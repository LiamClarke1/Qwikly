import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { sendEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.qwikly.co.za";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const allowed = await checkRateLimit(`forgot:${ip}`, 5);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Please wait a minute and try again." }, { status: 429 });
  }

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const db = supabaseAdmin();

  // Use Supabase admin to generate a recovery link without triggering Supabase's
  // built-in email send (which is rate-limited on the free tier).
  const { data, error } = await db.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: `${APP_URL}/reset-password` },
  });

  // Always return a success-shaped response to prevent email enumeration,
  // even when the user does not exist.
  if (error || !data?.properties?.action_link) {
    return NextResponse.json({ ok: true });
  }

  const actionLink = data.properties.action_link;

  await sendEmail({
    to: email,
    subject: "Reset your Qwikly password",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a;">
        <h1 style="font-size: 22px; font-weight: 700; margin: 0 0 16px;">Reset your password</h1>
        <p style="font-size: 15px; line-height: 1.55; margin: 0 0 24px; color: #4a4a4a;">
          Click the button below to set a new password for your Qwikly account. This link expires in 1 hour and can only be used once.
        </p>
        <a href="${actionLink}"
           style="display: inline-block; background: #E85A2C; color: #fff; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px;">
          Reset password
        </a>
        <p style="font-size: 13px; line-height: 1.55; margin: 24px 0 0; color: #888;">
          If you didn't request this, you can ignore this email. Your password won't change.
        </p>
        <p style="font-size: 13px; line-height: 1.55; margin: 16px 0 0; color: #888;">
          If the button doesn't work, paste this link into your browser:<br>
          <span style="word-break: break-all; color: #555;">${actionLink}</span>
        </p>
      </div>
    `,
  });

  return NextResponse.json({ ok: true });
}
