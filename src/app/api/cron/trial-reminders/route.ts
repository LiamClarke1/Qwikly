import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.qwikly.co.za";

function trialReminderHtml({
  businessName,
  daysLeft,
  billingUrl,
}: {
  businessName: string;
  daysLeft: number;
  billingUrl: string;
}) {
  const isExpired = daysLeft <= 0;
  const isUrgent = daysLeft <= 2;

  const accentColor = isExpired ? "#B45309" : isUrgent ? "#D97706" : "#E85A2C";

  const eyebrow = isExpired
    ? "Your trial has ended"
    : isUrgent
    ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left in your trial`
    : `${daysLeft} days left in your trial`;

  const headline = isExpired
    ? "Your digital assistant is paused."
    : isUrgent
    ? "Add a plan to keep your assistant running."
    : "Your free trial is almost up.";

  const body = isExpired
    ? `Your 14-day free trial has ended and your Qwikly digital assistant has been paused on your website. Visitors can no longer reach it. <strong style="color:#1C1A18;">Your data, leads, and settings are all safe</strong> and ready to reactivate the moment you pick a plan.`
    : isUrgent
    ? `You have <strong style="color:#1C1A18;">${daysLeft} day${daysLeft === 1 ? "" : "s"} left</strong> in your free trial. After that, your Qwikly digital assistant will be paused and visitors won't be able to reach it on your website. Pick a plan now to keep everything running without interruption.`
    : `You have <strong style="color:#1C1A18;">${daysLeft} days left</strong> in your Qwikly free trial. Your digital assistant is live and capturing leads on your website. To keep it running after your trial, pick a plan — Pro starts at R999/month with no per-lead fees.`;

  const ctaLabel = isExpired ? "Reactivate my assistant" : "Pick a plan";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F2EE;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F2EE;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

        <!-- Logo -->
        <tr><td style="padding-bottom:28px;">
          <span style="font-size:22px;font-weight:700;color:#1C1A18;letter-spacing:-0.5px;">
            Qwikly<span style="color:${accentColor};">.</span>
          </span>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:#FFFFFF;border:1px solid rgba(28,26,24,0.10);border-radius:16px;padding:32px;">

          <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:0.10em;text-transform:uppercase;color:${accentColor};">${eyebrow}</p>
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#1C1A18;letter-spacing:-0.3px;line-height:1.3;">${headline}</h1>
          <p style="margin:0 0 28px;font-size:14px;color:#6B6560;line-height:1.7;">${body}</p>

          <!-- CTA -->
          <a href="${billingUrl}" style="display:inline-block;background:${accentColor};color:#FFFFFF;font-size:14px;font-weight:700;text-decoration:none;padding:13px 28px;border-radius:12px;">${ctaLabel} →</a>

          ${isExpired ? `
          <p style="margin:24px 0 0;font-size:12px;color:#9C9690;line-height:1.6;">
            Your data is safe and will never be deleted. Upgrading reactivates your assistant immediately — no setup needed.
          </p>` : `
          <p style="margin:24px 0 0;font-size:12px;color:#9C9690;line-height:1.6;">
            Pro from R999/month · No per-lead fees · Cancel anytime
          </p>`}

        </td></tr>

        <!-- Footer -->
        <tr><td style="padding-top:24px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#9C9690;">
            You're receiving this because you signed up for a Qwikly trial.<br>
            <a href="${SITE}" style="color:#E85A2C;text-decoration:none;">qwikly.co.za</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin();
  const now = new Date();

  // Find all active trial subscriptions
  const { data: subs } = await db
    .from("subscriptions")
    .select("user_id, trial_ends_at")
    .eq("plan", "trial")
    .not("trial_ends_at", "is", null);

  if (!subs?.length) return NextResponse.json({ sent: 0 });

  let sent = 0;
  let skipped = 0;

  for (const sub of subs) {
    const trialEndsAt = new Date(sub.trial_ends_at!);
    const msLeft = trialEndsAt.getTime() - now.getTime();
    const daysLeft = Math.round(msLeft / (1000 * 60 * 60 * 24));

    // Only process at reminder milestones: 5, 2, 1 days remaining, or just expired (0 or -1)
    const isReminderDay = [5, 2, 1, 0, -1].includes(daysLeft);
    if (!isReminderDay) {
      skipped++;
      continue;
    }

    // Fetch client info for this user
    const { data: client } = await db
      .from("clients")
      .select("business_name, client_email, notification_email, billing_email")
      .eq("auth_user_id", sub.user_id)
      .maybeSingle();

    if (!client) { skipped++; continue; }

    const toEmail = client.billing_email || client.notification_email || client.client_email;
    if (!toEmail) { skipped++; continue; }

    const businessName = client.business_name ?? "your business";
    const billingUrl = `${SITE}/dashboard/settings/billing`;

    const subjectMap: Record<number, string> = {
      5:  `5 days left in your Qwikly trial`,
      2:  `2 days left — your assistant pauses soon`,
      1:  `Last day of your Qwikly trial`,
      0:  `Your Qwikly digital assistant has been paused`,
      [-1]: `Your Qwikly digital assistant has been paused`,
    };

    const subject = subjectMap[daysLeft] ?? `Your Qwikly trial is ending`;

    try {
      await sendEmail({
        to: toEmail,
        subject,
        html: trialReminderHtml({ businessName, daysLeft: Math.max(daysLeft, 0), billingUrl }),
        tags: [{ name: "type", value: "trial_reminder" }],
      });
      sent++;
    } catch (err) {
      console.error("[trial-reminders] send failed", { userId: sub.user_id, daysLeft, err });
    }
  }

  return NextResponse.json({ sent, skipped });
}
