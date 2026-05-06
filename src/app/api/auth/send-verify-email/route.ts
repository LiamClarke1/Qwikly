import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";
import { sendEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";
import { randomBytes, createHash } from "crypto";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.qwikly.co.za";
const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const allowed = await checkRateLimit(`verify-send:${ip}`, 3);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Please wait a minute." }, { status: 429 });
  }

  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (s) =>
          s.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const db = supabaseAdmin();

  const { data: client, error: clientError } = await db
    .from("clients")
    .select("id, notification_email, support_email, email_verified_at")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (clientError || !client) {
    return NextResponse.json({ error: "client_not_found" }, { status: 404 });
  }

  if (client.email_verified_at) {
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }

  const targetEmail =
    (client.notification_email as string | null) ??
    (client.support_email as string | null) ??
    user.email ??
    null;

  if (!targetEmail) {
    return NextResponse.json({ error: "no_email_on_file" }, { status: 400 });
  }

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();

  const { error: insertError } = await db.from("email_verifications").insert({
    client_id: client.id,
    email: targetEmail,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });

  if (insertError) {
    return NextResponse.json({ error: "could_not_create_token" }, { status: 500 });
  }

  const verifyLink = `${APP_URL}/auth/verify?token=${token}`;

  const { error: sendError } = await sendEmail({
    to: targetEmail,
    subject: "Verify your Qwikly email",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a;">
        <h1 style="font-size: 22px; font-weight: 700; margin: 0 0 16px;">Confirm your email</h1>
        <p style="font-size: 15px; line-height: 1.55; margin: 0 0 24px; color: #4a4a4a;">
          Click the button below to verify ${targetEmail} and activate full access to your Qwikly dashboard. This link expires in 1 hour.
        </p>
        <a href="${verifyLink}"
           style="display: inline-block; background: #E85A2C; color: #fff; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px;">
          Verify email
        </a>
        <p style="font-size: 13px; line-height: 1.55; margin: 24px 0 0; color: #888;">
          If you didn't request this, you can ignore this email.
        </p>
        <p style="font-size: 13px; line-height: 1.55; margin: 16px 0 0; color: #888;">
          If the button doesn't work, paste this link:<br>
          <span style="word-break: break-all; color: #555;">${verifyLink}</span>
        </p>
      </div>
    `,
  });

  if (sendError) {
    return NextResponse.json({ error: sendError }, { status: 500 });
  }

  return NextResponse.json({ ok: true, sentTo: targetEmail });
}
