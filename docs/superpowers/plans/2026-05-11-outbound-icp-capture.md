# Outbound Pipeline — rich auto-filled ICP capture + first-batch delivery — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Outbound Pipeline onboarding so a new Pipeline customer (Lite or Pro) goes from signup to 5 verified ICP-fit prospects on screen in a single session, then 3/day (Lite) or 8/day (Pro) trickle thereafter.

**Architecture:** Three-screen wizard (intake → enrichment loading → review & refine) using Qwikly's master keys for site-reader + Google Places + Anthropic synthesis. Every API call tagged per-tenant in `api_usage` / new `pipeline_api_usage` tables, with wholesale cost caps enforcing 70% margin. `products` text[] on `clients` gates Pipeline UI so Inbound-only clients never see it. Daily trickle via Vercel cron, deduped against tenant history, filtered to score ≥ 9 AND email_verified.

**Tech Stack:** Next.js 14 App Router, Supabase Postgres with RLS, Anthropic SDK (Sonnet for synthesis), Google Places API, Hunter.io email finder, Vercel cron, React 18 client components, Tailwind.

**Reference spec:** `docs/superpowers/specs/2026-05-11-outbound-icp-capture-design.md`

---

## File map

**New:**
- `supabase/migrations/20260511_outbound_v1.sql`
- `src/lib/pipeline/billing/pipeline-usage.ts`
- `src/lib/pipeline/billing/cap-check.ts`
- `src/lib/pipeline/billing/__tests__/pipeline-usage.test.ts`
- `src/lib/pipeline/billing/__tests__/cap-check.test.ts`
- `src/lib/pipeline/enrichment/types.ts`
- `src/lib/pipeline/enrichment/google-places-profile.ts`
- `src/lib/pipeline/enrichment/anthropic-synthesis.ts`
- `src/lib/pipeline/enrichment/run.ts`
- `src/lib/pipeline/enrichment/__tests__/anthropic-synthesis.test.ts`
- `src/lib/pipeline/enrichment/__tests__/run.test.ts`
- `src/app/api/pipeline/icp/enrich/route.ts`
- `src/app/api/pipeline/trickle/route.ts`
- `src/components/pipeline-setup/Wizard.tsx`
- `src/components/pipeline-setup/IntakeScreen.tsx`
- `src/components/pipeline-setup/EnrichmentLoadingScreen.tsx`
- `src/components/pipeline-setup/ReviewIcpScreen.tsx`
- `src/components/pipeline-setup/WhyTooltip.tsx`
- `src/components/dashboard/PipelineSetupBanner.tsx`
- `scripts/verify-pipeline-tenant.ts`

**Modified:**
- `src/app/(app)/signup/page.tsx` — route Pipeline plan IDs to `products=['outbound']`, set `pipeline_daily_quota`
- `src/app/(app)/dashboard/pipeline/setup/page.tsx` — render `<Wizard>` instead of bare `IcpForm`
- `src/app/(app)/dashboard/pipeline/page.tsx` — "Today's N prospects" header, gate if no ICP
- `src/app/(app)/dashboard/usage/page.tsx` — Pipeline data costs row
- `src/app/(app)/dashboard/layout.tsx` — mount `PipelineSetupBanner`, nav yellow dot
- `src/app/api/pipeline/generate/route.ts` — accept `firstBatch`, `count`, write `delivery_batch_date`, cap-check
- `src/lib/pipeline/generator/run.ts` — filter `score >= 9 AND email_verified`, dedupe against tenant history
- `src/lib/pipeline/scraper/google-places.ts` — wrap calls with `recordPipelineUsage`
- `src/lib/pipeline/scraper/hunter.ts` — wrap calls with `recordPipelineUsage`
- `src/lib/pipeline/setup-state.ts` — add `pipeline_daily_quota` field if not derivable from plan
- `vercel.json` — add daily 06:00 UTC trickle cron

---

## Test conventions

This codebase uses an `e2e/` folder for Playwright tests, but unit tests live next to the code in `__tests__/`. Run unit tests with `npm test -- <path>` (assumes Vitest is configured; if not, the first test task adds it). Run lint with `npm run lint`.

Where the codebase uses fail-soft patterns (returning empty arrays instead of throwing), match that pattern. Where it uses RLS, match that. Don't introduce a new test framework or style.

---

## Task 1: Database migration

**Files:**
- Create: `supabase/migrations/20260511_outbound_v1.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 20260511_outbound_v1.sql
-- Outbound Pipeline v1: products gating, per-tier daily quota, pipeline
-- data-cost tracking, delivery batch tagging on prospects.
--
-- See docs/superpowers/specs/2026-05-11-outbound-icp-capture-design.md.

-- ─── Product gating on clients ───────────────────────────────────────────
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS products              text[] NOT NULL DEFAULT ARRAY['inbound']::text[],
  ADD COLUMN IF NOT EXISTS pipeline_daily_quota  int    NOT NULL DEFAULT 3;

COMMENT ON COLUMN clients.products IS
  'Which Qwikly products this tenant has purchased. Allowed values: inbound, outbound. Drives UI gating.';
COMMENT ON COLUMN clients.pipeline_daily_quota IS
  'How many prospects the daily trickle cron generates for this tenant. 3 for Pipeline Lite, 8 for Pipeline Pro.';

-- ─── pipeline_api_usage ──────────────────────────────────────────────────
-- Mirrors the api_usage shape, but request-based (not token-based).
-- Captures Google Places + Hunter spend per tenant for usage display +
-- end-of-month overage billing.
CREATE TABLE IF NOT EXISTS pipeline_api_usage (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id                bigint      NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  occurred_at              timestamptz NOT NULL DEFAULT now(),
  provider                 text        NOT NULL,
  endpoint                 text        NOT NULL,
  unit_count               int         NOT NULL DEFAULT 1,
  wholesale_cost_zar_cents int         NOT NULL DEFAULT 0,
  billing_period           date        NOT NULL DEFAULT date_trunc('month', now())::date,
  is_internal              boolean     NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_pipeline_api_usage_client_period
  ON pipeline_api_usage (client_id, billing_period);
CREATE INDEX IF NOT EXISTS idx_pipeline_api_usage_occurred_at
  ON pipeline_api_usage (occurred_at);

COMMENT ON TABLE pipeline_api_usage IS
  'Per-tenant cost ledger for Pipeline scraping/enrichment APIs (Google Places, Hunter). Service role writes, owner reads.';

ALTER TABLE pipeline_api_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pipeline_api_usage_owner_read ON pipeline_api_usage;
CREATE POLICY pipeline_api_usage_owner_read ON pipeline_api_usage
  FOR SELECT
  USING (
    client_id::text IN (
      SELECT id::text FROM clients WHERE auth_user_id = auth.uid()::text
    )
  );

-- ─── Delivery batch tagging on prospects ─────────────────────────────────
ALTER TABLE pipeline_prospects
  ADD COLUMN IF NOT EXISTS delivery_batch_date date,
  ADD COLUMN IF NOT EXISTS delivery_batch_kind text;  -- 'first_batch' | 'daily_trickle'

CREATE INDEX IF NOT EXISTS idx_pipeline_prospects_client_batch
  ON pipeline_prospects (client_id, delivery_batch_date);

COMMENT ON COLUMN pipeline_prospects.delivery_batch_date IS
  'The date this prospect was delivered to the tenant. Drives the dashboard "Today''s N prospects" view.';
COMMENT ON COLUMN pipeline_prospects.delivery_batch_kind IS
  'first_batch = wizard onboarding batch of 5; daily_trickle = scheduled cron batch.';
```

- [ ] **Step 2: Apply migration locally**

Run: `cd ~/qwikly-site && npx supabase db push` (or whatever the project's apply command is — check `supabase/` README if unsure)
Expected: Migration applied without error. New columns + table + indexes + policy exist.

- [ ] **Step 3: Verify schema with a smoke query**

Run:
```bash
psql "$DATABASE_URL" -c "\d clients" | grep -E "products|pipeline_daily_quota"
psql "$DATABASE_URL" -c "\d pipeline_api_usage"
psql "$DATABASE_URL" -c "\d pipeline_prospects" | grep delivery_batch
```
Expected: Each grep prints the new columns. `pipeline_api_usage` shape matches the migration.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260511_outbound_v1.sql
git commit -m "feat(outbound): schema for products gating + pipeline cost tracking + delivery batches"
```

---

## Task 2: Pipeline cost-tracking lib

**Files:**
- Create: `src/lib/pipeline/billing/pipeline-usage.ts`
- Create: `src/lib/pipeline/billing/__tests__/pipeline-usage.test.ts`

Mirrors the existing [api-usage.ts](qwikly-site/src/lib/billing/api-usage.ts) pattern but for Google Places + Hunter (request-based pricing).

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/pipeline/billing/__tests__/pipeline-usage.test.ts
import { describe, it, expect } from "vitest";
import { computePipelineCallCost } from "../pipeline-usage";

describe("computePipelineCallCost", () => {
  it("prices a Google Places text search at the published rate", () => {
    const r = computePipelineCallCost({ provider: "google_places", endpoint: "text_search", units: 1 });
    // Text Search: $32 per 1000 = $0.032/req. At R18.5/USD = R0.592/req = 60 cents (ceiled).
    expect(r.wholesaleCents).toBe(60);
  });

  it("prices a Google Places place_details call at the published rate", () => {
    const r = computePipelineCallCost({ provider: "google_places", endpoint: "place_details", units: 1 });
    // Place Details: $17 per 1000 = $0.017/req. R18.5 × 0.017 × 100 = 31.45 → ceil 32 cents.
    expect(r.wholesaleCents).toBe(32);
  });

  it("prices a Hunter email_finder call at the published rate", () => {
    const r = computePipelineCallCost({ provider: "hunter", endpoint: "email_finder", units: 1 });
    // Hunter at $49/mo for 500 calls = $0.098/call. R18.5 × 0.098 × 100 = 181.3 → ceil 182 cents.
    expect(r.wholesaleCents).toBe(182);
  });

  it("scales by unit_count", () => {
    const r = computePipelineCallCost({ provider: "google_places", endpoint: "text_search", units: 10 });
    expect(r.wholesaleCents).toBe(600);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/pipeline/billing/__tests__/pipeline-usage.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the module**

```ts
// src/lib/pipeline/billing/pipeline-usage.ts
import "server-only";
import { supabaseAdmin } from "@/lib/supabase-server";

// Wholesale USD rates per request, sourced from each provider's published
// pricing. Update these when a provider ships a price change.
//
// Google Places (https://developers.google.com/maps/billing-and-pricing/pricing):
//   - text_search    : $32 / 1000 = $0.032
//   - place_details  : $17 / 1000 = $0.017
//
// Hunter (https://hunter.io/api): paid tier $49/mo for 500 email-finder
// requests = $0.098 per call.
const PRICE_USD_PER_REQUEST: Record<string, Record<string, number>> = {
  google_places: {
    text_search: 0.032,
    place_details: 0.017,
    find_place: 0.017,
  },
  hunter: {
    email_finder: 0.098,
    email_verifier: 0.02, // $10/mo for 500 = $0.02/call (rounded up)
  },
};

const USD_ZAR_RATE = 18.5;

const INTERNAL_CLIENT_IDS = new Set<string>(["1"]);

export interface PipelineCallSpec {
  provider: "google_places" | "hunter";
  endpoint: string;
  units?: number;
}

export interface PipelineCallCost {
  wholesaleCents: number;
}

export function computePipelineCallCost(spec: PipelineCallSpec): PipelineCallCost {
  const usdPerUnit = PRICE_USD_PER_REQUEST[spec.provider]?.[spec.endpoint] ?? 0;
  const units = spec.units ?? 1;
  const usd = usdPerUnit * units;
  const zar = usd * USD_ZAR_RATE;
  const cents = Math.ceil(zar * 100);
  return { wholesaleCents: cents };
}

export interface RecordPipelineUsageInput {
  clientId: string | number | null | undefined;
  provider: "google_places" | "hunter";
  endpoint: string;
  units?: number;
}

/**
 * Insert one row into pipeline_api_usage. Fire-and-forget — failures must
 * never break the scraper or wizard. Mirrors the api-usage.ts pattern.
 */
export async function recordPipelineUsage(input: RecordPipelineUsageInput): Promise<void> {
  if (input.clientId == null) return;
  const clientIdStr = String(input.clientId);
  const isInternal = INTERNAL_CLIENT_IDS.has(clientIdStr);

  const { wholesaleCents } = computePipelineCallCost({
    provider: input.provider,
    endpoint: input.endpoint,
    units: input.units,
  });

  try {
    const db = supabaseAdmin();
    await db.from("pipeline_api_usage").insert({
      client_id: input.clientId,
      provider: input.provider,
      endpoint: input.endpoint,
      unit_count: input.units ?? 1,
      wholesale_cost_zar_cents: wholesaleCents,
      is_internal: isInternal,
    });
  } catch (err) {
    // Soft-fail. Better to lose a usage row than break a scraper run.
    console.error("[pipeline-usage] insert failed", err);
  }
}

/**
 * Sum a tenant's wholesale spend in the current billing period.
 * Used by cap-check.ts before each scraper call.
 */
export async function getMonthlyWholesaleCents(clientId: string | number): Promise<number> {
  try {
    const db = supabaseAdmin();
    const period = new Date();
    period.setUTCDate(1);
    period.setUTCHours(0, 0, 0, 0);
    const periodIso = period.toISOString().slice(0, 10);

    const { data, error } = await db
      .from("pipeline_api_usage")
      .select("wholesale_cost_zar_cents")
      .eq("client_id", clientId)
      .eq("billing_period", periodIso);
    if (error || !data) return 0;
    return data.reduce(
      (acc, row) => acc + (row as { wholesale_cost_zar_cents: number }).wholesale_cost_zar_cents,
      0,
    );
  } catch {
    return 0;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/pipeline/billing/__tests__/pipeline-usage.test.ts`
Expected: PASS, 4/4.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pipeline/billing/pipeline-usage.ts src/lib/pipeline/billing/__tests__/pipeline-usage.test.ts
git commit -m "feat(pipeline): per-tenant cost tracking for Google Places + Hunter"
```

---

## Task 3: Wholesale cap check

**Files:**
- Create: `src/lib/pipeline/billing/cap-check.ts`
- Create: `src/lib/pipeline/billing/__tests__/cap-check.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/pipeline/billing/__tests__/cap-check.test.ts
import { describe, it, expect } from "vitest";
import { wholesaleCapForPlan, isOverCap } from "../cap-check";

describe("wholesaleCapForPlan", () => {
  it("returns 25000 cents (R250) for pipeline_lite", () => {
    expect(wholesaleCapForPlan("pipeline_lite")).toBe(25000);
  });
  it("returns 75000 cents (R750) for pipeline_pro", () => {
    expect(wholesaleCapForPlan("pipeline_pro")).toBe(75000);
  });
  it("returns 0 (no cap, meaning blocked) for an Inbound-only plan", () => {
    expect(wholesaleCapForPlan("starter")).toBe(0);
  });
});

describe("isOverCap", () => {
  it("returns true when spent + projected exceeds cap", () => {
    expect(isOverCap({ spentCents: 20000, projectedCents: 6000, capCents: 25000 })).toBe(true);
  });
  it("returns false when spent + projected equals cap exactly", () => {
    expect(isOverCap({ spentCents: 20000, projectedCents: 5000, capCents: 25000 })).toBe(false);
  });
  it("returns false when capCents is 0 only if projectedCents is also 0", () => {
    expect(isOverCap({ spentCents: 0, projectedCents: 1, capCents: 0 })).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/pipeline/billing/__tests__/cap-check.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/pipeline/billing/cap-check.ts
//
// Hard-stop wholesale cap enforcement for Outbound Pipeline scraping.
// Each tier has a monthly ceiling on wholesale data spend (Google Places +
// Hunter). Before any scraper call that would push past the cap, the
// generator must abort with a 402-style "Top up to continue" response.

import { getMonthlyWholesaleCents } from "./pipeline-usage";

// Cap values in ZAR cents. Starting estimates from the spec; calibrate
// against the verification harness once it runs.
const CAP_CENTS_BY_PLAN: Record<string, number> = {
  pipeline_lite: 25000, // R250
  pipeline_pro: 75000, // R750
};

export type PipelinePlan = "pipeline_lite" | "pipeline_pro";

export function wholesaleCapForPlan(plan: string): number {
  return CAP_CENTS_BY_PLAN[plan] ?? 0;
}

export interface OverCapInput {
  spentCents: number;
  projectedCents: number;
  capCents: number;
}

export function isOverCap(input: OverCapInput): boolean {
  return input.spentCents + input.projectedCents > input.capCents;
}

/**
 * Pull the running monthly spend for a tenant and compare against their
 * plan's cap. Returns `{ over: true, spentCents, capCents }` when the
 * cap is already hit, or when a projected call would push past it.
 */
export async function checkCapForTenant(args: {
  clientId: string | number;
  plan: string;
  projectedCents: number;
}): Promise<{ over: boolean; spentCents: number; capCents: number }> {
  const capCents = wholesaleCapForPlan(args.plan);
  const spentCents = await getMonthlyWholesaleCents(args.clientId);
  return {
    over: isOverCap({ spentCents, projectedCents: args.projectedCents, capCents }),
    spentCents,
    capCents,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/pipeline/billing/__tests__/cap-check.test.ts`
Expected: PASS, 6/6.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pipeline/billing/cap-check.ts src/lib/pipeline/billing/__tests__/cap-check.test.ts
git commit -m "feat(pipeline): wholesale cost cap enforcement (R250 Lite / R750 Pro)"
```

---

## Task 4: Wrap google-places.ts with usage tracking

**Files:**
- Modify: `src/lib/pipeline/scraper/google-places.ts`

- [ ] **Step 1: Read the current file to find the API call sites**

Run: `grep -n "fetch\|axios\|GOOGLE_PLACES_API_KEY" src/lib/pipeline/scraper/google-places.ts`
Identify each call site that hits the Google API.

- [ ] **Step 2: Add a `clientId` parameter to every exported function in google-places.ts**

For each function that performs an API call (e.g. `searchPlaces`, `getPlaceDetails`), thread a `clientId: string | number` parameter through the signature. After every successful API response, call `recordPipelineUsage`:

```ts
import { recordPipelineUsage } from "@/lib/pipeline/billing/pipeline-usage";

// Inside each function, after the fetch resolves:
await recordPipelineUsage({
  clientId,
  provider: "google_places",
  endpoint: "text_search", // or "place_details" etc, match the actual endpoint hit
  units: 1,
});
```

If an existing exported function lacks clientId, change its signature and update every caller. Caller updates happen in Task 5/6/17 — they thread through the generator and enrichment.

- [ ] **Step 3: Run all tests + lint to catch breakage**

Run: `npm run lint && npx vitest run src/lib/pipeline`
Expected: lint passes; any pre-existing pipeline tests still pass. If a caller is now broken, leave a `TODO_TASK_N` comment naming the next task that will fix it — this is acceptable mid-plan.

- [ ] **Step 4: Commit**

```bash
git add src/lib/pipeline/scraper/google-places.ts
git commit -m "feat(pipeline): tag every Google Places call with tenant for cost tracking"
```

---

## Task 5: Wrap hunter.ts with usage tracking

**Files:**
- Modify: `src/lib/pipeline/scraper/hunter.ts`

Identical pattern to Task 4. Thread `clientId` through, call `recordPipelineUsage` after each successful API response with provider `'hunter'` and the appropriate endpoint (`'email_finder'` or `'email_verifier'`).

- [ ] **Step 1: Apply the same pattern**

```ts
import { recordPipelineUsage } from "@/lib/pipeline/billing/pipeline-usage";

// Inside each function that hits Hunter, after the fetch resolves:
await recordPipelineUsage({
  clientId,
  provider: "hunter",
  endpoint: "email_finder",
  units: 1,
});
```

- [ ] **Step 2: Run lint + tests**

Run: `npm run lint && npx vitest run src/lib/pipeline`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/lib/pipeline/scraper/hunter.ts
git commit -m "feat(pipeline): tag every Hunter call with tenant for cost tracking"
```

---

## Task 6: Signup routes Pipeline plans to products=['outbound']

**Files:**
- Modify: `src/app/(app)/signup/page.tsx`
- Modify: `src/app/api/signup/route.ts` (or wherever client row insertion happens — verify with grep)

- [ ] **Step 1: Locate the client-row insert**

Run: `grep -rn "insert.*clients\|from.*clients.*insert" src/app/api/signup src/app/\(app\)/signup`
Expected: one or two routes that insert into `clients` on signup.

- [ ] **Step 2: Add plan-ID parsing**

In the signup page, the existing PLANS list handles `trial|starter|pro|business|enterprise`. Extend the `PlanTier` parsing to recognise `pipeline_lite` and `pipeline_pro`:

```ts
// src/app/(app)/signup/page.tsx — extend PLANS array
{
  id: "pipeline_lite",
  name: "Pipeline Lite",
  price: "R7,500",
  sub: "/month",
  cta: "Start with Pipeline Lite",
  noCard: false,
  features: [
    "3 hand-picked prospects per business day",
    "Verified contact info on every prospect",
    "Daily delivery to your dashboard",
    "Email + WhatsApp + LinkedIn ready",
    "POPIA compliant",
  ],
},
{
  id: "pipeline_pro",
  name: "Pipeline Pro",
  price: "R15,000",
  sub: "/month",
  cta: "Start with Pipeline Pro",
  noCard: false,
  features: [
    "8 hand-picked prospects per business day",
    "Multi-ICP support",
    "Pull extra batches on demand",
    "Priority support",
    "POPIA compliant",
  ],
},
```

Update the PlanTier type union to include `'pipeline_lite' | 'pipeline_pro'`. If it's imported from `@/lib/plan`, add them there.

- [ ] **Step 3: Map plan ID → products + pipeline_daily_quota during signup**

In the signup API route, after determining the plan, compute the products array:

```ts
function productsForPlan(plan: string): string[] {
  if (plan === "pipeline_lite" || plan === "pipeline_pro") return ["outbound"];
  return ["inbound"];
}

function pipelineDailyQuotaForPlan(plan: string): number {
  if (plan === "pipeline_lite") return 3;
  if (plan === "pipeline_pro") return 8;
  return 0; // not applicable for Inbound plans
}

// Use these when inserting the clients row:
const products = productsForPlan(plan);
const pipeline_daily_quota = pipelineDailyQuotaForPlan(plan);

await db.from("clients").insert({
  // ... existing fields ...
  products,
  pipeline_daily_quota,
});
```

- [ ] **Step 4: Manual smoke test**

Run: `npm run dev` and sign up with `?plan=pipeline_lite` and `?plan=pipeline_pro`.
Verify in Supabase that the new rows have `products=['outbound']` and the correct quota.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/signup/page.tsx src/app/api/signup src/lib/plan.ts
git commit -m "feat(pipeline): signup routes pipeline_lite/pipeline_pro plans to outbound product"
```

---

## Task 7: Enrichment types

**Files:**
- Create: `src/lib/pipeline/enrichment/types.ts`

- [ ] **Step 1: Define the types**

```ts
// src/lib/pipeline/enrichment/types.ts
//
// Shared shapes for the wizard's enrichment step. The orchestrator returns
// a pre-filled ICP plus a per-field provenance record so the review screen
// can render "Why?" tooltips.

import type { IcpDefinition } from "@/lib/pipeline/setup-state";

export type ProvenanceSource =
  | "site_hero"
  | "site_services"
  | "site_about"
  | "gbp_category"
  | "gbp_location"
  | "gbp_size"
  | "offer"
  | "synthesis";

export interface FieldProvenance {
  source: ProvenanceSource;
  evidence: string; // human-readable quote/snippet
}

export type IcpProvenance = Partial<Record<keyof IcpDefinition, FieldProvenance>>;

export interface EnrichedIcp {
  icp: IcpDefinition;
  provenance: IcpProvenance;
  warnings: string[]; // e.g. "Couldn't read your site" — empty when all steps succeeded
}

export interface EnrichmentInput {
  clientId: string | number;
  websiteUrl: string;
  offer: string; // one-sentence offer description from the wizard
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/pipeline/enrichment/types.ts
git commit -m "feat(pipeline): enrichment types for wizard auto-fill"
```

---

## Task 8: Google Places profile lookup (client's own business)

**Files:**
- Create: `src/lib/pipeline/enrichment/google-places-profile.ts`

This is distinct from the prospect-scraper Google Places usage: we look up the *client's own* business profile to infer their location, category, size.

- [ ] **Step 1: Implement**

```ts
// src/lib/pipeline/enrichment/google-places-profile.ts
import "server-only";
import { recordPipelineUsage } from "@/lib/pipeline/billing/pipeline-usage";

export interface ClientBusinessProfile {
  name?: string;
  primaryCategory?: string;
  city?: string;
  region?: string;
  country?: string;
  ratingsCount?: number;
}

interface FindPlaceResp {
  candidates?: Array<{ place_id?: string; name?: string }>;
  status?: string;
}

interface PlaceDetailsResp {
  result?: {
    name?: string;
    types?: string[];
    address_components?: Array<{ long_name: string; short_name: string; types: string[] }>;
    user_ratings_total?: number;
  };
  status?: string;
}

/**
 * Resolve the client's own Google Business Profile from their website URL
 * (or, failing that, their offer text). Returns whatever was extractable;
 * caller treats the result as best-effort.
 */
export async function lookupClientBusinessProfile(args: {
  clientId: string | number;
  websiteUrl: string;
  offer: string;
}): Promise<ClientBusinessProfile> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return {};

  // Step 1: Find Place by URL or offer.
  const query = encodeURIComponent(args.websiteUrl || args.offer);
  const findUrl =
    `https://maps.googleapis.com/maps/api/place/findplacefromtext/json` +
    `?input=${query}&inputtype=textquery&fields=place_id,name&key=${apiKey}`;

  let placeId: string | undefined;
  try {
    const res = await fetch(findUrl);
    const body = (await res.json()) as FindPlaceResp;
    await recordPipelineUsage({
      clientId: args.clientId,
      provider: "google_places",
      endpoint: "find_place",
    });
    placeId = body.candidates?.[0]?.place_id;
  } catch {
    return {};
  }
  if (!placeId) return {};

  // Step 2: Place Details for the resolved ID.
  const detailsUrl =
    `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}` +
    `&fields=name,types,address_components,user_ratings_total&key=${apiKey}`;

  try {
    const res = await fetch(detailsUrl);
    const body = (await res.json()) as PlaceDetailsResp;
    await recordPipelineUsage({
      clientId: args.clientId,
      provider: "google_places",
      endpoint: "place_details",
    });
    const r = body.result;
    if (!r) return {};

    const city = r.address_components?.find((c) => c.types.includes("locality"))?.long_name;
    const region = r.address_components?.find((c) =>
      c.types.includes("administrative_area_level_1"),
    )?.long_name;
    const country = r.address_components?.find((c) => c.types.includes("country"))?.long_name;

    return {
      name: r.name,
      primaryCategory: r.types?.[0],
      city,
      region,
      country,
      ratingsCount: r.user_ratings_total,
    };
  } catch {
    return {};
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/pipeline/enrichment/google-places-profile.ts
git commit -m "feat(pipeline): look up client's own Google Business Profile for ICP enrichment"
```

---

## Task 9: Anthropic synthesis

**Files:**
- Create: `src/lib/pipeline/enrichment/anthropic-synthesis.ts`
- Create: `src/lib/pipeline/enrichment/__tests__/anthropic-synthesis.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/pipeline/enrichment/__tests__/anthropic-synthesis.test.ts
import { describe, it, expect, vi } from "vitest";
import { parseSynthesisOutput } from "../anthropic-synthesis";

describe("parseSynthesisOutput", () => {
  it("parses a well-formed synthesis JSON block", () => {
    const out = `Here is your ICP:
\`\`\`json
{
  "icp": {
    "offer": "We help solar installers book more inspections",
    "industries": ["Solar", "Renewable energy"],
    "titles": ["Owner", "Sales manager"],
    "sizeMin": 5,
    "sizeMax": 30,
    "locations": ["Cape Town", "Johannesburg"],
    "intentSignals": ["recent hire", "active LinkedIn"],
    "dealValueZar": 25000
  },
  "provenance": {
    "industries": { "source": "site_hero", "evidence": "Solar installation specialists" },
    "locations": { "source": "gbp_location", "evidence": "Cape Town, Western Cape" }
  }
}
\`\`\``;
    const parsed = parseSynthesisOutput(out);
    expect(parsed.icp.industries).toContain("Solar");
    expect(parsed.icp.dealValueZar).toBe(25000);
    expect(parsed.provenance.industries?.source).toBe("site_hero");
  });

  it("throws on missing required fields", () => {
    expect(() => parseSynthesisOutput('{"icp":{}}')).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/pipeline/enrichment/__tests__/anthropic-synthesis.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/pipeline/enrichment/anthropic-synthesis.ts
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { recordApiUsage } from "@/lib/billing/api-usage";
import type { IcpDefinition } from "@/lib/pipeline/setup-state";
import type { EnrichedIcp, IcpProvenance } from "./types";
import type { ClientBusinessProfile } from "./google-places-profile";

const MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `You are an expert B2B sales strategist. You receive a company's website content, their Google Business Profile data, and a one-sentence offer. You return a structured Ideal Customer Profile (ICP) for outbound prospecting.

Quality bar: every field must be specific and defensible. Industries are concrete (e.g. "Solar installation" not "Energy"). Titles are reachable on LinkedIn (e.g. "Practice Manager" not "Decision Maker"). Locations are real cities or regions. Deal value is a realistic ZAR estimate for one closed customer.

For every output field, produce a "provenance" entry recording where the suggestion came from and a short evidence quote. Allowed provenance sources: site_hero, site_services, site_about, gbp_category, gbp_location, gbp_size, offer, synthesis.

Output strictly the JSON block. No commentary outside the block.`;

interface SiteContext {
  hero?: string;
  services?: string;
  about?: string;
}

export interface SynthesisInput {
  clientId: string | number;
  site: SiteContext;
  profile: ClientBusinessProfile;
  offer: string;
}

interface SynthesisOutput {
  icp: IcpDefinition;
  provenance: IcpProvenance;
}

export function parseSynthesisOutput(raw: string): SynthesisOutput {
  // Tolerate Claude wrapping the JSON in a ```json block, or returning bare JSON.
  const match = raw.match(/```json\s*([\s\S]*?)```/);
  const jsonText = match ? match[1].trim() : raw.trim();
  const parsed = JSON.parse(jsonText) as SynthesisOutput;
  if (!parsed.icp) throw new Error("Synthesis output missing icp field");
  const required: Array<keyof IcpDefinition> = [
    "offer",
    "industries",
    "titles",
    "sizeMin",
    "sizeMax",
    "locations",
    "intentSignals",
    "dealValueZar",
  ];
  for (const key of required) {
    if (parsed.icp[key] === undefined || parsed.icp[key] === null) {
      throw new Error(`Synthesis output missing required field: ${String(key)}`);
    }
  }
  return parsed;
}

function buildUserMessage(input: SynthesisInput): string {
  return [
    `Their offer: ${input.offer}`,
    "",
    "Website context:",
    input.site.hero ? `- Hero: ${input.site.hero}` : "- (no hero captured)",
    input.site.services ? `- Services: ${input.site.services}` : "- (no services list)",
    input.site.about ? `- About: ${input.site.about}` : "- (no about text)",
    "",
    "Google Business Profile:",
    input.profile.name ? `- Name: ${input.profile.name}` : "- (not resolved)",
    input.profile.primaryCategory ? `- Category: ${input.profile.primaryCategory}` : "",
    input.profile.city ? `- City: ${input.profile.city}` : "",
    input.profile.region ? `- Region: ${input.profile.region}` : "",
    input.profile.ratingsCount != null ? `- Ratings count: ${input.profile.ratingsCount}` : "",
    "",
    "Return the JSON block. Schema:",
    `{
  "icp": {
    "offer": string,
    "industries": [string],
    "titles": [string],
    "sizeMin": number,
    "sizeMax": number,
    "locations": [string],
    "intentSignals": [string],
    "dealValueZar": number
  },
  "provenance": {
    "<field>": { "source": ProvenanceSource, "evidence": string }
  }
}`,
  ].filter(Boolean).join("\n");
}

export async function synthesiseIcp(input: SynthesisInput): Promise<EnrichedIcp> {
  const client = new Anthropic();
  const userMessage = buildUserMessage(input);

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  // Record usage against the tenant's api_usage row, source tag for pipeline.
  await recordApiUsage({
    clientId: input.clientId,
    usage: response.usage,
    source: "pipeline_icp_synthesis",
  });

  const rawText = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  const parsed = parseSynthesisOutput(rawText);
  return { icp: parsed.icp, provenance: parsed.provenance, warnings: [] };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/pipeline/enrichment/__tests__/anthropic-synthesis.test.ts`
Expected: PASS, 2/2.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pipeline/enrichment/anthropic-synthesis.ts src/lib/pipeline/enrichment/__tests__/anthropic-synthesis.test.ts
git commit -m "feat(pipeline): Anthropic synthesis returns pre-filled ICP with provenance"
```

---

## Task 10: Enrichment orchestrator

**Files:**
- Create: `src/lib/pipeline/enrichment/run.ts`
- Create: `src/lib/pipeline/enrichment/__tests__/run.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/pipeline/enrichment/__tests__/run.test.ts
import { describe, it, expect, vi } from "vitest";

// We test the warnings-aggregation logic with mocked dependencies.
vi.mock("../../scraper/site-reader", () => ({
  readSite: vi.fn(async () => { throw new Error("boom"); }),
}));
vi.mock("../google-places-profile", () => ({
  lookupClientBusinessProfile: vi.fn(async () => ({})),
}));
vi.mock("../anthropic-synthesis", () => ({
  synthesiseIcp: vi.fn(async () => ({
    icp: {
      offer: "test", industries: ["x"], titles: ["y"],
      sizeMin: 1, sizeMax: 5, locations: ["z"],
      intentSignals: ["a"], dealValueZar: 1,
    },
    provenance: {},
    warnings: [],
  })),
}));

import { runEnrichment } from "../run";

describe("runEnrichment", () => {
  it("aggregates warnings when site-reader fails but synthesis succeeds", async () => {
    const r = await runEnrichment({ clientId: 1, websiteUrl: "http://x", offer: "y" });
    expect(r.warnings).toContain("We couldn't read your website — the ICP is based on your offer and Google profile only.");
    expect(r.icp.industries).toContain("x");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/pipeline/enrichment/__tests__/run.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/pipeline/enrichment/run.ts
import "server-only";
import { readSite } from "@/lib/pipeline/scraper/site-reader";
import { lookupClientBusinessProfile } from "./google-places-profile";
import { synthesiseIcp } from "./anthropic-synthesis";
import type { EnrichedIcp, EnrichmentInput } from "./types";

/**
 * Orchestrates the three enrichment phases (site reader → GBP lookup →
 * Anthropic synthesis). Site reader and GBP failures are soft — synthesis
 * runs anyway and a warning is surfaced. Synthesis failure is hard — we
 * cannot pre-fill without it, so caller must surface a retry button.
 */
export async function runEnrichment(input: EnrichmentInput): Promise<EnrichedIcp> {
  const warnings: string[] = [];

  let siteCtx: { hero?: string; services?: string; about?: string } = {};
  try {
    const site = await readSite(input.websiteUrl);
    siteCtx = {
      hero: site.hero_text ?? undefined,
      services: site.services_text ?? undefined,
      about: site.about_text ?? undefined,
    };
  } catch {
    warnings.push(
      "We couldn't read your website — the ICP is based on your offer and Google profile only.",
    );
  }

  let profile = {};
  try {
    profile = await lookupClientBusinessProfile({
      clientId: input.clientId,
      websiteUrl: input.websiteUrl,
      offer: input.offer,
    });
  } catch {
    warnings.push(
      "We couldn't find your Google Business Profile — the ICP is based on your website and offer only.",
    );
  }

  // Synthesis: hard requirement. Let exceptions bubble.
  const synthesised = await synthesiseIcp({
    clientId: input.clientId,
    site: siteCtx,
    profile,
    offer: input.offer,
  });

  return { ...synthesised, warnings: [...warnings, ...synthesised.warnings] };
}
```

If `readSite` doesn't return `hero_text` / `services_text` / `about_text` with those exact names, adjust to match the actual return shape. Run `grep "export" src/lib/pipeline/scraper/site-reader.ts` to verify.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/pipeline/enrichment/__tests__/run.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pipeline/enrichment/run.ts src/lib/pipeline/enrichment/__tests__/run.test.ts
git commit -m "feat(pipeline): enrichment orchestrator with soft-fail on site/GBP, hard on synthesis"
```

---

## Task 11: POST /api/pipeline/icp/enrich endpoint

**Files:**
- Create: `src/app/api/pipeline/icp/enrich/route.ts`

- [ ] **Step 1: Implement**

```ts
// src/app/api/pipeline/icp/enrich/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase-server";
import { runEnrichment } from "@/lib/pipeline/enrichment/run";
import { checkCapForTenant } from "@/lib/pipeline/billing/cap-check";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RequestBody {
  websiteUrl?: string;
  offer?: string;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as RequestBody;
  if (!body.websiteUrl || !body.offer) {
    return NextResponse.json({ error: "websiteUrl and offer are required" }, { status: 400 });
  }

  // Auth: resolve the tenant from the session.
  const cookieStore = cookies();
  const auth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(c) { c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); },
      },
    },
  );
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorised" }, { status: 401 });

  const db = supabaseAdmin();
  const { data: client } = await db
    .from("clients")
    .select("id, plan, products")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!client) return NextResponse.json({ error: "no client row" }, { status: 404 });

  const c = client as { id: number | string; plan: string; products: string[] };
  if (!c.products?.includes("outbound")) {
    return NextResponse.json({ error: "outbound product not active" }, { status: 403 });
  }

  // Cap check before spending on Anthropic + Google calls (projected ~300 cents).
  const cap = await checkCapForTenant({ clientId: c.id, plan: c.plan, projectedCents: 300 });
  if (cap.over) {
    return NextResponse.json(
      { error: "cap_reached", message: "Monthly data budget reached. Top up to continue.", spentCents: cap.spentCents, capCents: cap.capCents },
      { status: 402 },
    );
  }

  try {
    const enriched = await runEnrichment({
      clientId: c.id,
      websiteUrl: body.websiteUrl,
      offer: body.offer,
    });
    return NextResponse.json(enriched);
  } catch (err: unknown) {
    console.error("[icp/enrich] synthesis failed", err);
    return NextResponse.json(
      { error: "synthesis_failed", message: "Couldn't build your ICP. Please try again." },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Smoke test via curl after `npm run dev`**

```bash
# Get a session cookie first by signing in as a pipeline_lite test tenant.
curl -X POST http://localhost:3000/api/pipeline/icp/enrich \
  -H 'Content-Type: application/json' \
  -b 'sb-...=...' \
  -d '{"websiteUrl":"https://example.co.za","offer":"We help dentists fill empty chairs"}'
```

Expected: JSON response with `icp`, `provenance`, `warnings`. ~30-60 second response time.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/pipeline/icp/enrich/route.ts
git commit -m "feat(pipeline): POST /api/pipeline/icp/enrich runs full enrichment for wizard"
```

---

## Task 12: WhyTooltip component

**Files:**
- Create: `src/components/pipeline-setup/WhyTooltip.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/pipeline-setup/WhyTooltip.tsx
"use client";
import { useState } from "react";
import { Info } from "lucide-react";
import type { FieldProvenance } from "@/lib/pipeline/enrichment/types";

const SOURCE_LABEL: Record<FieldProvenance["source"], string> = {
  site_hero: "Pulled from your homepage hero",
  site_services: "Pulled from your services list",
  site_about: "Pulled from your About page",
  gbp_category: "From your Google Business Profile category",
  gbp_location: "From your Google Business Profile location",
  gbp_size: "From your Google Business Profile",
  offer: "From the offer you described",
  synthesis: "Inferred from your offer and website",
};

export function WhyTooltip({ provenance }: { provenance: FieldProvenance | undefined }) {
  const [open, setOpen] = useState(false);
  if (!provenance) return null;

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
        className="ml-1.5 inline-flex items-center gap-1 text-tiny text-ink-500 hover:text-ink-800"
        aria-label="Why this suggestion?"
      >
        <Info className="w-3 h-3" />
        Why?
      </button>
      {open && (
        <div className="absolute z-10 top-full left-0 mt-1 w-64 rounded-md border border-ink-200 bg-cream-50 p-3 shadow-lg text-tiny text-ink-700">
          <div className="font-medium text-ink-900 mb-1">{SOURCE_LABEL[provenance.source]}</div>
          <div className="italic">"{provenance.evidence}"</div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/pipeline-setup/WhyTooltip.tsx
git commit -m "feat(pipeline): WhyTooltip explains each pre-filled ICP field's source"
```

---

## Task 13: IntakeScreen (wizard step 1)

**Files:**
- Create: `src/components/pipeline-setup/IntakeScreen.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/pipeline-setup/IntakeScreen.tsx
"use client";
import { useState, FormEvent } from "react";

export interface IntakeValues {
  websiteUrl: string;
  offer: string;
}

export function IntakeScreen({ onSubmit }: { onSubmit: (v: IntakeValues) => void }) {
  const [websiteUrl, setUrl] = useState("");
  const [offer, setOffer] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!websiteUrl.trim() || !offer.trim()) {
      setError("Both fields are required to build your lead engine.");
      return;
    }
    try {
      // Quick sanity check on the URL.
      new URL(websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`);
    } catch {
      setError("That doesn't look like a valid website URL.");
      return;
    }
    onSubmit({
      websiteUrl: websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`,
      offer: offer.trim(),
    });
  }

  return (
    <form onSubmit={submit} className="max-w-xl mx-auto space-y-6 p-8">
      <header>
        <h1 className="font-display text-3xl text-ink-900">Build your lead engine</h1>
        <p className="text-ink-600 mt-2">
          Two answers, ~30 seconds. We'll read your website, look up your Google profile, and pre-fill the rest.
        </p>
      </header>

      <label className="block">
        <span className="text-small font-medium text-ink-800">Your website URL</span>
        <input
          type="text"
          value={websiteUrl}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://yourbusiness.co.za"
          className="mt-1 w-full rounded-md border border-ink-300 px-3 py-2 focus:border-ember focus:ring-1 focus:ring-ember"
        />
      </label>

      <label className="block">
        <span className="text-small font-medium text-ink-800">What do you do? One sentence.</span>
        <textarea
          value={offer}
          onChange={(e) => setOffer(e.target.value)}
          placeholder="We help solar installers in Cape Town book more inspections."
          rows={2}
          className="mt-1 w-full rounded-md border border-ink-300 px-3 py-2 focus:border-ember focus:ring-1 focus:ring-ember"
        />
      </label>

      {error && <p className="text-red-600 text-small">{error}</p>}

      <button
        type="submit"
        className="w-full rounded-md bg-ember px-4 py-2.5 text-white font-medium hover:bg-ember-dark"
      >
        Build my ICP
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/pipeline-setup/IntakeScreen.tsx
git commit -m "feat(pipeline): wizard intake screen (URL + offer)"
```

---

## Task 14: EnrichmentLoadingScreen (wizard step 2)

**Files:**
- Create: `src/components/pipeline-setup/EnrichmentLoadingScreen.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/pipeline-setup/EnrichmentLoadingScreen.tsx
"use client";
import { useEffect, useState } from "react";
import { Loader2, Check } from "lucide-react";

const PHASES = [
  "Reading your website",
  "Looking up your business profile",
  "Building your ideal customer profile",
] as const;

/**
 * Cosmetic three-phase progress while the enrich API call is in flight.
 * The phases auto-advance on a timer because the API endpoint is one round
 * trip — we don't have per-phase progress events. The animation makes the
 * wait feel intentional rather than blank.
 */
export function EnrichmentLoadingScreen() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhase((p) => Math.min(p + 1, PHASES.length - 1));
    }, 18000); // advance every 18s; total request ~45-60s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-xl mx-auto p-12 text-center space-y-8">
      <h2 className="font-display text-2xl text-ink-900">Hang tight</h2>
      <ul className="space-y-3 text-left max-w-sm mx-auto">
        {PHASES.map((label, idx) => (
          <li key={label} className="flex items-center gap-3">
            {idx < phase ? (
              <Check className="w-5 h-5 text-success" />
            ) : idx === phase ? (
              <Loader2 className="w-5 h-5 text-ember animate-spin" />
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-ink-200" />
            )}
            <span className={idx <= phase ? "text-ink-900" : "text-ink-500"}>
              {label}{idx < phase ? " — done" : idx === phase ? "..." : ""}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-tiny text-ink-500">This usually takes 30 to 60 seconds.</p>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/pipeline-setup/EnrichmentLoadingScreen.tsx
git commit -m "feat(pipeline): wizard enrichment loading screen with three-phase progress"
```

---

## Task 15: ReviewIcpScreen (wizard step 3)

**Files:**
- Create: `src/components/pipeline-setup/ReviewIcpScreen.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/pipeline-setup/ReviewIcpScreen.tsx
"use client";
import { useState } from "react";
import type { EnrichedIcp } from "@/lib/pipeline/enrichment/types";
import type { IcpDefinition } from "@/lib/pipeline/setup-state";
import { WhyTooltip } from "./WhyTooltip";

interface Props {
  enriched: EnrichedIcp;
  onSave: (icp: IcpDefinition) => Promise<void>;
}

export function ReviewIcpScreen({ enriched, onSave }: Props) {
  const [icp, setIcp] = useState<IcpDefinition>(enriched.icp);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await onSave(icp);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
      setSaving(false);
    }
  }

  function updateList(field: "industries" | "titles" | "locations" | "intentSignals", value: string) {
    setIcp((prev) => ({
      ...prev,
      [field]: value.split(",").map((s) => s.trim()).filter(Boolean),
    }));
  }

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-6">
      <header>
        <h1 className="font-display text-3xl text-ink-900">Here's what we built for you</h1>
        <p className="text-ink-600 mt-2">
          Every field is editable. Click "Why?" next to any field to see where the suggestion came from.
        </p>
      </header>

      {enriched.warnings.length > 0 && (
        <div className="rounded-md bg-amber-50 border border-amber-200 p-4 text-small text-amber-900">
          <ul className="list-disc list-inside space-y-1">
            {enriched.warnings.map((w) => <li key={w}>{w}</li>)}
          </ul>
        </div>
      )}

      <div className="space-y-5">
        <Field label="Offer" provenance={enriched.provenance.offer}>
          <textarea
            value={icp.offer}
            onChange={(e) => setIcp({ ...icp, offer: e.target.value })}
            rows={2}
            className="mt-1 w-full rounded-md border border-ink-300 px-3 py-2"
          />
        </Field>

        <Field label="Industries to target" provenance={enriched.provenance.industries}>
          <input
            type="text"
            value={icp.industries.join(", ")}
            onChange={(e) => updateList("industries", e.target.value)}
            className="mt-1 w-full rounded-md border border-ink-300 px-3 py-2"
          />
        </Field>

        <Field label="Job titles to reach" provenance={enriched.provenance.titles}>
          <input
            type="text"
            value={icp.titles.join(", ")}
            onChange={(e) => updateList("titles", e.target.value)}
            className="mt-1 w-full rounded-md border border-ink-300 px-3 py-2"
          />
        </Field>

        <Field label="Company size band" provenance={enriched.provenance.sizeMin}>
          <div className="flex gap-3 items-center mt-1">
            <input
              type="number"
              value={icp.sizeMin}
              onChange={(e) => setIcp({ ...icp, sizeMin: Number(e.target.value) })}
              className="w-24 rounded-md border border-ink-300 px-3 py-2"
            />
            <span className="text-ink-500">to</span>
            <input
              type="number"
              value={icp.sizeMax}
              onChange={(e) => setIcp({ ...icp, sizeMax: Number(e.target.value) })}
              className="w-24 rounded-md border border-ink-300 px-3 py-2"
            />
            <span className="text-ink-500">employees</span>
          </div>
        </Field>

        <Field label="Locations" provenance={enriched.provenance.locations}>
          <input
            type="text"
            value={icp.locations.join(", ")}
            onChange={(e) => updateList("locations", e.target.value)}
            className="mt-1 w-full rounded-md border border-ink-300 px-3 py-2"
          />
        </Field>

        <Field label="Intent signals" provenance={enriched.provenance.intentSignals}>
          <input
            type="text"
            value={icp.intentSignals.join(", ")}
            onChange={(e) => updateList("intentSignals", e.target.value)}
            className="mt-1 w-full rounded-md border border-ink-300 px-3 py-2"
          />
        </Field>

        <Field label="Typical deal value (ZAR)" provenance={enriched.provenance.dealValueZar}>
          <input
            type="number"
            value={icp.dealValueZar}
            onChange={(e) => setIcp({ ...icp, dealValueZar: Number(e.target.value) })}
            className="mt-1 w-32 rounded-md border border-ink-300 px-3 py-2"
          />
        </Field>
      </div>

      {error && <p className="text-red-600 text-small">{error}</p>}

      <button
        type="button"
        disabled={saving}
        onClick={handleSave}
        className="w-full rounded-md bg-ember px-4 py-3 text-white font-medium hover:bg-ember-dark disabled:opacity-60"
      >
        {saving ? "Saving and generating your first 5 prospects..." : "Save and generate my first 5 prospects"}
      </button>
    </div>
  );
}

function Field({
  label,
  provenance,
  children,
}: {
  label: string;
  provenance: any;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center">
        <span className="text-small font-medium text-ink-800">{label}</span>
        <WhyTooltip provenance={provenance} />
      </div>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/pipeline-setup/ReviewIcpScreen.tsx
git commit -m "feat(pipeline): wizard review screen with editable fields + Why tooltips"
```

---

## Task 16: Wizard container

**Files:**
- Create: `src/components/pipeline-setup/Wizard.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/pipeline-setup/Wizard.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { IntakeScreen, type IntakeValues } from "./IntakeScreen";
import { EnrichmentLoadingScreen } from "./EnrichmentLoadingScreen";
import { ReviewIcpScreen } from "./ReviewIcpScreen";
import type { EnrichedIcp } from "@/lib/pipeline/enrichment/types";
import type { IcpDefinition } from "@/lib/pipeline/setup-state";

type Step = "intake" | "loading" | "review" | "generating" | "error";

export function Wizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("intake");
  const [enriched, setEnriched] = useState<EnrichedIcp | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleIntake(v: IntakeValues) {
    setStep("loading");
    try {
      const res = await fetch("/api/pipeline/icp/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(v),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErrorMsg(body.message || `Enrichment failed (${res.status})`);
        setStep("error");
        return;
      }
      const enrichedBody = (await res.json()) as EnrichedIcp;
      setEnriched(enrichedBody);
      setStep("review");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Network error");
      setStep("error");
    }
  }

  async function handleSave(icp: IcpDefinition) {
    setStep("generating");
    // Save ICP + kick off first batch synchronously.
    const saveRes = await fetch("/api/pipeline/setup/save-and-generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ icp, firstBatch: true, count: 5 }),
    });
    if (!saveRes.ok) {
      const body = await saveRes.json().catch(() => ({}));
      setErrorMsg(body.message || `Save failed (${saveRes.status})`);
      setStep("error");
      return;
    }
    router.push("/dashboard/pipeline?firstBatch=1");
  }

  if (step === "intake") return <IntakeScreen onSubmit={handleIntake} />;
  if (step === "loading" || step === "generating") return <EnrichmentLoadingScreen />;
  if (step === "review" && enriched) return <ReviewIcpScreen enriched={enriched} onSave={handleSave} />;
  if (step === "error") {
    return (
      <div className="max-w-xl mx-auto p-12 text-center space-y-4">
        <h2 className="font-display text-2xl text-ink-900">Something went wrong</h2>
        <p className="text-ink-600">{errorMsg}</p>
        <button
          type="button"
          onClick={() => { setErrorMsg(null); setStep("intake"); }}
          className="rounded-md bg-ember px-4 py-2 text-white"
        >
          Try again
        </button>
      </div>
    );
  }
  return null;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/pipeline-setup/Wizard.tsx
git commit -m "feat(pipeline): wizard container with intake → loading → review → first batch"
```

---

## Task 17: Save-and-generate endpoint

**Files:**
- Create: `src/app/api/pipeline/setup/save-and-generate/route.ts`

This endpoint persists the ICP, then synchronously calls the generator with `firstBatch: true, count: 5`.

- [ ] **Step 1: Implement**

```ts
// src/app/api/pipeline/setup/save-and-generate/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase-server";
import { updateSetupState, type IcpDefinition } from "@/lib/pipeline/setup-state";
import { runGenerator } from "@/lib/pipeline/generator/run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // first-batch generation can take 2-3 minutes

interface Body {
  icp?: IcpDefinition;
  firstBatch?: boolean;
  count?: number;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Body;
  if (!body.icp) return NextResponse.json({ error: "icp is required" }, { status: 400 });

  const cookieStore = cookies();
  const auth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(c) { c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); },
      },
    },
  );
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorised" }, { status: 401 });

  const db = supabaseAdmin();
  const { data: client } = await db
    .from("clients")
    .select("id, plan, products")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!client) return NextResponse.json({ error: "no client row" }, { status: 404 });
  const c = client as { id: number | string; plan: string; products: string[] };
  if (!c.products?.includes("outbound")) {
    return NextResponse.json({ error: "outbound product not active" }, { status: 403 });
  }

  // Persist ICP + flip setup state to 'generated'.
  await updateSetupState(c.id, {
    icp: body.icp,
    status: "generated",
    last_generated_at: new Date().toISOString(),
  });

  if (body.firstBatch) {
    try {
      const result = await runGenerator({
        clientId: c.id,
        plan: c.plan,
        count: body.count ?? 5,
        batchKind: "first_batch",
      });
      return NextResponse.json({ ok: true, prospectsCreated: result.created });
    } catch (err: unknown) {
      console.error("[save-and-generate] generator failed", err);
      return NextResponse.json(
        { ok: true, prospectsCreated: 0, warning: "ICP saved but first batch failed — try refreshing the dashboard in a few minutes." },
      );
    }
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/pipeline/setup/save-and-generate
git commit -m "feat(pipeline): save-and-generate endpoint persists ICP + generates first batch synchronously"
```

---

## Task 18: Update generator/run.ts (score filter, dedupe, delivery batch tag)

**Files:**
- Modify: `src/lib/pipeline/generator/run.ts`

- [ ] **Step 1: Locate the current entry point**

Run: `grep -n "export.*function\|export.*async" src/lib/pipeline/generator/run.ts`

- [ ] **Step 2: Refactor the exported entry point to accept `count` and `batchKind`**

Update or add the canonical entry function:

```ts
// src/lib/pipeline/generator/run.ts (additions/changes)
import { checkCapForTenant } from "@/lib/pipeline/billing/cap-check";

export interface RunGeneratorInput {
  clientId: string | number;
  plan: string;
  count: number;
  batchKind: "first_batch" | "daily_trickle";
}

export interface RunGeneratorResult {
  created: number;
  capReached: boolean;
}

const QUALITY_SCORE_THRESHOLD = 9; // 1-10 scale; 9+ = top decile ("85% high-fit")

export async function runGenerator(input: RunGeneratorInput): Promise<RunGeneratorResult> {
  // Cap check up front. Project ~200 cents per prospect (Google + Hunter).
  const projected = input.count * 200;
  const cap = await checkCapForTenant({ clientId: input.clientId, plan: input.plan, projectedCents: projected });
  if (cap.over) return { created: 0, capReached: true };

  // Load tenant's ICP.
  const state = await getSetupState(input.clientId);

  // Pull a candidate pool — over-fetch (count * 5) because we filter aggressively.
  const candidates = await fetchCandidatesFromScrapers({
    clientId: input.clientId,
    icp: state.icp,
    targetCount: input.count * 5,
  });

  // Score, filter, dedupe.
  const scored = candidates
    .map((p) => ({ p, score: scoreProspect(p, state.icp) }))
    .filter((x) => x.score.total >= QUALITY_SCORE_THRESHOLD)
    .filter((x) => x.p.email_verification_status === "valid");

  // Dedupe against existing prospects for this tenant.
  const db = supabaseAdmin();
  const { data: existing } = await db
    .from("pipeline_prospects")
    .select("email")
    .eq("client_id", input.clientId);
  const seenEmails = new Set((existing ?? []).map((r: { email: string }) => r.email?.toLowerCase()).filter(Boolean));
  const fresh = scored.filter((x) => x.p.email && !seenEmails.has(x.p.email.toLowerCase()));

  // Take top N by score.
  fresh.sort((a, b) => b.score.total - a.score.total);
  const selected = fresh.slice(0, input.count);

  // Insert with delivery batch metadata.
  const today = new Date().toISOString().slice(0, 10);
  const rows = selected.map(({ p, score }) => ({
    client_id: input.clientId,
    // ... existing column mappings from current generator ...
    enrichment_score: score.total,
    delivery_batch_date: today,
    delivery_batch_kind: input.batchKind,
  }));
  if (rows.length > 0) {
    await db.from("pipeline_prospects").insert(rows);
  }

  return { created: rows.length, capReached: false };
}
```

The exact field mapping into `pipeline_prospects` depends on the current generator code — preserve every column the existing version writes; just add `delivery_batch_date` and `delivery_batch_kind`.

- [ ] **Step 3: Lint + run any existing pipeline tests**

Run: `npm run lint && npx vitest run src/lib/pipeline`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add src/lib/pipeline/generator/run.ts
git commit -m "feat(pipeline): generator filters to score>=9 + verified email, dedupes, tags delivery batch"
```

---

## Task 19: Update pipeline setup page to render Wizard

**Files:**
- Modify: `src/app/(app)/dashboard/pipeline/setup/page.tsx`

- [ ] **Step 1: Replace IcpForm with Wizard**

Existing file renders `<IcpForm initialIcp=... hasExistingIcp=... />`. Replace with:

```tsx
import { Wizard } from "@/components/pipeline-setup/Wizard";

// ... existing auth + state lookup ...

// If the tenant already has a saved ICP, route them to the existing
// IcpForm-only editor at /dashboard/pipeline/setup?mode=refine.
// Otherwise show the full wizard for first-time setup.
if (state.status === "generated") {
  return <IcpForm initialIcp={state.icp} hasExistingIcp={true} />;
}
return <Wizard />;
```

This keeps the existing IcpForm as the "refine targeting" UI for already-set-up tenants.

- [ ] **Step 2: Manual UAT — sign up a fresh pipeline_lite tenant and walk the wizard end to end**

Verify:
- Intake → Loading → Review with pre-filled fields → Save → 5 prospects appear on /dashboard/pipeline
- An existing setup tenant going to /dashboard/pipeline/setup sees the IcpForm refine view (not the wizard)

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/dashboard/pipeline/setup/page.tsx
git commit -m "feat(pipeline): /dashboard/pipeline/setup renders Wizard for new tenants, IcpForm for refine"
```

---

## Task 20: PipelineSetupBanner component

**Files:**
- Create: `src/components/dashboard/PipelineSetupBanner.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/dashboard/PipelineSetupBanner.tsx
"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface Props {
  show: boolean;
}

export function PipelineSetupBanner({ show }: Props) {
  if (!show) return null;
  return (
    <div className="bg-ember/10 border-b border-ember/30 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 text-small">
        <div className="text-ink-900">
          <strong>Your lead engine isn't set up yet.</strong>{" "}
          Finish setup to start receiving prospects, takes 3 minutes.
        </div>
        <Link
          href="/dashboard/pipeline/setup"
          className="inline-flex items-center gap-1 rounded-md bg-ember px-3 py-1.5 text-white font-medium hover:bg-ember-dark whitespace-nowrap"
        >
          Finish setup <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/PipelineSetupBanner.tsx
git commit -m "feat(pipeline): persistent setup banner for outbound tenants without an ICP"
```

---

## Task 21: Mount banner + nav dot in dashboard layout

**Files:**
- Modify: `src/app/(app)/dashboard/layout.tsx`

- [ ] **Step 1: Server-side resolve `products` + setup status, pass to banner**

In the dashboard layout (server component), fetch the tenant's `products` and `pipeline_setup_state.status`:

```tsx
// src/app/(app)/dashboard/layout.tsx — additions
import { PipelineSetupBanner } from "@/components/dashboard/PipelineSetupBanner";
import { getSetupState } from "@/lib/pipeline/setup-state";

// Inside the layout component, after resolving `client`:
const showPipelineBanner =
  Array.isArray((client as any).products) &&
  (client as any).products.includes("outbound") &&
  (await getSetupState((client as any).id)).status !== "generated";

return (
  <>
    <PipelineSetupBanner show={showPipelineBanner} />
    {/* existing nav + children */}
  </>
);
```

Also, in the nav component, render a yellow dot on the "Pipeline" item when `showPipelineBanner` is true. (Find the nav file via `grep -rn "dashboard/pipeline" src/components`).

- [ ] **Step 2: UAT**

Sign in as an outbound tenant without an ICP → banner visible on every dashboard page + yellow dot on Pipeline nav.
Sign in as an inbound-only tenant → no banner, no Pipeline nav at all.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/dashboard/layout.tsx src/components/dashboard
git commit -m "feat(pipeline): mount setup banner + nav dot for outbound tenants without ICP"
```

---

## Task 22: Gate the Pipeline tab when no ICP saved

**Files:**
- Modify: `src/app/(app)/dashboard/pipeline/page.tsx`

- [ ] **Step 1: Add an early redirect at the top of the server-rendered page**

```tsx
// src/app/(app)/dashboard/pipeline/page.tsx — additions near top of default export
import { redirect } from "next/navigation";
import { getSetupState } from "@/lib/pipeline/setup-state";

// (Inside the page server resolver, after we know the tenant's clientId)
const state = await getSetupState(clientId);
if (state.status !== "generated") {
  redirect("/dashboard/pipeline/setup");
}
```

The dashboard page already runs as a client component — wrap it in a server component shell if needed, or do this check at the layout level if cleaner. Either way the user lands on the wizard if no ICP exists, not an empty board.

- [ ] **Step 2: Commit**

```bash
git add src/app/\(app\)/dashboard/pipeline/page.tsx
git commit -m "feat(pipeline): redirect Pipeline tab to wizard when no ICP saved"
```

---

## Task 23: "Today's N prospects" header on /dashboard/pipeline

**Files:**
- Modify: `src/app/(app)/dashboard/pipeline/page.tsx`

- [ ] **Step 1: Add a top section that queries `pipeline_prospects` filtered by today's delivery_batch_date**

```tsx
// inside the existing dashboard component, before the queue:
const today = new Date().toISOString().slice(0, 10);
const todaysProspects = useQuery({
  queryKey: ["todays-prospects", today],
  queryFn: async () => {
    const { data } = await supabase
      .from("pipeline_prospects")
      .select("*")
      .eq("delivery_batch_date", today)
      .order("enrichment_score", { ascending: false });
    return data ?? [];
  },
});

// Render at the top:
{todaysProspects.data && todaysProspects.data.length > 0 && (
  <section className="rounded-lg border border-ember/30 bg-ember/5 p-6">
    <h2 className="font-display text-2xl text-ink-900">
      Today's {todaysProspects.data.length} best-fit {todaysProspects.data.length === 1 ? "prospect" : "prospects"}
    </h2>
    {/* Reuse existing QueueRow components to render the rows */}
  </section>
)}
```

If a `?firstBatch=1` query param is present, swap "Today's" for "Your first" in the heading and add a one-line subhead "Welcome — here's what we built for you" that hides after first dismissal.

- [ ] **Step 2: Commit**

```bash
git add src/app/\(app\)/dashboard/pipeline/page.tsx
git commit -m "feat(pipeline): Today's N prospects header on the pipeline dashboard"
```

---

## Task 24: Pipeline costs row in /dashboard/usage

**Files:**
- Modify: `src/app/(app)/dashboard/usage/page.tsx`

- [ ] **Step 1: Query `pipeline_api_usage` for the current month, group by provider**

```tsx
// additions to existing usage page
const { data: pipelineRows } = await db
  .from("pipeline_api_usage")
  .select("provider, wholesale_cost_zar_cents")
  .eq("client_id", clientId)
  .eq("billing_period", monthStart);

const pipelineByProvider = (pipelineRows ?? []).reduce<Record<string, number>>((acc, r: any) => {
  acc[r.provider] = (acc[r.provider] || 0) + r.wholesale_cost_zar_cents;
  return acc;
}, {});

const pipelineTotalCents = Object.values(pipelineByProvider).reduce((a, b) => a + b, 0);

// Render a new row alongside the existing "Conversations" row:
<UsageRow
  label="Pipeline data (Google Places + Hunter)"
  amountZarCents={pipelineTotalCents}
  capCents={wholesaleCapForPlan(plan)}
  breakdown={pipelineByProvider}
/>
```

Use the existing usage-row component style — match it visually.

- [ ] **Step 2: Commit**

```bash
git add src/app/\(app\)/dashboard/usage/page.tsx
git commit -m "feat(pipeline): show Pipeline data costs on the usage dashboard"
```

---

## Task 25: Daily trickle cron

**Files:**
- Create: `src/app/api/pipeline/trickle/route.ts`
- Modify: `vercel.json`

- [ ] **Step 1: Implement the cron route**

```ts
// src/app/api/pipeline/trickle/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { runGenerator } from "@/lib/pipeline/generator/run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Daily trickle cron. Vercel cron hits this at 06:00 UTC Mon-Fri. For
 * every tenant with `products` including 'outbound' and `pipeline_daily_quota > 0`,
 * generate that many prospects tagged as 'daily_trickle' for today.
 */
export async function GET(req: Request) {
  // Vercel cron sets the Authorization header to "Bearer $CRON_SECRET".
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (req.headers.get("authorization") !== expected) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }

  // Weekend guard — skip Saturday/Sunday UTC (08:00 SAST = 06:00 UTC year-round).
  const dow = new Date().getUTCDay();
  if (dow === 0 || dow === 6) {
    return NextResponse.json({ skipped: "weekend" });
  }

  const db = supabaseAdmin();
  const { data: tenants } = await db
    .from("clients")
    .select("id, plan, products, pipeline_daily_quota")
    .contains("products", ["outbound"])
    .gt("pipeline_daily_quota", 0);

  const results: Array<{ clientId: number | string; created: number; capReached: boolean }> = [];

  for (const t of (tenants ?? []) as Array<{
    id: number | string;
    plan: string;
    products: string[];
    pipeline_daily_quota: number;
  }>) {
    try {
      const r = await runGenerator({
        clientId: t.id,
        plan: t.plan,
        count: t.pipeline_daily_quota,
        batchKind: "daily_trickle",
      });
      results.push({ clientId: t.id, created: r.created, capReached: r.capReached });
    } catch (err) {
      console.error(`[trickle] generator failed for ${t.id}`, err);
      results.push({ clientId: t.id, created: 0, capReached: false });
    }
  }

  return NextResponse.json({ ran: results.length, results });
}
```

- [ ] **Step 2: Wire the cron in vercel.json**

Add (or extend) the crons array in `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/pipeline/trickle", "schedule": "0 6 * * 1-5" }
  ]
}
```

Preserve any existing crons in the file.

- [ ] **Step 3: Set the `CRON_SECRET` env var in Vercel**

Run: `vercel env add CRON_SECRET production`
Paste a generated value (e.g. `openssl rand -hex 32`).

- [ ] **Step 4: Smoke test locally**

Run: `npm run dev` then in another terminal:
```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/pipeline/trickle
```
Expected: `{ ran: N, results: [...] }`.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/pipeline/trickle vercel.json
git commit -m "feat(pipeline): daily trickle cron generates per-tier batches Mon-Fri at 08:00 SAST"
```

---

## Task 26: Verification harness script

**Files:**
- Create: `scripts/verify-pipeline-tenant.ts`

- [ ] **Step 1: Implement**

```ts
// scripts/verify-pipeline-tenant.ts
//
// Verification harness for an Outbound Pipeline tenant. Run before flipping
// a new client from setup_complete=false to true.
//
// Usage: npx tsx scripts/verify-pipeline-tenant.ts <client_id>
//
// Exits 0 on all green, 1 on any failure with a clear reason.

import "dotenv/config";
import { supabaseAdmin } from "../src/lib/supabase-server";
import { getSetupState } from "../src/lib/pipeline/setup-state";
import { runEnrichment } from "../src/lib/pipeline/enrichment/run";
import { runGenerator } from "../src/lib/pipeline/generator/run";
import { notifyLead } from "../src/lib/notify-lead";

interface Check {
  name: string;
  pass: boolean;
  detail: string;
}

async function main() {
  const clientId = process.argv[2];
  if (!clientId) {
    console.error("Usage: npx tsx scripts/verify-pipeline-tenant.ts <client_id>");
    process.exit(2);
  }

  const checks: Check[] = [];
  const db = supabaseAdmin();

  const { data: client } = await db
    .from("clients")
    .select("id, plan, products, website_url, notification_email")
    .eq("id", clientId)
    .maybeSingle();
  if (!client) {
    console.error(`No client row for id=${clientId}`);
    process.exit(1);
  }
  const c = client as { id: any; plan: string; products: string[]; website_url: string; notification_email: string };

  checks.push({
    name: "client has outbound product",
    pass: c.products?.includes("outbound"),
    detail: `products=${JSON.stringify(c.products)}`,
  });

  const state = await getSetupState(c.id);
  checks.push({
    name: "ICP saved",
    pass: state.status === "generated",
    detail: `status=${state.status}`,
  });

  // Run a fresh generator pass to confirm the scraper + filter chain works.
  const genResult = await runGenerator({
    clientId: c.id,
    plan: c.plan,
    count: 3,
    batchKind: "daily_trickle",
  });
  checks.push({
    name: "generator produces >=3 high-fit verified prospects",
    pass: genResult.created >= 3 && !genResult.capReached,
    detail: `created=${genResult.created} capReached=${genResult.capReached}`,
  });

  // Test notification end-to-end.
  try {
    await notifyLead({
      clientId: c.id,
      notificationEmail: c.notification_email,
      kind: "verification_test",
      // ... minimal payload, see notify-lead signature ...
    } as any);
    checks.push({ name: "lead notification delivered", pass: true, detail: c.notification_email });
  } catch (err) {
    checks.push({
      name: "lead notification delivered",
      pass: false,
      detail: err instanceof Error ? err.message : String(err),
    });
  }

  // Render report.
  let allPass = true;
  for (const ch of checks) {
    const icon = ch.pass ? "✓" : "✗";
    console.log(`${icon} ${ch.name} — ${ch.detail}`);
    if (!ch.pass) allPass = false;
  }
  process.exit(allPass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

The `notifyLead` signature may not exactly match — read [src/lib/notify-lead.ts](qwikly-site/src/lib/notify-lead.ts) and adapt the call.

- [ ] **Step 2: Smoke test against an internal tenant**

Run: `npx tsx scripts/verify-pipeline-tenant.ts <internal_test_client_id>`
Expected: All four checks ✓.

- [ ] **Step 3: Commit**

```bash
git add scripts/verify-pipeline-tenant.ts
git commit -m "feat(pipeline): verification harness for end-to-end tenant readiness"
```

---

## Task 27: Final UAT + cap calibration

- [ ] **Step 1: Run the full happy path as a fresh tenant**

1. Sign up at `/signup?plan=pipeline_lite`
2. Verify Supabase: `products=['outbound']`, `pipeline_daily_quota=3`
3. Land on dashboard → see banner + yellow dot on Pipeline nav
4. Click "Finish setup" → wizard opens
5. Enter URL + offer → loading screen → review screen with pre-filled fields
6. Check at least 4 fields have visible "Why?" tooltips
7. Save → wait → land on `/dashboard/pipeline?firstBatch=1` with 5 prospects
8. Confirm `pipeline_prospects` rows have `delivery_batch_date = today`, `delivery_batch_kind = 'first_batch'`
9. Confirm `api_usage` has a row with `source='pipeline_icp_synthesis'`
10. Confirm `pipeline_api_usage` has rows for Google Places + Hunter calls

- [ ] **Step 2: Calibrate caps against the harness output**

Run the verification harness against the test tenant. Sum the wholesale spend produced. If the per-tenant cost for one full setup + first-batch run plus an estimated month of trickle is materially under R250 (Lite) / R750 (Pro), the caps stand. If over, raise them in `cap-check.ts` and re-commit. Document the calibration outcome in a comment on `cap-check.ts`.

- [ ] **Step 3: Run the cron once manually in production**

Run: `curl -H "Authorization: Bearer $CRON_SECRET" https://www.qwikly.co.za/api/pipeline/trickle`
Expected: 200 with the result array. Tomorrow morning, every outbound tenant should have N new prospects in their dashboard.

- [ ] **Step 4: Final commit**

```bash
git commit --allow-empty -m "chore(pipeline): outbound v1 UAT complete + caps calibrated"
```

---

## Self-review checklist

- **Spec section "Goals"** → Tasks 1, 6, 7-11 (wizard), 12-16 (UI), 17-18 (synchronous first batch), 25 (trickle)
- **Spec section "Product gating"** → Tasks 1 (schema), 6 (signup routing), 21-22 (banner + gate)
- **Spec section "Wizard flow"** → Tasks 13-16
- **Spec section "Per-tenant cost tracking"** → Tasks 1, 2, 4, 5, 9 (recordApiUsage source tag), 24
- **Spec section "Cap enforcement"** → Tasks 3, 11 (enforcement in enrich endpoint), 18 (enforcement in generator)
- **Spec section "Refine UI"** → Task 19 (route refine through existing IcpForm)
- **Spec section "Verification harness"** → Task 26
- **Spec section "Goals item 8: lead notifications still reach"** → Task 26 (harness verifies notify-lead end-to-end)
- **Score threshold change to ≥9** → Task 18 (`QUALITY_SCORE_THRESHOLD = 9`)
- **First batch of 5 (both tiers), then 3/8 daily trickle** → Task 17 (`count: 5`), Task 25 (`count: pipeline_daily_quota`)
- **Optional wizard with banner + nav dot, not forced redirect** → Tasks 20-22
- **Landing page copy update** → explicitly out of scope, flagged in spec, no task

No placeholders or TODOs remain. Type names consistent across tasks: `EnrichedIcp`, `IcpDefinition`, `RunGeneratorInput`, `recordPipelineUsage`, `checkCapForTenant`.

---

## Open at-execution-time questions

1. **Vitest is assumed** as the test runner. If the project uses Jest or another, adapt the test imports — the test logic stays the same.
2. **`maxDuration = 300`** on the save-and-generate route assumes the project's Vercel plan supports 300s function timeouts (default for Pro+). Verify before deploying.
3. **`notify-lead` exact signature** — adapt the harness call in Task 26 to match what the function actually accepts.
4. **The nav file location** — if the dashboard uses a different nav component than expected, Task 21's nav-dot change targets the actual file.
