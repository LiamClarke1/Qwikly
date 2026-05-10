/**
 * Templates for the 60 second response loop.
 *
 * Used by the Twilio dispatcher and the lead notification fallbacks.
 * No emoji. No "AI", "bot", "chatbot", "robot", or "artificial intelligence"
 * in any user-visible string.
 */

export const OWNER_PING_MAX_CHARS = 320;

export interface InstantReplyTemplate {
  /** Internal name. */
  name: 'ownerPing' | 'leadBookingLink' | 'leadFallbackEmail';
  /** Plain-text body for SMS / WhatsApp. */
  text: string;
  /** Optional HTML body for email channels. */
  html?: string;
  /** Optional subject for email channels. */
  subject?: string;
  /** Hard character cap for SMS / WhatsApp variants. */
  maxChars?: number;
  /** True if emoji are forbidden. All Qwikly outbound is no-emoji. */
  noEmoji: boolean;
}

/**
 * Owner ping: WhatsApp or SMS to the business owner the moment a lead lands.
 * Strict no-emoji. Strict 320 char cap to fit a single SMS segment plus
 * room for variable expansion.
 */
export const OWNER_PING: InstantReplyTemplate = {
  name: 'ownerPing',
  text: 'New Qwikly lead, {{leadName}}, {{leadSummary}}. Reply YES to send your booking link.',
  maxChars: OWNER_PING_MAX_CHARS,
  noEmoji: true,
};

/**
 * Lead booking link: outbound to the lead after the owner replies YES.
 */
export const LEAD_BOOKING_LINK: InstantReplyTemplate = {
  name: 'leadBookingLink',
  text: 'Hi {{leadName}}, here is the booking link from {{businessName}}, {{bookingLink}}. Pick a slot that works and we will see you then.',
  maxChars: OWNER_PING_MAX_CHARS,
  noEmoji: true,
};

/**
 * Fallback email if both WhatsApp and SMS to the lead fail.
 */
export const LEAD_FALLBACK_EMAIL: InstantReplyTemplate = {
  name: 'leadFallbackEmail',
  subject: '{{businessName}}, your booking link',
  text: [
    'Hi {{leadName}},',
    '',
    'Thanks for reaching out to {{businessName}}. Here is the booking link, {{bookingLink}}.',
    '',
    'Pick a slot that works for you and the team will be ready.',
    '',
    'If you would rather reply by message, just respond to this email and the team will pick it up.',
    '',
    'Speak soon,',
    '{{businessName}}',
  ].join('\n'),
  html: [
    '<p>Hi {{leadName}},</p>',
    '<p>Thanks for reaching out to <strong>{{businessName}}</strong>. Here is the booking link, <a href="{{bookingLink}}">{{bookingLink}}</a>.</p>',
    '<p>Pick a slot that works for you and the team will be ready.</p>',
    '<p>If you would rather reply by message, just respond to this email and the team will pick it up.</p>',
    '<p>Speak soon,<br/>{{businessName}}</p>',
  ].join('\n'),
  noEmoji: true,
};

export const INSTANT_REPLY_TEMPLATES: Record<InstantReplyTemplate['name'], InstantReplyTemplate> = {
  ownerPing: OWNER_PING,
  leadBookingLink: LEAD_BOOKING_LINK,
  leadFallbackEmail: LEAD_FALLBACK_EMAIL,
};

function interpolate(input: string, vars: Record<string, string>): string {
  return input.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key: string) => {
    if (Object.prototype.hasOwnProperty.call(vars, key)) {
      return vars[key];
    }
    return match;
  });
}

export interface RenderedInstantReply {
  text: string;
  html?: string;
  subject?: string;
  /** True if the rendered SMS / WhatsApp body exceeded the cap. */
  overCap: boolean;
}

/**
 * Render an instant-reply template by name, substituting placeholders.
 * Reports overCap so the dispatcher can split or downgrade the channel.
 */
export function renderTemplate(
  name: InstantReplyTemplate['name'],
  vars: Record<string, string>,
): RenderedInstantReply {
  const template = INSTANT_REPLY_TEMPLATES[name];
  const text = interpolate(template.text, vars);
  const html = template.html ? interpolate(template.html, vars) : undefined;
  const subject = template.subject ? interpolate(template.subject, vars) : undefined;
  const overCap = typeof template.maxChars === 'number' && text.length > template.maxChars;
  return { text, html, subject, overCap };
}
