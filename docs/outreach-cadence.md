# Qwikly Outreach Cadence

Operational doc for Mission Control and the Twilio dispatcher. Source: internal playbook informed by Danny Menake, "Stop selling AI receptionists, sell this instead", 2026.

## Philosophy, 3 emails over 6 days

We earn replies, we do not chase opens. Three contacts, then stop. The cadence is calibrated so a busy South African owner sees us at most three times in one working week.

- Day 0, icebreaker plus soft CTA. Personal first line, one observation about their business, one soft ask. Cap 120 words.
- Day 3, TL;DR follow up. Compress the offer to under 80 words. No new pitch, just a clean recap and the same soft ask.
- Day 6, breakup. Permission to close the loop. One sentence opt-in, no pressure.

## The 80 word TL;DR rule

Email two must come in under 80 words including the greeting and sign-off. If it does not, it gets cut. Short emails get read on a phone in the queue at Pick n Pay, long emails get archived.

## Soft CTA discipline

Every CTA is low friction. The default is a 90 second walkthrough, not a meeting. The alternative offer is a recorded video. We never ask for a 30 minute call in the first three touches. We never use urgency or fake scarcity.

## Deliverability rules

- Send from multiple sending domains, never the primary brand domain.
- Warm new domains for 2 weeks before any volume, ramp slowly.
- Track reply rate, not open rate. Apple Mail Privacy Protection has made open rate a vanity metric.
- Plain text first, no images, no tracking pixels, no link shorteners.
- One link maximum per email, and only when the CTA needs it.
- Suppress on reply, suppress on unsubscribe, suppress on bounce, immediately.

## The 60 second response rule

When a real prospect raises a hand, on the website, in WhatsApp, in SMS, we respond inside 60 seconds. The owner gets pinged, the lead gets a booking link, and the conversation moves forward before the prospect's attention does. The instant-reply templates in `src/lib/outreach/instant-reply-templates.ts` are the canonical strings. No emoji, no jargon, no mention of how the system works under the hood.

## Placeholder convention

All templates use `{{token}}` placeholders. Mission Control interpolates with verified data only. Unknown tokens are left in place on purpose so QA spots them before send.
