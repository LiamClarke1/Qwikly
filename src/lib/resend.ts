import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);
export const FROM = process.env.RESEND_FROM ?? "Qwikly <onboarding@resend.dev>";

export function bookingConfirmationHtml({
  customerName,
  businessName,
  jobType,
  area,
  datetime,
}: {
  customerName: string;
  businessName: string;
  jobType?: string | null;
  area?: string | null;
  datetime?: string | null;
}) {
  const dateStr = datetime
    ? new Date(datetime).toLocaleString("en-ZA", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "To be confirmed";

  const details = [
    jobType ? `<tr><td style="padding:6px 0;color:#9CA3AF;font-size:13px;">Service</td><td style="padding:6px 0;color:#F4F4F5;font-size:13px;text-align:right;">${jobType}</td></tr>` : "",
    area ? `<tr><td style="padding:6px 0;color:#9CA3AF;font-size:13px;">Area</td><td style="padding:6px 0;color:#F4F4F5;font-size:13px;text-align:right;">${area}</td></tr>` : "",
    `<tr><td style="padding:6px 0;color:#9CA3AF;font-size:13px;">Date & time</td><td style="padding:6px 0;color:#F4F4F5;font-size:13px;text-align:right;">${dateStr}</td></tr>`,
  ].join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#07080B;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#07080B;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

        <!-- Logo -->
        <tr><td style="padding-bottom:32px;">
          <span style="font-size:22px;font-weight:700;color:#F4F4F5;letter-spacing:-0.5px;">
            Qwikly<span style="color:#E85A2C;">.</span>
          </span>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:#0D111A;border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:32px;">

          <p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#E85A2C;">Booking confirmed</p>
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#F4F4F5;letter-spacing:-0.3px;">You're booked in, ${customerName}.</h1>
          <p style="margin:0 0 28px;font-size:14px;color:#9CA3AF;line-height:1.6;">${businessName} has confirmed your booking. See the details below.</p>

          <!-- Details table -->
          <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid rgba(255,255,255,0.06);margin-bottom:28px;">
            ${details}
          </table>

          <p style="margin:0;font-size:13px;color:#6B7280;line-height:1.6;">
            Questions? Reply to this email or WhatsApp ${businessName} directly.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding-top:24px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#4B5563;">Powered by <a href="https://qwikly.co.za" style="color:#E85A2C;text-decoration:none;">Qwikly</a></p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function bookingReminderHtml({
  customerName,
  businessName,
  jobType,
  datetime,
}: {
  customerName: string;
  businessName: string;
  jobType?: string | null;
  datetime?: string | null;
}) {
  const dateStr = datetime
    ? new Date(datetime).toLocaleString("en-ZA", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "soon";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#07080B;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#07080B;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

        <tr><td style="padding-bottom:32px;">
          <span style="font-size:22px;font-weight:700;color:#F4F4F5;letter-spacing:-0.5px;">
            Qwikly<span style="color:#E85A2C;">.</span>
          </span>
        </td></tr>

        <tr><td style="background:#0D111A;border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:32px;">
          <p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#E85A2C;">Reminder</p>
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#F4F4F5;letter-spacing:-0.3px;">Your appointment is coming up.</h1>
          <p style="margin:0 0 20px;font-size:14px;color:#9CA3AF;line-height:1.6;">
            Hi ${customerName}, just a reminder that your ${jobType ? `<strong style="color:#F4F4F5;">${jobType}</strong> ` : ""}appointment with <strong style="color:#F4F4F5;">${businessName}</strong> is scheduled for <strong style="color:#F4F4F5;">${dateStr}</strong>.
          </p>
          <p style="margin:0;font-size:13px;color:#6B7280;line-height:1.6;">Need to reschedule? Reply to this email or WhatsApp us directly.</p>
        </td></tr>

        <tr><td style="padding-top:24px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#4B5563;">Powered by <a href="https://qwikly.co.za" style="color:#E85A2C;text-decoration:none;">Qwikly</a></p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
