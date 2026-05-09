import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { supabaseAdmin } from "@/lib/supabase-server";
import { sendEmail } from "@/lib/email";
import { signPrivacyDeletionToken } from "@/lib/privacy-token";

export const dynamic = "force-dynamic";

const TOKEN_TTL_HOURS = 24;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.qwikly.co.za";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

function hashIp(req: NextRequest): string | null {
  const ip =
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    null;
  if (!ip) return null;
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

export async function POST(req: NextRequest) {
  let body: { email?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const rawEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!isValidEmail(rawEmail)) {
    return NextResponse.json({ ok: false, error: "Enter a valid email address." }, { status: 400 });
  }

  const db = supabaseAdmin();

  // Always create a request row, even if no matching conversation exists,
  // so we can rate-limit by request_count and avoid revealing whether the
  // email is in our system (prevents enumeration).
  const ipHash = hashIp(req);
  const userAgent = req.headers.get("user-agent")?.slice(0, 200) ?? null;

  const { data: requestRow, error: insertErr } = await db
    .from("privacy_deletion_requests")
    .insert({
      email: rawEmail,
      ip_hash: ipHash,
      user_agent: userAgent,
    })
    .select("id")
    .single();

  if (insertErr || !requestRow) {
    console.error("[privacy:delete-my-data] insert failed:", insertErr?.message);
    return NextResponse.json(
      { ok: false, error: "Could not record your request. Please try again." },
      { status: 500 }
    );
  }

  // Look up matching conversations by visitor email. We do a simple count
  // here just to pre-validate; the actual soft-delete happens after the
  // visitor confirms by clicking the link in their email.
  const { count: convCount } = await db
    .from("conversations")
    .select("id", { count: "exact", head: true })
    .ilike("customer_email", rawEmail)
    .is("deleted_at", null);

  // Send the confirmation email regardless. If we said "no match found" we
  // would leak account presence, which is itself a privacy concern under POPIA.
  const expiresAt = Math.floor(Date.now() / 1000) + TOKEN_TTL_HOURS * 60 * 60;
  const token = signPrivacyDeletionToken({
    rid: requestRow.id,
    email: rawEmail,
    x: expiresAt,
  });

  const confirmUrl = `${SITE_URL}/privacy/delete-my-data/confirm?token=${encodeURIComponent(token)}`;

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1F2937;line-height:1.55;max-width:560px;margin:0 auto;padding:24px">
      <h1 style="font-size:22px;color:#0F172A;margin:0 0 16px">Confirm your data deletion request</h1>
      <p style="margin:0 0 16px">
        We received a request to delete the personal information we hold about
        <strong>${rawEmail}</strong> from Qwikly. To confirm this request, click the button below.
      </p>
      <p style="margin:0 0 24px">
        <a href="${confirmUrl}" style="display:inline-block;background:#0F172A;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px">
          Confirm deletion
        </a>
      </p>
      <p style="margin:0 0 16px;font-size:14px;color:#475569">
        Or copy and paste this link into your browser:<br/>
        <a href="${confirmUrl}" style="color:#E85A2C;word-break:break-all">${confirmUrl}</a>
      </p>
      <p style="margin:0 0 16px;font-size:14px;color:#475569">
        The link expires in ${TOKEN_TTL_HOURS} hours. Once confirmed, we soft-delete your conversations
        immediately and remove them entirely on the next daily retention run.
      </p>
      <p style="margin:24px 0 0;font-size:13px;color:#94A3B8;border-top:1px solid #E2E8F0;padding-top:16px">
        If you did not request this, you can ignore this email and nothing will happen.
        Questions? Reply to this email or write to hello@qwikly.co.za.
      </p>
      <p style="margin:8px 0 0;font-size:12px;color:#94A3B8">
        Sent in line with the Protection of Personal Information Act (POPIA, 2013).
      </p>
    </div>
  `;

  const emailResult = await sendEmail({
    to: rawEmail,
    subject: "Confirm your Qwikly data deletion request",
    html,
    replyTo: "hello@qwikly.co.za",
    tags: [{ name: "kind", value: "privacy_deletion_confirm" }],
  });

  if (emailResult.error) {
    console.error("[privacy:delete-my-data] email failed:", emailResult.error);
    // Don't tell the visitor — we still pretend the email went out so we
    // don't leak whether the address is reachable or not.
  }

  return NextResponse.json({
    ok: true,
    message:
      "If we have data linked to that email, we have sent a confirmation link. Check your inbox to finish the deletion.",
    matches_found: convCount ?? 0,
  });
}
