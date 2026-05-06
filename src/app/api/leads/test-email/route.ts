import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { v2Auth } from "@/lib/v2-auth";
import { resend, FROM } from "@/lib/resend";
import { leadNotificationHtml } from "@/lib/email/templates/lead-v2";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.qwikly.co.za";

// POST /api/leads/test-email
// Sends a fake "new lead" notification to the configured recipient so the
// business owner can confirm end-to-end delivery before going live.
// Optional body: { override_recipient?: string } — ignores stored prefs and
// uses the provided address instead. Useful when verifying a new email.
export async function POST(req: NextRequest) {
  const auth = await v2Auth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
    .select("id, name, contact_email, notification_email")
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

  const html = leadNotificationHtml({
    businessName: business.name || "your business",
    leadName: "Test Visitor",
    contact: "+27 82 555 0000",
    need: "This is a test notification — no real lead was captured.",
    preferredTime: "Whenever works",
    visitorEmail: "test@qwikly.co.za",
    confirmUrl: `${BASE_URL}/dashboard/leads`,
    suggestUrl: `${BASE_URL}/dashboard/leads`,
  });

  const { data, error } = await resend.emails.send({
    from: FROM,
    to: [recipient],
    subject: "Qwikly test — your lead alerts are working",
    html,
  });

  if (error) {
    console.error("[leads/test-email] send failed:", { businessId: business.id, error });
    return NextResponse.json(
      { error: "send_failed", message: error.message ?? String(error), recipient },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, recipient, message_id: data?.id ?? null });
}
