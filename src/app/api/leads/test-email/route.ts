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
  const { data: businessRaw, error: bizErr } = await db
    .from("businesses")
    .select("*")
    .eq("id", auth.businessId)
    .maybeSingle();
  const business = businessRaw as
    | {
        id: string;
        name: string;
        contact_email: string | null;
        notification_email?: string | null;
        lead_emails_enabled?: boolean | null;
        owner_first_name?: string | null;
      }
    | null;

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
    ownerFirstName: business.owner_first_name,
    leadName: "Sarah Mokoena",
    contact: "+27 82 555 0123",
    need: "Looking for a quote on a kitchen renovation, ideally before mid-June.",
    preferredTime: "Tomorrow morning works best",
    visitorEmail: "sarah.test@example.com",
    confirmUrl,
    suggestUrl,
    conversation: [
      { role: "visitor", content: "Hi, do you guys handle kitchen renovations?" },
      { role: "assistant", content: "Yes! We do full and partial kitchen renos across Johannesburg. What did you have in mind?" },
      { role: "visitor", content: "I want to redo our cabinets and put in a stone countertop. Roughly 4m x 3m kitchen." },
      { role: "assistant", content: "Cool. Can I grab your name and a contact number so the team can send you a quote?" },
      { role: "visitor", content: "Sarah Mokoena — 082 555 0123. Tomorrow morning would be great for a call." },
    ],
    documents: [
      {
        id: "test-doc-1",
        fileName: "kitchen-photos.pdf",
        fileType: "application/pdf",
        fileSizeBytes: 2_400_000,
        viewUrl: `${BASE_URL}/dashboard/leads`,
      },
    ],
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
