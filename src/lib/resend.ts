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

export function setupCallSlotPickerHtml({
  visitorName,
  slots,
  baseUrl,
  rescheduleToken,
}: {
  visitorName: string;
  slots: { token: string; label: string }[];
  baseUrl: string;
  rescheduleToken?: string;
}) {
  const slotButtons = slots
    .map(
      (s) => `
    <table cellpadding="0" cellspacing="0" style="margin:0 0 10px;width:100%;">
      <tr><td style="background:#0D111A;border:1px solid rgba(255,255,255,0.10);border-radius:10px;">
        <a href="${baseUrl}/book/${s.token}" style="display:block;padding:14px 18px;font-size:14px;font-weight:600;color:#F4F4F5;text-decoration:none;letter-spacing:-.005em;">${s.label} &nbsp;→</a>
      </td></tr>
    </table>`
    )
    .join("");

  const rescheduleCta = rescheduleToken
    ? `<table cellpadding="0" cellspacing="0" style="margin:18px 0 0;width:100%;"><tr><td style="border:1px dashed rgba(232,90,44,0.45);border-radius:10px;background:rgba(232,90,44,0.05);">
         <a href="${baseUrl}/reschedule/${rescheduleToken}" style="display:block;padding:14px 18px;font-size:13px;font-weight:600;color:#E85A2C;text-decoration:none;letter-spacing:-.005em;text-align:center;">None of these work? Tell us when does &nbsp;→</a>
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

          <p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#E85A2C;">Pick your slot</p>
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#F4F4F5;letter-spacing:-0.3px;">Hey ${visitorName}, let's book it.</h1>
          <p style="margin:0 0 24px;font-size:14px;color:#9CA3AF;line-height:1.6;">
            Pick a 15-minute window that works for you. Click a slot, confirm, and the Google Meet invite lands in your inbox right after.
          </p>

          ${slotButtons}

          ${rescheduleCta}

          <p style="margin:18px 0 0;font-size:12px;color:#6B7280;line-height:1.55;">
            Slots hold for 48 hours. Reply to this email if you'd rather chat over text.
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

// ─── Host-side templates (sent to the Clarke Agency inbox, not customers) ───

function escHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function contactFormHostNotificationHtml({
  name,
  email,
  phone,
  subject,
  message,
}: {
  name: string;
  email: string;
  phone?: string | null;
  subject: string;
  message: string;
}) {
  const submittedAt = new Date().toLocaleString("en-ZA", {
    timeZone: "Africa/Johannesburg",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#07080B;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#07080B;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="padding-bottom:32px;"><span style="font-size:22px;font-weight:700;color:#F4F4F5;letter-spacing:-0.5px;">Qwikly<span style="color:#E85A2C;">.</span></span></td></tr>
        <tr><td style="background:#0D111A;border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:32px;">
          <p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#E85A2C;">New contact</p>
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#F4F4F5;letter-spacing:-0.3px;">${escHtml(subject)}</h1>
          <p style="margin:0 0 24px;font-size:13px;color:#9CA3AF;line-height:1.6;">Submitted ${submittedAt} SAST</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid rgba(255,255,255,0.06);margin-bottom:18px;">
            <tr><td style="padding:12px 0 6px;color:#9CA3AF;font-size:13px;">From</td><td style="padding:12px 0 6px;color:#F4F4F5;font-size:13px;text-align:right;font-weight:600;">${escHtml(name)}</td></tr>
            <tr><td style="padding:6px 0;color:#9CA3AF;font-size:13px;">Email</td><td style="padding:6px 0;color:#F4F4F5;font-size:13px;text-align:right;font-weight:600;"><a href="mailto:${escHtml(email)}" style="color:#F4F4F5;text-decoration:none;">${escHtml(email)}</a></td></tr>
            ${phone ? `<tr><td style="padding:6px 0 12px;color:#9CA3AF;font-size:13px;">Phone</td><td style="padding:6px 0 12px;color:#F4F4F5;font-size:13px;text-align:right;font-weight:600;">${escHtml(phone)}</td></tr>` : ""}
          </table>
          <p style="margin:0 0 6px;font-size:13px;color:#F4F4F5;font-weight:600;">Message</p>
          <p style="margin:0 0 24px;font-size:13px;color:#9CA3AF;line-height:1.65;white-space:pre-wrap;">${escHtml(message)}</p>
          <table cellpadding="0" cellspacing="0" style="margin:0;"><tr><td style="background:#E85A2C;border-radius:10px;">
            <a href="mailto:${escHtml(email)}?subject=${encodeURIComponent("Re: " + subject)}" style="display:inline-block;padding:13px 22px;font-size:14px;font-weight:700;color:#fff;text-decoration:none;letter-spacing:-.005em;">Reply to ${escHtml(name.split(" ")[0])}</a>
          </td></tr></table>
        </td></tr>
        <tr><td style="padding-top:24px;text-align:center;"><p style="margin:0;font-size:11px;color:#4B5563;">Sent by <a href="https://qwikly.co.za" style="color:#E85A2C;text-decoration:none;">Qwikly</a></p></td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function contactFormVisitorAckHtml({
  visitorName,
  subject,
  message,
}: {
  visitorName: string;
  subject: string;
  message: string;
}) {
  const first = visitorName.split(" ")[0] || visitorName;
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#07080B;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#07080B;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="padding-bottom:32px;"><span style="font-size:22px;font-weight:700;color:#F4F4F5;letter-spacing:-0.5px;">Qwikly<span style="color:#E85A2C;">.</span></span></td></tr>
        <tr><td style="background:#0D111A;border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:32px;">
          <p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#E85A2C;">Got your message, ${escHtml(first)}</p>
          <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#F4F4F5;letter-spacing:-0.3px;">Thanks for reaching out.</h1>
          <p style="margin:0 0 20px;font-size:14px;color:#9CA3AF;line-height:1.65;">
            We&rsquo;ve got your message and one of the team will get back to you within one business day. Here&rsquo;s a copy for your records.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid rgba(255,255,255,0.06);margin-bottom:18px;">
            <tr><td style="padding:12px 0 6px;color:#9CA3AF;font-size:13px;">Subject</td><td style="padding:12px 0 6px;color:#F4F4F5;font-size:13px;text-align:right;font-weight:600;">${escHtml(subject)}</td></tr>
          </table>
          <p style="margin:0 0 6px;font-size:13px;color:#F4F4F5;font-weight:600;">Your message</p>
          <p style="margin:0 0 24px;font-size:13px;color:#9CA3AF;line-height:1.65;white-space:pre-wrap;">${escHtml(message)}</p>
          <p style="margin:0;font-size:13px;color:#6B7280;line-height:1.6;">
            If you don&rsquo;t hear from us within one business day, reply to this email or check your junk folder in case our reply got filtered.
          </p>
        </td></tr>
        <tr><td style="padding-top:24px;text-align:center;"><p style="margin:0;font-size:11px;color:#4B5563;">Sent by <a href="https://qwikly.co.za" style="color:#E85A2C;text-decoration:none;">Qwikly</a></p></td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function rescheduleHostNotificationHtml({
  name,
  email,
  phone,
  preferredTimes,
  originalSlots,
}: {
  name: string;
  email: string;
  phone?: string | null;
  preferredTimes: string;
  originalSlots: string[];
}) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#07080B;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#07080B;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="padding-bottom:32px;"><span style="font-size:22px;font-weight:700;color:#F4F4F5;letter-spacing:-0.5px;">Qwikly<span style="color:#E85A2C;">.</span></span></td></tr>
        <tr><td style="background:#0D111A;border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:32px;">
          <p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#E85A2C;">Reschedule request</p>
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#F4F4F5;letter-spacing:-0.3px;">${escHtml(name)} needs different times</h1>
          <p style="margin:0 0 24px;font-size:14px;color:#9CA3AF;line-height:1.6;">The 3 slots you offered didn't work. Send fresh ones.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid rgba(255,255,255,0.06);margin-bottom:18px;">
            <tr><td style="padding:12px 0 6px;color:#9CA3AF;font-size:13px;">Email</td><td style="padding:12px 0 6px;color:#F4F4F5;font-size:13px;text-align:right;font-weight:600;"><a href="mailto:${escHtml(email)}" style="color:#F4F4F5;text-decoration:none;">${escHtml(email)}</a></td></tr>
            ${phone ? `<tr><td style="padding:6px 0;color:#9CA3AF;font-size:13px;">Phone</td><td style="padding:6px 0;color:#F4F4F5;font-size:13px;text-align:right;font-weight:600;">${escHtml(phone)}</td></tr>` : ""}
          </table>
          <p style="margin:0 0 6px;font-size:13px;color:#F4F4F5;font-weight:600;">When does work for them</p>
          <p style="margin:0 0 18px;font-size:13px;color:#9CA3AF;line-height:1.65;white-space:pre-wrap;">${escHtml(preferredTimes)}</p>
          <p style="margin:0 0 6px;font-size:13px;color:#F4F4F5;font-weight:600;">Slots offered (declined)</p>
          <p style="margin:0 0 24px;font-size:12px;color:#6B7280;line-height:1.55;">${originalSlots.map(escHtml).join(" · ")}</p>
          <table cellpadding="0" cellspacing="0" style="margin:0;"><tr><td style="background:#E85A2C;border-radius:10px;">
            <a href="mailto:${escHtml(email)}?subject=${encodeURIComponent("New times for your Qwikly setup call")}" style="display:inline-block;padding:13px 22px;font-size:14px;font-weight:700;color:#fff;text-decoration:none;letter-spacing:-.005em;">Email ${escHtml(name.split(" ")[0])} new slots</a>
          </td></tr></table>
        </td></tr>
        <tr><td style="padding-top:24px;text-align:center;"><p style="margin:0;font-size:11px;color:#4B5563;">Sent by <a href="https://qwikly.co.za" style="color:#E85A2C;text-decoration:none;">Qwikly</a></p></td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function newSignupAdminNotificationHtml({
  email,
  businessName,
  plan,
  signupTime,
}: {
  email: string;
  businessName?: string | null;
  plan: string;
  signupTime: string;
}) {
  const safeBiz = businessName?.trim() ? escHtml(businessName) : "<em style=\"color:#6B7280;font-style:italic;\">not provided</em>";
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#07080B;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#07080B;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="padding-bottom:32px;"><span style="font-size:22px;font-weight:700;color:#F4F4F5;letter-spacing:-0.5px;">Qwikly<span style="color:#E85A2C;">.</span></span></td></tr>
        <tr><td style="background:#0D111A;border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:32px;">
          <p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#E85A2C;">New signup</p>
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#F4F4F5;letter-spacing:-0.3px;">A new client just signed up.</h1>
          <p style="margin:0 0 24px;font-size:14px;color:#9CA3AF;line-height:1.6;">${signupTime} SAST</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid rgba(255,255,255,0.06);margin-bottom:18px;">
            <tr><td style="padding:12px 0 6px;color:#9CA3AF;font-size:13px;">Email</td><td style="padding:12px 0 6px;color:#F4F4F5;font-size:13px;text-align:right;font-weight:600;"><a href="mailto:${escHtml(email)}" style="color:#F4F4F5;text-decoration:none;">${escHtml(email)}</a></td></tr>
            <tr><td style="padding:6px 0;color:#9CA3AF;font-size:13px;">Business</td><td style="padding:6px 0;color:#F4F4F5;font-size:13px;text-align:right;font-weight:600;">${safeBiz}</td></tr>
            <tr><td style="padding:6px 0 12px;color:#9CA3AF;font-size:13px;">Plan</td><td style="padding:6px 0 12px;color:#F4F4F5;font-size:13px;text-align:right;font-weight:600;text-transform:capitalize;">${escHtml(plan)}</td></tr>
          </table>
          <p style="margin:0 0 16px;font-size:13px;color:#9CA3AF;line-height:1.6;">They've landed in the dashboard and started the 7-step setup wizard. Lead notifications will route to this email by default.</p>
          <table cellpadding="0" cellspacing="0" style="margin:0;"><tr><td style="background:#E85A2C;border-radius:10px;">
            <a href="https://www.qwikly.co.za/dashboard/admin/clients" style="display:inline-block;padding:13px 22px;font-size:14px;font-weight:700;color:#fff;text-decoration:none;letter-spacing:-.005em;">View in admin →</a>
          </td></tr></table>
        </td></tr>
        <tr><td style="padding-top:24px;text-align:center;"><p style="margin:0;font-size:11px;color:#4B5563;">Sent by Qwikly</p></td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function rescheduleAcknowledgmentHtml({
  visitorName,
}: {
  visitorName: string;
}) {
  const first = visitorName.split(" ")[0] || visitorName;
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#07080B;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#07080B;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="padding-bottom:32px;"><span style="font-size:22px;font-weight:700;color:#F4F4F5;letter-spacing:-0.5px;">Qwikly<span style="color:#E85A2C;">.</span></span></td></tr>
        <tr><td style="background:#0D111A;border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:32px;">
          <p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#E85A2C;">Got it, ${escHtml(first)}</p>
          <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#F4F4F5;letter-spacing:-0.3px;">We'll come back with fresh times.</h1>
          <p style="margin:0 0 16px;font-size:14px;color:#9CA3AF;line-height:1.65;">
            Thanks for letting us know. The Qwikly team has the times you suggested and will reach out within one business day with a slot that works for both of us.
          </p>
          <p style="margin:0;font-size:13px;color:#6B7280;line-height:1.6;">
            If anything urgent comes up before then, just reply to this email.
          </p>
        </td></tr>
        <tr><td style="padding-top:24px;text-align:center;"><p style="margin:0;font-size:11px;color:#4B5563;">Sent by <a href="https://qwikly.co.za" style="color:#E85A2C;text-decoration:none;">Qwikly</a></p></td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
