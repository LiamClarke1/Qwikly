# Pipeline Platform Spec

Pipeline is the outbound side of Qwikly. Tenants run a five-step setup, the system generates a seed list, warms sending domains, runs a cadence, classifies replies, and books meetings. This document describes what is built today, what is stubbed, and what is required to switch each stub on in production.

## What is built today

- Dashboard surface at `/dashboard/pipeline/**`, owned by the dashboard agent. Read-only views over the tables defined in this migration.
- Setup wizard at `/dashboard/pipeline/setup`, owned by the wizard agent. Writes to `pipeline_setup_state` (one row per business) and pushes ICP, seed list, sending domains, and copy approvals as JSONB.
- Prospect generator at `/api/pipeline/generate`, currently a stub. Returns deterministic mock prospects so the rest of the flow can be exercised end to end. Internal-token gated.
- Setup notify at `/api/pipeline/setup/notify`, session gated, used by the wizard to mark a step complete and push the next-step prompt.
- Schema (this migration): `pipeline_setup_state`, `pipeline_campaigns`, `pipeline_prospects`, `pipeline_replies`, `pipeline_sending_domains`, `pipeline_meetings`. All tenant scoped via `businesses.user_id = auth.uid()`.
- Templates for the cadence copy live in `src/lib/pipeline/templates` (owned by another agent). The wizard writes approvals into `pipeline_setup_state.copy_approvals`.

## What is stubbed

- The prospect generator returns mock data only. There is no real search, no real verification, no real LinkedIn enrichment. `pipeline_prospects.email_verified` is always written as false.
- The cadence sender is not wired. There is no real email delivery, no warmup, no daily cap enforcement, no domain rotation. `pipeline_campaigns.sent_count` is updated by the stub for shape only.
- Reply tracking is not wired. There is no inbound webhook, no classifier, no `pipeline_replies` insert path. The classification column accepts values but nothing writes them.
- Domain provisioning is not wired. `pipeline_sending_domains.status` defaults to `provisioning` and stays there.
- Meeting booking off a positive reply is not wired. `pipeline_meetings` is empty in production.

## Production wiring required, in order

### 1. Prospect data provider

Pick one provider for prospect search and enrichment, plus one provider for email verification. Recommendation: Apollo for search and enrichment, Hunter for verification.

API surface needed:

- `searchByCriteria({ industry, country, city, employees, titles, intent_signals })` returns a page of candidate prospects. Map each candidate into `pipeline_prospects` with `source = 'apollo'`.
- `enrichByCompany({ domain })` returns firmographic and headcount data, written into `pipeline_prospects.industry`, `employees`, `city`, `country`.
- `verifyEmail({ email })` returns one of valid, risky, invalid, unknown. Only valid flips `pipeline_prospects.email_verified` to true. Risky and unknown stay unverified, invalid drops the row to `status = 'dead'`.

Env vars: `APOLLO_API_KEY`, `HUNTER_API_KEY`. Add a feature flag `PIPELINE_USE_LIVE_PROVIDER` so the stub stays available for local development.

### 2. Cold email infrastructure

Pick one provider for sending and warmup. Recommendation: Smartlead, with Instantly as the fallback if Smartlead pricing changes.

What the provider must cover:

- Domain provisioning. Buy or accept a tenant-owned root domain, set up DNS (SPF, DKIM, DMARC, MX), provision two to four mailboxes per domain. Write the result into `pipeline_sending_domains`, flip `status` to `warming` once DNS validates.
- Mailbox warmup. Provider sends warmup volume on autopilot. When warmup completes, set `warmup_complete_at` and flip status to `live`. The `daily_send_cap` ramps from a small starting value (10 per day) to the configured ceiling (50 per day default).
- Sending cadence. Pipeline pushes a campaign payload to the provider. The provider handles per-mailbox rotation, time-of-day windows, and weekday-only sending. The cadence agent (`src/lib/pipeline/**`) is responsible for building the payload, the provider is responsible for delivery.
- Reply forwarding. Provider must forward replies via webhook to `/api/pipeline/replies/inbound`. That handler writes a `pipeline_replies` row and triggers the classifier.

Env vars: `SMARTLEAD_API_KEY`, `SMARTLEAD_WEBHOOK_SECRET`, optional `INSTANTLY_API_KEY`.

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

Rough monthly cost at small scale, in ZAR:

- Apollo, basic plan with 1,000 credits: about R900 per month.
- Hunter, starter plan: about R600 per month.
- Smartlead, basic plan: about R1,300 per month, plus mailbox cost (Google Workspace at R150 per mailbox per month, four mailboxes per tenant gives R600 per tenant).
- Domain registration: about R200 per domain per year.

For a tenant running one campaign with 500 prospects per month, expect roughly R3,500 per month in third-party cost, before Qwikly margin. Pricing should reflect this.

## Compliance

Outbound email in South Africa is regulated by POPIA. Pipeline must:

- Only send to business contact addresses, never to personal addresses, and never to consumer contact lists.
- Include a clear opt-out in every email. The opt-out must be a one-click unsubscribe, not a reply-stop. The phrase used in the templates is, "If you would rather not hear from us, click here to opt out, no follow-up."
- Maintain a per-tenant suppression list. When a prospect opts out, write `pipeline_prospects.status = 'dead'` and keep the row so the address is never re-contacted. The suppression list is also exported on tenant offboarding.
- Never share suppression lists across tenants. POPIA treats each tenant as a separate responsible party.
- Honour direct unsubscribes received as replies. The classifier writes `not_interested` and the cadence sender must stop on the next tick.

The Pipeline service is opt-in per tenant. The setup wizard captures explicit confirmation that the tenant has lawful basis to contact the audience defined in the ICP, and that confirmation is stored in `pipeline_setup_state.copy_approvals`.
