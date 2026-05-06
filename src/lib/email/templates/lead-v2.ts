export type ConversationMessage = {
  role: "visitor" | "assistant" | string;
  content: string;
};

export type SharedDocument = {
  id: string;
  fileName: string;
  fileType: string;
  fileSizeBytes?: number | null;
  viewUrl: string;
};

export type LeadEmailArgs = {
  businessName: string;
  leadName: string | null;
  contact: string;
  need: string | null;
  preferredTime: string | null;
  visitorEmail: string | null;
  confirmUrl: string;
  suggestUrl: string;
  conversation?: ConversationMessage[] | null;
  documents?: SharedDocument[] | null;
  /** First name of the business owner — used to personalise the auto-filled reply. */
  ownerFirstName?: string | null;
};

export function leadNotificationHtml(args: LeadEmailArgs) {
  const {
    businessName,
    leadName,
    contact,
    need,
    preferredTime,
    visitorEmail,
    confirmUrl,
    suggestUrl,
    conversation,
    documents,
    ownerFirstName,
  } = args;
  // Detect whether the visitor gave us a phone number or an email so the
  // "tap to call / email / WhatsApp" buttons can deep-link appropriately.
  const contactIsEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.trim());
  const phoneDigits = contact.replace(/[^\d]/g, "");
  const phoneE164 = phoneDigits.startsWith("0") && phoneDigits.length === 10
    ? `27${phoneDigits.slice(1)}`
    : phoneDigits;

  const displayName = leadName?.trim() || (contactIsEmail ? contact : "New visitor");

  // Build a context-aware first-reply message. Pre-filled into the WhatsApp /
  // email / SMS deep-links so when you tap the button, the message is already
  // typed in the destination app — just review and hit send.
  const firstName = (leadName?.trim() || "").split(/\s+/)[0] || "there";
  const owner = ownerFirstName?.trim() || "";
  const ownerSignoff = owner ? `\n\n– ${owner}` : "";
  const needFragment = need?.trim() ? ` about ${need.trim()}` : "";
  const followUpMessage =
    `Hi ${firstName}, this is ${owner ? owner + " from " : ""}${businessName}. ` +
    `Thanks for getting in touch via our website${needFragment}. ` +
    `What's the best time to give you a quick call?${ownerSignoff}`;
  const followUpSubject = `${businessName} — re: your enquiry${needFragment}`;

  const enc = (s: string) => encodeURIComponent(s);

  const callHref = !contactIsEmail && phoneDigits.length >= 9
    ? `tel:${contact.replace(/\s+/g, "")}`
    : null;
  const whatsappHref = !contactIsEmail && phoneDigits.length >= 9
    ? `https://wa.me/${phoneE164}?text=${enc(followUpMessage)}`
    : null;
  const smsHref = !contactIsEmail && phoneDigits.length >= 9
    ? `sms:${contact.replace(/\s+/g, "")}?&body=${enc(followUpMessage)}`
    : null;
  const emailTarget = contactIsEmail ? contact.trim() : visitorEmail?.trim();
  const emailHref = emailTarget
    ? `mailto:${emailTarget}?subject=${enc(followUpSubject)}&body=${enc(followUpMessage)}`
    : null;

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
  if (smsHref) {
    quickButtons.push(`
      <td style="padding:0 6px;">
        <a href="${esc(smsHref)}" style="display:block;padding:14px 16px;background:#1F2937;color:#F4F4F5;text-decoration:none;border-radius:12px;font-size:14px;font-weight:700;text-align:center;border:1px solid rgba(255,255,255,0.08);">
          💬 SMS
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

  // ── Conversation summary block (visitor + assistant turns)
  // Shows the last few turns so the business owner has context before replying.
  // Visitor messages are highlighted; assistant replies are dimmed for context.
  const conversationBlock = (() => {
    const turns = Array.isArray(conversation) ? conversation : [];
    if (turns.length === 0) return "";

    // Keep the most recent ~6 messages so the email doesn't get unbounded.
    const recent = turns.slice(-6);

    const bubbles = recent.map((t) => {
      const isVisitor = (t.role || "").toLowerCase().includes("visitor")
        || (t.role || "").toLowerCase() === "user"
        || (t.role || "").toLowerCase() === "customer";
      const text = (t.content || "").trim();
      if (!text) return "";

      if (isVisitor) {
        return `
          <tr><td style="padding:6px 0;">
            <table cellpadding="0" cellspacing="0" role="presentation" style="margin-left:auto;">
              <tr><td style="background:#1A2030;padding:10px 14px;border-radius:14px 14px 4px 14px;max-width:380px;">
                <span style="display:block;font-size:10px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#E85A2C;margin-bottom:3px;">${esc(displayName)}</span>
                <span style="display:block;font-size:13px;color:#F4F4F5;line-height:1.5;white-space:pre-wrap;">${esc(text)}</span>
              </td></tr>
            </table>
          </td></tr>`;
      }
      return `
        <tr><td style="padding:6px 0;">
          <table cellpadding="0" cellspacing="0" role="presentation">
            <tr><td style="background:rgba(255,255,255,0.03);padding:10px 14px;border-radius:14px 14px 14px 4px;max-width:380px;">
              <span style="display:block;font-size:10px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#6B7280;margin-bottom:3px;">Your assistant</span>
              <span style="display:block;font-size:13px;color:#9CA3AF;line-height:1.5;white-space:pre-wrap;">${esc(text)}</span>
            </td></tr>
          </table>
        </td></tr>`;
    }).filter(Boolean).join("");

    if (!bubbles) return "";

    const trimmedNotice = turns.length > recent.length
      ? `<p style="margin:0 0 12px;font-size:11px;color:#6B7280;font-style:italic;">Showing the last ${recent.length} of ${turns.length} messages</p>`
      : "";

    return `
      <p style="margin:24px 0 12px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#9CA3AF;">Conversation</p>
      ${trimmedNotice}
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:24px;">
        ${bubbles}
      </table>`;
  })();

  // ── Documents shared by the visitor (only if any)
  const documentsBlock = (() => {
    const docs = Array.isArray(documents) ? documents : [];
    if (docs.length === 0) return "";

    const fileIcon = (type: string) => {
      const t = (type || "").toLowerCase();
      if (t.includes("pdf")) return "📄";
      if (t.includes("image") || t.includes("png") || t.includes("jpeg") || t.includes("jpg")) return "🖼️";
      if (t.includes("word") || t.includes("document")) return "📝";
      return "📎";
    };
    const sizeLabel = (bytes: number | null | undefined) => {
      if (!bytes || bytes <= 0) return "";
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
      return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    };

    const rows = docs.map((d) => `
      <tr><td style="padding:8px 0;">
        <a href="${esc(d.viewUrl)}" style="display:block;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:12px 14px;text-decoration:none;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr>
            <td style="vertical-align:middle;width:32px;font-size:18px;">${fileIcon(d.fileType)}</td>
            <td style="vertical-align:middle;padding-left:8px;">
              <div style="font-size:13px;font-weight:600;color:#F4F4F5;line-height:1.3;">${esc(d.fileName)}</div>
              <div style="font-size:11px;color:#6B7280;margin-top:2px;">${esc(d.fileType)}${sizeLabel(d.fileSizeBytes ?? null) ? " · " + sizeLabel(d.fileSizeBytes ?? null) : ""}</div>
            </td>
            <td align="right" style="vertical-align:middle;font-size:12px;color:#E85A2C;font-weight:600;white-space:nowrap;">View →</td>
          </tr></table>
        </a>
      </td></tr>`).join("");

    return `
      <p style="margin:24px 0 8px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#9CA3AF;">
        ${docs.length === 1 ? "Document shared" : `${docs.length} documents shared`}
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:24px;">
        ${rows}
      </table>`;
  })();

  // ── Pre-filled reply preview block — shows what's been auto-typed into
  //     the WhatsApp / Email / SMS deep-links, so the user knows what will
  //     appear when they tap.
  const replyPreviewBlock = `
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 20px;">
      <tr><td style="background:rgba(255,255,255,0.025);border:1px dashed rgba(255,255,255,0.1);border-radius:10px;padding:14px 16px;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#9CA3AF;">
          ✨ Pre-typed reply (tap a button above to send)
        </p>
        <p style="margin:0;font-size:13px;color:#D1D5DB;line-height:1.55;font-style:italic;white-space:pre-wrap;">${esc(followUpMessage)}</p>
      </td></tr>
    </table>`;

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

          <!-- Quick action buttons (one-tap reply, with pre-filled message) -->
          ${quickButtons.length > 0 ? `
          <table class="qw-quick" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 -6px 16px;">
            <tr>${quickButtons.join("")}</tr>
          </table>
          ${replyPreviewBlock}` : ""}

          <!-- Detail table -->
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-top:1px solid rgba(255,255,255,0.05);margin-bottom:8px;">
            ${detailRows}
          </table>

          <!-- Conversation summary -->
          ${conversationBlock}

          <!-- Documents shared -->
          ${documentsBlock}

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
export function leadNotificationText(args: LeadEmailArgs) {
  const {
    businessName,
    leadName,
    contact,
    need,
    preferredTime,
    visitorEmail,
    confirmUrl,
    suggestUrl,
    conversation,
    documents,
  } = args;
  const lines: string[] = [
    `New lead — ${businessName}`,
    "",
    `${leadName ?? "A new visitor"} would like to hear back from you.`,
    "",
    `Contact: ${contact}`,
    visitorEmail ? `Email:   ${visitorEmail}` : "",
    need ? `Need:    ${need}` : "",
    preferredTime ? `Time:    ${preferredTime}` : "",
  ];

  const turns = Array.isArray(conversation) ? conversation : [];
  if (turns.length > 0) {
    lines.push("", "Conversation:");
    for (const t of turns.slice(-6)) {
      const who = (t.role || "").toLowerCase().includes("visitor")
        || (t.role || "").toLowerCase() === "user"
        ? leadName || "Visitor"
        : "Assistant";
      const text = (t.content || "").trim();
      if (text) lines.push(`  ${who}: ${text}`);
    }
  }

  const docs = Array.isArray(documents) ? documents : [];
  if (docs.length > 0) {
    lines.push("", "Documents shared:");
    for (const d of docs) lines.push(`  - ${d.fileName} → ${d.viewUrl}`);
  }

  lines.push(
    "",
    "Respond:",
    `  Confirm slot:         ${confirmUrl}`,
    `  Suggest another time: ${suggestUrl}`,
    "",
    "— Captured by your Qwikly assistant",
    "  Manage alerts: https://www.qwikly.co.za/dashboard/settings/profile",
  );
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
