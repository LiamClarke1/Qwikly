import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { log } from "@/lib/log";
import { checkRateLimit } from "@/lib/rate-limit";
import { v2Auth } from "@/lib/v2-auth";
import { resend, FROM } from "@/lib/resend";
import { PLAN_CONFIG, resolvePlan, type PlanTier } from "@/lib/plan";
import {
  leadNotificationHtml,
  leadNotificationText,
  capReachedNotificationHtml,
  type ConversationMessage,
} from "@/lib/email/templates/lead-v2";

// Defensive: the widget can send raw_conversation in a few different shapes
// depending on how it was wired up. Coerce to {role, content} pairs that the
// email template understands. Returns [] when the input is absent or unusable.
function normaliseConversation(raw: unknown): ConversationMessage[] {
  if (!Array.isArray(raw)) return [];
  const out: ConversationMessage[] = [];
  for (const turn of raw) {
    if (!turn || typeof turn !== "object") continue;
    const t = turn as Record<string, unknown>;
    const role = String(
      t.role ?? t.sender ?? t.from ?? (t.is_visitor ? "visitor" : "assistant")
    );
    const content = typeof t.content === "string"
      ? t.content
      : typeof t.message === "string"
        ? t.message
        : typeof t.text === "string"
          ? t.text
          : "";
    if (content.trim()) out.push({ role, content });
  }
  return out;
}

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.qwikly.co.za";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS });
}

// ─── POST /api/leads (PUBLIC) ─────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: {
    api_key?: string;
    name?: string;
    contact?: string;
    need?: string;
    preferred_time?: string;
    visitor_email?: string;
    raw_conversation?: unknown;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400, headers: CORS });
  }

  const { api_key, contact } = body;
  if (!api_key || !contact) {
    return NextResponse.json(
      { error: "api_key and contact are required" },
      { status: 400, headers: CORS }
    );
  }

  const allowed = await checkRateLimit(api_key, 100);
  if (!allowed) {
    return NextResponse.json({ error: "rate_limit_exceeded" }, { status: 429, headers: CORS });
  }

  const db = supabaseAdmin();

  const { data: businessRaw } = await db
    .from("businesses")
    .select("*")
    .eq("api_key", api_key)
    .maybeSingle();
  const business = businessRaw as
    | {
        id: string;
        name: string;
        contact_email: string | null;
        notification_email?: string | null;
        lead_emails_enabled?: boolean | null;
        owner_first_name?: string | null;
        user_id: string;
      }
    | null;

  if (!business) {
    return NextResponse.json({ error: "invalid_api_key" }, { status: 401, headers: CORS });
  }

  const { data: sub } = await db
    .from("subscriptions")
    .select("plan, current_period_start, current_period_end")
    .eq("user_id", business.user_id)
    .maybeSingle();

  const plan = (sub?.plan ?? "trial") as PlanTier;
  const usagePeriod = await ensureUsagePeriod(db, business.id, sub);
  const planConfig = PLAN_CONFIG[resolvePlan(plan)];
  const leadCap = planConfig.leadLimit; // null = no hard cap (premium)

  // Resolve where notifications should land. notification_email is the user-controlled
  // setting; contact_email is the legacy fallback for accounts that pre-date the toggle.
  const recipient = (business.notification_email && business.notification_email.trim())
    || (business.contact_email && business.contact_email.trim())
    || null;
  const emailsEnabled = business.lead_emails_enabled !== false; // default true if column null

  // ── Lead cap enforcement ──────────────────────────────────────────────────────
  if (leadCap !== null && usagePeriod.leads_captured >= leadCap) {
    // Only email on the first blocked request (when exactly at cap)
    if (usagePeriod.leads_captured === leadCap && emailsEnabled && recipient) {
      resend.emails
        .send({
          from: FROM,
          to: [recipient],
          subject: "You've hit your Qwikly lead cap — upgrade to keep capturing",
          html: capReachedNotificationHtml({ businessName: business.name }),
        })
        .catch((err) =>
          log("error", "leads_cap_reached_email_failed", {
            businessId: business.id,
            error: err instanceof Error ? err.message : String(err),
          })
        );
    }
    return NextResponse.json({ ok: true, capped: true }, { headers: CORS });
  }

  // ── Store lead ────────────────────────────────────────────────────────────────
  // T3.7 — start with email_status: 'pending' so the dashboard shows the
  // notification is in-flight; the .then/.catch on the resend promise will
  // settle this to 'sent' or 'failed' once the network call resolves.
  const { data: lead, error: leadError } = await db
    .from("leads")
    .insert({
      business_id: business.id,
      name: body.name ?? null,
      contact,
      need: body.need ?? null,
      preferred_time: body.preferred_time ?? null,
      visitor_email: body.visitor_email ?? null,
      raw_conversation: body.raw_conversation ?? null,
      email_status: "pending",
    })
    .select("id, confirm_token, name, need, preferred_time, visitor_email")
    .single();

  if (leadError || !lead) {
    log("error", "leads_insert_failed", { error: leadError?.message });
    return NextResponse.json({ error: "failed_to_store" }, { status: 500, headers: CORS });
  }

  if (!lead.confirm_token) {
    log("error", "leads_confirm_token_missing", { leadId: lead.id });
    return NextResponse.json({ error: "failed_to_store" }, { status: 500, headers: CORS });
  }

  // ── Increment usage ───────────────────────────────────────────────────────────
  // Track top-up count when a paid plan goes over its included cap (soft overflow for billing)
  const isOverCap = leadCap !== null && usagePeriod.leads_captured >= leadCap;
  await db
    .from("usage_periods")
    .update({
      leads_captured: usagePeriod.leads_captured + 1,
      ...(isOverCap ? { top_up_count: usagePeriod.top_up_count + 1 } : {}),
    })
    .eq("id", usagePeriod.id);

  // ── Send notification email ───────────────────────────────────────────────────
  const confirmUrl = `${BASE_URL}/api/leads/confirm/${lead.confirm_token}?action=confirm`;
  const suggestUrl = `${BASE_URL}/api/leads/confirm/${lead.confirm_token}?action=suggest`;

  if (!emailsEnabled || !recipient) {
    await db
      .from("leads")
      .update({
        email_status: "skipped",
        email_error: !emailsEnabled
          ? "lead_emails_disabled"
          : "no_recipient_address",
      })
      .eq("id", lead.id);
    return NextResponse.json({ ok: true, lead_id: lead.id, email_skipped: true }, { headers: CORS });
  }

  // T3.7 — Fire-and-forget the email but record the outcome so failures are
  // visible in the dashboard and we never silently lose a notification.
  // The lead row was inserted with email_status='pending'; the .then/.catch
  // chain below settles it to 'sent' or 'failed'.
  void resend.emails
    .send({
      from: FROM,
      to: [recipient],
      replyTo: lead.visitor_email ?? undefined,
      subject: `New lead — ${lead.name ?? contact}`,
      html: leadNotificationHtml({
        businessName: business.name,
        ownerFirstName: business.owner_first_name,
        leadName: lead.name,
        contact,
        need: lead.need,
        preferredTime: lead.preferred_time,
        visitorEmail: lead.visitor_email,
        confirmUrl,
        suggestUrl,
        conversation: normaliseConversation(body.raw_conversation),
      }),
      text: leadNotificationText({
        businessName: business.name,
        ownerFirstName: business.owner_first_name,
        leadName: lead.name,
        contact,
        need: lead.need,
        preferredTime: lead.preferred_time,
        visitorEmail: lead.visitor_email,
        confirmUrl,
        suggestUrl,
        conversation: normaliseConversation(body.raw_conversation),
      }),
    })
    .then(async ({ data, error }) => {
      if (error) {
        log("error", "leads_notification_email_failed", {
          leadId: lead.id,
          businessId: business.id,
          error: error.message ?? String(error),
        });
        await db
          .from("leads")
          .update({ email_status: "failed", email_error: error.message ?? String(error) })
          .eq("id", lead.id);
      } else {
        await db
          .from("leads")
          .update({
            email_status: "sent",
            email_message_id: data?.id ?? null,
            email_sent_at: new Date().toISOString(),
          })
          .eq("id", lead.id);
      }
    })
    .catch(async (err) => {
      log("error", "leads_notification_email_threw", {
        leadId: lead.id,
        businessId: business.id,
        error: err?.message ?? String(err),
      });
      await db
        .from("leads")
        .update({ email_status: "failed", email_error: err?.message ?? String(err) })
        .eq("id", lead.id);
    });

  return NextResponse.json({ ok: true, lead_id: lead.id }, { headers: CORS });
}

// ─── GET /api/leads (AUTH) ────────────────────────────────────────────────────

export async function GET() {
  const auth = await v2Auth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS });
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("leads")
    .select("id, name, contact, need, preferred_time, visitor_email, status, captured_at")
    .eq("business_id", auth.businessId)
    .order("captured_at", { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400, headers: CORS });
  }

  return NextResponse.json(data ?? []);
}

// ─── Helper ───────────────────────────────────────────────────────────────────

async function ensureUsagePeriod(
  db: ReturnType<typeof supabaseAdmin>,
  businessId: string,
  sub: { current_period_start?: string | null; current_period_end?: string | null } | null
) {
  const now = new Date();

  const periodStart = sub?.current_period_start
    ? new Date(sub.current_period_start)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = sub?.current_period_end
    ? new Date(sub.current_period_end)
    : new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const { data: existing } = await db
    .from("usage_periods")
    .select("id, leads_captured, top_up_count")
    .eq("business_id", businessId)
    .lte("period_start", now.toISOString())
    .gte("period_end", now.toISOString())
    .maybeSingle();

  if (existing) return existing;

  const { data: created } = await db
    .from("usage_periods")
    .upsert(
      {
        business_id: businessId,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        leads_captured: 0,
        top_up_count: 0,
      },
      { onConflict: "business_id,period_start", ignoreDuplicates: true }
    )
    .select("id, leads_captured, top_up_count")
    .maybeSingle();

  if (created) return created;

  const { data: fetched } = await db
    .from("usage_periods")
    .select("id, leads_captured, top_up_count")
    .eq("business_id", businessId)
    .lte("period_start", now.toISOString())
    .gte("period_end", now.toISOString())
    .maybeSingle();

  return fetched!;
}
