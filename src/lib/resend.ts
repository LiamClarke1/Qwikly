import { Resend } from "resend";

export const FROM = process.env.RESEND_FROM ?? "Qwikly <onboarding@resend.dev>";

let _resend: Resend | null = null;
export function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}
export const resend = new Proxy({} as Resend, {
  get(_t, prop) {
    return getResend()[prop as keyof Resend];
  },
});

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

export function qwiklyMeetingConfirmationHtml({
  visitorName,
  startIso,
  endIso,
  meetLink,
}: {
  visitorName: string;
  startIso: string;
  endIso: string;
  meetLink: string | null;
}) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const dateStr = start.toLocaleString("en-ZA", {
    timeZone: "Africa/Johannesburg",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeStr = `${start.toLocaleString("en-ZA", {
    timeZone: "Africa/Johannesburg",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })}–${end.toLocaleString("en-ZA", {
    timeZone: "Africa/Johannesburg",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })} SAST`;
  const durationMin = Math.round((end.getTime() - start.getTime()) / 60_000);

  const meetButton = meetLink
    ? `<table cellpadding="0" cellspacing="0" style="margin:24px 0 4px;"><tr><td style="background:#E85A2C;border-radius:10px;">
         <a href="${meetLink}" style="display:inline-block;padding:13px 22px;font-size:14px;font-weight:700;color:#fff;text-decoration:none;letter-spacing:-.005em;">Join Google Meet</a>
       </td></tr></table>
       <p style="margin:0 0 24px;font-size:12px;color:#6B7280;word-break:break-all;">${meetLink}</p>`
    : `<p style="margin:24px 0;font-size:13px;color:#9CA3AF;">A Google Meet link will arrive shortly in your calendar invite.</p>`;

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

          <p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#E85A2C;">Call confirmed</p>
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#F4F4F5;letter-spacing:-0.3px;">You're booked in, ${visitorName}.</h1>
          <p style="margin:0 0 24px;font-size:14px;color:#9CA3AF;line-height:1.6;">
            The Clarke Agency team will jump on a ${durationMin}-minute call with you to walk through how Qwikly fits your business and get the chat live on your site by the end of the call. The calendar invite is on its way.
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid rgba(255,255,255,0.06);margin-bottom:8px;">
            <tr><td style="padding:12px 0 6px;color:#9CA3AF;font-size:13px;">Date</td><td style="padding:12px 0 6px;color:#F4F4F5;font-size:13px;text-align:right;font-weight:600;">${dateStr}</td></tr>
            <tr><td style="padding:6px 0;color:#9CA3AF;font-size:13px;">Time</td><td style="padding:6px 0;color:#F4F4F5;font-size:13px;text-align:right;font-weight:600;">${timeStr}</td></tr>
            <tr><td style="padding:6px 0 12px;color:#9CA3AF;font-size:13px;">Format</td><td style="padding:6px 0 12px;color:#F4F4F5;font-size:13px;text-align:right;font-weight:600;">Google Meet (${durationMin} min)</td></tr>
          </table>

          ${meetButton}

          <p style="margin:0 0 6px;font-size:13px;color:#F4F4F5;font-weight:600;">What to have ready</p>
          <p style="margin:0 0 8px;font-size:13px;color:#9CA3AF;line-height:1.6;">
            So we can get you fully live on the call, please have these on hand:
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;">
            <tr><td style="padding:6px 0 6px 14px;color:#9CA3AF;font-size:13px;line-height:1.55;border-left:2px solid #E85A2C;">Login to your website (so we can drop the chat snippet straight in).</td></tr>
            <tr><td style="padding:6px 0 6px 14px;color:#9CA3AF;font-size:13px;line-height:1.55;border-left:2px solid #E85A2C;">A quick rundown of your services, pricing, and business hours.</td></tr>
            <tr><td style="padding:6px 0 6px 14px;color:#9CA3AF;font-size:13px;line-height:1.55;border-left:2px solid #E85A2C;">Your logo and brand colours (PNG/SVG and hex codes).</td></tr>
            <tr><td style="padding:6px 0 6px 14px;color:#9CA3AF;font-size:13px;line-height:1.55;border-left:2px solid #E85A2C;">The email or WhatsApp number where you want new leads to land.</td></tr>
          </table>
          <p style="margin:0 0 18px;font-size:12px;color:#6B7280;line-height:1.55;">
            Don't stress if anything's missing, we'll work around it. The goal is to leave the call with Qwikly running on your site and your first leads already coming in.
          </p>

          <p style="margin:0 0 6px;font-size:13px;color:#F4F4F5;font-weight:600;">What to expect on the call</p>
          <p style="margin:0 0 16px;font-size:13px;color:#9CA3AF;line-height:1.6;">
            No slides, no pitch deck. We'll ask about your business, show you Qwikly running on a site like yours, install it on your site, and walk you through how leads will land.
          </p>

          <p style="margin:0;font-size:13px;color:#6B7280;line-height:1.6;">
            Need to reschedule? Reply to the calendar invite or to this email.
          </p>
        </td></tr>

        <tr><td style="padding-top:24px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#4B5563;">Sent by <a href="https://qwikly.co.za" style="color:#E85A2C;text-decoration:none;">Qwikly</a></p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function qwiklyBookingNotificationHtml({
  visitorName,
  visitorEmail,
  visitorPhone,
  businessType,
  startIso,
  endIso,
  meetLink,
  notes,
  conversationUrl,
}: {
  visitorName: string;
  visitorEmail: string;
  visitorPhone?: string | null;
  businessType?: string | null;
  startIso: string;
  endIso: string;
  meetLink: string | null;
  notes?: string | null;
  conversationUrl?: string | null;
}) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const dateStr = start.toLocaleString("en-ZA", {
    timeZone: "Africa/Johannesburg",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeStr = `${start.toLocaleString("en-ZA", {
    timeZone: "Africa/Johannesburg",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })}–${end.toLocaleString("en-ZA", {
    timeZone: "Africa/Johannesburg",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })} SAST`;

  const row = (label: string, value: string) =>
    `<tr><td style="padding:6px 0;color:#9CA3AF;font-size:13px;">${label}</td><td style="padding:6px 0;color:#F4F4F5;font-size:13px;text-align:right;font-weight:600;word-break:break-word;">${value}</td></tr>`;

  const detailRows = [
    row("Date", dateStr),
    row("Time", timeStr),
    row("Visitor", visitorName),
    row("Email", `<a href="mailto:${visitorEmail}" style="color:#F4F4F5;text-decoration:none;">${visitorEmail}</a>`),
    visitorPhone ? row("Phone", `<a href="tel:${visitorPhone}" style="color:#F4F4F5;text-decoration:none;">${visitorPhone}</a>`) : "",
    businessType ? row("Business", businessType) : "",
    notes ? row("Notes", notes) : "",
  ].filter(Boolean).join("");

  const meetButton = meetLink
    ? `<table cellpadding="0" cellspacing="0" style="margin:24px 0 4px;"><tr><td style="background:#E85A2C;border-radius:10px;">
         <a href="${meetLink}" style="display:inline-block;padding:13px 22px;font-size:14px;font-weight:700;color:#fff;text-decoration:none;letter-spacing:-.005em;">Join Google Meet</a>
       </td></tr></table>`
    : "";

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

          <p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#E85A2C;">New booking</p>
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#F4F4F5;letter-spacing:-0.3px;">${visitorName} just booked an intro call.</h1>
          <p style="margin:0 0 24px;font-size:14px;color:#9CA3AF;line-height:1.6;">
            Booked through the chat on qwikly.co.za. Calendar invite has been sent to the visitor and the event is on your Google Calendar.
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid rgba(255,255,255,0.06);margin-bottom:8px;">
            ${detailRows}
          </table>

          ${meetButton}

          ${conversationUrl ? `<p style="margin:16px 0 0;font-size:13px;color:#9CA3AF;line-height:1.6;">
            <a href="${conversationUrl}" style="color:#E85A2C;text-decoration:none;font-weight:600;">View the chat transcript →</a>
          </p>` : ""}
        </td></tr>

        <tr><td style="padding-top:24px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#4B5563;">Sent by <a href="https://qwikly.co.za" style="color:#E85A2C;text-decoration:none;">Qwikly</a></p>
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
