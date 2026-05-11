# Bundle Model Implementation Plan (Phase 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse Inbound and Outbound product lines into a single tier ladder, enforce Outbound access by plan, and surface a soft-gate upsell overlay for Starter and Trial users.

**Architecture:** `clients.plan` stays the single source of truth. A new `hasOutbound(plan)` helper governs access across dashboard routes, API routes, and the billing/cap-check engine. Existing `pipeline_lite` / `pipeline_pro` tiers are retired (kept inactive for the small number of existing rows). Founders Concierge tier (R2,999) is added between Pro and Business.

**Tech Stack:** Next.js 14 App Router, Supabase (Postgres + Auth), Vitest, Tailwind, Lucide icons.

**Out of scope for Phase 1:** PayFast or any new payment gateway integration. Manual EFT (existing `payment_proof` flow) continues to be the payment path until Phase 2 ships. Promo codes also deferred.

**Reference spec:** [docs/superpowers/specs/2026-05-11-bundle-and-payments-design.md](../specs/2026-05-11-bundle-and-payments-design.md)

---

## File Map

**Modify:**
- `src/lib/plan.ts` , add `founders`, drop `PipelinePlanTier`, add `hasOutbound`, `productsForPlan`, `dailyProspectQuotaForPlan`
- `src/app/api/signup/route.ts` , use new helpers, add `founders` to validPlans
- `src/lib/pipeline/billing/cap-check.ts` , key caps by bundle plan instead of pipeline_* tiers
- `src/app/(landing)/pricing/page.tsx` , remove standalone Outbound pricing, add Outbound badge to Pro/Founders/Business/Enterprise
- `src/app/(landing)/pipeline/page.tsx` , remove any pricing block, add CTA to /pricing
- `src/app/(app)/dashboard/settings/billing/page.tsx` , add `founders` to PlanId and pricing constants

**Create:**
- `supabase/migrations/20260512_bundle_plans.sql` , constraint + backfill
- `src/lib/auth/require-outbound.ts` , server-side guard helper
- `src/components/pipeline/OutboundLockedOverlay.tsx` , the upsell overlay
- `src/app/(app)/dashboard/pipeline/layout.tsx` , server layout that gates the route group
- `src/lib/plan.test.ts` , unit tests for plan helpers
- `src/lib/pipeline/billing/__tests__/cap-check-bundle.test.ts` , tests for new cap keys
- `src/lib/auth/__tests__/require-outbound.test.ts` , tests for the guard helper

---

## Task 1: Add `founders` tier and bundle helpers to `plan.ts`

**Files:**
- Modify: `src/lib/plan.ts`
- Test: `src/lib/plan.test.ts`

- [ ] **Step 1: Write failing test for `hasOutbound`**

Create `src/lib/plan.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { hasOutbound, productsForPlan, dailyProspectQuotaForPlan, PLAN_CONFIG } from './plan';

describe('hasOutbound', () => {
  it.each(['pro', 'founders', 'business', 'enterprise'] as const)(
    'returns true for %s',
    (plan) => {
      expect(hasOutbound(plan)).toBe(true);
    }
  );

  it.each(['trial', 'starter', 'premium'] as const)(
    'returns false for %s',
    (plan) => {
      expect(hasOutbound(plan)).toBe(false);
    }
  );
});

describe('productsForPlan', () => {
  it('returns inbound-only for trial and starter', () => {
    expect(productsForPlan('trial')).toEqual(['inbound']);
    expect(productsForPlan('starter')).toEqual(['inbound']);
  });

  it('returns inbound + outbound for pro and up', () => {
    expect(productsForPlan('pro')).toEqual(['inbound', 'outbound']);
    expect(productsForPlan('founders')).toEqual(['inbound', 'outbound']);
    expect(productsForPlan('business')).toEqual(['inbound', 'outbound']);
    expect(productsForPlan('enterprise')).toEqual(['inbound', 'outbound']);
  });
});

describe('dailyProspectQuotaForPlan', () => {
  it('returns 0 for inbound-only tiers', () => {
    expect(dailyProspectQuotaForPlan('trial')).toBe(0);
    expect(dailyProspectQuotaForPlan('starter')).toBe(0);
  });

  it('returns the bundle quotas', () => {
    expect(dailyProspectQuotaForPlan('pro')).toBe(5);
    expect(dailyProspectQuotaForPlan('founders')).toBe(5);
    expect(dailyProspectQuotaForPlan('business')).toBe(10);
  });
});

describe('PLAN_CONFIG', () => {
  it('includes founders between pro and business', () => {
    expect(PLAN_CONFIG.founders.name).toBe('Founders Concierge');
    expect(PLAN_CONFIG.founders.priceMonthly).toBe(2999);
    expect(PLAN_CONFIG.founders.leadLimit).toBe(100);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd ~/qwikly-site && npx vitest run src/lib/plan.test.ts
```

Expected: FAIL with "hasOutbound is not exported" or "founders is not a valid PlanTier".

- [ ] **Step 3: Update `src/lib/plan.ts`**

Replace the `InboundPlanTier` type and add the new tier and helpers:

```ts
export type InboundPlanTier = 'trial' | 'starter' | 'pro' | 'founders' | 'business' | 'enterprise' | 'premium';

// Legacy aliases kept for one release so any straggler imports keep
// resolving until the cleanup pass. New code should use InboundPlanTier
// or PlanTier directly.
/** @deprecated Use InboundPlanTier. Pipeline tiers retired 2026-05-11. */
export type PipelinePlanTier = 'pipeline_lite' | 'pipeline_pro';

export type PlanTier = InboundPlanTier;
```

Add `founders` to `PLAN_CONFIG`. Insert between `pro` and `business`:

```ts
  founders: {
    name: 'Founders Concierge',
    priceMonthly: 2999,
    leadLimit: 100,
    removeBranding: true,
    customGreeting: true,
    csvExport: false,
    apiAccess: false,
    supportTier: 'priority',
    teamSeats: 3,
    responseSlaHours: 4,
    conversationsIncluded: 2000,
    overageCentsPerConversation: 750,
    topUpPricePerLeadZar: 20,
  },
```

Add the three helpers at the bottom of the file, above the `PUBLIC_TIERS` export:

```ts
/**
 * Returns true if the plan includes Outbound access. Outbound is bundled
 * into Pro and every tier above it. Trial and Starter are Inbound-only.
 */
export function hasOutbound(plan: InboundPlanTier): boolean {
  return plan === 'pro' || plan === 'founders' || plan === 'business' || plan === 'enterprise';
}

/**
 * Returns the products array that should live on the `clients` row for a
 * given plan. Used by the signup route, the PayFast ITN webhook (Phase 2),
 * and the migration backfill.
 */
export function productsForPlan(plan: InboundPlanTier): ('inbound' | 'outbound')[] {
  return hasOutbound(plan) ? ['inbound', 'outbound'] : ['inbound'];
}

/**
 * Daily prospect quota for Outbound. Returns 0 for Inbound-only tiers, so
 * callers can use a single numeric value instead of branching on the
 * product flag.
 */
export function dailyProspectQuotaForPlan(plan: InboundPlanTier): number {
  switch (plan) {
    case 'pro':
    case 'founders':
      return 5;
    case 'business':
      return 10;
    case 'enterprise':
      return 20;
    default:
      return 0;
  }
}
```

Update `resolvePlan` to recognise `'founders'`:

```ts
export function resolvePlan(raw: string | null | undefined): InboundPlanTier {
  if (raw === 'trial') return 'trial';
  if (raw === 'starter' || raw === 'lite') return 'starter';
  if (raw === 'pro') return 'pro';
  if (raw === 'founders') return 'founders';
  if (raw === 'business') return 'business';
  if (raw === 'enterprise') return 'enterprise';
  if (raw === 'premium') return 'premium';
  // Legacy pipeline tiers resolve to their bundle equivalents.
  if (raw === 'pipeline_lite') return 'pro';
  if (raw === 'pipeline_pro') return 'business';
  return 'trial';
}
```

Update `PUBLIC_TIERS`:

```ts
export const PUBLIC_TIERS: InboundPlanTier[] = ['starter', 'pro', 'founders', 'business', 'enterprise'];
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd ~/qwikly-site && npx vitest run src/lib/plan.test.ts
```

Expected: PASS, all 9 tests green.

- [ ] **Step 5: Commit**

```bash
cd ~/qwikly-site && git add src/lib/plan.ts src/lib/plan.test.ts
git -c commit.gpgsign=false commit -m "$(cat <<'EOF'
feat: add founders tier and bundle helpers to plan.ts

Adds Founders Concierge (R2,999), exposes hasOutbound, productsForPlan,
and dailyProspectQuotaForPlan helpers. Maps legacy pipeline_lite and
pipeline_pro raw values to pro and business in resolvePlan.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Database migration for new tier and backfill

**Files:**
- Create: `supabase/migrations/20260512_bundle_plans.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260512_bundle_plans.sql`:

```sql
-- 20260512_bundle_plans.sql
--
-- Collapses Inbound and Outbound product lines into a single bundle ladder
-- (see docs/superpowers/specs/2026-05-11-bundle-and-payments-design.md).
--
-- 1. Adds 'founders' to the plan CHECK constraints on clients and subscriptions
-- 2. Adds a 'founders' row to plan_prices
-- 3. Marks pipeline_lite and pipeline_pro as inactive in plan_prices
-- 4. Backfills any existing pipeline_* clients into their bundle equivalents
--
-- Idempotent. Safe to run repeatedly.

-- 1. Plan CHECK constraints, expand to include 'founders'.
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_plan_check;
ALTER TABLE clients
  ADD CONSTRAINT clients_plan_check
  CHECK (plan IN (
    'trial', 'starter', 'pro', 'founders', 'business', 'enterprise', 'premium',
    'pipeline_lite', 'pipeline_pro'
  ));

ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check;
ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_plan_check
  CHECK (plan IN (
    'trial', 'starter', 'pro', 'founders', 'business', 'enterprise', 'premium',
    'pipeline_lite', 'pipeline_pro'
  ));

-- 2. Founders plan price row.
INSERT INTO plan_prices (plan_key, display_name, amount_zar_cents, billing_cadence, is_active)
VALUES ('founders', 'Founders Concierge', 299900, 'monthly', true)
ON CONFLICT (plan_key) DO UPDATE SET
  display_name     = EXCLUDED.display_name,
  amount_zar_cents = EXCLUDED.amount_zar_cents,
  is_active        = EXCLUDED.is_active,
  updated_at       = now();

-- 3. Retire standalone pipeline tiers, hidden from new flows but kept so
--    any straggler rows continue resolving cleanly.
UPDATE plan_prices
  SET is_active = false, updated_at = now()
  WHERE plan_key IN ('pipeline_lite', 'pipeline_pro');

-- 4. Backfill: existing pipeline_lite clients land on Pro, pipeline_pro on
--    Business. Products + quota set to match the bundle.
UPDATE clients
  SET plan = 'pro',
      products = ARRAY['inbound','outbound'],
      pipeline_daily_quota = 5
  WHERE plan = 'pipeline_lite';

UPDATE clients
  SET plan = 'business',
      products = ARRAY['inbound','outbound'],
      pipeline_daily_quota = 10
  WHERE plan = 'pipeline_pro';

UPDATE subscriptions SET plan = 'pro'      WHERE plan = 'pipeline_lite';
UPDATE subscriptions SET plan = 'business' WHERE plan = 'pipeline_pro';

-- 5. After the constraint expansion above runs once, the old pipeline_*
--    values are no longer in the CHECK list, but we keep them there for
--    one release of safety. A follow-up migration in Phase 2 will drop
--    them once we have confirmed zero rows remain.
```

- [ ] **Step 2: Apply the migration locally**

```bash
cd ~/qwikly-site && npx supabase db push --include-all
```

Expected: migration applied, no error.

- [ ] **Step 3: Verify the constraint and backfill**

```bash
cd ~/qwikly-site && npx supabase db query --query "SELECT plan, count(*) FROM clients GROUP BY plan; SELECT plan_key, is_active FROM plan_prices WHERE plan_key IN ('founders','pipeline_lite','pipeline_pro');"
```

Expected: no `pipeline_lite` or `pipeline_pro` rows in clients, `founders` row in plan_prices with `is_active=true`, pipeline tiers with `is_active=false`.

- [ ] **Step 4: Commit**

```bash
cd ~/qwikly-site && git add supabase/migrations/20260512_bundle_plans.sql
git -c commit.gpgsign=false commit -m "$(cat <<'EOF'
feat(db): add founders tier and backfill pipeline tiers to bundle

Migration adds 'founders' to clients/subscriptions plan CHECK,
seeds plan_prices, and backfills any pipeline_lite/pipeline_pro
clients into pro/business with the new daily quotas.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Update signup route to use bundle helpers

**Files:**
- Modify: `src/app/api/signup/route.ts`

- [ ] **Step 1: Delete the local helpers**

In `src/app/api/signup/route.ts`, remove the two local functions:

```ts
// DELETE these two:
function productsForPlan(plan: string): string[] { ... }
function pipelineDailyQuotaForPlan(plan: string): number { ... }
```

- [ ] **Step 2: Import from lib/plan**

Add the import near the top of the file:

```ts
import {
  productsForPlan,
  dailyProspectQuotaForPlan,
  resolvePlan,
  type InboundPlanTier,
} from "@/lib/plan";
```

- [ ] **Step 3: Update validPlans**

Replace the `validPlans` list with:

```ts
const validPlans: InboundPlanTier[] = ['trial', 'starter', 'pro', 'founders', 'business', 'enterprise', 'premium'];
const resolvedPlan: InboundPlanTier = validPlans.includes(planParam as InboundPlanTier)
  ? (planParam as InboundPlanTier)
  : 'trial';
```

Note: `pipeline_lite` and `pipeline_pro` are intentionally removed from valid signup plans. Anyone passing them via URL gets the trial fallback. The migration backfill handled existing rows.

- [ ] **Step 4: Replace the clients insert call**

The insert that reads `products: productsForPlan(resolvedPlan)` and `pipeline_daily_quota: pipelineDailyQuotaForPlan(resolvedPlan)` continues to work, but now the imports come from `@/lib/plan`. Update the call site so it reads `dailyProspectQuotaForPlan` instead of the deleted local name:

```ts
await db.from("clients").insert({
  auth_user_id: data.user.id,
  business_name: businessName ?? "",
  onboarding_step: 1,
  web_widget_enabled: true,
  plan: resolvedPlan,
  products: productsForPlan(resolvedPlan),
  pipeline_daily_quota: dailyProspectQuotaForPlan(resolvedPlan),
  ...(trialEndsAt ? { trial_ends_at: trialEndsAt } : {}),
});
```

- [ ] **Step 5: Build and check types**

```bash
cd ~/qwikly-site && npx tsc --noEmit
```

Expected: no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
cd ~/qwikly-site && git add src/app/api/signup/route.ts
git -c commit.gpgsign=false commit -m "$(cat <<'EOF'
refactor(signup): use shared plan helpers, add founders to valid plans

Removes the local productsForPlan and pipelineDailyQuotaForPlan
duplicates. Drops pipeline_lite/pipeline_pro from valid signup plans
since they are retired by the bundle migration.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Update cap-check.ts to key caps by bundle plan

**Files:**
- Modify: `src/lib/pipeline/billing/cap-check.ts`
- Test: `src/lib/pipeline/billing/__tests__/cap-check-bundle.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/lib/pipeline/billing/__tests__/cap-check-bundle.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { wholesaleCapForPlan } from '../cap-check';

describe('wholesaleCapForPlan, bundle tiers', () => {
  it('returns the Pro cap', () => {
    expect(wholesaleCapForPlan('pro')).toBe(25000); // R250
  });

  it('returns the Founders cap (same as Pro)', () => {
    expect(wholesaleCapForPlan('founders')).toBe(25000);
  });

  it('returns the Business cap', () => {
    expect(wholesaleCapForPlan('business')).toBe(75000); // R750
  });

  it('returns the Enterprise cap', () => {
    expect(wholesaleCapForPlan('enterprise')).toBe(200000); // R2000
  });

  it('returns 0 for inbound-only tiers', () => {
    expect(wholesaleCapForPlan('starter')).toBe(0);
    expect(wholesaleCapForPlan('trial')).toBe(0);
  });

  it('still resolves legacy pipeline_lite to the Pro cap', () => {
    expect(wholesaleCapForPlan('pipeline_lite')).toBe(25000);
  });

  it('still resolves legacy pipeline_pro to the Business cap', () => {
    expect(wholesaleCapForPlan('pipeline_pro')).toBe(75000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd ~/qwikly-site && npx vitest run src/lib/pipeline/billing/__tests__/cap-check-bundle.test.ts
```

Expected: FAIL. Old `pro` returns 0 because only `pipeline_lite` / `pipeline_pro` were in `CAP_CENTS_BY_PLAN`.

- [ ] **Step 3: Update CAP_CENTS_BY_PLAN**

In `src/lib/pipeline/billing/cap-check.ts`, replace the constant:

```ts
const CAP_CENTS_BY_PLAN: Record<string, number> = {
  // Bundle tiers
  pro:        25000,  // R250
  founders:   25000,  // R250, matches Pro since Founders is Pro + concierge
  business:   75000,  // R750
  enterprise: 200000, // R2,000
  // Legacy pipeline tiers, kept for one release while the backfill rolls.
  pipeline_lite: 25000,
  pipeline_pro:  75000,
};
```

Also update the `PipelinePlan` type to reflect the rename:

```ts
/** @deprecated Use InboundPlanTier from @/lib/plan. */
export type PipelinePlan = 'pro' | 'founders' | 'business' | 'enterprise';
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd ~/qwikly-site && npx vitest run src/lib/pipeline/billing/__tests__/
```

Expected: PASS, both the existing cap-check tests and the new bundle tests.

- [ ] **Step 5: Commit**

```bash
cd ~/qwikly-site && git add src/lib/pipeline/billing/cap-check.ts src/lib/pipeline/billing/__tests__/cap-check-bundle.test.ts
git -c commit.gpgsign=false commit -m "$(cat <<'EOF'
feat(cap-check): key wholesale caps by bundle plan

Adds pro/founders/business/enterprise to CAP_CENTS_BY_PLAN with the
Outbound caps. Keeps pipeline_lite/pipeline_pro keys for one release
of safety until the backfill is fully verified.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Create the server-side access guard helper

**Files:**
- Create: `src/lib/auth/require-outbound.ts`
- Create: `src/lib/auth/__tests__/require-outbound.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/auth/__tests__/require-outbound.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireOutboundAccess } from '../require-outbound';

const mockMaybeSingle = vi.fn();
const mockFrom = vi.fn(() => ({
  select: () => ({
    eq: () => ({ maybeSingle: mockMaybeSingle }),
  }),
}));

vi.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: () => ({ from: mockFrom }),
}));

describe('requireOutboundAccess', () => {
  beforeEach(() => {
    mockMaybeSingle.mockReset();
  });

  it('returns ok for a pro plan', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { plan: 'pro' }, error: null });
    const result = await requireOutboundAccess('user-1');
    expect(result.ok).toBe(true);
  });

  it('returns not-ok with plan for a starter plan', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { plan: 'starter' }, error: null });
    const result = await requireOutboundAccess('user-1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.plan).toBe('starter');
  });

  it('returns not-ok when no clients row exists', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const result = await requireOutboundAccess('user-1');
    expect(result.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd ~/qwikly-site && npx vitest run src/lib/auth/__tests__/require-outbound.test.ts
```

Expected: FAIL with "Cannot find module './require-outbound'".

- [ ] **Step 3: Implement the helper**

Create `src/lib/auth/require-outbound.ts`:

```ts
import { supabaseAdmin } from '@/lib/supabase-server';
import { hasOutbound, resolvePlan } from '@/lib/plan';

export type OutboundAccessResult =
  | { ok: true; plan: string }
  | { ok: false; plan: string | null };

/**
 * Look up the caller's plan via auth_user_id and return whether they
 * have Outbound access. Returns ok=false with plan=null if no clients
 * row exists yet (e.g. signup is mid-flight).
 *
 * Server-only. Do not import into client components.
 */
export async function requireOutboundAccess(authUserId: string): Promise<OutboundAccessResult> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from('clients')
    .select('plan')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, plan: null };
  }

  const plan = resolvePlan(data.plan);
  return hasOutbound(plan)
    ? { ok: true, plan: data.plan }
    : { ok: false, plan: data.plan };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd ~/qwikly-site && npx vitest run src/lib/auth/__tests__/require-outbound.test.ts
```

Expected: PASS, all 3 tests green.

- [ ] **Step 5: Commit**

```bash
cd ~/qwikly-site && git add src/lib/auth/require-outbound.ts src/lib/auth/__tests__/require-outbound.test.ts
git -c commit.gpgsign=false commit -m "$(cat <<'EOF'
feat(auth): add requireOutboundAccess server-side guard

Single helper used by API routes and the dashboard pipeline layout
to check whether the caller's plan includes Outbound. Returns the
raw plan so callers can render an accurate upsell.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Apply the API guard to `/api/pipeline/*` routes

**Files:**
- Modify: every `route.ts` under `src/app/api/pipeline/`
  - `setup/save-and-generate/route.ts`
  - `icp/enrich/route.ts`
  - `setup-status/route.ts`
  - `trickle/route.ts`
  - `generate/route.ts` (if exists, verify before editing)

- [ ] **Step 1: Read each route's current auth pattern**

```bash
cd ~/qwikly-site && grep -l "auth.getUser\|getSession" src/app/api/pipeline/**/*.ts
```

Expected: a list of the routes that pull the user. Each of these is where the guard inserts.

- [ ] **Step 2: Insert the guard in each route, right after the user is loaded**

For each file, after the line where `userId` (or equivalent) is established, add:

```ts
import { requireOutboundAccess } from '@/lib/auth/require-outbound';

// ... existing auth code that sets `userId` ...

const access = await requireOutboundAccess(userId);
if (!access.ok) {
  return NextResponse.json(
    { error: 'outbound_access_required', plan: access.plan },
    { status: 403 }
  );
}
```

The `trickle/route.ts` route is a cron worker, not a user request. Skip the guard there but verify it still reads the tenant's plan from the row before calling the scraper, the `hasOutbound` check happens implicitly via `dailyProspectQuotaForPlan` returning 0 for Inbound-only tenants.

- [ ] **Step 3: Manual smoke test, blocked Starter**

Start the dev server in a separate terminal:

```bash
cd ~/qwikly-site && npm run dev
```

Sign in as a Starter user (or set `clients.plan = 'starter'` for a test user via Supabase Studio). Hit `POST /api/pipeline/setup/save-and-generate` with curl:

```bash
curl -i -X POST http://localhost:3000/api/pipeline/setup/save-and-generate \
  -H 'Content-Type: application/json' \
  -H "Cookie: <copy session cookie from browser>" \
  -d '{}'
```

Expected: `HTTP/1.1 403` with body `{"error":"outbound_access_required","plan":"starter"}`.

- [ ] **Step 4: Manual smoke test, allowed Pro**

Set `clients.plan = 'pro'` for the same user. Repeat the curl. Expected: route runs normally (200 or 4xx for missing payload, but never 403).

- [ ] **Step 5: Commit**

```bash
cd ~/qwikly-site && git add src/app/api/pipeline/
git -c commit.gpgsign=false commit -m "$(cat <<'EOF'
feat(api): guard /api/pipeline/* routes with requireOutboundAccess

Every user-facing pipeline route now returns 403 with a structured
error if the caller's plan does not include Outbound. The trickle
cron worker is exempt, it relies on dailyProspectQuotaForPlan=0
to no-op for inbound-only tenants.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Create the OutboundLockedOverlay component

**Files:**
- Create: `src/components/pipeline/OutboundLockedOverlay.tsx`

- [ ] **Step 1: Build the component**

Create `src/components/pipeline/OutboundLockedOverlay.tsx`:

```tsx
"use client";

import Link from "next/link";
import { Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  currentPlan: string;
}

export function OutboundLockedOverlay({ currentPlan }: Props) {
  const tierLabel = currentPlan === 'trial' ? 'Free Trial' : 'Starter';
  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-white/70 backdrop-blur-md"
      role="dialog"
      aria-label="Outbound locked"
    >
      <div className="max-w-md text-center px-6 py-8 rounded-2xl bg-white shadow-xl border border-ink-100">
        <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-ink-50 flex items-center justify-center">
          <Lock className="w-6 h-6 text-ink-700" aria-hidden />
        </div>
        <h2 className="text-xl font-semibold text-ink-900">Outbound is on the Pro plan</h2>
        <p className="mt-2 text-sm text-ink-600">
          You are on {tierLabel}. Upgrade to Pro for R1,799/month to unlock daily hand-picked prospects,
          warmed sending domains, and the full Outbound pipeline.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Link href="/dashboard/settings/billing?plan=pro">
            <Button className="w-full">
              Upgrade to Pro
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
          <Link href="/pipeline" className="text-tiny text-ink-500 hover:text-ink-700 underline">
            Learn what Outbound does
          </Link>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build and check types**

```bash
cd ~/qwikly-site && npx tsc --noEmit
```

Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
cd ~/qwikly-site && git add src/components/pipeline/OutboundLockedOverlay.tsx
git -c commit.gpgsign=false commit -m "$(cat <<'EOF'
feat(ui): add OutboundLockedOverlay upsell component

Frosted-glass overlay rendered over /dashboard/pipeline pages for
Starter and Trial users. Doubles as the upgrade CTA surface.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Gate the dashboard pipeline route group with a server layout

**Files:**
- Create: `src/app/(app)/dashboard/pipeline/layout.tsx`

- [ ] **Step 1: Build the server layout**

Create `src/app/(app)/dashboard/pipeline/layout.tsx`:

```tsx
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { OutboundLockedOverlay } from '@/components/pipeline/OutboundLockedOverlay';
import { requireOutboundAccess } from '@/lib/auth/require-outbound';

export const dynamic = 'force-dynamic';

export default async function PipelineLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();

  // Not signed in, let the parent (app) layout handle the redirect.
  if (!user) return <>{children}</>;

  const access = await requireOutboundAccess(user.id);
  if (access.ok) return <>{children}</>;

  // Render the real page content blurred behind the overlay, so the user
  // sees a hint of what they would get and the overlay sits on top.
  return (
    <div className="relative">
      <div aria-hidden className="pointer-events-none select-none filter blur-sm opacity-60">
        {children}
      </div>
      <OutboundLockedOverlay currentPlan={access.plan ?? 'starter'} />
    </div>
  );
}
```

- [ ] **Step 2: Smoke-test the locked state**

Start the dev server, sign in as a Starter user, visit `http://localhost:3000/dashboard/pipeline`.

Expected: overlay visible centered on the page, "Upgrade to Pro" button links to `/dashboard/settings/billing?plan=pro`, page content behind is blurred and not interactive.

- [ ] **Step 3: Smoke-test the unlocked state**

Set the same user's plan to `pro` in Supabase Studio. Reload `/dashboard/pipeline`.

Expected: full dashboard, no overlay.

- [ ] **Step 4: Commit**

```bash
cd ~/qwikly-site && git add src/app/\(app\)/dashboard/pipeline/layout.tsx
git -c commit.gpgsign=false commit -m "$(cat <<'EOF'
feat(dashboard): soft-gate /dashboard/pipeline with bundle check

Server layout reads the caller's plan via requireOutboundAccess and
renders the OutboundLockedOverlay over a blurred page when the plan
is Inbound-only. Combines belt-and-suspenders with the API guards
in Task 6.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Collapse the pricing page to a single bundle ladder

**Files:**
- Modify: `src/app/(landing)/pricing/page.tsx`

- [ ] **Step 1: Remove the PipelinePricingBlock import and usage**

In `src/app/(landing)/pricing/page.tsx`, find and remove:

```ts
import { PipelinePricingBlock } from "@/components/pricing/PipelinePricingBlock";
```

Then remove any JSX rendering `<PipelinePricingBlock ... />` further down the file. Replace it with a short single-paragraph callout:

```tsx
<section className="my-12 text-center">
  <p className="text-sm text-ink-600 max-w-2xl mx-auto">
    Outbound, our daily hand-picked prospect pipeline, is included on every plan from Pro upward.
    No separate purchase needed.
    {" "}
    <a href="/pipeline" className="underline">See how Outbound works</a>.
  </p>
</section>
```

- [ ] **Step 2: Add an "Outbound included" badge to the four bundled tiers**

In the `tiers` array, add a `bundleBadge?: string` field. Then in the JSX where each tier card is rendered, conditionally render:

```tsx
{tier.bundleBadge && (
  <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-ink-50 text-tiny text-ink-700">
    <Sparkles className="w-3 h-3" aria-hidden />
    {tier.bundleBadge}
  </div>
)}
```

Set `bundleBadge: "Outbound included"` on the `pro`, `founders`, `business`, and `enterprise` tiers. Leave `starter` without it.

- [ ] **Step 3: Add an outbound feature line to each bundled tier**

In each of the four bundled tiers' `features` array, insert as the first entry (so it's prominent):

- Pro: `"5 hand-picked prospects/day (Outbound)"`
- Founders: `"5 hand-picked prospects/day (Outbound)"`
- Business: `"10 hand-picked prospects/day (Outbound)"`
- Enterprise: `"Custom Outbound volume"`

- [ ] **Step 4: Smoke-test the page**

Visit `http://localhost:3000/pricing`.

Expected: four bundled tiers show the "Outbound included" badge, Starter does not. No Outbound pricing block. The single-paragraph callout above the grid points to /pipeline for explainer content.

- [ ] **Step 5: Commit**

```bash
cd ~/qwikly-site && git add src/app/\(landing\)/pricing/page.tsx
git -c commit.gpgsign=false commit -m "$(cat <<'EOF'
feat(pricing): collapse to bundle ladder, retire standalone Outbound

Removes PipelinePricingBlock and adds an "Outbound included" badge
plus a prospect-volume feature line to every tier from Pro upward.
Starter stays Inbound-only.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Repurpose `/pipeline` marketing page

**Files:**
- Modify: `src/app/(landing)/pipeline/page.tsx`

- [ ] **Step 1: Confirm no separate pricing block remains on the page**

```bash
cd ~/qwikly-site && grep -n "PricingBlock\|MONTHLY\|R[0-9]" src/app/\(landing\)/pipeline/page.tsx
```

If any pricing references show up, remove them. The page should explain the Outbound feature but not name a price.

- [ ] **Step 2: Add a "See pricing" CTA at the bottom**

Add or update the final CTA block in `src/app/(landing)/pipeline/page.tsx`:

```tsx
<section className="text-center py-12">
  <h2 className="text-2xl font-semibold">Ready to add Outbound?</h2>
  <p className="mt-2 text-ink-600">
    Included with every Qwikly plan from Pro upward.
  </p>
  <div className="mt-4">
    <a
      href="/pricing"
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-ink-900 text-white hover:bg-ink-800 transition"
    >
      See pricing
    </a>
  </div>
</section>
```

- [ ] **Step 3: Smoke-test**

Visit `http://localhost:3000/pipeline`.

Expected: no inline pricing, CTA at the bottom routes to /pricing.

- [ ] **Step 4: Commit**

```bash
cd ~/qwikly-site && git add src/app/\(landing\)/pipeline/page.tsx
git -c commit.gpgsign=false commit -m "$(cat <<'EOF'
feat(pipeline-page): retire standalone pricing, link to /pricing

Outbound is now bundled into every Pro+ plan, the /pipeline page is
purely a feature explainer. Pricing lives at /pricing.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Add `founders` tier to the billing settings page

**Files:**
- Modify: `src/app/(app)/dashboard/settings/billing/page.tsx`

- [ ] **Step 1: Update PlanId type**

Find the type alias near the top of the file:

```ts
type PlanId = "starter" | "pro" | "business" | "enterprise" | "premium";
```

Replace with:

```ts
type PlanId = "starter" | "pro" | "founders" | "business" | "enterprise" | "premium";
```

- [ ] **Step 2: Add founders to MONTHLY and ANNUAL constants**

```ts
const MONTHLY: Record<PlanId, number> = {
  starter: 699,
  pro: 1799,
  founders: 2999,
  business: 3999,
  enterprise: 7999,
  premium: 1999,
};
const ANNUAL: Record<PlanId, number> = {
  starter: 7128,
  pro: 18350,
  founders: 30590, // 2999 * 12 * 0.85, rounded
  business: 40790,
  enterprise: 81590,
  premium: 20390,
};
```

- [ ] **Step 3: Add founders to the PLANS metadata record**

```ts
founders: {
  name: "Founders Concierge",
  tagline: "Pro plan, plus a real person handling every lead",
  highlight: false,
  features: [
    "Everything in Pro",
    "Real human responding to every lead",
    "We book calls into your calendar",
    "5 hand-picked prospects/day (Outbound)",
    "Limited spots, capacity capped per region",
  ],
},
```

- [ ] **Step 4: Build and check types**

```bash
cd ~/qwikly-site && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Smoke-test**

Visit `http://localhost:3000/dashboard/settings/billing`.

Expected: Founders appears in the plan picker between Pro and Business, with the correct monthly and annual prices.

- [ ] **Step 6: Commit**

```bash
cd ~/qwikly-site && git add src/app/\(app\)/dashboard/settings/billing/page.tsx
git -c commit.gpgsign=false commit -m "$(cat <<'EOF'
feat(billing): add founders tier to the billing settings UI

Adds Founders Concierge to PlanId, the MONTHLY/ANNUAL pricing
constants, and the PLANS metadata record so users on any tier can
see and switch to it.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: Full end-to-end verification

- [ ] **Step 1: Run the full test suite**

```bash
cd ~/qwikly-site && npm test
```

Expected: every test green, including the new plan, cap-check, and require-outbound suites.

- [ ] **Step 2: Build the production bundle**

```bash
cd ~/qwikly-site && npm run build
```

Expected: build succeeds, no TypeScript or lint errors.

- [ ] **Step 3: Manual happy-path walk, Starter user**

With the dev server running:

1. Sign up at `/signup?plan=starter`.
2. Confirm the dashboard loads.
3. Click "Pipeline" / "Outbound" nav item.
4. Confirm the locked overlay appears with "Upgrade to Pro" CTA.
5. Click the CTA, confirm it lands on `/dashboard/settings/billing?plan=pro`.
6. Hit `POST /api/pipeline/setup/save-and-generate` via curl, confirm 403.

- [ ] **Step 4: Manual happy-path walk, Pro user**

1. In Supabase Studio, update the same user's `clients.plan` to `'pro'` and `products` to `ARRAY['inbound','outbound']`.
2. Reload `/dashboard/pipeline`.
3. Confirm no overlay, full dashboard.
4. Confirm `POST /api/pipeline/setup/save-and-generate` returns its normal response.

- [ ] **Step 5: Manual happy-path walk, Founders user**

1. Update `clients.plan` to `'founders'`.
2. Reload `/dashboard/pipeline`. Confirm full access.
3. Visit `/dashboard/settings/billing`. Confirm Founders is shown as the current plan.

- [ ] **Step 6: Final summary commit**

If any small fixes came out of the manual walk, batch them into one commit:

```bash
cd ~/qwikly-site && git add -A
git -c commit.gpgsign=false commit -m "$(cat <<'EOF'
chore: post-walk fixes from bundle model verification

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## What Phase 2 will add (separate plan)

When a payment gateway is approved (PayFast primary, Paddle backup), a separate plan will cover:

- PayFast checkout module + ITN webhook handler
- Live access flip from webhook into `clients.plan` + `clients.products` + `clients.pipeline_daily_quota`
- `/pay/success` page that forces a one-shot Supabase refetch before rendering the dashboard
- Wiring the signup form to redirect paid plans to PayFast checkout
- Deprecating the existing Paystack code paths after one release of stability

Phase 1 ships value on its own: the bundle model is enforced, the upsell surface exists, and existing manual EFT payments (the `payment_proof` flow) continue to settle subscriptions correctly while Phase 2 is built.
