/**
 * Qwikly outbound cadence templates.
 *
 * Productises the 3-email-over-6-days sequence: icebreaker, TL;DR, breakup.
 * These are the generic baseline. Niche-specific copy lives elsewhere.
 *
 * Internal playbook informed by Danny Menake,
 * "Stop selling AI receptionists, sell this instead", 2026.
 *
 * Note on naming: this file uses the term "AI" only in this internal comment
 * for source attribution. No user-visible string in this file uses the words
 * "AI", "bot", "chatbot", "robot", or "artificial intelligence".
 */

export type CadenceTemplateId = 'icebreaker' | 'tldr' | 'breakup';

export interface CadenceTemplate {
  id: CadenceTemplateId;
  day: number;
  /**
   * Three to five ambiguous subject line patterns. No clickbait. No emoji.
   * Patterns may include placeholders like {{firstName}} or {{businessName}}.
   */
  subjectLineHints: string[];
  /**
   * Body template. Placeholders use the {{token}} convention.
   * Common tokens: {{firstName}}, {{businessName}}, {{icebreaker}},
   * {{painPoint}}, {{softCTA}}, {{senderFirstName}}.
   */
  body: string;
  /** Soft word cap. Mission Control should warn above this. */
  maxWords: number;
  /** Default soft CTA used when {{softCTA}} is not overridden. */
  softCTA: string;
  /** Optional "or I can send you a video" lift. */
  alternativeOffer?: string;
  /** Optional risk-reversal bait line. */
  riskReversal?: string;
}

export const ICEBREAKER_TEMPLATE: CadenceTemplate = {
  id: 'icebreaker',
  day: 0,
  subjectLineHints: [
    'quick one, {{firstName}}',
    '{{businessName}}',
    'noticed something on your site',
    'a thought for {{businessName}}',
    'one idea for {{firstName}}',
  ],
  body: [
    'Hi {{firstName}},',
    '',
    '{{icebreaker}}',
    '',
    'I had a look at {{businessName}} and noticed {{painPoint}}. Most owners I speak to lose a handful of these every week without realising, mostly after hours or on weekends.',
    '',
    'We help South African businesses like yours catch those leads in under a minute, so the customer books before they keep scrolling.',
    '',
    '{{softCTA}}',
    '',
    'Cheers,',
    '{{senderFirstName}}',
  ].join('\n'),
  maxWords: 120,
  softCTA: 'Worth a quick look? Happy to send a 90 second walkthrough if it is easier than a call.',
  alternativeOffer: 'If you would rather not jump on a call, I can send you a short video showing exactly how this would work for {{businessName}}.',
  riskReversal: 'No setup fees, no lock-in, and you only pay when a real lead lands.',
};

export const TLDR_TEMPLATE: CadenceTemplate = {
  id: 'tldr',
  day: 3,
  subjectLineHints: [
    're, {{businessName}}',
    'short version',
    'quick recap, {{firstName}}',
    'tl;dr',
  ],
  body: [
    'Hi {{firstName}},',
    '',
    'Short version of my last note.',
    '',
    'Most {{businessName}} style businesses lose leads after hours. We reply in under 60 seconds, qualify the lead, and push the booking link straight to the customer. You stay in control the whole time.',
    '',
    '{{softCTA}}',
    '',
    '{{senderFirstName}}',
  ].join('\n'),
  maxWords: 80,
  softCTA: 'Want me to send a 90 second video showing it on your site?',
  alternativeOffer: 'Happy to record a quick Loom for {{businessName}} if that is easier.',
};

export const BREAKUP_TEMPLATE: CadenceTemplate = {
  id: 'breakup',
  day: 6,
  subjectLineHints: [
    'closing the loop',
    'last note, {{firstName}}',
    'should I close this out?',
    'parking this',
  ],
  body: [
    'Hi {{firstName}},',
    '',
    'I do not want to clutter your inbox, so this is my last note.',
    '',
    'If catching after hours leads is not a priority right now, all good. If it is, just reply with the word "open" and I will send the walkthrough.',
    '',
    '{{senderFirstName}}',
  ].join('\n'),
  maxWords: 60,
  softCTA: 'Reply "open" and I will send the walkthrough.',
};

export const CADENCE_TEMPLATES: readonly CadenceTemplate[] = [
  ICEBREAKER_TEMPLATE,
  TLDR_TEMPLATE,
  BREAKUP_TEMPLATE,
] as const;

/**
 * Substitute {{token}} placeholders in a string using the supplied vars.
 * Unknown tokens are left in place so QA can spot missing data.
 */
function interpolate(input: string, vars: Record<string, string>): string {
  return input.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key: string) => {
    if (Object.prototype.hasOwnProperty.call(vars, key)) {
      return vars[key];
    }
    return match;
  });
}

/**
 * Pseudo-random subject line picker. Uses Math.random by default.
 * Mission Control may pass a seeded picker via vars.__pickIndex if needed,
 * but the public surface stays simple.
 */
function pickSubject(hints: readonly string[], vars: Record<string, string>): string {
  if (hints.length === 0) {
    return '';
  }
  const idx = Math.floor(Math.random() * hints.length);
  const chosen = hints[idx] ?? hints[0];
  return interpolate(chosen, vars);
}

export interface RenderedCadenceEmail {
  subject: string;
  body: string;
}

/**
 * Render a cadence template into a ready-to-send subject and body.
 * Picks a random subject line from the template's hints.
 */
export function renderCadenceEmail(
  template: CadenceTemplate,
  vars: Record<string, string>,
): RenderedCadenceEmail {
  const mergedVars: Record<string, string> = {
    softCTA: template.softCTA,
    ...vars,
  };
  return {
    subject: pickSubject(template.subjectLineHints, mergedVars),
    body: interpolate(template.body, mergedVars),
  };
}
