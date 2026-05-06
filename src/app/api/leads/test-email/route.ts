import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { v2Auth } from "@/lib/v2-auth";
import { resend, FROM } from "@/lib/resend";
import { leadNotificationHtml, leadNotificationText } from "@/lib/email/templates/lead-v2";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.qwikly.co.za";

// POST /api/leads/test-email
// Sends a sample lead-alert email so the business owner can verify their
// configuration end-to-end (Resend domain, recipient resolution, template
// rendering). Uses the *exact* code path real leads use, just with a fake
// conversation + document attached so every section of the email renders.
//
// We intentionally do NOT insert a row in the leads table for tests — that
// would pollute the dashboard with rows that aren't real leads.
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
  const { data: businessRaw } = await db
    .from("businesses")
    .select("*")
    .eq("id", auth.businessId)
    .maybeSingle();
  const business = businessRaw as
    | {
        id: string;
        name: string;
        contact_email?: string | null;
        notification_email?: string | null;
        owner_first_name?: string | null;
      }
    | null;

  if (!business) {
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

  // Sample data — exercises every block in the template (need, conversation,
  // attachments, pre-typed reply, owner name) so users can preview the full
  // email before real leads start arriving.
  const templateArgs = {
    businessName: business.name || "your business",
    ownerFirstName: business.owner_first_name ?? null,
    leadName: "Sarah Mokoena",
    contact: "+27 82 555 0123",
    need: "Looking for a quote on a kitchen renovation, ideally before mid-June.",
    preferredTime: "Tomorrow morning works best",
    visitorEmail: "sarah.test@example.com",
    confirmUrl: `${BASE_URL}/dashboard/leads`,
    suggestUrl: `${BASE_URL}/dashboard/leads`,
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

  const { data, error } = await resend.emails.send({
    from: FROM,
    to: [recipient],
    subject: "Qwikly — sample lead alert (preview)",
    html: leadNotificationHtml(templateArgs),
    text: leadNotificationText(templateArgs),
  });

  if (error) {
    console.error("[leads/test-email] send failed:", { businessId: business.id, error });
    return NextResponse.json(
      { error: "send_failed", message: error.message ?? String(error), recipient },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    recipient,
    message_id: data?.id ?? null,
    note: "Sample email sent. Real leads from your widget will look the same with their actual conversation + attachments.",
  });
}
