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
  /** First name of the business owner , used to personalise the auto-filled reply. */
  ownerFirstName?: string | null;
  /** Visitor said the job is urgent (today/ASAP). Renders a red URGENT banner. */
  isUrgent?: boolean | null;
  /** Visitor said the job will likely span multiple days. Surfaces in the summary. */
  expectedDays?: number | null;
  /** Assistant escalated this conversation rather than capturing a normal lead.
   *  Renders a red banner so the owner can see the difference at a glance. */
  isEscalation?: boolean | null;
  /** Trade-specific structured detail captured by the assistant during the
   *  conversation (budget, property type, medical aid, matter type, etc.).
   *  Rendered as a key-value list inside the Details block so the owner can
   *  scan trade-specific facts without reading the full transcript. */
  details?: Record<string, string> | null;
  /** Visitor explicitly confirmed they have engaged with the business before.
   *  Renders a small "RETURNING CLIENT" pill above the headline so the owner
   *  knows to prioritise. */
  isReturningCustomer?: boolean | null;
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
    isEscalation,
    details,
    isReturningCustomer,
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
  // typed in the destination app , just review and hit send.
  const firstName = (leadName?.trim() || "").split(/\s+/)[0] || "there";
  const owner = ownerFirstName?.trim() || "";
  const ownerSignoff = owner ? `\n\n– ${owner}` : "";
  const needFragment = need?.trim() ? ` about ${need.trim()}` : "";
  const followUpMessage =
    `Hi ${firstName}, this is ${owner ? owner + " from " : ""}${businessName}. ` +
    `Thanks for getting in touch via our website${needFragment}. ` +
    `What's the best time to give you a quick call?${ownerSignoff}`;
  const followUpSubject = `${businessName} , re: your enquiry${needFragment}`;

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

  // ── Quick-action buttons (call / WhatsApp / SMS / email)
  // Primary action gets the ember brand color, secondaries are ghost-style on
  // cream so the email feels on-brand with qwikly.co.za. The first available
  // action becomes primary; the rest are secondary.
  const quickButtons: string[] = [];
  const primaryBtn = (label: string, href: string) =>
    `<a href="${esc(href)}" style="display:inline-block;margin:0 8px 8px 0;padding:11px 18px;background:#E85A2C;color:#FFFFFF;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;letter-spacing:-0.1px;">${label}</a>`;
  const secondaryBtn = (label: string, href: string) =>
    `<a href="${esc(href)}" style="display:inline-block;margin:0 8px 8px 0;padding:11px 18px;background:#FFFFFF;color:#0E0E0C;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;letter-spacing:-0.1px;border:1px solid #D6D2C8;">${label}</a>`;
  let assignedPrimary = false;
  const addBtn = (label: string, href: string | null) => {
    if (!href) return;
    if (!assignedPrimary) {
      quickButtons.push(primaryBtn(label, href));
      assignedPrimary = true;
    } else {
      quickButtons.push(secondaryBtn(label, href));
    }
  };
  addBtn("Call", callHref);
  addBtn("WhatsApp", whatsappHref);
  addBtn("Text", smsHref);
  addBtn("Email back", emailHref);

  // ── Documents shared , Gmail-style "attachment chips" pinned to the very top
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
        <a href="${esc(d.viewUrl)}" style="display:block;background:#FFFFFF;border:1px solid #E6E0D4;border-radius:8px;padding:12px 14px;text-decoration:none;min-width:180px;">
          <table cellpadding="0" cellspacing="0" role="presentation"><tr>
            <td style="vertical-align:middle;width:40px;">
              <span style="display:inline-block;background:rgba(232,90,44,0.10);color:#C3431C;font-size:10px;font-weight:700;letter-spacing:0.06em;padding:6px 8px;border-radius:5px;">${fileIcon(d.fileType)}</span>
            </td>
            <td style="vertical-align:middle;padding-left:10px;">
              <div style="font-size:13px;font-weight:600;color:#0E0E0C;line-height:1.3;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(d.fileName)}</div>
              <div style="font-size:11px;color:#6A6A63;margin-top:3px;">${sizeLabel(d.fileSizeBytes ?? null) || esc(d.fileType)}</div>
            </td>
          </tr></table>
        </a>
      </td>`).join("");

    return `
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:28px;">
        <tr><td style="font-size:11px;color:#6A6A63;padding-bottom:10px;letter-spacing:0.12em;text-transform:uppercase;font-weight:600;">
          ${docs.length} attachment${docs.length === 1 ? "" : "s"} from the visitor
        </td></tr>
        <tr><td>
          <table cellpadding="0" cellspacing="0" role="presentation"><tr>${chips}</tr></table>
        </td></tr>
      </table>`;
  })();

  // ── Conversation summary , formatted like an email transcript, plain text
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
      const whoColor = isVisitor ? "#0E0E0C" : "#C3431C";
      return `
        <tr><td style="padding:8px 0;font-size:14px;line-height:1.6;color:#2A2A27;">
          <strong style="color:${whoColor};font-weight:600;">${esc(who)}</strong>
          <span style="color:#8F8F86;"> · </span>
          ${esc(text)}
        </td></tr>`;
    }).filter(Boolean).join("");

    if (!lines) return "";

    const trimmedNotice = turns.length > recent.length
      ? `<p style="margin:0 0 10px;font-size:12px;color:#8F8F86;font-style:italic;">Showing the last ${recent.length} of ${turns.length} messages.</p>`
      : "";

    return `
      <p style="margin:32px 0 12px;font-size:11px;font-weight:600;color:#6A6A63;letter-spacing:0.12em;text-transform:uppercase;">Conversation</p>
      ${trimmedNotice}
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 28px;background:#FFFFFF;border:1px solid #E6E0D4;border-radius:8px;padding:8px 18px;">
        ${lines}
      </table>`;
  })();

  // ── Detail rows (only render rows that have content) , like a normal email
  //     "summary" with key-values aligned left
  const detailRow = (label: string, value: string | null | undefined) =>
    value && value.trim()
      ? `<tr>
          <td style="padding:9px 18px 9px 0;color:#6A6A63;font-size:12px;width:120px;vertical-align:top;letter-spacing:0.06em;text-transform:uppercase;font-weight:600;">${esc(label)}</td>
          <td style="padding:9px 0;color:#0E0E0C;font-size:15px;line-height:1.5;font-weight:500;">${esc(value)}</td>
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

  // ── URGENT banner , visitor flagged the job as needing attention today.
  //     Sits above the subject line so it's the first thing the tradesman
  //     sees in the inbox preview AND in the open email.
  const urgentBanner = isUrgent
    ? `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 18px;background:#E85A2C;border-radius:6px;">
        <tr><td style="padding:12px 16px;font-size:13px;color:#FFFFFF;line-height:1.5;">
          <strong style="letter-spacing:0.12em;text-transform:uppercase;">Urgent</strong> &nbsp;·&nbsp; Visitor said this needs sorting today. Reply or call now.
        </td></tr>
      </table>`
    : "";

  // ── ESCALATION banner. Assistant handed the visitor off because one of
  //     the configured escalation rules fired. Owner needs to know this is
  //     a handoff, not a normal lead.
  const escalationBanner = isEscalation
    ? `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 18px;background:#B91C1C;border-radius:6px;">
        <tr><td style="padding:12px 16px;font-size:13px;color:#FFFFFF;line-height:1.5;">
          <strong style="letter-spacing:0.12em;text-transform:uppercase;">Escalated</strong> &nbsp;·&nbsp; Escalated by your digital assistant. The visitor was handed off because an escalation rule fired.
        </td></tr>
      </table>`
    : "";

  const expectedDaysLine = expectedDays && expectedDays > 1
    ? `<p style="margin:0 0 18px;font-size:13px;color:#2A2A27;line-height:1.6;background:rgba(232,90,44,0.08);border-left:3px solid #E85A2C;padding:10px 14px;border-radius:4px;">
        <strong style="color:#0E0E0C;">Multi-day job</strong> · Visitor estimates this will take ${expectedDays} day${expectedDays === 1 ? "" : "s"}. Hold a follow-up slot when you book.
      </p>`
    : "";

  // Returning-client pill, sits above the headline so the owner spots a
  // repeat customer at a glance.
  const returningPill = isReturningCustomer
    ? `<p style="margin:0 0 10px;"><span style="display:inline-block;background:#0E0E0C;color:#FFFFFF;font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;padding:5px 9px;border-radius:4px;">Returning client</span></p>`
    : "";

  // Trade-specific detail block, rendered as a key-value list. Keys are
  // shown in title-case for readability (matter_type → Matter type), values
  // verbatim. Only renders when the assistant captured at least one detail.
  const detailsBlock = (() => {
    const map = details && typeof details === "object" ? details : null;
    if (!map) return "";
    const entries = Object.entries(map).filter(([, v]) => typeof v === "string" && v.trim());
    if (entries.length === 0) return "";
    const titleCase = (k: string) => k
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    const rows = entries.map(([k, v]) => `
      <tr>
        <td style="padding:9px 18px 9px 0;color:#6A6A63;font-size:12px;width:140px;vertical-align:top;letter-spacing:0.06em;text-transform:uppercase;font-weight:600;">${esc(titleCase(k))}</td>
        <td style="padding:9px 0;color:#0E0E0C;font-size:15px;line-height:1.5;font-weight:500;">${esc(v)}</td>
      </tr>`).join("");
    return `
      <p style="margin:24px 0 10px;font-size:11px;font-weight:600;color:#6A6A63;letter-spacing:0.12em;text-transform:uppercase;">What they told the assistant</p>
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 4px;background:#FAF5EC;border:1px solid #E6E0D4;border-radius:8px;padding:6px 18px;">
        ${rows}
      </table>`;
  })();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>New lead , ${esc(displayName)}</title>
  <!--[if mso]>
  <style>td,a,h1,h2,p { font-family: Arial, sans-serif !important; } .qw-display { font-family: Georgia, 'Times New Roman', serif !important; }</style>
  <![endif]-->
  <style>
    @media (max-width:560px) {
      .qw-pad { padding:28px 22px !important; }
      .qw-display { font-size:30px !important; line-height:1.15 !important; }
      .qw-actions td { display:block !important; width:100% !important; padding:0 0 8px !important; }
      .qw-actions a { width:100% !important; box-sizing:border-box !important; text-align:center !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#F4EEE4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-font-smoothing:antialiased;color:#0E0E0C;">

  <!-- Hidden preheader (preview text in inbox lists) -->
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#F4EEE4;opacity:0;">
    ${isUrgent ? "URGENT , " : ""}${esc(displayName)} reached out${need ? " about " + esc(need.slice(0, 80)) : ""}. ${(documents?.length ?? 0) > 0 ? `${documents!.length} file${documents!.length === 1 ? "" : "s"} attached.` : "Tap a button to reply."}
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#F4EEE4;padding:36px 16px;">
    <tr><td align="center">

      <!-- Brand wordmark , uses the customer's business name so the email is
           branded as their business, not Qwikly. The accent dot stays for
           editorial polish. Qwikly's own house tenant naturally renders as
           "Qwikly." here since its business_name is "Qwikly". -->
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:580px;margin:0 auto 18px;">
        <tr><td style="padding:0 4px 0 4px;">
          <span style="font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:500;color:#0E0E0C;letter-spacing:-0.5px;">${esc(businessName)}<span style="color:#E85A2C;">.</span></span>
        </td></tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:580px;background:#FFFFFF;border:1px solid #E6E0D4;border-radius:12px;box-shadow:0 1px 0 rgba(14,14,12,0.04);">

        <!-- Eyebrow + timestamp -->
        <tr><td class="qw-pad" style="padding:30px 36px 0;">
          <p style="margin:0 0 14px;font-size:11px;color:#6A6A63;letter-spacing:0.16em;text-transform:uppercase;font-weight:600;">
            ${isUrgent ? "Urgent lead" : "New lead"} &nbsp;·&nbsp; ${esc(capturedAt)} SAST &nbsp;·&nbsp; ${esc(businessName)}
          </p>
        </td></tr>

        <!-- Body -->
        <tr><td class="qw-pad" style="padding:0 36px 8px;">

          <!-- Attachments at top -->
          ${docsTopBlock}

          <!-- Escalation banner -->
          ${escalationBanner}

          <!-- Urgency banner -->
          ${urgentBanner}

          <!-- Returning-client pill (only when the assistant flagged it) -->
          ${returningPill}

          <!-- Editorial display headline -->
          <h1 class="qw-display" style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:34px;font-weight:400;color:#0E0E0C;line-height:1.15;letter-spacing:-0.6px;">
            You've got a <em style="font-style:italic;font-weight:400;color:#0E0E0C;">${isReturningCustomer ? "returning lead" : "new lead"}</em>${need ? `<span style="color:#6A6A63;font-style:normal;">.</span>` : `<span style="color:#E85A2C;">.</span>`}
          </h1>

          ${expectedDaysLine}

          <!-- Intro line -->
          <p style="margin:0 0 26px;font-size:15px;color:#2A2A27;line-height:1.6;">
            ${greeting} <strong style="color:#0E0E0C;font-weight:600;">${esc(displayName)}</strong> just came through your website${need ? ` about <em style="color:#0E0E0C;">${esc(need)}</em>` : ""}.${preferredTime ? ` They mentioned: <em style="color:#0E0E0C;">"${esc(preferredTime)}"</em>.` : ""}
          </p>

          <!-- Lead details -->
          <p style="margin:0 0 10px;font-size:11px;font-weight:600;color:#6A6A63;letter-spacing:0.12em;text-transform:uppercase;">Details</p>
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 4px;background:#FAF5EC;border:1px solid #E6E0D4;border-radius:8px;padding:6px 18px;">
            ${detailRows}
          </table>

          <!-- Trade-specific structured detail captured by the assistant -->
          ${detailsBlock}

          <!-- Conversation transcript -->
          ${conversationBlock}

          <!-- Pre-typed reply -->
          ${quickButtons.length > 0 ? `
          <p style="margin:32px 0 10px;font-size:11px;font-weight:600;color:#6A6A63;letter-spacing:0.12em;text-transform:uppercase;">Reply now</p>
          <p style="margin:0 0 14px;font-size:14px;color:#2A2A27;line-height:1.6;">
            Tap a button below, your reply is already drafted. Just review and send.
          </p>
          <p style="margin:0 0 16px;">
            ${quickButtons.join("")}
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 28px;background:#FAF5EC;border:1px solid #E6E0D4;border-radius:8px;padding:16px 18px;">
            <tr><td style="font-size:14px;color:#2A2A27;line-height:1.6;font-style:italic;white-space:pre-wrap;">${esc(followUpMessage)}</td></tr>
          </table>` : ""}

          <!-- Booking confirm/suggest -->
          <p style="margin:0 0 12px;font-size:11px;font-weight:600;color:#6A6A63;letter-spacing:0.12em;text-transform:uppercase;">Or respond to their time</p>
          <table class="qw-actions" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td style="padding-right:8px;">
                <a href="${esc(confirmUrl)}" style="display:inline-block;padding:11px 20px;background:#0E0E0C;color:#FFFFFF;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;letter-spacing:-0.1px;">Confirm slot</a>
              </td>
              <td>
                <a href="${esc(suggestUrl)}" style="display:inline-block;padding:11px 20px;background:#FFFFFF;color:#0E0E0C;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;letter-spacing:-0.1px;border:1px solid #D6D2C8;">Suggest another time</a>
              </td>
            </tr>
          </table>

          <!-- Reply tip -->
          <p style="margin:28px 0 0;font-size:13px;color:#6A6A63;line-height:1.6;border-top:1px solid #E6E0D4;padding-top:18px;">
            ${visitorEmail || contactIsEmail ? `Tip · hit <strong style="color:#2A2A27;font-weight:600;">Reply</strong> and your response goes straight to ${esc(visitorEmail || contact)}.` : "Tip · reply to this email to add private notes for yourself."}
          </p>

        </td></tr>

        <!-- Footer , phrased as the customer's own assistant, with a small
             "Powered by Qwikly" attribution so credit stays without the email
             reading like a Qwikly broadcast. -->
        <tr><td class="qw-pad" style="padding:20px 36px 26px;border-top:1px solid #F0EAE0;">
          <p style="margin:0;font-size:12px;color:#8F8F86;line-height:1.6;">
            Captured by your <a href="https://www.qwikly.co.za/dashboard" style="color:#6A6A63;text-decoration:underline;">${esc(businessName)}</a> assistant &nbsp;·&nbsp;
            <a href="https://www.qwikly.co.za/dashboard/settings/profile" style="color:#8F8F86;text-decoration:underline;">Manage alerts</a>
          </p>
        </td></tr>

      </table>

      <!-- Outer Powered-by attribution -->
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:580px;margin:18px auto 0;">
        <tr><td style="text-align:center;padding:0 4px;">
          <p style="margin:0;font-size:11px;color:#8F8F86;letter-spacing:0.04em;">
            Powered by <a href="https://www.qwikly.co.za" style="color:#6A6A63;text-decoration:underline;">Qwikly</a>
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
    isEscalation,
    details,
    isReturningCustomer,
  } = args;
  const lines: string[] = [];
  if (isEscalation) {
    lines.push("ESCALATED, handed off by your digital assistant.", "");
  }
  if (isReturningCustomer) {
    lines.push("RETURNING CLIENT.", "");
  }
  lines.push(
    `${isUrgent ? "URGENT lead" : "New lead"} , ${businessName}`,
    "",
    `${leadName ?? "A new visitor"} would like to hear back from you.`,
    isUrgent ? "** Visitor said this needs sorting today. **" : "",
    "",
    `Contact: ${contact}`,
    visitorEmail ? `Email:   ${visitorEmail}` : "",
    need ? `Need:    ${need}` : "",
    preferredTime ? `Time:    ${preferredTime}` : "",
    expectedDays && expectedDays > 1 ? `Job span: ~${expectedDays} days (hold a follow-up slot)` : "",
  );
  if (details && typeof details === "object") {
    const entries = Object.entries(details).filter(([, v]) => typeof v === "string" && v.trim());
    if (entries.length > 0) {
      lines.push("", "What they told the assistant:");
      const pad = Math.max(...entries.map(([k]) => k.length));
      for (const [k, v] of entries) {
        const label = k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).padEnd(pad + 2);
        lines.push(`  ${label} ${v}`);
      }
    }
  }

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
    `, Captured by your ${businessName} assistant`,
    "  Manage alerts: https://www.qwikly.co.za/dashboard/settings/profile",
    "",
    "  Powered by Qwikly · https://www.qwikly.co.za",
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
            Your Starter plan captures up to 25 leads per month. You've reached that limit for this billing cycle. Upgrade to Pro to keep capturing leads , up to 200/month.
          </p>
          <a href="https://www.qwikly.co.za/dashboard/billing" style="display:inline-block;padding:12px 24px;background:#E85A2C;color:#fff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:700;">Upgrade to Pro , R599/mo</a>
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
