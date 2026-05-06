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
  // Detect whether the visitor gave us a phone number or an email so the
  // "tap to call / email / WhatsApp" buttons can deep-link appropriately.
  const contactIsEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.trim());
  const phoneDigits = contact.replace(/[^\d]/g, "");
  const phoneE164 = phoneDigits.startsWith("0") && phoneDigits.length === 10
    ? `27${phoneDigits.slice(1)}`
    : phoneDigits;

  const callHref = !contactIsEmail && phoneDigits.length >= 9
    ? `tel:${contact.replace(/\s+/g, "")}`
    : null;
  const whatsappHref = !contactIsEmail && phoneDigits.length >= 9
    ? `https://wa.me/${phoneE164}`
    : null;
  const emailHref = contactIsEmail
    ? `mailto:${contact.trim()}`
    : visitorEmail
      ? `mailto:${visitorEmail.trim()}`
      : null;

  const displayName = leadName?.trim() || (contactIsEmail ? contact : "New visitor");

  // Format capture time in SAST so the timestamp is meaningful at a glance
  const capturedAt = new Date().toLocaleString("en-ZA", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Africa/Johannesburg",
  });

  // ── Quick-action buttons (call / WhatsApp / email)
  const quickButtons: string[] = [];
  if (callHref) {
    quickButtons.push(`
      <td style="padding:0 6px;">
        <a href="${esc(callHref)}" style="display:block;padding:14px 16px;background:#E85A2C;color:#fff;text-decoration:none;border-radius:12px;font-size:14px;font-weight:700;text-align:center;">
          📞 Call now
        </a>
      </td>`);
  }
  if (whatsappHref) {
    quickButtons.push(`
      <td style="padding:0 6px;">
        <a href="${esc(whatsappHref)}" style="display:block;padding:14px 16px;background:#25D366;color:#fff;text-decoration:none;border-radius:12px;font-size:14px;font-weight:700;text-align:center;">
          💬 WhatsApp
        </a>
      </td>`);
  }
  if (emailHref) {
    quickButtons.push(`
      <td style="padding:0 6px;">
        <a href="${esc(emailHref)}" style="display:block;padding:14px 16px;background:#1F2937;color:#F4F4F5;text-decoration:none;border-radius:12px;font-size:14px;font-weight:700;text-align:center;border:1px solid rgba(255,255,255,0.08);">
          ✉️ Email
        </a>
      </td>`);
  }

  // ── Detail rows (only render rows that have content)
  const detailRow = (label: string, value: string | null | undefined) =>
    value && value.trim()
      ? `<tr>
          <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);color:#9CA3AF;font-size:13px;width:35%;vertical-align:top;">${esc(label)}</td>
          <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);color:#F4F4F5;font-size:13px;line-height:1.5;text-align:right;">${esc(value)}</td>
        </tr>`
      : "";

  const detailRows = [
    detailRow("Name", leadName),
    detailRow("Contact", contact),
    !contactIsEmail ? detailRow("Email", visitorEmail) : "",
    detailRow("Preferred time", preferredTime),
    detailRow("Captured", capturedAt + " (SAST)"),
  ]
    .filter(Boolean)
    .join("");

  // ── "What they need" hero quote (only if present)
  const needBlock = need?.trim()
    ? `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
        <tr><td style="background:rgba(232,90,44,0.08);border-left:3px solid #E85A2C;border-radius:8px;padding:16px 18px;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#E85A2C;">What they need</p>
          <p style="margin:0;font-size:15px;color:#F4F4F5;line-height:1.55;">${esc(need)}</p>
        </td></tr>
      </table>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="dark light">
  <meta name="supported-color-schemes" content="dark light">
  <title>New lead — ${esc(businessName)}</title>
  <!--[if mso]>
  <style>td,a,h1,h2,p { font-family: Arial, sans-serif !important; }</style>
  <![endif]-->
  <style>
    @media (max-width:520px) {
      .qw-card { padding:24px 20px !important; }
      .qw-quick td { display:block !important; width:100% !important; padding:6px 0 !important; }
      .qw-h1 { font-size:24px !important; }
      .qw-actions td { display:block !important; width:100% !important; padding:6px 0 !important; }
      .qw-actions a { width:100% !important; box-sizing:border-box !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#07080B;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-font-smoothing:antialiased;">

  <!-- Hidden preheader (preview text in inbox lists) -->
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#07080B;opacity:0;">
    ${esc(displayName)} is asking about ${esc(need || "your service")}. Tap to call, WhatsApp or email back now.
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#07080B;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;">

        <!-- Logo + freshness pill -->
        <tr><td style="padding-bottom:24px;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td align="left" style="vertical-align:middle;">
                <span style="font-size:22px;font-weight:700;color:#F4F4F5;letter-spacing:-0.5px;">Qwikly<span style="color:#E85A2C;">.</span></span>
              </td>
              <td align="right" style="vertical-align:middle;">
                <span style="display:inline-block;padding:5px 11px;background:rgba(34,197,94,0.12);border:1px solid rgba(34,197,94,0.25);border-radius:999px;color:#4ADE80;font-size:11px;font-weight:600;letter-spacing:0.04em;">● JUST NOW</span>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Card -->
        <tr><td class="qw-card" style="background:#0D111A;border:1px solid rgba(255,255,255,0.07);border-radius:20px;padding:36px;">

          <!-- Hero -->
          <p style="margin:0 0 6px;font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#E85A2C;">New lead • ${esc(businessName)}</p>
          <h1 class="qw-h1" style="margin:0 0 8px;font-size:28px;font-weight:700;color:#F4F4F5;letter-spacing:-0.5px;line-height:1.2;">
            ${esc(displayName)}
          </h1>
          <p style="margin:0 0 24px;font-size:14px;color:#9CA3AF;line-height:1.55;">
            wants to hear from you. Reply fast — leads contacted within 5 minutes are <strong style="color:#F4F4F5;">21× more likely to convert</strong>.
          </p>

          ${needBlock}

          <!-- Quick action buttons (one-tap reply) -->
          ${quickButtons.length > 0 ? `
          <table class="qw-quick" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 -6px 28px;">
            <tr>${quickButtons.join("")}</tr>
          </table>` : ""}

          <!-- Detail table -->
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-top:1px solid rgba(255,255,255,0.05);margin-bottom:28px;">
            ${detailRows}
          </table>

          <!-- Booking actions -->
          <p style="margin:0 0 12px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#9CA3AF;">Booking response</p>
          <table class="qw-actions" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td style="padding-right:10px;">
                <a href="${esc(confirmUrl)}" style="display:inline-block;padding:13px 22px;background:#F4F4F5;color:#07080B;text-decoration:none;border-radius:10px;font-size:14px;font-weight:700;">
                  ✓ Confirm slot
                </a>
              </td>
              <td>
                <a href="${esc(suggestUrl)}" style="display:inline-block;padding:13px 22px;background:transparent;color:#9CA3AF;text-decoration:none;border-radius:10px;font-size:14px;font-weight:600;border:1px solid rgba(255,255,255,0.12);">
                  Suggest another time
                </a>
              </td>
            </tr>
          </table>

        </td></tr>

        <!-- Reply-to tip -->
        <tr><td style="padding-top:16px;">
          <p style="margin:0;font-size:12px;color:#6B7280;line-height:1.55;text-align:center;">
            💡 <strong style="color:#9CA3AF;">Pro tip:</strong> Just hit Reply ${visitorEmail || contactIsEmail ? "and your message will go straight to them." : "to add notes for yourself."}
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding-top:20px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#4B5563;">
            Captured by your <a href="https://www.qwikly.co.za/dashboard" style="color:#9CA3AF;text-decoration:none;">Qwikly</a> assistant
            <span style="color:#374151;"> · </span>
            <a href="https://www.qwikly.co.za/dashboard/settings/profile" style="color:#6B7280;text-decoration:underline;">Manage alerts</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// Plain-text alternative for spam-filter friendliness and accessibility.
// Sent alongside the HTML version so receivers without HTML support still
// get a usable, structured message.
export function leadNotificationText({
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
  const lines = [
    `New lead — ${businessName}`,
    "",
    `${leadName ?? "A new visitor"} would like to hear back from you.`,
    "",
    `Contact: ${contact}`,
    visitorEmail ? `Email:   ${visitorEmail}` : "",
    need ? `Need:    ${need}` : "",
    preferredTime ? `Time:    ${preferredTime}` : "",
    "",
    "Respond:",
    `  Confirm slot:        ${confirmUrl}`,
    `  Suggest another time: ${suggestUrl}`,
    "",
    "— Captured by your Qwikly assistant",
    "  Manage alerts: https://www.qwikly.co.za/dashboard/settings/profile",
  ];
  return lines.filter((l) => l !== null && l !== undefined).join("\n");
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
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#F4F4F5;letter-spacing:-0.3px;">You've hit your 25-lead limit, ${esc(businessName)}.</h1>
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
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
