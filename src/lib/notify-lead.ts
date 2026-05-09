// Shared lead-notification helper.
// Used by both /api/leads (v2 widget posts directly) and /api/web/chat
// (the live widget that flips conversations.is_lead = true). Keeps email
// formatting, recipient resolution, and delivery tracking in one place so
// the inbox alert behaves identically no matter which path captured the lead.

import { supabaseAdmin } from "./supabase-server";
import { resend, FROM } from "./resend";
import {
  leadNotificationHtml,
  leadNotificationText,
  type ConversationMessage,
  type SharedDocument,
} from "./email/templates/lead-v2";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.qwikly.co.za";

// Override recipient for the qwikly.co.za marketing chat (client_id=1) so lead
// + booking notifications go to the Clarke Agency inbox instead of whatever's
// stored on the businesses row. Set this in Vercel env. Falls back to the
// standard businesses.notification_email/contact_email lookup if unset.
const QWIKLY_OWN_NOTIFICATION_EMAIL = (process.env.QWIKLY_OWN_NOTIFICATION_EMAIL ?? "").trim() || null;
// T3.9 — sourced from QWIKLY_OWNER_CLIENT_ID env var (see .env.example).
// Falls back to "1" so local dev without the env var still works.
const QWIKLY_OWN_CLIENT_ID = process.env.QWIKLY_OWNER_CLIENT_ID ?? "1";

export function resolveQwiklyOwnRecipientOverride(clientId: number | string | null | undefined): string | null {
  if (clientId == null) return null;
  if (String(clientId) !== QWIKLY_OWN_CLIENT_ID) return null;
  return QWIKLY_OWN_NOTIFICATION_EMAIL;
}

export type NotifyLeadResult =
  | { ok: true; messageId: string | null; recipient: string }
  | { ok: false; reason: "disabled" | "no_recipient" | "no_resend_key" | "send_failed"; message?: string };

type NotifyLeadInput = {
  /** v1 client_id (BIGINT) — used to look up the matching v2 business via auth_user_id. */
  clientId?: number | string | null;
  /** v2 business_id (UUID) — preferred when available. */
  businessId?: string | null;
  /** v1 conversations.id, used to load messages and documents. Optional. */
  conversationId?: number | string | null;
  /** Lead details, in whatever subset is known at call time. */
  lead: {
    id?: string | number | null;
    name: string | null;
    contact: string;
    need: string | null;
    preferredTime: string | null;
    visitorEmail: string | null;
    confirmToken?: string | null;
    /** Visitor flagged the job as urgent (today/ASAP). Switches the email
     *  to URGENT styling + subject line. */
    isUrgent?: boolean | null;
    /** Visitor's estimate of how many days the job will take. Surfaced in
     *  the email so the tradesman knows to hold a follow-up slot. */
    expectedDays?: number | null;
    /** Assistant flagged this as a handoff because an escalation rule fired,
     *  not a normal lead capture. Switches subject + email body styling. */
    isEscalation?: boolean | null;
  };
};

export async function notifyLeadCaptured(input: NotifyLeadInput): Promise<NotifyLeadResult> {
  const db = supabaseAdmin();

  // ── 1. Resolve the v2 business (where notification settings live)
  type BusinessRow = {
    id: string;
    name: string;
    contact_email?: string | null;
    notification_email?: string | null;
    lead_emails_enabled?: boolean | null;
    owner_first_name?: string | null;
  };
  let business: BusinessRow | null = null;

  if (input.businessId) {
    const { data } = await db
      .from("businesses")
      .select("*")
      .eq("id", input.businessId)
      .maybeSingle();
    business = (data as BusinessRow) ?? null;
  } else if (input.clientId != null) {
    // Bridge v1 → v2: clients.auth_user_id matches businesses.user_id.
    const { data: client } = await db
      .from("clients")
      .select("auth_user_id")
      .eq("id", input.clientId)
      .maybeSingle();
    const authUserId = (client as { auth_user_id?: string | null } | null)?.auth_user_id;
    if (authUserId) {
      const { data } = await db
        .from("businesses")
        .select("*")
        .eq("user_id", authUserId)
        .maybeSingle();
      business = (data as BusinessRow) ?? null;
    }
  }

  // For qwikly.co.za (client_id=1) the Clarke Agency env override wins so all
  // marketing-chat alerts route to one inbox regardless of the businesses row.
  // Override also lets us send even when no business row exists for client_id=1.
  const ownOverride = resolveQwiklyOwnRecipientOverride(input.clientId ?? null);

  if (!business && !ownOverride) {
    return { ok: false, reason: "no_recipient", message: "No matching business row" };
  }

  // ── 2. Resolve recipient + on/off toggle
  const recipient = ownOverride
    || (business?.notification_email && business.notification_email.trim())
    || (business?.contact_email && business.contact_email.trim())
    || null;
  const emailsEnabled = business?.lead_emails_enabled !== false; // null/undefined = on by default

  if (!emailsEnabled) return { ok: false, reason: "disabled" };
  if (!recipient) return { ok: false, reason: "no_recipient" };
  if (!process.env.RESEND_API_KEY) return { ok: false, reason: "no_resend_key" };

  // ── 3. Pull the conversation history (last 6 messages) and any shared documents
  //       from the v1 tables when a conversationId is provided.
  let conversation: ConversationMessage[] = [];
  let documents: SharedDocument[] = [];

  if (input.conversationId != null) {
    const convId = typeof input.conversationId === "string"
      ? Number(input.conversationId)
      : input.conversationId;

    const [{ data: msgs }, { data: docs }] = await Promise.all([
      db
        .from("messages_log")
        .select("role, content, created_at")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true })
        .limit(40),
      db
        .from("conversation_documents")
        .select("id, file_name, file_type, file_size, uploaded_by")
        .eq("conversation_id", convId)
        .eq("status", "active")
        .order("created_at", { ascending: true }),
    ]);

    if (Array.isArray(msgs)) {
      conversation = msgs
        .filter((m): m is { role: string; content: string; created_at: string } =>
          !!m && typeof m.content === "string" && m.content.trim().length > 0
        )
        .map((m) => ({
          // The widget stores roles as "customer" or "assistant". Map "customer"
          // to "visitor" since that's what the email template recognises.
          role: m.role === "customer" ? "visitor" : m.role,
          content: m.content,
        }));
    }
    if (Array.isArray(docs)) {
      documents = docs
        .filter((d): d is { id: string; file_name: string; file_type: string; file_size: number; uploaded_by: string } =>
          !!d && (d as { uploaded_by?: string }).uploaded_by === "visitor"
        )
        .map((d) => ({
          id: d.id,
          fileName: d.file_name,
          fileType: d.file_type,
          fileSizeBytes: d.file_size,
          // Link straight to the lead detail in the dashboard so the user can
          // open the file with one tap. Conversation id == lead id in the
          // legacy dashboard convention.
          viewUrl: `${BASE_URL}/dashboard/leads`,
        }));
    }
  }

  // ── 4. Build confirm/suggest URLs (best-effort — only if we have a token)
  const confirmUrl = input.lead.confirmToken
    ? `${BASE_URL}/api/leads/confirm/${input.lead.confirmToken}?action=confirm`
    : `${BASE_URL}/dashboard/leads`;
  const suggestUrl = input.lead.confirmToken
    ? `${BASE_URL}/api/leads/confirm/${input.lead.confirmToken}?action=suggest`
    : `${BASE_URL}/dashboard/leads`;

  const templateArgs = {
    businessName: business?.name || "Qwikly",
    ownerFirstName: business?.owner_first_name ?? null,
    leadName: input.lead.name,
    contact: input.lead.contact,
    need: input.lead.need,
    preferredTime: input.lead.preferredTime,
    visitorEmail: input.lead.visitorEmail,
    confirmUrl,
    suggestUrl,
    conversation,
    documents,
    isUrgent: input.lead.isUrgent ?? false,
    expectedDays: input.lead.expectedDays ?? null,
    isEscalation: input.lead.isEscalation ?? false,
  };

  const baseSubject = input.lead.isUrgent
    ? `URGENT lead, ${input.lead.name ?? input.lead.contact}`
    : `New lead, ${input.lead.name ?? input.lead.contact}`;
  const subject = input.lead.isEscalation
    ? `[ESCALATION] ${baseSubject}`
    : baseSubject;

  const { data, error } = await resend.emails.send({
    from: FROM,
    to: [recipient],
    replyTo: input.lead.visitorEmail ?? undefined,
    subject,
    html: leadNotificationHtml(templateArgs),
    text: leadNotificationText(templateArgs),
    headers: input.lead.isUrgent
      ? { "X-Priority": "1", "X-MSMail-Priority": "High", Importance: "high" }
      : undefined,
  });

  if (error) {
    console.error("[notify-lead] send failed:", { businessId: business?.id ?? null, clientId: input.clientId, error });
    return { ok: false, reason: "send_failed", message: error.message ?? String(error) };
  }

  return { ok: true, messageId: data?.id ?? null, recipient };
}
