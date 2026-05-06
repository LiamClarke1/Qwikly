import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { v2Auth } from "@/lib/v2-auth";
import { resend, FROM } from "@/lib/resend";
import { leadNotificationHtml, leadNotificationText } from "@/lib/email/templates/lead-v2";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.qwikly.co.za";

// POST /api/leads/test-email
// Exercises the full lead-alert pipeline so the business owner can verify
// end-to-end that:
//   1. The backend can create a lead row (DB write succeeds)
//   2. Resend delivers the notification email
//   3. The email_status / email_message_id columns track the result
//
// Optional body: { override_recipient?: string } — ignores stored prefs and
// uses the provided address instead. Useful when verifying a new address
// before saving it.
//
// Rate-limited to 4 requests per minute per business to prevent accidental
// inbox flooding from rapid button clicks.
export async function POST(req: NextRequest) {
  const auth = await v2Auth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Rate limit: 4 test sends per minute per business
  const allowed = await checkRateLimit(`test-email:${auth.businessId}`, 4);
  if (!allowed) {
    return NextResponse.json(
      {
        error: "rate_limited",
        message: "You've sent 4 test emails this minute. Wait a moment and try again.",
      },
      { status: 429 }
    );
  }

  let body: { override_recipient?: string } = {};
  try {
    const text = await req.text();
    if (text) body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: business, error: bizErr } = await db
    .from("businesses")
    .select("id, name, contact_email, notification_email, lead_emails_enabled")
    .eq("id", auth.businessId)
    .maybeSingle();

  if (bizErr || !business) {
    return NextResponse.json({ error: "business_not_found" }, { status: 404 });
  }

  const override = body.override_recipient?.trim();
  if (override && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(override)) {
    return NextResponse.json({ error: "override_recipient must be a valid email" }, { status: 400 });
  }

  const recipient = override
    || (business.notification_email && business.notification_email.trim())
    || (business.contact_email && business.contact_email.trim())
    || null;

  if (!recipient) {
    return NextResponse.json(
      { error: "no_recipient", message: "Set a notification email before sending a test." },
      { status: 400 }
    );
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "missing_resend_key", message: "RESEND_API_KEY is not configured on the server." },
      { status: 500 }
    );
  }

  // ── 1. Insert a real test lead row so the DB-write side of the pipeline
  //       is exercised end-to-end. The lead is clearly marked so it's easy
  //       to find and delete later. We do NOT increment usage_periods so
  //       these tests don't burn the user's monthly lead cap.
  const { data: lead, error: leadError } = await db
    .from("leads")
    .insert({
      business_id: business.id,
      name: "Qwikly Test Lead",
      contact: "+27 00 000 0000",
      need: "End-to-end test of your lead alert pipeline. Safe to delete.",
      preferred_time: "Anytime",
      visitor_email: "test@qwikly.co.za",
    })
    .select("id, confirm_token")
    .single();

  if (leadError || !lead?.confirm_token) {
    console.error("[leads/test-email] insert error:", leadError);
    return NextResponse.json(
      { error: "db_write_failed", message: leadError?.message ?? "Could not write test lead" },
      { status: 500 }
    );
  }

  // ── 2. Build the same email a real lead would trigger
  const confirmUrl = `${BASE_URL}/api/leads/confirm/${lead.confirm_token}?action=confirm`;
  const suggestUrl = `${BASE_URL}/api/leads/confirm/${lead.confirm_token}?action=suggest`;

  const templateArgs = {
    businessName: business.name || "your business",
    leadName: "Qwikly Test Lead",
    contact: "+27 00 000 0000",
    need: "End-to-end test of your lead alert pipeline. Safe to delete.",
    preferredTime: "Anytime",
    visitorEmail: "test@qwikly.co.za",
    confirmUrl,
    suggestUrl,
  };

  // ── 3. Send through Resend exactly like the real /api/leads path does
  const { data, error } = await resend.emails.send({
    from: FROM,
    to: [recipient],
    subject: "Qwikly — test lead alert (delete after verifying)",
    html: leadNotificationHtml(templateArgs),
    text: leadNotificationText(templateArgs),
  });

  if (error) {
    console.error("[leads/test-email] send failed:", { businessId: business.id, error });
    await db
      .from("leads")
      .update({ email_status: "failed", email_error: error.message ?? String(error) })
      .eq("id", lead.id);
    return NextResponse.json(
      { error: "send_failed", message: error.message ?? String(error), recipient, lead_id: lead.id },
      { status: 502 }
    );
  }

  // ── 4. Persist delivery status so the same tracking that real leads use
  //       gets exercised on this path.
  await db
    .from("leads")
    .update({
      email_status: "sent",
      email_message_id: data?.id ?? null,
      email_sent_at: new Date().toISOString(),
    })
    .eq("id", lead.id);

  return NextResponse.json({
    ok: true,
    recipient,
    message_id: data?.id ?? null,
    lead_id: lead.id,
    note: "A test lead was created. View or delete it from /dashboard/leads.",
  });
}
