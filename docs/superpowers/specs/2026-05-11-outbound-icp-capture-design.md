# Design — Outbound Pipeline: rich auto-filled ICP capture + first-batch delivery

**Date:** 2026-05-11
**Owner:** Liam Clarke
**Sprint:** Outbound v1 (sprint 1 of N)
**Status:** Design — pending implementation plan

---

## Problem

Qwikly sells two products: the inbound Digital Assistant (chat widget on the client's site) and the outbound Pipeline (managed lead engine). Today, the Outbound product has the engine pieces in place — Google Places scraper, Hunter email enrichment, site reader, Anthropic-backed ICP suggester, scoring, dashboard — but the ICP capture is too thin to drive high-quality results. A new client is dropped into a blank ICP form and asked to define their own ideal customer profile. Most won't, or will fill it shallowly, and the scraper produces generic prospects that don't match what the client actually wanted.

The product promise is **the 5 prospects today that are actually worth contacting**, not raw volume. To deliver on that promise, we need a deep, auto-filled ICP captured during onboarding, plus a daily trickle of high-fit prospects sized to the client's plan.

This design covers the Outbound branch only. The Inbound assistant setup is unchanged in this sprint.

## Goals

1. A new Pipeline customer goes from signup to **5 verified, ICP-fit prospects on screen** in a single session. This first batch is a one-time welcome experience and is always 5 regardless of tier, designed to prove the product works before the first daily trickle lands.
2. The ICP is captured in **under 30 seconds of typing** by the client (URL + one-sentence offer). Our system fills the rest using site reader, Google Business Profile, and an Anthropic synthesis step.
3. Every pre-filled field is editable, with a **"Why?" tooltip** showing the source of the suggestion (e.g. "From your homepage hero" or "From your Google Business Profile").
4. After saving the ICP, **3 prospects/day (Lite) or 8 prospects/day (Pro)** are delivered to the dashboard each business day, picked from the top of the scored pool. These are *additional* to the first-batch 5.
5. **Inbound-only customers never see Pipeline UI**. The product gating is driven by a `products` array on the client record.
6. **All API costs are tracked per-tenant** in the same pattern as the existing Inbound `api_usage` infrastructure. A new `pipeline_api_usage` table covers Google Places + Hunter calls. Hard-stop caps protect Qwikly's gross margin floor.
7. **Every number shown to the client is a count of real DB rows**, never an estimate. (Saved feedback rule: "Client Reporting Accuracy Standards.")
8. **Lead notifications still reach the client** end-to-end after every change. (Saved feedback rule: "Lead notifications must always reach the client.")

## Non-goals (deferred to follow-up sprints)

- Inbound assistant setup richness (separate sprint, same auto-fill pattern can be applied later)
- Booked-meeting tracking (we can't see the client's inbox; defer)
- Sprint mode, hot keys, reply drafter, voice notes — those are Mission Control founder-tooling, not paying-customer features
- Bring-your-own-API-keys — Qwikly holds master keys; per-tenant metered billing covers cost (mirrors Inbound)
- Outbound email sending on behalf of the client — they handle send themselves (Outlook / WhatsApp / their own SMTP)
- Refresh of landing page copy ("Up to 1,500 prospects per month" → quality framing) — flagged as separate task
- Bulk select, snooze, per-prospect notes/tags from the Mission Control HTML — not v1

## Architecture overview

### Product gating

A new `products` text[] column on `clients` controls which product UI a tenant sees:

- `products = ['inbound']` → existing Digital Assistant flow only, no Pipeline nav, no Pipeline wizard
- `products = ['outbound']` → no Inbound widget setup, Pipeline wizard required
- `products = ['inbound','outbound']` → both setups in sequence (Inbound first, then Pipeline)

Signup determines the value from the `?plan=` query parameter:
- `?plan=trial|starter|pro|business|enterprise` → `['inbound']`
- `?plan=pipeline_lite|pipeline_pro` → `['outbound']`
- `?plan=combo_*` (future) → `['inbound','outbound']`

A second column `pipeline_daily_quota` int stores the per-day prospect cap (3 for Lite, 8 for Pro). Stored on the client (not derived from plan tier) so we can hand-tune for individual customers without code changes.

### Routing into the wizard

The wizard is **optional, not forced** — paying clients are not blocked from the dashboard. Instead, three soft signals make it impossible to miss:

1. **Persistent banner at the top of every dashboard page** (for tenants with `outbound` in `products` and no ICP saved): "Your lead engine isn't set up yet. Finish setup to start receiving prospects — takes 3 minutes." The banner has a prominent "Finish setup" CTA that opens the wizard at `/dashboard/pipeline/setup`. The banner is dismissable for the current session but reappears on next login until setup completes.
2. **Yellow status dot on the Pipeline nav item** until ICP is saved. Disappears the moment the first batch lands.
3. **The Pipeline tab itself stays gated** — clicking it routes to the wizard, not an empty dashboard. We don't want to show a confusing zero-state to a paying customer.

The rest of the dashboard (Settings, Billing, Inbound widget for combo clients) is fully accessible. The user can choose to do everything else first and run the wizard later, but cannot use the Pipeline product itself until it's set up — which is the honest behaviour.

A combo client (`['inbound','outbound']`) sees the Pipeline banner only after Inbound is complete (so they're not staring at two setup banners simultaneously). The two flows are independent but Inbound is shown first by convention.

### Wizard flow (3 screens, single session)

**Screen 1 — Intake.** Two fields: website URL, one-sentence offer. Submit posts to `POST /api/pipeline/icp/enrich`.

**Screen 2 — Enrichment loading.** The client sits on a progress screen with three labelled phases:
1. "Reading your website..." — `siteReader(url)` returns title, hero copy, services list, brand voice hints
2. "Looking up your business profile..." — `googlePlacesProfileLookup(url, offer)` resolves the client's own Google Business Profile (used to infer location served, business size band, industry classification)
3. "Building your ideal customer profile..." — Anthropic Sonnet call with a structured prompt that takes site + GBP context + offer and returns a fully-formed ICP JSON

If any step fails, we surface a clear error with a retry button. We do not silently fall back to defaults — the client must know what was inferred and what wasn't.

**Screen 3 — Review & refine.** The pre-filled ICP renders as the existing IcpForm with two changes:
- Each field shows a small "ⓘ Why?" pill that opens a tooltip with the source of the suggestion ("Pulled from your homepage hero," "From your Google Business Profile location," "Synthesised from your offer + industry")
- A "Save and generate my first 5 prospects" CTA at the bottom

Saving:
1. Persists the ICP via the existing `updateSetupState`
2. Calls `POST /api/pipeline/generate` synchronously with `firstBatch: true, count: 5`
3. The generator runs Google Places + Hunter + scoring, dedupes against any pre-existing rows, picks the top 5 by score, writes them to `pipeline_prospects` with `delivery_batch_date = today`
4. Redirects to `/dashboard/pipeline` which now shows "Your first 5 prospects" at the top

**Failure handling on first batch:** if the generator can't produce 5 prospects (rare — usually means an extremely narrow ICP), it returns whatever it found with a banner "We found {n} prospects matching your ICP. Refine your targeting to widen the pool." The wizard remains marked complete; the trickle cron will continue trying tomorrow.

### Daily trickle delivery

A Vercel cron at `0 6 * * 1-5` (06:00 UTC, Mon-Fri) iterates every tenant with `products` containing `outbound` and runs the generator with `count = pipeline_daily_quota`. Generated prospects are tagged `delivery_batch_date = today` and surface on the dashboard's "Today's N prospects" header.

The generator must:
1. Query the existing `pipeline_prospects` for this tenant to dedupe (no prospect delivered twice)
2. Score the candidate pool with the existing `scoring.ts`
3. Filter to score ≥ a "high-fit" threshold (target: ≥ 85 if existing scoring tops out at 100; threshold to be confirmed at plan stage by reading `src/lib/pipeline/scoring.ts`) AND email_verified = true (quality bar)
4. Take top N
5. If pool exhausted (no prospects above bar), surface a "We need to widen your ICP" prompt on the dashboard rather than dropping quality

Weekend handling: cron only runs Mon-Fri. Saturday and Sunday show "Off-day — your next batch lands Monday morning."

### Per-tenant cost tracking

The Inbound product writes to `api_usage` on every Anthropic call, tagged with `client_id` and rolled up monthly. We mirror this pattern for Outbound:

**`api_usage`** (existing) — extended only by adding new `source` values:
- `'pipeline_icp_synthesis'` for the wizard's Anthropic call
- `'pipeline_prospect_match'` for any per-prospect Anthropic enrichment

**`pipeline_api_usage`** (new) — tracks per-request costs for Google Places and Hunter:
```
id                   uuid pk
client_id            bigint fk clients(id)
occurred_at          timestamptz default now()
provider             text  -- 'google_places' | 'hunter'
endpoint             text  -- 'text_search' | 'place_details' | 'email_finder'
unit_count           int   -- requests, results, etc
wholesale_cost_zar_cents int
billing_period       date  -- date_trunc('month', now())
is_internal          boolean default false
```

Same RLS pattern (owner read, service role write). Same monthly rollup.

**Cap enforcement.** Each pipeline plan has a wholesale-cost cap per month, stored alongside the existing conversation cap logic:
- `pipeline_lite`: R250/month wholesale (~60 prospects at typical rates, 70% margin on R7,500/mo)
- `pipeline_pro`: R750/month wholesale (~160 prospects at typical rates, 70% margin on R15,000/mo)

The generator checks the running monthly wholesale cost before each call and hard-stops when the cap is hit. A capped tenant sees "Monthly data budget reached, top up to continue" — same UX pattern as the existing conversation cap. Top-up uses the existing credit wallet (Phase 3 work already done for Inbound).

The actual wholesale-cap numbers above are starting estimates. They will be **calibrated against the verification harness** (see below) before enable.

### Refine UI

From the dashboard, "Refine targeting" reopens the existing IcpForm pre-loaded with the current ICP. Edits save to the same `pipeline_setup_state.icp`. A note in the editor reads "Changes apply to tomorrow morning's batch — today's prospects stay as-is." This avoids the surprise of mid-day prospects vanishing and matches the trickle cadence.

There is no separate "filter" UI. The ICP IS the filter. Adding a second filtering layer would create two sources of truth and confuse the client.

### Verification harness

Before any client goes live on Outbound, an internal script must run end-to-end against their tenant ID and report:

1. Site reader successfully fetched the URL and extracted ≥ 3 services
2. Google Places successfully resolved their business profile
3. Anthropic synthesis returned a complete ICP (all required fields non-empty)
4. Generator produced ≥ 3 prospects matching the ICP
5. Each prospect has score ≥ 80 AND email_verified
6. `notify-lead` (the existing email notifier) successfully delivered a test notification to the tenant's `notification_email`

If any check fails, the harness returns a non-zero exit code with a clear error. Output is a single-page summary the operator (Liam) reads before flipping the tenant from `setup_complete = false` to `true`.

This satisfies the saved rule: "Every chat-pipeline change must verify the tenant still gets a real-time lead notification end-to-end."

## Components and modules

### New files

- `src/components/pipeline-setup/IntakeScreen.tsx` — Screen 1 of the wizard
- `src/components/pipeline-setup/EnrichmentLoadingScreen.tsx` — Screen 2 with three-phase progress
- `src/components/pipeline-setup/ReviewIcpScreen.tsx` — Screen 3, wraps IcpForm with "Why?" tooltips and the "Save and generate" CTA
- `src/components/pipeline-setup/WhyTooltip.tsx` — small reusable provenance tooltip
- `src/lib/pipeline/enrichment/run.ts` — orchestrates site reader + Google Places + Anthropic synthesis, returns ICP + per-field provenance
- `src/lib/pipeline/enrichment/anthropic-synthesis.ts` — the Claude call with prompt + schema
- `src/lib/pipeline/enrichment/google-places-profile.ts` — looks up the *client's own* business on Google Places (separate concern from prospect scraping)
- `src/lib/pipeline/billing/pipeline-usage.ts` — mirrors `api-usage.ts` for Google Places + Hunter cost tracking
- `src/lib/pipeline/billing/cap-check.ts` — hard-stop cap enforcement
- `src/app/api/pipeline/icp/enrich/route.ts` — POST endpoint that runs enrichment, returns pre-filled ICP + provenance
- `scripts/verify-pipeline-tenant.ts` — verification harness CLI
- `supabase/migrations/20260511_outbound_v1.sql` — migration for `clients.products`, `clients.pipeline_daily_quota`, `pipeline_api_usage`

### Existing files modified

- `src/components/dashboard/PipelineSetupBanner.tsx` (new) — the persistent setup banner shown on dashboard pages for outbound tenants without an ICP
- `src/components/dashboard/Nav.tsx` (or equivalent) — add the yellow status dot to the Pipeline nav item when setup is incomplete
- `src/app/(app)/dashboard/pipeline/page.tsx` — if no ICP saved, redirect to `/dashboard/pipeline/setup` instead of rendering an empty dashboard (Pipeline tab gating; rest of dashboard untouched)
- `src/app/(app)/signup/page.tsx` — route Pipeline plan IDs to `products=['outbound']`
- `src/app/(app)/dashboard/pipeline/setup/page.tsx` — render the new 3-screen wizard instead of bare IcpForm
- `src/app/api/pipeline/generate/route.ts` — accept `firstBatch: true, count: N`, hard-stop on cap, write `delivery_batch_date`
- `src/lib/pipeline/generator/run.ts` — score ≥ 80 AND email_verified gating, dedupe against existing rows for tenant
- `src/lib/pipeline/scraper/google-places.ts` — wrap calls in `recordPipelineUsage()`
- `src/lib/pipeline/scraper/hunter.ts` — wrap calls in `recordPipelineUsage()`
- `src/app/(app)/dashboard/pipeline/page.tsx` — add "Today's N prospects" header, "Refine targeting" button, gate behind `delivery_batch_date = today`
- `src/app/(app)/dashboard/usage/page.tsx` — add "Pipeline data costs" row alongside existing conversation usage
- `vercel.json` — add the daily 06:00 UTC cron for trickle delivery

## Data flow

```
Signup with ?plan=pipeline_lite
   ↓
clients row created with products=['outbound'], pipeline_daily_quota=3
   ↓
Middleware redirects /dashboard → /dashboard/pipeline/setup
   ↓
Screen 1: client enters URL + offer
   ↓
POST /api/pipeline/icp/enrich
   ├── siteReader(url)                  → records site fetch (no API cost)
   ├── googlePlacesProfileLookup(url)    → records pipeline_api_usage row
   └── anthropicSynthesise(...)          → records api_usage row, source='pipeline_icp_synthesis'
   ↓
Returns { icp, provenance }
   ↓
Screen 3: client reviews, edits, saves
   ↓
PATCH pipeline_setup_state + POST /api/pipeline/generate { firstBatch:true, count:5 }
   ├── Cap check (would this run breach the wholesale cap?) → if yes, return 402 with "Top up"
   ├── Google Places search by ICP                          → records pipeline_api_usage rows
   ├── Hunter email enrichment per result                   → records pipeline_api_usage rows
   ├── Score, filter to score ≥ 80 AND email_verified, dedupe
   └── Insert top 5 with delivery_batch_date = today
   ↓
Redirect to /dashboard/pipeline → "Your first 5 prospects"
   ↓
[Tomorrow 06:00 UTC]
Cron runs the same generator with count=3
   ↓
3 new prospects appear with delivery_batch_date = tomorrow
   ↓
notify-lead emails the tenant's notification_email
```

## Database migration

```sql
-- 20260511_outbound_v1.sql

-- Product gating
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS products              text[] NOT NULL DEFAULT ARRAY['inbound']::text[],
  ADD COLUMN IF NOT EXISTS pipeline_daily_quota  int    NOT NULL DEFAULT 3;

-- Backfill existing tenants — assume inbound only unless overridden
UPDATE clients SET products = ARRAY['inbound']::text[] WHERE products IS NULL;

-- Pipeline data-cost tracking (mirrors api_usage shape, request-based not token-based)
CREATE TABLE IF NOT EXISTS pipeline_api_usage (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id                bigint      NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  occurred_at              timestamptz NOT NULL DEFAULT now(),
  provider                 text        NOT NULL,    -- 'google_places' | 'hunter'
  endpoint                 text        NOT NULL,    -- 'text_search' | 'place_details' | 'email_finder'
  unit_count               int         NOT NULL DEFAULT 1,
  wholesale_cost_zar_cents int         NOT NULL DEFAULT 0,
  billing_period           date        NOT NULL DEFAULT date_trunc('month', now())::date,
  is_internal              boolean     NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_pipeline_api_usage_client_period ON pipeline_api_usage (client_id, billing_period);

ALTER TABLE pipeline_api_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY pipeline_api_usage_owner_read ON pipeline_api_usage
  FOR SELECT
  USING (client_id::text IN (
    SELECT id::text FROM clients WHERE auth_user_id = auth.uid()
  ));

-- Delivery batch tracking on prospects
ALTER TABLE pipeline_prospects
  ADD COLUMN IF NOT EXISTS delivery_batch_date date;

CREATE INDEX IF NOT EXISTS idx_pipeline_prospects_client_batch
  ON pipeline_prospects (client_id, delivery_batch_date);
```

## Anthropic synthesis prompt (sketch)

```
You are an expert B2B sales strategist. Given a company's website content, their
Google Business Profile data, and their one-sentence offer, return a structured
Ideal Customer Profile (ICP) for outbound prospecting.

Inputs:
- Website hero, services, about copy: {site_reader_output}
- Google Business Profile (location, category, size band): {gbp_output}
- Offer: {offer}

Return JSON matching this schema (all fields required):
{
  "industries":      [string]   // 3-5 industries to target
  "titles":          [string]   // 4-6 titles to reach
  "sizeMin":         number     // company size band lower
  "sizeMax":         number     // company size band upper
  "locations":       [string]   // 2-4 cities/regions
  "intentSignals":   [string]   // 2-4 signals that indicate readiness
  "dealValueZar":    number     // estimated typical deal size in ZAR
}

Plus, for each field, a "provenance" entry:
{
  "industries":     { "source": "site_hero" | "gbp_category" | "offer" | "synthesis", "evidence": "..." }
  ...
}
```

The provenance entries drive the "Why?" tooltips on the review screen.

## Error handling

- **Site reader fails** (URL unreachable, blocked, no content) → continue with empty site context. Surface "We couldn't read your site, so the ICP is based only on your offer. Edit any field to refine."
- **Google Places lookup fails** (rate limit, no match) → continue with empty GBP context. Same surfacing.
- **Anthropic synthesis fails** → hard error, retry button. Without the synthesis we can't pre-fill, and falling back to a blank form defeats the entire design.
- **First batch produces 0 prospects** → wizard completes anyway, dashboard shows "We need to widen your ICP — your current targeting is too narrow." Refine link prominent.
- **First batch produces 1-4 prospects** → wizard completes, dashboard shows what was found with the same widen prompt.
- **Cap reached during enrichment** → 402 response, "Monthly data budget reached. Top up to continue." Same flow as Inbound conversation cap.
- **Cron run fails for a tenant** → logged to existing logging infra, retried on next day. We don't bombard the tenant with error emails.

## Testing

- **Unit:** enrichment orchestrator with mocked site/GBP/Anthropic responses; generator with mocked scraper outputs; cap check with various usage rows.
- **Integration (Supabase):** wizard end-to-end with the test database, verify migrations apply cleanly, verify RLS prevents cross-tenant reads of `pipeline_api_usage`.
- **Verification harness:** the script described above, run against a known-good tenant ID before enable.
- **Manual UAT:** Liam runs the wizard as a fresh Pipeline Lite signup, confirms the 5-prospect first batch lands and is recognisably ICP-fit.
- **Regression:** existing Inbound flow untouched, all existing tests still pass, `notify-lead` end-to-end test still green.

## Pricing copy implications (out of sprint, flagged)

The current landing page copy says "Up to 1,500 prospects per month" (Lite) and "Up to 5,000" (Pro). After this sprint, the actual delivery is 3/day or 8/day (60 or 160 per month). The copy needs to change to a quality-led framing — "3 hand-picked, ICP-matched, contact-verified prospects every business day" — to keep our reporting-accuracy promise. Filed as separate task.

## Open questions for review

None at design time — all blocking questions resolved in conversation.

Items intentionally left to plan stage:
- Exact Anthropic model choice (Sonnet vs Haiku for synthesis — Sonnet for quality on first run, can fall back later)
- Exact wholesale cap numbers (R250 / R750 are starting estimates, will be calibrated against verification harness output)
- Vercel cron schedule: `0 6 * * 1-5` UTC = 08:00 SAST year-round (SA doesn't observe DST). 08:00 SAST aligns with the Mission Control workflow ("morning send block at 08:00").
- "Why?" tooltip exact UI treatment — pill, hover, click — to be decided in implementation
