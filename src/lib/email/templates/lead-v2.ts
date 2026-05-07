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
  /** Visitor said the job is urgent (today/ASAP). Renders a red URGENT banner. */
  isUrgent?: boolean | null;
  /** Visitor said the job will likely span multiple days. Surfaces in the summary. */
  expectedDays?: number | null;
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
    isUrgent,
    expectedDays,
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

  // ── Quick-action buttons (call / WhatsApp / SMS / email) — small text-link
  //     style, sits below the body like a normal email signature would.
  const quickButtons: string[] = [];
  if (callHref) {
    quickButtons.push(`<a href="${esc(callHref)}" style="display:inline-block;margin:0 8px 8px 0;padding:9px 16px;background:#111827;color:#FFFFFF;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;">Call</a>`);
  }
  if (whatsappHref) {
    quickButtons.push(`<a href="${esc(whatsappHref)}" style="display:inline-block;margin:0 8px 8px 0;padding:9px 16px;background:#25D366;color:#FFFFFF;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;">WhatsApp</a>`);
  }
  if (smsHref) {
    quickButtons.push(`<a href="${esc(smsHref)}" style="display:inline-block;margin:0 8px 8px 0;padding:9px 16px;background:#FFFFFF;color:#111827;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;border:1px solid #E5E7EB;">Text</a>`);
  }
  if (emailHref) {
    quickButtons.push(`<a href="${esc(emailHref)}" style="display:inline-block;margin:0 8px 8px 0;padding:9px 16px;background:#FFFFFF;color:#111827;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;border:1px solid #E5E7EB;">Email back</a>`);
  }

  // ── Documents shared — Gmail-style "attachment chips" pinned to the very top
  const docsTopBlock = (() => {
    const docs = Array.isArray(documents) ? documents : [];
    if (docs.length === 0) return "";

    const fileIcon = (type: string) => {
      const t = (type || "").toLowerCase();
      if (t.includes("pdf")) return "PDF";
      if (t.includes("image") || t.includes("png") || t.includes("jpeg") || t.includes("jpg")) return "IMG";
      if (t.includes("word") || t.includes("document")) return "DOC";
      return "FILE";
    };
    const sizeLabel = (bytes: number | null | undefined) => {
      if (!bytes || bytes <= 0) return "";
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
      return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    };

    const chips = docs.map((d) => `
      <td style="padding:0 8px 8px 0;vertical-align:top;">
        <a href="${esc(d.viewUrl)}" style="display:block;background:#FFFFFF;border:1px solid #E5E7EB;border-radius:8px;padding:10px 12px;text-decoration:none;min-width:180px;">
          <table cellpadding="0" cellspacing="0" role="presentation"><tr>
            <td style="vertical-align:middle;width:36px;">
              <span style="display:inline-block;background:#F3F4F6;color:#6B7280;font-size:10px;font-weight:700;letter-spacing:0.04em;padding:6px 7px;border-radius:5px;">${fileIcon(d.fileType)}</span>
            </td>
            <td style="vertical-align:middle;padding-left:10px;">
              <div style="font-size:13px;font-weight:600;color:#111827;line-height:1.3;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(d.fileName)}</div>
              <div style="font-size:11px;color:#6B7280;margin-top:2px;">${sizeLabel(d.fileSizeBytes ?? null) || esc(d.fileType)}</div>
            </td>
          </tr></table>
        </a>
      </td>`).join("");

    return `
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:24px;">
        <tr><td style="font-size:12px;color:#6B7280;padding-bottom:8px;">
          📎 ${docs.length} attachment${docs.length === 1 ? "" : "s"} from the visitor
        </td></tr>
        <tr><td>
          <table cellpadding="0" cellspacing="0" role="presentation"><tr>${chips}</tr></table>
        </td></tr>
      </table>`;
  })();

  // ── Conversation summary — formatted like an email transcript, plain text
  //     style with the speaker's name in bold, not chat bubbles.
  const conversationBlock = (() => {
    const turns = Array.isArray(conversation) ? conversation : [];
    if (turns.length === 0) return "";

    const recent = turns.slice(-6);
    const visitorLabel = leadName?.trim() || "Visitor";

    const lines = recent.map((t) => {
      const isVisitor = (t.role || "").toLowerCase().includes("visitor")
        || (t.role || "").toLowerCase() === "user"
        || (t.role || "").toLowerCase() === "customer";
      const text = (t.content || "").trim();
      if (!text) return "";
      const who = isVisitor ? visitorLabel : "Your assistant";
      const whoColor = isVisitor ? "#111827" : "#6B7280";
      return `
        <tr><td style="padding:6px 0;font-size:14px;line-height:1.55;color:#374151;">
          <strong style="color:${whoColor};">${esc(who)}:</strong> ${esc(text)}
        </td></tr>`;
    }).filter(Boolean).join("");

    if (!lines) return "";

    const trimmedNotice = turns.length > recent.length
      ? `<p style="margin:0 0 8px;font-size:12px;color:#9CA3AF;font-style:italic;">Showing the last ${recent.length} of ${turns.length} messages.</p>`
      : "";

    return `
      <p style="margin:24px 0 8px;font-size:13px;font-weight:600;color:#111827;">Conversation</p>
      ${trimmedNotice}
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 24px;border-left:3px solid #E5E7EB;padding-left:14px;">
        ${lines}
      </table>`;
  })();

  // ── Detail rows (only render rows that have content) — like a normal email
  //     "summary" with key-values aligned left
  const detailRow = (label: string, value: string | null | undefined) =>
    value && value.trim()
      ? `<tr>
          <td style="padding:6px 16px 6px 0;color:#6B7280;font-size:13px;width:120px;vertical-align:top;">${esc(label)}</td>
          <td style="padding:6px 0;color:#111827;font-size:14px;line-height:1.5;">${esc(value)}</td>
        </tr>`
      : "";

  const detailRows = [
    detailRow("Name", leadName),
    detailRow(contactIsEmail ? "Email" : "Phone", contact),
    !contactIsEmail ? detailRow("Email", visitorEmail) : "",
    detailRow("Preferred time", preferredTime),
    detailRow("Captured", capturedAt + " (SAST)"),
  ]
    .filter(Boolean)
    .join("");

  // Personal greeting using the owner's first name when known
  const greetingName = ownerFirstName?.trim() || "";
  const greeting = greetingName ? `Hi ${esc(greetingName)},` : "Hi,";

  // ── URGENT banner — visitor flagged the job as needing attention today.
  //     Sits above the subject line so it's the first thing the tradesman
  //     sees in the inbox preview AND in the open email.
  const urgentBanner = isUrgent
    ? `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 14px;background:#FEF2F2;border:1px solid #FCA5A5;border-radius:6px;">
        <tr><td style="padding:10px 14px;font-size:13px;color:#991B1B;line-height:1.5;">
          <strong style="color:#991B1B;letter-spacing:0.04em;">URGENT</strong> · Visitor said this needs sorting today. Reply or call now.
        </td></tr>
      </table>`
    : "";

  const expectedDaysLine = expectedDays && expectedDays > 1
    ? `<p style="margin:0 0 12px;font-size:13px;color:#374151;line-height:1.55;background:#FFFBEB;border-left:3px solid #F59E0B;padding:8px 12px;border-radius:4px;">
        <strong style="color:#92400E;">Multi-day job:</strong> Visitor estimates this will take ${expectedDays} day${expectedDays === 1 ? "" : "s"}. Hold a follow-up slot when you book.
      </p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>New lead — ${esc(displayName)}</title>
  <!--[if mso]>
  <style>td,a,h1,h2,p { font-family: Arial, sans-serif !important; }</style>
  <![endif]-->
  <style>
    @media (max-width:560px) {
      .qw-pad { padding:24px 20px !important; }
      .qw-actions td { display:block !important; width:100% !important; padding:0 0 8px !important; }
      .qw-actions a { width:100% !important; box-sizing:border-box !important; text-align:center !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-font-smoothing:antialiased;color:#111827;">

  <!-- Hidden preheader (preview text in inbox lists) -->
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#F9FAFB;opacity:0;">
    ${isUrgent ? "URGENT — " : ""}${esc(displayName)} reached out${need ? " about " + esc(need.slice(0, 80)) : ""}. ${(documents?.length ?? 0) > 0 ? `${documents!.length} file${documents!.length === 1 ? "" : "s"} attached.` : "Tap a button to reply."}
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#F9FAFB;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;background:#FFFFFF;border:1px solid #E5E7EB;border-radius:8px;">

        <!-- Sender header -->
        <tr><td class="qw-pad" style="padding:24px 32px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td style="vertical-align:middle;">
                <div style="font-size:13px;color:#6B7280;">From <strong style="color:#111827;">Qwikly Assistant</strong> · ${esc(businessName)}</div>
                <div style="font-size:12px;color:#9CA3AF;margin-top:2px;">${esc(capturedAt)} (SAST)</div>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Body -->
        <tr><td class="qw-pad" style="padding:20px 32px 8px;">

          <!-- Attachments at top, like Gmail -->
          ${docsTopBlock}

          <!-- Urgency banner (only if flagged) -->
          ${urgentBanner}

          <!-- Subject line -->
          <h1 style="margin:0 0 16px;font-size:20px;font-weight:600;color:${isUrgent ? "#991B1B" : "#111827"};line-height:1.3;letter-spacing:-0.2px;">
            ${isUrgent ? "Urgent lead" : "New lead"}: ${esc(displayName)}${need ? ` — ${esc(need.length > 50 ? need.slice(0, 50) + "…" : need)}` : ""}
          </h1>

          ${expectedDaysLine}

          <!-- Greeting and human intro -->
          <p style="margin:0 0 14px;font-size:15px;color:#111827;line-height:1.55;">
            ${greeting}
          </p>
          <p style="margin:0 0 18px;font-size:15px;color:#374151;line-height:1.6;">
            <strong style="color:#111827;">${esc(displayName)}</strong> just reached out via your website${need ? ` about <em>${esc(need)}</em>` : ""}.
            ${preferredTime ? `They mentioned: <em>"${esc(preferredTime)}"</em>.` : ""}
            Here's everything they shared:
          </p>

          <!-- Lead details -->
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 8px;background:#F9FAFB;border-radius:6px;padding:6px 14px;">
            ${detailRows}
          </table>

          <!-- Conversation transcript -->
          ${conversationBlock}

          <!-- Pre-typed reply notice + buttons -->
          ${quickButtons.length > 0 ? `
          <p style="margin:24px 0 6px;font-size:13px;font-weight:600;color:#111827;">Reply now</p>
          <p style="margin:0 0 12px;font-size:13px;color:#6B7280;line-height:1.55;">
            Tap a button below — your reply is already typed. Just review and send.
          </p>
          <p style="margin:0 0 16px;">
            ${quickButtons.join("")}
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 24px;background:#F3F4F6;border-radius:6px;padding:14px 16px;">
            <tr><td style="font-size:13px;color:#374151;line-height:1.55;font-style:italic;white-space:pre-wrap;">${esc(followUpMessage)}</td></tr>
          </table>` : ""}

          <!-- Booking confirm/suggest -->
          <p style="margin:0 0 10px;font-size:13px;font-weight:600;color:#111827;">Or respond to their requested time</p>
          <table class="qw-actions" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td style="padding-right:8px;">
                <a href="${esc(confirmUrl)}" style="display:inline-block;padding:9px 18px;background:#111827;color:#FFFFFF;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;">Confirm slot</a>
              </td>
              <td>
                <a href="${esc(suggestUrl)}" style="display:inline-block;padding:9px 18px;background:#FFFFFF;color:#111827;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;border:1px solid #E5E7EB;">Suggest another time</a>
              </td>
            </tr>
          </table>

          <!-- Reply tip -->
          <p style="margin:24px 0 0;font-size:13px;color:#6B7280;line-height:1.55;border-top:1px solid #F3F4F6;padding-top:16px;">
            ${visitorEmail || contactIsEmail ? `Tip: Just hit <strong style="color:#374151;">Reply</strong> on this email and your response will go straight to ${esc(visitorEmail || contact)}.` : "Tip: Reply to this email to add private notes for yourself."}
          </p>

        </td></tr>

        <!-- Footer -->
        <tr><td class="qw-pad" style="padding:18px 32px 24px;border-top:1px solid #F3F4F6;">
          <p style="margin:0;font-size:12px;color:#9CA3AF;line-height:1.5;">
            Captured by your <a href="https://www.qwikly.co.za/dashboard" style="color:#6B7280;text-decoration:underline;">Qwikly</a> assistant ·
            <a href="https://www.qwikly.co.za/dashboard/settings/profile" style="color:#9CA3AF;text-decoration:underline;">Manage alerts</a>
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
    isUrgent,
    expectedDays,
  } = args;
  const lines: string[] = [
    `${isUrgent ? "URGENT lead" : "New lead"} — ${businessName}`,
    "",
    `${leadName ?? "A new visitor"} would like to hear back from you.`,
    isUrgent ? "** Visitor said this needs sorting today. **" : "",
    "",
    `Contact: ${contact}`,
    visitorEmail ? `Email:   ${visitorEmail}` : "",
    need ? `Need:    ${need}` : "",
    preferredTime ? `Time:    ${preferredTime}` : "",
    expectedDays && expectedDays > 1 ? `Job span: ~${expectedDays} days (hold a follow-up slot)` : "",
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
