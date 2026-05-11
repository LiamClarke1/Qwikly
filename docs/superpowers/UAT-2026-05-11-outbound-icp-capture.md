# UAT Checklist — Outbound Pipeline ICP Capture v1

**Date:** 2026-05-11
**Plan:** [2026-05-11-outbound-icp-capture.md](./plans/2026-05-11-outbound-icp-capture.md)
**Status:** All 27 implementation tasks complete. Awaiting human UAT + deploy.

## Pre-deploy checklist

### Database migrations to apply (in order)

1. `supabase/migrations/20260511_outbound_v1.sql` — adds `clients.products`, `clients.pipeline_daily_quota`, creates `pipeline_api_usage` table, adds `pipeline_prospects.delivery_batch_date` + `delivery_batch_kind` columns.
2. `supabase/migrations/20260511_outbound_v1_signup_plans.sql` — widens `clients_plan_check` + `subscriptions_plan_check` to include `pipeline_lite` and `pipeline_pro`. Also retroactively fixes `subscriptions_plan_check` to include `business`/`enterprise` (pre-existing bug surfaced during Task 6).

Run via `npx supabase db push` against the linked project. Both migrations are idempotent (use `IF NOT EXISTS` everywhere).

### Environment variables to set in Vercel (production)

- `CRON_SECRET` — random 32+ char string. The daily trickle cron returns 401 without it. Run: `vercel env add CRON_SECRET production` and paste a value from `openssl rand -hex 32`.
- `GOOGLE_PLACES_API_KEY` — already set if scraper has been running. Confirm.
- `HUNTER_API_KEY` — already set if Hunter calls have been working. Confirm.
- `ANTHROPIC_API_KEY` — already set for the inbound chat. Confirm.

### Vercel cron entry

`vercel.json` now includes `{ "path": "/api/pipeline/trickle", "schedule": "0 6 * * 1-5" }` (06:00 UTC = 08:00 SAST, Mon-Fri only). Vercel will auto-register the cron on deploy.

## Test scenarios

### Scenario 1: New Pipeline Lite customer signup → first batch

1. Open production in a fresh browser profile (no session).
2. Navigate to `/signup?plan=pipeline_lite`.
3. Complete signup.
4. Confirm in Supabase:
   - `clients` row created with `products = ['outbound']`, `pipeline_daily_quota = 3`, `plan = 'pipeline_lite'`.
5. Land on dashboard.
6. Verify:
   - Persistent banner at the top of every dashboard page: "Your lead engine isn't set up yet..."
   - Yellow dot on the Pipeline nav item.
7. Click "Finish setup" → routes to `/dashboard/pipeline/setup` → Wizard renders (NOT IcpForm).
8. Enter website URL + offer (one sentence) → click "Build my ICP".
9. Watch the 3-phase loading screen. Should advance every ~18s. Total wait: 30-90 seconds.
10. Land on review screen. Verify:
    - Every ICP field is pre-filled with reasonable values.
    - "Why?" tooltips appear next to at least 4 fields, opening a citation when clicked.
    - Edit any field → state updates.
11. Click "Save and generate my first 5 prospects".
12. Wait (up to 3 min).
13. Land on `/dashboard/pipeline?firstBatch=1`.
14. Verify:
    - "Your first 5 best-fit prospects" hero section at the top.
    - 5 (or fewer, if pool was thin) prospect rows rendered, each with score ≥ 9 and verified email.
    - Banner and yellow nav dot are GONE.
15. Confirm in Supabase:
    - `pipeline_prospects` has 5 rows with `delivery_batch_date = today`, `delivery_batch_kind = 'first_batch'`, `business_id` matches the tenant.
    - `api_usage` has a row with `source = 'pipeline_icp_synthesis'`.
    - `pipeline_api_usage` has rows for Google Places + Hunter calls.

### Scenario 2: Inbound-only customer unaffected

1. Sign up at `/signup?plan=starter` (Inbound tier).
2. Confirm in Supabase: `products = ['inbound']`.
3. Land on dashboard.
4. Verify:
    - NO Pipeline setup banner.
    - NO yellow nav dot on Pipeline.
    - Inbound widget setup flow works as before.

### Scenario 3: Refine ICP after launch

1. As a Pipeline tenant with a saved ICP, navigate to `/dashboard/pipeline/setup`.
2. Verify: IcpForm renders (the existing form, NOT the wizard).
3. Edit a field, save.
4. Verify the next trickle batch reflects the new ICP.

### Scenario 4: Trickle cron

1. After Scenario 1 has set up at least one outbound tenant, run the cron manually:
   ```
   curl -H "Authorization: Bearer $CRON_SECRET" https://www.qwikly.co.za/api/pipeline/trickle
   ```
2. Expected response: `{ ran: N, results: [{ clientId, created, capReached }, ...] }`.
3. Confirm in Supabase: each outbound tenant got 3 (Lite) or 8 (Pro) new `pipeline_prospects` with `delivery_batch_kind = 'daily_trickle'`.

### Scenario 5: Cap enforcement

1. For a test tenant, manually insert rows into `pipeline_api_usage` totalling close to the cap (R250 / R750).
2. Try to run the generator (via the cron or the wizard).
3. Expected: response includes `capReached: true`, no new prospects, no new pipeline_api_usage rows.
4. Tenant sees friendly message in the wizard UI.

### Scenario 6: Verification harness

Run against a known-good tenant ID:
```
cd ~/qwikly-site
npx tsx scripts/verify-pipeline-tenant.ts <client_id>
```
Expected output:
```
[PASS] client has outbound product
[PASS] ICP saved
[PASS] business profile exists
[PASS] generator produces >=3 high-fit verified prospects
[PASS] lead notification delivered
All green. Tenant is ready.
```
Exit code: 0.

### Scenario 7: Usage dashboard

1. As an outbound tenant, navigate to `/dashboard/usage`.
2. Verify the new "Pipeline data (Google Places + Hunter)" card renders below the conversations card.
3. Numbers match summed `pipeline_api_usage.wholesale_cost_zar_cents` for the current month.
4. Progress bar shows fraction of the cap consumed.
5. As an inbound-only tenant, the card does NOT render.

## Cap calibration

The starting caps in `src/lib/pipeline/billing/cap-check.ts` are:
- `pipeline_lite`: R250/month
- `pipeline_pro`: R750/month

After running Scenarios 1 + 6 against a real test tenant, sum the actual wholesale spend:
```sql
SELECT
  provider,
  SUM(wholesale_cost_zar_cents) / 100.0 AS zar_spent
FROM pipeline_api_usage
WHERE client_id = <test_client_id>
  AND billing_period = date_trunc('month', now())::date
GROUP BY provider;
```

If the per-tenant total for one full setup + month of trickle is materially under R250 (Lite) / R750 (Pro), the caps stand. If over, raise them in `cap-check.ts` and re-commit. Add a `// Calibrated 2026-MM-DD against test tenant X` comment so the next maintainer knows the numbers are grounded.

## Open follow-ups (post-v1)

1. **Landing page copy** — `/pipeline` currently says "Up to 1,500 prospects per month" (Lite) and "Up to 5,000" (Pro). Update to the quality-led framing: "3 hand-picked, ICP-matched, contact-verified prospects every business day" (Lite) / "8" (Pro). Not in scope for this sprint.
2. **OAuth signup path** — `/auth/callback/route.ts` currently downgrades `?plan=pipeline_lite` to `'trial'` via `resolvePlan`. If you ever expose Pipeline plans via Google OAuth signup, add the `products` / `pipeline_daily_quota` plumbing there too. Flagged by Task 6.
3. **CRON_SECRET rotation** — set a calendar reminder to rotate every 6 months.
4. **Vitest 4.x `--passWithNoTests`** — `npm test` exits 1 when there are zero matching test files. Add `--passWithNoTests` to the script if CI ever needs to tolerate empty runs.
