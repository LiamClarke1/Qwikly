export function leadNotificationHtml({
  businessName,
  leadName,
  contact,
  need,
  preferredTime,
  visitorEmail,
  confirmUrl,
  suggestUrl,
}: {
  businessName: string;
  leadName: string | null;
  contact: string;
  need: string | null;
  preferredTime: string | null;
  visitorEmail: string | null;
  confirmUrl: string;
  suggestUrl: string;
}) {
  const rows = [
    leadName
      ? `<tr><td style="padding:6px 0;color:#9CA3AF;font-size:13px;">Name</td><td style="padding:6px 0;color:#F4F4F5;font-size:13px;text-align:right;">${esc(leadName)}</td></tr>`
      : "",
    `<tr><td style="padding:6px 0;color:#9CA3AF;font-size:13px;">Contact</td><td style="padding:6px 0;color:#F4F4F5;font-size:13px;text-align:right;">${esc(contact)}</td></tr>`,
    visitorEmail
      ? `<tr><td style="padding:6px 0;color:#9CA3AF;font-size:13px;">Email</td><td style="padding:6px 0;color:#F4F4F5;font-size:13px;text-align:right;">${esc(visitorEmail)}</td></tr>`
      : "",
    need
      ? `<tr><td style="padding:6px 0;color:#9CA3AF;font-size:13px;">Need</td><td style="padding:6px 0;color:#F4F4F5;font-size:13px;text-align:right;">${esc(need)}</td></tr>`
      : "",
    preferredTime
      ? `<tr><td style="padding:6px 0;color:#9CA3AF;font-size:13px;">Preferred time</td><td style="padding:6px 0;color:#F4F4F5;font-size:13px;text-align:right;">${esc(preferredTime)}</td></tr>`
      : "",
  ]
    .filter(Boolean)
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#07080B;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#07080B;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="padding-bottom:32px;">
          <span style="font-size:22px;font-weight:700;color:#F4F4F5;letter-spacing:-0.5px;">Qwikly<span style="color:#E85A2C;">.</span></span>
        </td></tr>
        <tr><td style="background:#0D111A;border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:32px;">
          <p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#E85A2C;">New lead captured</p>
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#F4F4F5;letter-spacing:-0.3px;">Someone's interested, ${esc(businessName)}.</h1>
          <p style="margin:0 0 28px;font-size:14px;color:#9CA3AF;line-height:1.6;">Your digital assistant captured a new lead. Confirm their preferred time or suggest another.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid rgba(255,255,255,0.06);margin-bottom:28px;">
            ${rows}
          </table>
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-right:12px;">
                <a href="${confirmUrl}" style="display:inline-block;padding:12px 24px;background:#E85A2C;color:#fff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:700;">Confirm this slot</a>
              </td>
              <td>
                <a href="${suggestUrl}" style="display:inline-block;padding:12px 24px;background:#1A2030;color:#9CA3AF;text-decoration:none;border-radius:10px;font-size:14px;font-weight:600;border:1px solid rgba(255,255,255,0.1);">Suggest another time</a>
              </td>
            </tr>
          </table>
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

export function visitorConfirmationHtml({
  visitorName,
  businessName,
  preferredTime,
}: {
  visitorName: string | null;
  businessName: string;
  preferredTime: string | null;
}) {
  const name = visitorName ?? "there";
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#07080B;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#07080B;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="padding-bottom:32px;">
          <span style="font-size:22px;font-weight:700;color:#F4F4F5;letter-spacing:-0.5px;">Qwikly<span style="color:#E85A2C;">.</span></span>
        </td></tr>
        <tr><td style="background:#0D111A;border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:32px;">
          <p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#22C55E;">Confirmed</p>
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#F4F4F5;letter-spacing:-0.3px;">You're booked in, ${esc(name)}.</h1>
          <p style="margin:0 0 28px;font-size:14px;color:#9CA3AF;line-height:1.6;">
            <strong style="color:#F4F4F5;">${esc(businessName)}</strong> has confirmed your booking${preferredTime ? ` for <strong style="color:#F4F4F5;">${esc(preferredTime)}</strong>` : ""}. They'll be in touch to finalise the details.
          </p>
          <p style="margin:0;font-size:13px;color:#6B7280;">Got questions? Just reply to this email.</p>
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

export function capReachedNotificationHtml({ businessName }: { businessName: string }) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#07080B;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#07080B;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="padding-bottom:32px;">
          <span style="font-size:22px;font-weight:700;color:#F4F4F5;letter-spacing:-0.5px;">Qwikly<span style="color:#E85A2C;">.</span></span>
        </td></tr>
        <tr><td style="background:#0D111A;border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:32px;">
          <p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#F59E0B;">Lead cap reached</p>
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#F4F4F5;letter-spacing:-0.3px;">You've hit your 25-lead limit.</h1>
          <p style="margin:0 0 24px;font-size:14px;color:#9CA3AF;line-height:1.6;">
            Your Starter plan captures up to 25 leads per month. You've reached that limit for this billing cycle. Upgrade to Pro to keep capturing leads — up to 200/month.
          </p>
          <a href="https://www.qwikly.co.za/dashboard/billing" style="display:inline-block;padding:12px 24px;background:#E85A2C;color:#fff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:700;">Upgrade to Pro — R599/mo</a>
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

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
