# Pipeline Platform Spec

Pipeline is the outbound side of Qwikly. Tenants run a five-step setup, the system generates a seed list, warms sending domains, runs a cadence, classifies replies, and books meetings. This document describes what is built today, what is stubbed, and what is required to switch each stub on in production.

## What is built today

- Dashboard surface at `/dashboard/pipeline/**`, owned by the dashboard agent. Read-only views over the tables defined in this migration.
- ICP setup at `/dashboard/pipeline/setup`. Writes to `pipeline_setup_state` (one row per business) and pushes the ICP as JSONB.
- Live prospect generator at `/api/pipeline/generate` and the in-dashboard generate action. Google Places returns SA businesses, the site reader scrapes each one, Hunter finds the best email for the domain, scoring filters to 7-plus, and a Claude Haiku call writes a one-sentence personalised opener.
- Email composer in the prospect detail page. Opens the Qwikly client's own Gmail, Outlook, or default mail client via mailto and web deep links. No SMTP, no API integration, no domain warmup.
- Setup notify at `/api/pipeline/setup/notify`, session gated, used to push an internal alert when a new ICP is submitted.
- Schema (this migration): `pipeline_setup_state`, `pipeline_campaigns`, `pipeline_prospects`, `pipeline_replies`, `pipeline_meetings`. All tenant scoped via `businesses.user_id = auth.uid()`.
- Templates for the cadence copy live in `src/lib/outreach/cadence.ts`. The Email composer pre-fills subject and body from these templates.

## Sending

Qwikly clients send from their own existing Gmail or Outlook. The Email composer pre-drafts subject and body and opens their default mail client via mailto. No SMTP, no domain warmup, no deliverability infrastructure on our side.

The composer offers three buttons: open in the client's default mail app (mailto), open in Gmail web, open in Outlook web. After sending, the client taps "Mark as sent" to flip the prospect status to `contacted`. Replies land in the client's normal inbox and can be pasted into the Reply Drafter for a drafted response.

## What is still stubbed

- Reply tracking is not wired. There is no inbound webhook, no classifier, no `pipeline_replies` insert path. The classification column accepts values but nothing writes them.
- Meeting booking off a positive reply is not wired. `pipeline_meetings` is empty in production.

## Production wiring, in place

### 1. Google Places, Hunter, Anthropic, site reader

Four pieces are actually wired into the orchestrator at `src/lib/pipeline/generator/run.ts`:

- Google Places API for SA business discovery. Env: `GOOGLE_PLACES_API_KEY` (Maps Platform).
- Site reader, in-house HTML scraper at `src/lib/pipeline/scraper/site-reader.ts`. No key required.
- Hunter.io email finder and verifier. Env: `HUNTER_API_KEY`.
- Anthropic Claude Haiku for the personalised one-sentence opener. Env: `ANTHROPIC_API_KEY` (already used elsewhere in the codebase).

When `GOOGLE_PLACES_API_KEY` is missing the orchestrator falls back to a deterministic mock generator so local development is unblocked. Per-prospect errors are isolated.

### 2. Cost per prospect

Per prospect cost in USD:

- Google Places (Text Search plus Place Details): about USD 0.034.
- Hunter (Domain Search plus Verifier): about USD 0.05.
- Anthropic Claude Haiku (one short opener): about USD 0.0002.
- Total: about USD 0.085.

A 30-prospect run costs about USD 2.55. A 100-prospect run costs about USD 8.50. Pricing should reflect this.

### 3. Reply classification

Start with a deterministic keyword classifier. Upgrade later to a model-backed classifier if accuracy is not good enough.

Classifier interface:

```ts
type ReplyClassification =
  | 'interested'
  | 'not_interested'
  | 'ooo'
  | 'wrong_person'
  | 'ask_later'
  | 'unclassified';

function classifyReply(input: {
  subject: string;
  body: string;
}): { classification: ReplyClassification; confidence: number };
```

Rules for the keyword pass:

- `ooo` if the body matches out-of-office phrases (out of office, on leave, away until, vacation).
- `not_interested` if the body matches unsubscribe phrases (not interested, please remove, unsubscribe, do not contact).
- `wrong_person` if the body matches forward phrases (wrong person, no longer here, try, you want).
- `ask_later` if the body matches defer phrases (next quarter, after the holidays, in a few months, follow up later).
- `interested` if the body matches yes phrases (sounds good, sure, happy to chat, send a time, book in, when).
- Otherwise `unclassified`.

Write the result and a small confidence score into `pipeline_replies.classification`. The follow-up agent reads from this column.

### 4. Calendar booking

When a reply is classified `interested`, automatically send the booking link, do not wait for the tenant to respond. Reuse the Instant Reply 60s pattern in `src/lib/instant-reply` (do not edit it from this lane).

Flow:

1. Classifier writes `classification = 'interested'` to `pipeline_replies`.
2. A row is inserted into `pipeline_meetings` with `status = 'booked'` and `meeting_url` set to the tenant's `businesses.booking_link_url`.
3. A reply is sent within 60 seconds using the same dispatcher used by Instant Reply, with the booking link.
4. `pipeline_replies.actions_taken` is appended with `{ type: 'sent_booking_link', at: <timestamp> }`.

When the prospect picks a slot on the calendar, the calendar webhook updates `pipeline_meetings.scheduled_at` and `meeting_url` if a per-meeting URL is generated.

## Cost notes

Per-prospect cost lives in the section above. Rough monthly cost at small scale, in USD:

- Google Places, Maps Platform pay-as-you-go: about USD 0.034 per prospect.
- Hunter.io, starter plan: about USD 0.05 per prospect.
- Anthropic Claude Haiku, opener generation: about USD 0.0002 per prospect.
- Sending: zero. Qwikly clients send from their own Gmail or Outlook, so there is no SMTP cost, no mailbox subscription, no warmup spend.

For a tenant running one 500-prospect run per month, expect roughly USD 42.50 in third-party cost (about R800), before Qwikly margin. Pricing should reflect this.

## Compliance

Outbound email in South Africa is regulated by POPIA. Pipeline must:

- Only send to business contact addresses, never to personal addresses, and never to consumer contact lists.
- Include a clear opt-out in every email. The opt-out must be a one-click unsubscribe, not a reply-stop. The phrase used in the templates is, "If you would rather not hear from us, click here to opt out, no follow-up."
- Maintain a per-tenant suppression list. When a prospect opts out, write `pipeline_prospects.status = 'dead'` and keep the row so the address is never re-contacted. The suppression list is also exported on tenant offboarding.
- Never share suppression lists across tenants. POPIA treats each tenant as a separate responsible party.
- Honour direct unsubscribes received as replies. The Qwikly client marks the prospect as `dead` and never re-contacts them.

The Pipeline service is opt-in per tenant. The setup flow captures explicit confirmation that the tenant has lawful basis to contact the audience defined in the ICP. Because the tenant sends from their own email account, they remain the responsible party under POPIA for every outbound message.
