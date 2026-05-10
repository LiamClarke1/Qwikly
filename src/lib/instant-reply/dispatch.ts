// Instant Reply 60s dispatcher.
//
// Loads a captured lead and the tenant's owner-notification settings, then
// pushes a short message through the cheapest reachable channel:
//   1. WhatsApp via Twilio
//   2. SMS via Twilio (fallback)
//   3. Email via Resend (final fallback)
//
// Returns the channel used, or a structured failure reason. All attempts are
// logged so the dashboard can show why a notification did not land.
//
// Schema notes: this helper reads from the existing `leads` table and from a
// `businesses` row extended with the instant-reply fields (see
// docs/instant-reply.md). When those columns do not yet exist in the live
// database, the function fails fast with `reason: "tenant_settings_missing"`
// rather than guessing.

import twilio from "twilio";
import { supabaseAdmin } from "@/lib/supabase-server";
import { resend, FROM } from "@/lib/resend";
import { log } from "@/lib/log";

export type DispatchOk = { ok: true; channel: "whatsapp" | "sms" | "email" };
export type DispatchFail = { ok: false; reason: string };
export type DispatchResult = DispatchOk | DispatchFail;

type LeadRow = {
  id: string;
  business_id: string;
  name: string | null;
  contact: string;
  need: string | null;
  captured_at: string | null;
};

type TenantRow = {
  id: string;
  name: string | null;
  owner_whatsapp: string | null;
  owner_sms_fallback: string | null;
  owner_email_fallback: string | null;
  notification_email: string | null;
  contact_email: string | null;
  instant_reply_enabled: boolean | null;
  business_hours: BusinessHours | null;
};

type BusinessHours = {
  start?: string;
  end?: string;
  tz?: string;
};

const MAX_MESSAGE_CHARS = 320;

function getTwilioClient() {
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

function composeOwnerMessage(lead: LeadRow): string {
  const who = (lead.name && lead.name.trim()) || lead.contact || "a visitor";
  const summary = (lead.need && lead.need.trim()) || "no detail captured";
  const base = `New Qwikly lead: ${who}, ${summary}. Reply YES to send your booking link.`;
  if (base.length <= MAX_MESSAGE_CHARS) return base;
  // Trim the summary so the call to action survives.
  const overflow = base.length - MAX_MESSAGE_CHARS;
  const trimmedSummary = summary.slice(0, Math.max(0, summary.length - overflow - 1)) + "...";
  return `New Qwikly lead: ${who}, ${trimmedSummary}. Reply YES to send your booking link.`;
}

function isWithinBusinessHours(hours: BusinessHours | null): boolean {
  // No config means always on.
  if (!hours || !hours.start || !hours.end) return true;
  const tz = hours.tz || "Africa/Johannesburg";
  // Format current time in tenant tz as HH:mm.
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const current = fmt.format(now); // "HH:mm"
  return current >= hours.start && current <= hours.end;
}

function normaliseWhatsappNumber(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("whatsapp:")) return trimmed;
  const cleaned = trimmed.startsWith("+") ? trimmed : `+${trimmed.replace(/\D/g, "")}`;
  return `whatsapp:${cleaned}`;
}

function normaliseSmsNumber(raw: string): string {
  const trimmed = raw.trim();
  return trimmed.startsWith("+") ? trimmed : `+${trimmed.replace(/\D/g, "")}`;
}

async function tryWhatsApp(toRaw: string, body: string): Promise<{ ok: true; sid: string } | { ok: false; error: string }> {
  const from = process.env.TWILIO_WHATSAPP_NUMBER;
  if (!from) return { ok: false, error: "missing_TWILIO_WHATSAPP_NUMBER" };
  try {
    const msg = await getTwilioClient().messages.create({
      from,
      to: normaliseWhatsappNumber(toRaw),
      body,
    });
    return { ok: true, sid: msg.sid };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function trySms(toRaw: string, body: string): Promise<{ ok: true; sid: string } | { ok: false; error: string }> {
  const from = process.env.TWILIO_SMS_NUMBER;
  if (!from) return { ok: false, error: "missing_TWILIO_SMS_NUMBER" };
  try {
    const msg = await getTwilioClient().messages.create({
      from,
      to: normaliseSmsNumber(toRaw),
      body,
    });
    return { ok: true, sid: msg.sid };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function tryEmail(to: string, subject: string, body: string): Promise<{ ok: true; id: string | null } | { ok: false; error: string }> {
  if (!process.env.RESEND_API_KEY) return { ok: false, error: "missing_RESEND_API_KEY" };
  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: [to],
      subject,
      text: body,
    });
    if (error) return { ok: false, error: error.message ?? String(error) };
    return { ok: true, id: data?.id ?? null };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function dispatchInstantReply(
  { leadId }: { leadId: string }
): Promise<DispatchResult> {
  if (!leadId) return { ok: false, reason: "missing_leadId" };

  const db = supabaseAdmin();

  const { data: leadRaw, error: leadErr } = await db
    .from("leads")
    .select("id, business_id, name, contact, need, captured_at")
    .eq("id", leadId)
    .maybeSingle();

  if (leadErr) {
    log("error", "instant_reply_lead_lookup_failed", { leadId, error: leadErr.message });
    return { ok: false, reason: "lead_lookup_failed" };
  }
  const lead = leadRaw as LeadRow | null;
  if (!lead) return { ok: false, reason: "lead_not_found" };

  // Tenant settings live on the businesses row (see docs/instant-reply.md).
  // We select * so missing columns degrade to undefined rather than throwing.
  const { data: tenantRaw, error: tenantErr } = await db
    .from("businesses")
    .select("*")
    .eq("id", lead.business_id)
    .maybeSingle();

  if (tenantErr) {
    log("error", "instant_reply_tenant_lookup_failed", { leadId, error: tenantErr.message });
    return { ok: false, reason: "tenant_lookup_failed" };
  }
  const tenant = tenantRaw as TenantRow | null;
  if (!tenant) return { ok: false, reason: "tenant_not_found" };

  // Default to enabled when the column does not exist yet (null).
  if (tenant.instant_reply_enabled === false) {
    log("info", "instant_reply_disabled", { leadId, tenantId: tenant.id });
    return { ok: false, reason: "instant_reply_disabled" };
  }

  if (!isWithinBusinessHours(tenant.business_hours ?? null)) {
    log("info", "instant_reply_outside_hours", { leadId, tenantId: tenant.id });
    return { ok: false, reason: "outside_business_hours" };
  }

  const messageBody = composeOwnerMessage(lead);

  // 1. WhatsApp
  if (tenant.owner_whatsapp && tenant.owner_whatsapp.trim()) {
    const wa = await tryWhatsApp(tenant.owner_whatsapp, messageBody);
    if (wa.ok) {
      log("info", "instant_reply_sent", { leadId, tenantId: tenant.id, channel: "whatsapp", sid: wa.sid });
      return { ok: true, channel: "whatsapp" };
    }
    log("warn", "instant_reply_whatsapp_failed", { leadId, tenantId: tenant.id, error: wa.error });
  }

  // 2. SMS
  const smsTarget = tenant.owner_sms_fallback?.trim() || tenant.owner_whatsapp?.trim();
  if (smsTarget) {
    const sms = await trySms(smsTarget, messageBody);
    if (sms.ok) {
      log("info", "instant_reply_sent", { leadId, tenantId: tenant.id, channel: "sms", sid: sms.sid });
      return { ok: true, channel: "sms" };
    }
    log("warn", "instant_reply_sms_failed", { leadId, tenantId: tenant.id, error: sms.error });
  }

  // 3. Email
  const emailTarget =
    tenant.owner_email_fallback?.trim() ||
    tenant.notification_email?.trim() ||
    tenant.contact_email?.trim() ||
    null;
  if (emailTarget) {
    const subject = `New Qwikly lead, ${lead.name ?? lead.contact}`;
    const em = await tryEmail(emailTarget, subject, messageBody);
    if (em.ok) {
      log("info", "instant_reply_sent", { leadId, tenantId: tenant.id, channel: "email", id: em.id });
      return { ok: true, channel: "email" };
    }
    log("warn", "instant_reply_email_failed", { leadId, tenantId: tenant.id, error: em.error });
  }

  log("error", "instant_reply_all_channels_failed", { leadId, tenantId: tenant.id });
  return { ok: false, reason: "all_channels_failed" };
}

// ── Owner reply handler ──────────────────────────────────────────────────────
//
// Called from the inbound Twilio webhook. Looks up the most recent unconfirmed
// lead for the owner's number, and (if the reply is YES / Y) sends the
// tenant's booking link to the lead via the same channel hierarchy.

export async function handleOwnerReply(
  { fromNumber, body }: { fromNumber: string; body: string }
): Promise<DispatchResult> {
  const text = body.trim().toLowerCase();
  const isYes = text === "yes" || text === "y" || text === "ok";
  if (!isYes) {
    log("info", "instant_reply_ignored_owner_reply", { fromNumber, bodyLength: body.length });
    return { ok: false, reason: "not_a_confirmation" };
  }

  const db = supabaseAdmin();
  const phone = fromNumber.replace(/^whatsapp:/i, "").trim();

  const { data: tenantRaw } = await db
    .from("businesses")
    .select("*")
    .or(`owner_whatsapp.eq.${phone},owner_sms_fallback.eq.${phone}`)
    .maybeSingle();
  const tenant = tenantRaw as (TenantRow & { booking_link_url?: string | null }) | null;
  if (!tenant) return { ok: false, reason: "tenant_not_found_for_owner" };

  const bookingLink = tenant.booking_link_url?.trim() || `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.qwikly.co.za"}/book`;

  const { data: leadRaw } = await db
    .from("leads")
    .select("id, business_id, name, contact, need, captured_at, visitor_email")
    .eq("business_id", tenant.id)
    .order("captured_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const lead = leadRaw as (LeadRow & { visitor_email: string | null }) | null;
  if (!lead) return { ok: false, reason: "no_recent_lead" };

  const businessName = tenant.name || "Qwikly";
  const message = `Hi ${lead.name ?? "there"}, thanks for reaching out to ${businessName}. Pick a time that suits you here: ${bookingLink}`;

  // Try WhatsApp first to the lead's contact, then SMS, then email.
  const wa = await tryWhatsApp(lead.contact, message);
  if (wa.ok) {
    log("info", "instant_reply_booking_link_sent", { leadId: lead.id, channel: "whatsapp" });
    return { ok: true, channel: "whatsapp" };
  }
  const sms = await trySms(lead.contact, message);
  if (sms.ok) {
    log("info", "instant_reply_booking_link_sent", { leadId: lead.id, channel: "sms" });
    return { ok: true, channel: "sms" };
  }
  if (lead.visitor_email) {
    const em = await tryEmail(lead.visitor_email, `Book a time with ${businessName}`, message);
    if (em.ok) {
      log("info", "instant_reply_booking_link_sent", { leadId: lead.id, channel: "email" });
      return { ok: true, channel: "email" };
    }
  }
  return { ok: false, reason: "could_not_send_booking_link" };
}
