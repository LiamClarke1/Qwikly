# Billing Foundation (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the foundation layer of the end-to-end billing system: schema migrations, the single source-of-truth writer, the PayFast core library, the ITN webhook endpoint with full validation and state machine, and the four time-based cron skeletons. Customer-facing flows (signup, upgrade, top-up, etc.) build on this in Phase 2.

**Architecture:** All entitlement writes funnel through `applySubscriptionToClient()` which is the only function that writes `clients.plan`, `products`, and feature flags. PayFast lives behind a thin module wall (`src/lib/payfast/*`) with no business logic, just protocol. The ITN endpoint validates four ways (signature, source IP, PayFast postback, DB amount match) before any DB write and is fully idempotent on `pf_payment_id`. Crons run hourly and act as the safety net for missed webhooks.

**Tech Stack:** Next.js 15 App Router, TypeScript strict, Supabase (Postgres + Auth + Storage), Vitest, PayFast hosted checkout + ITN + Subscriptions API. Existing project conventions: server-only modules, `supabaseAdmin()` for elevated writes, `force-dynamic` on stateful routes.

**Spec reference:** `docs/superpowers/specs/2026-05-11-end-to-end-billing-design.md`

**Out of scope for Phase 1 (lands in Phase 2):** signup flow changes, upgrade/downgrade UI, top-up pages, dashboard meter components, cleanup of 8% commission code, customer-facing pricing page changes.

---

## File Structure

### New migrations (Supabase)

| File | Responsibility |
|---|---|
| `supabase/migrations/20260513_subscriptions_billing_columns.sql` | Add `payfast_token`, `current_period_start`, `current_period_end`, `pending_plan`, `proration_credit_zar_cents` to `subscriptions` |
| `supabase/migrations/20260513_conversation_credits_split.sql` | Add `granted_balance_zar_cents`, `granted_expires_at`, `purchased_balance_zar_cents`; backfill from existing `balance_zar_cents`; keep old column for rollback safety |
| `supabase/migrations/20260513_payfast_payments.sql` | Create `payfast_payments` audit/pending table with RLS |
| `supabase/migrations/20260513_lead_topups.sql` | Create `lead_topups` table with RLS |
| `supabase/migrations/20260513_payment_failures.sql` | Create `payment_failures` table with RLS |

### New library modules (TypeScript)

| File | Responsibility |
|---|---|
| `src/lib/payfast/config.ts` | Env loading, sandbox/live toggle, static IP allowlist, URL builders |
| `src/lib/payfast/types.ts` | TypeScript types for ITN payloads, checkout params, API responses |
| `src/lib/payfast/signature.ts` | MD5 signature generation and verification, field-order canonicalisation |
| `src/lib/payfast/checkout.ts` | Build signed hosted checkout redirect URLs |
| `src/lib/payfast/adhoc.ts` | Charge a stored token (top-ups, proration) via PayFast API |
| `src/lib/payfast/token.ts` | Update subscription amount, cancel subscription, fetch subscription status |
| `src/lib/payfast/itn.ts` | ITN four-step validation pipeline |
| `src/lib/billing/apply-subscription.ts` | The single `applySubscriptionToClient()` function |
| `src/lib/billing/entitlement.ts` | `getEntitlement(clientId)` reader for runtime gates |
| `src/lib/billing/grant-amounts.ts` | Per-plan starting AI credit grant lookup |

### New API routes

| File | Responsibility |
|---|---|
| `src/app/api/payfast/itn/route.ts` | POST handler for ITN, validates and applies state transitions |
| `src/app/api/cron/payfast-reconcile/route.ts` | Hourly cron, resolves stuck pending payments |
| `src/app/api/cron/renewal-sweep/route.ts` | Hourly cron, fires renewals via PayFast token |
| `src/app/api/cron/trial-sweep/route.ts` | Hourly cron, pauses expired trials |
| `src/app/api/cron/dunning-sweep/route.ts` | Hourly cron, escalates past-due subscriptions |

### Modified files

| File | Change |
|---|---|
| `vercel.json` | Add four new cron entries |
| `src/lib/plan.ts` | Add `startingGrantZarCents` to `PlanConfig` and to each tier entry |

---

## Task 1: Schema migration — subscriptions billing columns

**Files:**
- Create: `supabase/migrations/20260513_subscriptions_billing_columns.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 20260513_subscriptions_billing_columns.sql
--
-- Adds the PayFast and billing-anchor columns to subscriptions that the
-- end-to-end billing design requires. See:
--   docs/superpowers/specs/2026-05-11-end-to-end-billing-design.md
--
-- Idempotent. Safe to re-run.

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS payfast_token TEXT,
  ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS current_period_end   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pending_plan         TEXT,
  ADD COLUMN IF NOT EXISTS proration_credit_zar_cents INT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end
  ON subscriptions (current_period_end)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_subscriptions_pending_plan
  ON subscriptions (pending_plan)
  WHERE pending_plan IS NOT NULL;

COMMENT ON COLUMN subscriptions.payfast_token IS
  'PayFast subscription token for ad-hoc charges and recurring renewals.';
COMMENT ON COLUMN subscriptions.pending_plan IS
  'Plan tier to switch to at next renewal (downgrade flow).';
```

- [ ] **Step 2: Run locally to verify**

Run: `cd ~/qwikly-site && supabase db reset && supabase migration up`
Expected: migration completes without error, `\d subscriptions` shows the new columns.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260513_subscriptions_billing_columns.sql
git commit -m "feat(billing): add PayFast billing columns to subscriptions"
```

---

## Task 2: Schema migration — conversation_credits split balance

**Files:**
- Create: `supabase/migrations/20260513_conversation_credits_split.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 20260513_conversation_credits_split.sql
--
-- Splits conversation_credits.balance_zar_cents into two ledgers:
--   - granted_balance_zar_cents: monthly plan grant, resets on renewal
--   - purchased_balance_zar_cents: top-ups, never expire (real money)
--
-- Backfills purchased_balance from existing balance so no top-up money is
-- lost. The legacy balance_zar_cents column is kept for one release of
-- rollback safety and dropped in a Phase 2 cleanup migration.
--
-- Idempotent. Safe to re-run.

ALTER TABLE conversation_credits
  ADD COLUMN IF NOT EXISTS granted_balance_zar_cents   INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS granted_expires_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS purchased_balance_zar_cents INT NOT NULL DEFAULT 0;

-- Backfill: existing balance becomes purchased (it was customer-paid top-up money).
UPDATE conversation_credits
  SET purchased_balance_zar_cents = balance_zar_cents
  WHERE purchased_balance_zar_cents = 0
    AND balance_zar_cents > 0;

COMMENT ON COLUMN conversation_credits.granted_balance_zar_cents IS
  'Plan grant balance, resets on renewal. Drains first.';
COMMENT ON COLUMN conversation_credits.purchased_balance_zar_cents IS
  'Top-up balance, never expires. Drains after granted.';
COMMENT ON COLUMN conversation_credits.granted_expires_at IS
  'When the granted balance resets, normally = subscriptions.current_period_end.';
```

- [ ] **Step 2: Verify backfill**

Run: `psql $DATABASE_URL -c "SELECT count(*) FROM conversation_credits WHERE balance_zar_cents > 0 AND purchased_balance_zar_cents != balance_zar_cents;"`
Expected: `0`

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260513_conversation_credits_split.sql
git commit -m "feat(billing): split conversation_credits balance into granted + purchased"
```

---

## Task 3: Schema migration — payfast_payments table

**Files:**
- Create: `supabase/migrations/20260513_payfast_payments.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 20260513_payfast_payments.sql
--
-- Audit log + pending-payment tracker for every PayFast transaction.
-- Every checkout creates a 'pending' row; the ITN handler transitions to
-- 'captured', 'failed', 'cancelled', or 'refunded'.
--
-- pf_payment_id is UNIQUE to guarantee idempotency across PayFast's up-to-5
-- retries per ITN.

CREATE TABLE IF NOT EXISTS payfast_payments (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           BIGINT       NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  subscription_id     BIGINT       REFERENCES subscriptions(id) ON DELETE SET NULL,
  m_payment_id        TEXT         NOT NULL,
  pf_payment_id       TEXT         UNIQUE,
  purpose             TEXT         NOT NULL CHECK (purpose IN (
                                     'subscription_setup',
                                     'subscription_renewal',
                                     'upgrade_proration',
                                     'topup_leads',
                                     'topup_ai_credit',
                                     'card_update'
                                   )),
  status              TEXT         NOT NULL DEFAULT 'pending'
                                   CHECK (status IN ('pending','captured','failed','cancelled','refunded')),
  amount_zar_cents    INT          NOT NULL,
  expected_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
  captured_at         TIMESTAMPTZ,
  refunded_at         TIMESTAMPTZ,
  raw_itn_payload     JSONB,
  invoice_pdf_url     TEXT,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payfast_payments_m_payment_id ON payfast_payments (m_payment_id);
CREATE INDEX IF NOT EXISTS idx_payfast_payments_client_created
  ON payfast_payments (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payfast_payments_pending_old
  ON payfast_payments (expected_at)
  WHERE status = 'pending';

ALTER TABLE payfast_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payfast_payments_owner_read ON payfast_payments;
CREATE POLICY payfast_payments_owner_read ON payfast_payments
  FOR SELECT
  USING (client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid()::text));

COMMENT ON TABLE  payfast_payments IS 'Every PayFast transaction Qwikly initiates: audit log + pending-payment tracker.';
COMMENT ON COLUMN payfast_payments.pf_payment_id IS 'PayFast reference, UNIQUE for idempotency across ITN retries.';
```

- [ ] **Step 2: Run and inspect**

Run: `cd ~/qwikly-site && supabase migration up`
Expected: table created, indexes visible in `\d payfast_payments`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260513_payfast_payments.sql
git commit -m "feat(billing): add payfast_payments audit and pending tracker table"
```

---

## Task 4: Schema migration — lead_topups table

**Files:**
- Create: `supabase/migrations/20260513_lead_topups.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 20260513_lead_topups.sql
--
-- Per-tenant lead-pack purchases. Each row decrements as leads are captured
-- (FIFO oldest non-expired pack first). Expired packs are ignored by the
-- capture logic but kept for the audit trail.

CREATE TABLE IF NOT EXISTS lead_topups (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           BIGINT       NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  subscription_id     BIGINT       REFERENCES subscriptions(id) ON DELETE SET NULL,
  leads_purchased     INT          NOT NULL CHECK (leads_purchased > 0),
  zar_cents_paid      INT          NOT NULL,
  leads_remaining     INT          NOT NULL CHECK (leads_remaining >= 0),
  expires_at          TIMESTAMPTZ  NOT NULL,
  payfast_payment_id  UUID         REFERENCES payfast_payments(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_topups_client_active
  ON lead_topups (client_id, created_at)
  WHERE leads_remaining > 0;

ALTER TABLE lead_topups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lead_topups_owner_read ON lead_topups;
CREATE POLICY lead_topups_owner_read ON lead_topups
  FOR SELECT
  USING (client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid()::text));

COMMENT ON TABLE lead_topups IS 'Lead-pack purchases. FIFO drain. Expires at subscription period end.';
```

- [ ] **Step 2: Verify**

Run: `psql $DATABASE_URL -c "\d lead_topups"`
Expected: table with all columns, partial index, RLS enabled.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260513_lead_topups.sql
git commit -m "feat(billing): add lead_topups table for lead-pack purchases"
```

---

## Task 5: Schema migration — payment_failures table

**Files:**
- Create: `supabase/migrations/20260513_payment_failures.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 20260513_payment_failures.sql
--
-- Tracks failed PayFast charges (renewals primarily) for the dunning cron
-- to escalate. One row per failure event. Resolved when a subsequent charge
-- succeeds or the customer updates payment method.

CREATE TABLE IF NOT EXISTS payment_failures (
  id                       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id                BIGINT       NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  subscription_id          BIGINT       NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  payfast_payment_id       UUID         REFERENCES payfast_payments(id) ON DELETE SET NULL,
  failed_at                TIMESTAMPTZ  NOT NULL DEFAULT now(),
  reason                   TEXT,
  retry_count              INT          NOT NULL DEFAULT 0,
  resolved_at              TIMESTAMPTZ,
  notification_sent_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payment_failures_unresolved
  ON payment_failures (failed_at)
  WHERE resolved_at IS NULL;

ALTER TABLE payment_failures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payment_failures_owner_read ON payment_failures;
CREATE POLICY payment_failures_owner_read ON payment_failures
  FOR SELECT
  USING (client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid()::text));

COMMENT ON TABLE payment_failures IS 'Failed PayFast charges, read by dunning cron.';
```

- [ ] **Step 2: Verify**

Run: `psql $DATABASE_URL -c "\d payment_failures"`
Expected: table created with partial index on unresolved failures.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260513_payment_failures.sql
git commit -m "feat(billing): add payment_failures dunning tracker"
```

---

## Task 6: Add `startingGrantZarCents` to `PlanConfig`

**Files:**
- Modify: `src/lib/plan.ts`
- Test: `src/lib/__tests__/plan.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `src/lib/__tests__/plan.test.ts`:

```typescript
import { startingGrantZarCents } from '../plan';

describe('startingGrantZarCents', () => {
  it.each([
    ['trial',      3000],
    ['starter',    10000],
    ['pro',        28000],
    ['founders',   45000],
    ['business',   65000],
    ['enterprise', 150000],
  ] as const)('returns %s grant = %i cents', (plan, expected) => {
    expect(startingGrantZarCents(plan)).toBe(expected);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/qwikly-site && npx vitest run src/lib/__tests__/plan.test.ts`
Expected: FAIL with "startingGrantZarCents is not exported".

- [ ] **Step 3: Update `PlanConfig` interface and tier entries**

In `src/lib/plan.ts`, add to the `PlanConfig` interface:

```typescript
interface PlanConfig {
  // ... existing fields ...
  /** Starting AI credit grant in ZAR cents, credited to the wallet on
   *  signup and reset on every renewal. */
  startingGrantZarCents: number;
}
```

Then add to each tier entry. Trial:

```typescript
  trial: {
    // ... existing fields ...
    startingGrantZarCents: 3000,  // R30
  },
```

Starter: `10000` (R100). Pro: `28000` (R280). Founders: `45000` (R450). Business: `65000` (R650). Enterprise: `150000` (R1500). Premium (legacy): `28000` (R280, matches Pro).

Add the helper at the bottom of the file:

```typescript
/**
 * Starting AI credit grant for a given plan, in ZAR cents. Credited to the
 * conversation_credits wallet on signup and reset on every renewal.
 */
export function startingGrantZarCents(tier: InboundPlanTier): number {
  return PLAN_CONFIG[tier].startingGrantZarCents;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/qwikly-site && npx vitest run src/lib/__tests__/plan.test.ts`
Expected: all `startingGrantZarCents` cases PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/plan.ts src/lib/__tests__/plan.test.ts
git commit -m "feat(billing): add startingGrantZarCents per plan tier"
```

---

## Task 7: PayFast config module

**Files:**
- Create: `src/lib/payfast/config.ts`
- Test: `src/lib/payfast/__tests__/config.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/payfast/__tests__/config.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('payfast/config', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.PAYFAST_MERCHANT_ID = '10000100';
    process.env.PAYFAST_MERCHANT_KEY = '46f0cd694581a';
    process.env.PAYFAST_PASSPHRASE = 'jt7NOE43FZPn';
    process.env.PAYFAST_MODE = 'sandbox';
    process.env.PAYFAST_RETURN_URL = 'https://qwikly.co.za/pay/success';
    process.env.PAYFAST_CANCEL_URL = 'https://qwikly.co.za/pay/cancel';
    process.env.PAYFAST_NOTIFY_URL = 'https://qwikly.co.za/api/payfast/itn';
  });

  it('loads env in sandbox mode', async () => {
    const { getPayfastConfig } = await import('../config');
    const cfg = getPayfastConfig();
    expect(cfg.mode).toBe('sandbox');
    expect(cfg.processUrl).toBe('https://sandbox.payfast.co.za/eng/process');
    expect(cfg.validateUrl).toBe('https://sandbox.payfast.co.za/eng/query/validate');
    expect(cfg.merchantId).toBe('10000100');
  });

  it('switches URLs in live mode', async () => {
    process.env.PAYFAST_MODE = 'live';
    const { getPayfastConfig } = await import('../config');
    const cfg = getPayfastConfig();
    expect(cfg.processUrl).toBe('https://www.payfast.co.za/eng/process');
    expect(cfg.validateUrl).toBe('https://www.payfast.co.za/eng/query/validate');
  });

  it('throws when required env is missing', async () => {
    delete process.env.PAYFAST_MERCHANT_ID;
    const { getPayfastConfig } = await import('../config');
    expect(() => getPayfastConfig()).toThrow(/PAYFAST_MERCHANT_ID/);
  });

  it('exposes the static IP allowlist', async () => {
    const { PAYFAST_IP_ALLOWLIST } = await import('../config');
    expect(PAYFAST_IP_ALLOWLIST).toContain('197.97.145.144');
    expect(PAYFAST_IP_ALLOWLIST.length).toBeGreaterThanOrEqual(9);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/qwikly-site && npx vitest run src/lib/payfast/__tests__/config.test.ts`
Expected: FAIL with module not found.

- [ ] **Step 3: Implement `src/lib/payfast/config.ts`**

```typescript
import 'server-only';

/**
 * PayFast static IP allowlist. PayFast does not publish a DNS-resolvable
 * list, so these are hardcoded from their official docs and reviewed on
 * every PayFast network change announcement.
 *
 * Source: https://developers.payfast.co.za/docs#notify_url
 */
export const PAYFAST_IP_ALLOWLIST = [
  '197.97.145.144',
  '197.97.145.145',
  '197.97.145.148',
  '197.97.145.149',
  '197.97.145.150',
  '197.97.145.151',
  '197.97.145.152',
  '197.97.145.153',
  '197.97.145.154',
  '197.97.145.155',
] as const;

export interface PayfastConfig {
  mode: 'sandbox' | 'live';
  merchantId: string;
  merchantKey: string;
  passphrase: string;
  processUrl: string;
  validateUrl: string;
  apiBaseUrl: string;
  returnUrl: string;
  cancelUrl: string;
  notifyUrl: string;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

export function getPayfastConfig(): PayfastConfig {
  const mode = (process.env.PAYFAST_MODE === 'live' ? 'live' : 'sandbox') as 'sandbox' | 'live';
  const host = mode === 'live' ? 'www.payfast.co.za' : 'sandbox.payfast.co.za';
  return {
    mode,
    merchantId: requireEnv('PAYFAST_MERCHANT_ID'),
    merchantKey: requireEnv('PAYFAST_MERCHANT_KEY'),
    passphrase: requireEnv('PAYFAST_PASSPHRASE'),
    processUrl: `https://${host}/eng/process`,
    validateUrl: `https://${host}/eng/query/validate`,
    apiBaseUrl: `https://api.payfast.co.za`,
    returnUrl: requireEnv('PAYFAST_RETURN_URL'),
    cancelUrl: requireEnv('PAYFAST_CANCEL_URL'),
    notifyUrl: requireEnv('PAYFAST_NOTIFY_URL'),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/qwikly-site && npx vitest run src/lib/payfast/__tests__/config.test.ts`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/payfast/config.ts src/lib/payfast/__tests__/config.test.ts
git commit -m "feat(payfast): config module with env loading and IP allowlist"
```

---

## Task 8: PayFast types module

**Files:**
- Create: `src/lib/payfast/types.ts`

- [ ] **Step 1: Implement types**

```typescript
import 'server-only';

/**
 * Subset of fields PayFast posts in an ITN. PayFast documents the full
 * payload at https://developers.payfast.co.za/docs#notify_url. We type the
 * fields we actually read; unrecognised fields fail signature verification
 * because they'd alter the canonical signing string.
 */
export interface PayfastItnPayload {
  m_payment_id: string;
  pf_payment_id: string;
  payment_status: 'COMPLETE' | 'FAILED' | 'CANCELLED' | 'REFUND';
  item_name: string;
  amount_gross: string;          // PayFast sends decimal strings, e.g. "699.00"
  amount_fee?: string;
  amount_net?: string;
  custom_str1?: string;          // we use this for client_id
  custom_str2?: string;          // we use this for subscription_id
  custom_str3?: string;          // we use this for purpose
  custom_str4?: string;
  custom_str5?: string;
  email_address?: string;
  merchant_id: string;
  token?: string;                // subscription token, present on subscription payments
  billing_date?: string;         // YYYY-MM-DD next billing date for subscriptions
  signature: string;
  [key: string]: string | undefined;
}

export interface CheckoutParams {
  m_payment_id: string;
  amount_zar_cents: number;
  item_name: string;
  item_description?: string;
  email_address?: string;
  client_id: string | number;
  subscription_id?: string | number;
  purpose:
    | 'subscription_setup'
    | 'subscription_renewal'
    | 'upgrade_proration'
    | 'topup_leads'
    | 'topup_ai_credit'
    | 'card_update';
  /** Subscription setup (recurring token) vs one-off / ad-hoc */
  recurring: boolean;
  /** Monthly recurring amount in ZAR cents, only for recurring=true. */
  recurring_amount_zar_cents?: number;
  /** First billing date YYYY-MM-DD for the recurring token, only for recurring=true. */
  billing_date?: string;
}

export interface AdhocChargeParams {
  token: string;
  amount_zar_cents: number;
  item_name: string;
  m_payment_id: string;
}

export interface AdhocChargeResponse {
  status: 'success' | 'failed';
  pf_payment_id?: string;
  message?: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/payfast/types.ts
git commit -m "feat(payfast): TypeScript types for ITN payloads and API params"
```

---

## Task 9: PayFast signature module

**Files:**
- Create: `src/lib/payfast/signature.ts`
- Test: `src/lib/payfast/__tests__/signature.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/lib/payfast/__tests__/signature.test.ts
import { describe, it, expect } from 'vitest';
import { generatePayfastSignature, verifyPayfastSignature, canonicalizeFields } from '../signature';

describe('canonicalizeFields', () => {
  it('encodes spaces as + per PayFast spec', () => {
    expect(canonicalizeFields({ name: 'Hello World' })).toBe('name=Hello+World');
  });

  it('preserves field insertion order, not alphabetical', () => {
    const out = canonicalizeFields({ b: '2', a: '1' });
    expect(out).toBe('b=2&a=1');
  });

  it('skips empty values', () => {
    const out = canonicalizeFields({ a: '1', b: '', c: '3' });
    expect(out).toBe('a=1&c=3');
  });

  it('url-encodes special characters', () => {
    expect(canonicalizeFields({ x: 'a&b' })).toBe('x=a%26b');
  });
});

describe('generatePayfastSignature', () => {
  it('appends passphrase before MD5 hash', () => {
    const sig = generatePayfastSignature(
      { merchant_id: '10000100', amount: '100.00' },
      'jt7NOE43FZPn',
    );
    // 32-char hex
    expect(sig).toMatch(/^[a-f0-9]{32}$/);
  });

  it('returns different signatures for different passphrases', () => {
    const a = generatePayfastSignature({ x: '1' }, 'pass-a');
    const b = generatePayfastSignature({ x: '1' }, 'pass-b');
    expect(a).not.toBe(b);
  });
});

describe('verifyPayfastSignature', () => {
  it('returns true for a valid signature', () => {
    const fields = { merchant_id: '10000100', amount: '100.00' };
    const sig = generatePayfastSignature(fields, 'jt7NOE43FZPn');
    expect(verifyPayfastSignature({ ...fields, signature: sig }, 'jt7NOE43FZPn')).toBe(true);
  });

  it('returns false for a tampered field', () => {
    const fields = { merchant_id: '10000100', amount: '100.00' };
    const sig = generatePayfastSignature(fields, 'jt7NOE43FZPn');
    expect(verifyPayfastSignature({ ...fields, amount: '999.00', signature: sig }, 'jt7NOE43FZPn')).toBe(false);
  });

  it('returns false for a wrong passphrase', () => {
    const fields = { x: '1' };
    const sig = generatePayfastSignature(fields, 'pass-a');
    expect(verifyPayfastSignature({ ...fields, signature: sig }, 'pass-b')).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ~/qwikly-site && npx vitest run src/lib/payfast/__tests__/signature.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `src/lib/payfast/signature.ts`**

```typescript
import 'server-only';
import { createHash } from 'node:crypto';

/**
 * Build a PayFast-canonical query string from a field map.
 *
 * PayFast's signing protocol:
 *  - Field order = the order they appear in the request (NOT alphabetical)
 *  - Skip empty values entirely
 *  - URL-encode values; spaces become '+' (application/x-www-form-urlencoded style)
 */
export function canonicalizeFields(fields: Record<string, string | undefined>): string {
  return Object.entries(fields)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v)).replace(/%20/g, '+')}`)
    .join('&');
}

export function generatePayfastSignature(
  fields: Record<string, string | undefined>,
  passphrase: string,
): string {
  const canonical = canonicalizeFields(fields);
  const withPassphrase = passphrase
    ? `${canonical}&passphrase=${encodeURIComponent(passphrase).replace(/%20/g, '+')}`
    : canonical;
  return createHash('md5').update(withPassphrase).digest('hex');
}

export function verifyPayfastSignature(
  fieldsWithSignature: Record<string, string | undefined>,
  passphrase: string,
): boolean {
  const { signature, ...rest } = fieldsWithSignature;
  if (!signature || typeof signature !== 'string') return false;
  const expected = generatePayfastSignature(rest, passphrase);
  return timingSafeEqual(expected, signature);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd ~/qwikly-site && npx vitest run src/lib/payfast/__tests__/signature.test.ts`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/payfast/signature.ts src/lib/payfast/__tests__/signature.test.ts
git commit -m "feat(payfast): MD5 signature generation and verification"
```

---

## Task 10: PayFast checkout URL builder

**Files:**
- Create: `src/lib/payfast/checkout.ts`
- Test: `src/lib/payfast/__tests__/checkout.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/lib/payfast/__tests__/checkout.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { buildCheckoutUrl } from '../checkout';

describe('buildCheckoutUrl', () => {
  beforeEach(() => {
    process.env.PAYFAST_MERCHANT_ID = '10000100';
    process.env.PAYFAST_MERCHANT_KEY = '46f0cd694581a';
    process.env.PAYFAST_PASSPHRASE = 'jt7NOE43FZPn';
    process.env.PAYFAST_MODE = 'sandbox';
    process.env.PAYFAST_RETURN_URL = 'https://qwikly.co.za/pay/success';
    process.env.PAYFAST_CANCEL_URL = 'https://qwikly.co.za/pay/cancel';
    process.env.PAYFAST_NOTIFY_URL = 'https://qwikly.co.za/api/payfast/itn';
  });

  it('builds a sandbox URL for a one-off charge', () => {
    const url = buildCheckoutUrl({
      m_payment_id: 'mp_001',
      amount_zar_cents: 69900,
      item_name: 'Qwikly Starter',
      client_id: 42,
      purpose: 'subscription_setup',
      recurring: false,
    });

    expect(url).toContain('sandbox.payfast.co.za/eng/process');
    expect(url).toContain('amount=699.00');
    expect(url).toContain('m_payment_id=mp_001');
    expect(url).toContain('custom_str1=42');
    expect(url).toContain('custom_str3=subscription_setup');
    expect(url).toContain('signature=');
  });

  it('includes recurring fields when recurring=true', () => {
    const url = buildCheckoutUrl({
      m_payment_id: 'mp_002',
      amount_zar_cents: 69900,
      item_name: 'Qwikly Starter',
      client_id: 42,
      purpose: 'subscription_setup',
      recurring: true,
      recurring_amount_zar_cents: 69900,
      billing_date: '2026-06-11',
    });

    expect(url).toContain('subscription_type=1');
    expect(url).toContain('billing_date=2026-06-11');
    expect(url).toContain('recurring_amount=699.00');
    expect(url).toContain('frequency=3'); // monthly
    expect(url).toContain('cycles=0');    // until cancelled
  });

  it('formats decimal amounts correctly', () => {
    const url = buildCheckoutUrl({
      m_payment_id: 'mp_003',
      amount_zar_cents: 12345,
      item_name: 'Test',
      client_id: 1,
      purpose: 'topup_ai_credit',
      recurring: false,
    });
    expect(url).toContain('amount=123.45');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ~/qwikly-site && npx vitest run src/lib/payfast/__tests__/checkout.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/lib/payfast/checkout.ts`**

```typescript
import 'server-only';
import { getPayfastConfig } from './config';
import { generatePayfastSignature } from './signature';
import type { CheckoutParams } from './types';

function zarCentsToDecimal(cents: number): string {
  const rands = Math.round(cents) / 100;
  return rands.toFixed(2);
}

export function buildCheckoutUrl(params: CheckoutParams): string {
  const cfg = getPayfastConfig();

  // Field order matters for signing. PayFast's documented order:
  // merchant_id, merchant_key, return_url, cancel_url, notify_url,
  // email_address, m_payment_id, amount, item_name, item_description,
  // custom_str1..5, subscription_type, billing_date, recurring_amount,
  // frequency, cycles.
  const fields: Record<string, string | undefined> = {
    merchant_id: cfg.merchantId,
    merchant_key: cfg.merchantKey,
    return_url: cfg.returnUrl,
    cancel_url: cfg.cancelUrl,
    notify_url: cfg.notifyUrl,
    email_address: params.email_address,
    m_payment_id: params.m_payment_id,
    amount: zarCentsToDecimal(params.amount_zar_cents),
    item_name: params.item_name,
    item_description: params.item_description,
    custom_str1: String(params.client_id),
    custom_str2: params.subscription_id != null ? String(params.subscription_id) : undefined,
    custom_str3: params.purpose,
  };

  if (params.recurring) {
    fields.subscription_type = '1';
    if (params.billing_date) fields.billing_date = params.billing_date;
    if (params.recurring_amount_zar_cents != null) {
      fields.recurring_amount = zarCentsToDecimal(params.recurring_amount_zar_cents);
    }
    fields.frequency = '3'; // 3 = monthly
    fields.cycles = '0';    // 0 = until cancelled
  }

  const signature = generatePayfastSignature(fields, cfg.passphrase);

  const qs = Object.entries(fields)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');

  return `${cfg.processUrl}?${qs}&signature=${signature}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd ~/qwikly-site && npx vitest run src/lib/payfast/__tests__/checkout.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/payfast/checkout.ts src/lib/payfast/__tests__/checkout.test.ts
git commit -m "feat(payfast): hosted checkout URL builder with recurring support"
```

---

## Task 11: PayFast ad-hoc charge module

**Files:**
- Create: `src/lib/payfast/adhoc.ts`
- Test: `src/lib/payfast/__tests__/adhoc.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/lib/payfast/__tests__/adhoc.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { chargeAdhoc } from '../adhoc';

describe('chargeAdhoc', () => {
  beforeEach(() => {
    process.env.PAYFAST_MERCHANT_ID = '10000100';
    process.env.PAYFAST_MERCHANT_KEY = '46f0cd694581a';
    process.env.PAYFAST_PASSPHRASE = 'jt7NOE43FZPn';
    process.env.PAYFAST_MODE = 'sandbox';
    process.env.PAYFAST_RETURN_URL = 'https://x';
    process.env.PAYFAST_CANCEL_URL = 'https://x';
    process.env.PAYFAST_NOTIFY_URL = 'https://x';
  });

  it('POSTs to /subscriptions/{token}/adhoc with signed payload', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 'success', data: { response: { pf_payment_id: 'pf_999' } } }),
    });
    vi.stubGlobal('fetch', fetchSpy);

    const result = await chargeAdhoc({
      token: 'subtok_abc',
      amount_zar_cents: 25000,
      item_name: 'AI credit top-up R250',
      m_payment_id: 'mp_topup_1',
    });

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toContain('/subscriptions/subtok_abc/adhoc');
    expect(init.method).toBe('POST');
    expect(init.headers['merchant-id']).toBe('10000100');
    expect(init.headers['signature']).toMatch(/^[a-f0-9]{32}$/);
    expect(result.status).toBe('success');
    expect(result.pf_payment_id).toBe('pf_999');
  });

  it('returns failure on non-2xx response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ status: 'failed', message: 'Insufficient funds' }),
    }));

    const result = await chargeAdhoc({
      token: 'subtok_abc',
      amount_zar_cents: 25000,
      item_name: 'x',
      m_payment_id: 'mp_topup_2',
    });

    expect(result.status).toBe('failed');
    expect(result.message).toContain('Insufficient');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/qwikly-site && npx vitest run src/lib/payfast/__tests__/adhoc.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/lib/payfast/adhoc.ts`**

```typescript
import 'server-only';
import { getPayfastConfig } from './config';
import { generatePayfastSignature } from './signature';
import type { AdhocChargeParams, AdhocChargeResponse } from './types';

function zarCentsToDecimal(cents: number): string {
  return (Math.round(cents) / 100).toFixed(2);
}

function timestampForSigning(): string {
  // PayFast API requires ISO-8601 with seconds precision in UTC.
  return new Date().toISOString().replace(/\.\d{3}Z$/, '+00:00');
}

/**
 * Charge an existing PayFast subscription token for an arbitrary amount.
 * Used for top-ups and upgrade proration.
 */
export async function chargeAdhoc(params: AdhocChargeParams): Promise<AdhocChargeResponse> {
  const cfg = getPayfastConfig();
  const timestamp = timestampForSigning();

  const body: Record<string, string> = {
    amount: zarCentsToDecimal(params.amount_zar_cents),
    item_name: params.item_name,
    m_payment_id: params.m_payment_id,
  };

  // PayFast API auth: sign all body params + 'merchant-id' header + 'timestamp' header
  // with the passphrase. See https://developers.payfast.co.za/api#tag/Subscriptions.
  const headersForSig: Record<string, string> = {
    'merchant-id': cfg.merchantId,
    timestamp,
    version: 'v1',
  };
  const allFields = { ...headersForSig, ...body };
  const signature = generatePayfastSignature(allFields, cfg.passphrase);

  const formBody = new URLSearchParams(body).toString();

  const url = `${cfg.apiBaseUrl}/subscriptions/${encodeURIComponent(params.token)}/adhoc`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...headersForSig,
      signature,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: formBody,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.status === 'failed') {
    return {
      status: 'failed',
      message: json?.message ?? `HTTP ${res.status}`,
    };
  }

  return {
    status: 'success',
    pf_payment_id: json?.data?.response?.pf_payment_id ?? json?.pf_payment_id,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/qwikly-site && npx vitest run src/lib/payfast/__tests__/adhoc.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/payfast/adhoc.ts src/lib/payfast/__tests__/adhoc.test.ts
git commit -m "feat(payfast): ad-hoc charge against stored subscription token"
```

---

## Task 12: PayFast token-management module

**Files:**
- Create: `src/lib/payfast/token.ts`
- Test: `src/lib/payfast/__tests__/token.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/lib/payfast/__tests__/token.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { updateSubscriptionAmount, cancelSubscriptionToken } from '../token';

describe('updateSubscriptionAmount', () => {
  beforeEach(() => {
    process.env.PAYFAST_MERCHANT_ID = '10000100';
    process.env.PAYFAST_MERCHANT_KEY = 'k';
    process.env.PAYFAST_PASSPHRASE = 'p';
    process.env.PAYFAST_MODE = 'sandbox';
    process.env.PAYFAST_RETURN_URL = 'https://x';
    process.env.PAYFAST_CANCEL_URL = 'https://x';
    process.env.PAYFAST_NOTIFY_URL = 'https://x';
  });

  it('PUTs to /subscriptions/{token}/update with new amount', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'success' }) });
    vi.stubGlobal('fetch', fetchSpy);

    await updateSubscriptionAmount('subtok_abc', 179900);

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toContain('/subscriptions/subtok_abc/update');
    expect(init.method).toBe('PUT');
    expect(init.body).toContain('amount=1799.00');
  });
});

describe('cancelSubscriptionToken', () => {
  it('PUTs to /subscriptions/{token}/cancel', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'success' }) });
    vi.stubGlobal('fetch', fetchSpy);

    await cancelSubscriptionToken('subtok_abc');

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toContain('/subscriptions/subtok_abc/cancel');
    expect(init.method).toBe('PUT');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/qwikly-site && npx vitest run src/lib/payfast/__tests__/token.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/lib/payfast/token.ts`**

```typescript
import 'server-only';
import { getPayfastConfig } from './config';
import { generatePayfastSignature } from './signature';

function zarCentsToDecimal(cents: number): string {
  return (Math.round(cents) / 100).toFixed(2);
}

function timestampForSigning(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, '+00:00');
}

function signedHeaders(body: Record<string, string>): Record<string, string> {
  const cfg = getPayfastConfig();
  const headersForSig: Record<string, string> = {
    'merchant-id': cfg.merchantId,
    timestamp: timestampForSigning(),
    version: 'v1',
  };
  const signature = generatePayfastSignature({ ...headersForSig, ...body }, cfg.passphrase);
  return { ...headersForSig, signature, 'content-type': 'application/x-www-form-urlencoded' };
}

export async function updateSubscriptionAmount(token: string, amount_zar_cents: number): Promise<void> {
  const cfg = getPayfastConfig();
  const body = { amount: zarCentsToDecimal(amount_zar_cents) };
  const res = await fetch(
    `${cfg.apiBaseUrl}/subscriptions/${encodeURIComponent(token)}/update`,
    {
      method: 'PUT',
      headers: signedHeaders(body),
      body: new URLSearchParams(body).toString(),
    },
  );
  if (!res.ok) throw new Error(`PayFast update failed: HTTP ${res.status}`);
}

export async function cancelSubscriptionToken(token: string): Promise<void> {
  const cfg = getPayfastConfig();
  const res = await fetch(
    `${cfg.apiBaseUrl}/subscriptions/${encodeURIComponent(token)}/cancel`,
    {
      method: 'PUT',
      headers: signedHeaders({}),
    },
  );
  if (!res.ok) throw new Error(`PayFast cancel failed: HTTP ${res.status}`);
}

export async function fetchPaymentByMPaymentId(m_payment_id: string): Promise<{
  status: 'pending' | 'success' | 'failed';
  pf_payment_id?: string;
} | null> {
  const cfg = getPayfastConfig();
  const res = await fetch(
    `${cfg.apiBaseUrl}/query/payment/${encodeURIComponent(m_payment_id)}`,
    {
      method: 'GET',
      headers: signedHeaders({}),
    },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`PayFast query failed: HTTP ${res.status}`);
  const json = await res.json();
  return {
    status: json?.data?.status ?? 'pending',
    pf_payment_id: json?.data?.pf_payment_id,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/qwikly-site && npx vitest run src/lib/payfast/__tests__/token.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/payfast/token.ts src/lib/payfast/__tests__/token.test.ts
git commit -m "feat(payfast): subscription token update/cancel/query"
```

---

## Task 13: PayFast ITN validation module

**Files:**
- Create: `src/lib/payfast/itn.ts`
- Test: `src/lib/payfast/__tests__/itn.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/lib/payfast/__tests__/itn.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { validateItn, ItnValidationResult } from '../itn';
import { generatePayfastSignature } from '../signature';

const baseEnv = () => {
  process.env.PAYFAST_MERCHANT_ID = '10000100';
  process.env.PAYFAST_MERCHANT_KEY = 'k';
  process.env.PAYFAST_PASSPHRASE = 'p';
  process.env.PAYFAST_MODE = 'sandbox';
  process.env.PAYFAST_RETURN_URL = 'https://x';
  process.env.PAYFAST_CANCEL_URL = 'https://x';
  process.env.PAYFAST_NOTIFY_URL = 'https://x';
};

function signedPayload(fields: Record<string, string>): Record<string, string> {
  const sig = generatePayfastSignature(fields, 'p');
  return { ...fields, signature: sig };
}

describe('validateItn', () => {
  beforeEach(() => {
    baseEnv();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: async () => 'VALID',
    }));
  });

  it('rejects on signature mismatch', async () => {
    const payload = { merchant_id: '10000100', amount_gross: '699.00', signature: 'wrong' };
    const result = await validateItn(payload, '197.97.145.144', 69900);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/signature/i);
  });

  it('rejects on disallowed source IP', async () => {
    const payload = signedPayload({ merchant_id: '10000100', amount_gross: '699.00' });
    const result = await validateItn(payload, '1.2.3.4', 69900);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/ip/i);
  });

  it('rejects on amount mismatch', async () => {
    const payload = signedPayload({ merchant_id: '10000100', amount_gross: '699.00' });
    const result = await validateItn(payload, '197.97.145.144', 100000);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/amount/i);
  });

  it('rejects when PayFast postback returns INVALID', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => 'INVALID' }));
    const payload = signedPayload({ merchant_id: '10000100', amount_gross: '699.00' });
    const result = await validateItn(payload, '197.97.145.144', 69900);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/postback/i);
  });

  it('returns valid when all four checks pass', async () => {
    const payload = signedPayload({ merchant_id: '10000100', amount_gross: '699.00' });
    const result = await validateItn(payload, '197.97.145.144', 69900);
    expect(result.valid).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ~/qwikly-site && npx vitest run src/lib/payfast/__tests__/itn.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/lib/payfast/itn.ts`**

```typescript
import 'server-only';
import { getPayfastConfig, PAYFAST_IP_ALLOWLIST } from './config';
import { verifyPayfastSignature } from './signature';

export interface ItnValidationResult {
  valid: boolean;
  reason?: string;
}

export async function validateItn(
  payload: Record<string, string>,
  sourceIp: string,
  expectedAmountZarCents: number,
): Promise<ItnValidationResult> {
  const cfg = getPayfastConfig();

  // 1. Signature
  if (!verifyPayfastSignature(payload, cfg.passphrase)) {
    return { valid: false, reason: 'signature mismatch' };
  }

  // 2. Source IP (sandbox is more lenient; live MUST match allowlist)
  if (cfg.mode === 'live' && !PAYFAST_IP_ALLOWLIST.includes(sourceIp as never)) {
    return { valid: false, reason: `ip not allowed: ${sourceIp}` };
  }

  // 3. PayFast postback validate
  const formBody = Object.entries(payload)
    .filter(([k]) => k !== 'signature')
    .map(([k, v]) => `${k}=${encodeURIComponent(v).replace(/%20/g, '+')}`)
    .join('&');
  const res = await fetch(cfg.validateUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: formBody,
  });
  const text = (await res.text()).trim();
  if (text !== 'VALID') {
    return { valid: false, reason: `postback validate returned ${text}` };
  }

  // 4. Amount match (PayFast sends "699.00" decimal strings)
  const grossCents = Math.round(parseFloat(payload.amount_gross ?? '0') * 100);
  if (grossCents !== expectedAmountZarCents) {
    return { valid: false, reason: `amount mismatch: got ${grossCents}, expected ${expectedAmountZarCents}` };
  }

  return { valid: true };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd ~/qwikly-site && npx vitest run src/lib/payfast/__tests__/itn.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/payfast/itn.ts src/lib/payfast/__tests__/itn.test.ts
git commit -m "feat(payfast): four-step ITN validation pipeline"
```

---

## Task 14: `applySubscriptionToClient()` — the single source-of-truth writer

**Files:**
- Create: `src/lib/billing/apply-subscription.ts`
- Test: `src/lib/billing/__tests__/apply-subscription.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/lib/billing/__tests__/apply-subscription.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applySubscriptionToClient } from '../apply-subscription';

// Test stub for supabaseAdmin
const fromMock = vi.fn();
vi.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: () => ({ from: fromMock }),
}));

describe('applySubscriptionToClient', () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it('reads subscription then writes derived fields to clients', async () => {
    const subscription = {
      id: 1,
      client_id: 42,
      plan: 'pro',
      status: 'active',
      cancel_at_period_end: false,
    };

    fromMock.mockImplementation((table: string) => {
      if (table === 'subscriptions') {
        return {
          select: () => ({ eq: () => ({ single: async () => ({ data: subscription, error: null }) }) }),
        };
      }
      if (table === 'clients') {
        return {
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        };
      }
      return {};
    });

    await applySubscriptionToClient(1);

    // The clients table mock should have been called
    const clientsCalls = fromMock.mock.calls.filter(([t]) => t === 'clients');
    expect(clientsCalls.length).toBeGreaterThan(0);
  });

  it('sets assistant_paused=true for trial_expired status', async () => {
    let captured: Record<string, unknown> | null = null;
    fromMock.mockImplementation((table: string) => {
      if (table === 'subscriptions') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: { id: 1, client_id: 42, plan: 'trial', status: 'trial_expired', cancel_at_period_end: false },
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        update: (vals: Record<string, unknown>) => {
          captured = vals;
          return { eq: vi.fn().mockResolvedValue({ error: null }) };
        },
      };
    });

    await applySubscriptionToClient(1);
    expect(captured).toMatchObject({ assistant_paused: true });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/qwikly-site && npx vitest run src/lib/billing/__tests__/apply-subscription.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/lib/billing/apply-subscription.ts`**

```typescript
import 'server-only';
import { supabaseAdmin } from '@/lib/supabase-server';
import {
  PLAN_CONFIG,
  resolvePlan,
  productsForPlan,
  dailyProspectQuotaForPlan,
} from '@/lib/plan';

const PAUSED_STATUSES = new Set(['trial_expired', 'paused_unpaid', 'cancelled']);

/**
 * Single funnel for writing entitlement to `clients`.
 *
 * subscriptions = source of truth for what the customer is paying for.
 * clients = derived view that the runtime reads.
 *
 * This is the ONLY function in the codebase that writes clients.plan,
 * clients.products, clients.pipeline_daily_quota, clients.lead_limit, or
 * clients.assistant_paused. A pre-commit grep guard enforces this rule.
 */
export async function applySubscriptionToClient(subscriptionId: number): Promise<void> {
  const db = supabaseAdmin();

  const { data: sub, error: subErr } = await db
    .from('subscriptions')
    .select('id, client_id, plan, status, cancel_at_period_end, current_period_end, pending_plan')
    .eq('id', subscriptionId)
    .single();

  if (subErr || !sub) {
    throw new Error(`applySubscriptionToClient: subscription ${subscriptionId} not found: ${subErr?.message}`);
  }

  const tier = resolvePlan(sub.plan);
  const cfg = PLAN_CONFIG[tier];
  const assistantPaused = PAUSED_STATUSES.has(sub.status);

  const updates = {
    plan: sub.plan,
    products: productsForPlan(tier),
    pipeline_daily_quota: dailyProspectQuotaForPlan(tier),
    lead_limit: cfg.leadLimit,
    assistant_paused: assistantPaused,
    remove_branding: cfg.removeBranding,
    custom_greeting: cfg.customGreeting,
    csv_export: cfg.csvExport,
    api_access: cfg.apiAccess,
  };

  const { error: updErr } = await db
    .from('clients')
    .update(updates)
    .eq('id', sub.client_id);

  if (updErr) {
    throw new Error(`applySubscriptionToClient: write failed: ${updErr.message}`);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/qwikly-site && npx vitest run src/lib/billing/__tests__/apply-subscription.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/billing/apply-subscription.ts src/lib/billing/__tests__/apply-subscription.test.ts
git commit -m "feat(billing): single source-of-truth writer applySubscriptionToClient"
```

---

## Task 15: `getEntitlement()` reader

**Files:**
- Create: `src/lib/billing/entitlement.ts`
- Test: `src/lib/billing/__tests__/entitlement.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/lib/billing/__tests__/entitlement.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getEntitlement } from '../entitlement';

const fromMock = vi.fn();
vi.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: () => ({ from: fromMock }),
}));

describe('getEntitlement', () => {
  beforeEach(() => fromMock.mockReset());

  it('returns aggregate entitlement for an active Starter customer', async () => {
    fromMock.mockImplementation((table: string) => {
      const responses: Record<string, unknown> = {
        clients: { id: 42, plan: 'starter', assistant_paused: false },
        subscriptions: {
          plan: 'starter',
          status: 'active',
          current_period_start: '2026-05-01T00:00:00Z',
          current_period_end: '2026-06-01T00:00:00Z',
          cancel_at_period_end: false,
          pending_plan: null,
          trial_ends_at: null,
        },
        conversation_credits: {
          granted_balance_zar_cents: 8000,
          purchased_balance_zar_cents: 5000,
        },
        usage_periods: { leads_captured: 12 },
        lead_topups: [],
      };
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: responses[table], error: null }),
            single: async () => ({ data: responses[table], error: null }),
            order: () => ({
              limit: () => ({ then: (cb: any) => cb({ data: [], error: null }) }),
            }),
            gt: () => ({ order: () => ({ then: (cb: any) => cb({ data: [], error: null }) }) }),
          }),
        }),
      };
    });

    const e = await getEntitlement(42);
    expect(e.plan).toBe('starter');
    expect(e.status).toBe('active');
    expect(e.assistantPaused).toBe(false);
    expect(e.leadsThisMonth).toBe(12);
    expect(e.leadLimit).toBe(30);
    expect(e.aiCreditTotalZarCents).toBe(13000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/qwikly-site && npx vitest run src/lib/billing/__tests__/entitlement.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/lib/billing/entitlement.ts`**

```typescript
import 'server-only';
import { supabaseAdmin } from '@/lib/supabase-server';
import { PLAN_CONFIG, resolvePlan, hasOutbound, dailyProspectQuotaForPlan } from '@/lib/plan';

export interface Entitlement {
  plan: string;
  status: string;
  assistantPaused: boolean;
  leadsThisMonth: number;
  leadLimit: number;
  topupLeadsRemaining: number;
  totalLeadsAvailable: number;
  aiCreditGrantedZarCents: number;
  aiCreditPurchasedZarCents: number;
  aiCreditTotalZarCents: number;
  hasOutbound: boolean;
  pipelineDailyQuota: number;
  periodStart: Date | null;
  periodEnd: Date | null;
  trialEndsAt: Date | null;
  cancelAtPeriodEnd: boolean;
  pendingPlan: string | null;
}

/**
 * Aggregate entitlement snapshot for the chat runtime, lead capture, dashboard
 * meters, and Outbound guards. Single query path so caps never disagree.
 */
export async function getEntitlement(clientId: number): Promise<Entitlement> {
  const db = supabaseAdmin();
  const now = new Date();

  const [clientRow, subRow, creditsRow, usageRow, topupsRow] = await Promise.all([
    db.from('clients').select('id, plan, assistant_paused').eq('id', clientId).maybeSingle(),
    db.from('subscriptions')
      .select('plan, status, current_period_start, current_period_end, cancel_at_period_end, pending_plan, trial_ends_at')
      .eq('client_id', clientId)
      .maybeSingle(),
    db.from('conversation_credits')
      .select('granted_balance_zar_cents, purchased_balance_zar_cents')
      .eq('client_id', clientId)
      .maybeSingle(),
    db.from('usage_periods')
      .select('leads_captured')
      .eq('client_id', clientId)
      .lte('period_start', now.toISOString())
      .gte('period_end', now.toISOString())
      .maybeSingle(),
    db.from('lead_topups')
      .select('leads_remaining, expires_at')
      .eq('client_id', clientId)
      .gt('leads_remaining', 0)
      .gt('expires_at', now.toISOString()),
  ]);

  const subscription = subRow.data ?? null;
  const tier = resolvePlan(subscription?.plan ?? clientRow.data?.plan ?? 'trial');
  const cfg = PLAN_CONFIG[tier];

  const grantedCents = creditsRow.data?.granted_balance_zar_cents ?? 0;
  const purchasedCents = creditsRow.data?.purchased_balance_zar_cents ?? 0;
  const totalCents = grantedCents + purchasedCents;

  const leadsThisMonth = usageRow.data?.leads_captured ?? 0;
  const leadLimit = cfg.leadLimit ?? Number.MAX_SAFE_INTEGER;
  const topupLeadsRemaining = (topupsRow.data ?? []).reduce(
    (sum: number, row: { leads_remaining: number }) => sum + (row.leads_remaining ?? 0),
    0,
  );

  return {
    plan: subscription?.plan ?? 'trial',
    status: subscription?.status ?? 'active',
    assistantPaused: clientRow.data?.assistant_paused ?? false,
    leadsThisMonth,
    leadLimit,
    topupLeadsRemaining,
    totalLeadsAvailable: Math.max(0, leadLimit - leadsThisMonth) + topupLeadsRemaining,
    aiCreditGrantedZarCents: grantedCents,
    aiCreditPurchasedZarCents: purchasedCents,
    aiCreditTotalZarCents: totalCents,
    hasOutbound: hasOutbound(tier),
    pipelineDailyQuota: dailyProspectQuotaForPlan(tier),
    periodStart: subscription?.current_period_start ? new Date(subscription.current_period_start) : null,
    periodEnd: subscription?.current_period_end ? new Date(subscription.current_period_end) : null,
    trialEndsAt: subscription?.trial_ends_at ? new Date(subscription.trial_ends_at) : null,
    cancelAtPeriodEnd: subscription?.cancel_at_period_end ?? false,
    pendingPlan: subscription?.pending_plan ?? null,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/qwikly-site && npx vitest run src/lib/billing/__tests__/entitlement.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/billing/entitlement.ts src/lib/billing/__tests__/entitlement.test.ts
git commit -m "feat(billing): getEntitlement aggregate reader for runtime gates"
```

---

## Task 16: ITN endpoint with state machine

**Files:**
- Create: `src/app/api/payfast/itn/route.ts`
- Test: `src/app/api/payfast/itn/__tests__/route.test.ts`

- [ ] **Step 1: Write failing test (idempotency case, the highest-risk path)**

```typescript
// src/app/api/payfast/itn/__tests__/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/payfast/itn', () => ({
  validateItn: vi.fn().mockResolvedValue({ valid: true }),
}));

const dbState = {
  pending_row: null as any,
  captured_calls: 0,
  applied_calls: 0,
};

vi.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: () => ({
    from: (table: string) => {
      if (table === 'payfast_payments') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: dbState.pending_row, error: null }),
            }),
          }),
          update: (vals: any) => {
            if (vals.status === 'captured') dbState.captured_calls++;
            return { eq: () => ({ error: null }) };
          },
        };
      }
      return { update: () => ({ eq: () => ({ error: null }) }) };
    },
  }),
}));

vi.mock('@/lib/billing/apply-subscription', () => ({
  applySubscriptionToClient: vi.fn(async () => { dbState.applied_calls++; }),
}));

import { POST } from '../route';

describe('POST /api/payfast/itn', () => {
  beforeEach(() => {
    dbState.captured_calls = 0;
    dbState.applied_calls = 0;
    dbState.pending_row = null;
  });

  it('is a no-op when the row is already captured', async () => {
    dbState.pending_row = {
      id: 'uuid-1',
      status: 'captured',
      amount_zar_cents: 69900,
      subscription_id: 1,
      purpose: 'subscription_setup',
    };
    const body = new URLSearchParams({
      m_payment_id: 'mp_1',
      pf_payment_id: 'pf_1',
      payment_status: 'COMPLETE',
      amount_gross: '699.00',
      merchant_id: '10000100',
      signature: 'x',
    }).toString();
    const req = new Request('https://x/api/payfast/itn', {
      method: 'POST',
      body,
      headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-forwarded-for': '197.97.145.144' },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(dbState.captured_calls).toBe(0);
    expect(dbState.applied_calls).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/qwikly-site && npx vitest run src/app/api/payfast/itn/__tests__/route.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `src/app/api/payfast/itn/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { validateItn } from '@/lib/payfast/itn';
import { applySubscriptionToClient } from '@/lib/billing/apply-subscription';
import { startingGrantZarCents, resolvePlan } from '@/lib/plan';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function parseForm(body: string): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(body));
}

function getSourceIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for') ?? '';
  return xff.split(',')[0].trim() || req.headers.get('x-real-ip') || '';
}

export async function POST(req: Request) {
  const bodyText = await req.text();
  const payload = parseForm(bodyText);
  const sourceIp = getSourceIp(req);

  const db = supabaseAdmin();

  // Look up the pending row by m_payment_id to know the expected amount and purpose.
  const { data: row, error: rowErr } = await db
    .from('payfast_payments')
    .select('id, status, amount_zar_cents, client_id, subscription_id, purpose')
    .eq('m_payment_id', payload.m_payment_id)
    .maybeSingle();

  if (rowErr || !row) {
    console.error('[payfast/itn] unknown m_payment_id', payload.m_payment_id);
    return NextResponse.json({ ok: false, reason: 'unknown_payment' }, { status: 400 });
  }

  // Idempotency: if already captured, return 200 and do nothing.
  if (row.status === 'captured' || row.status === 'refunded') {
    return NextResponse.json({ ok: true, idempotent: true });
  }

  // Four-step validation.
  const v = await validateItn(payload, sourceIp, row.amount_zar_cents);
  if (!v.valid) {
    console.error('[payfast/itn] validation failed:', v.reason, { m_payment_id: payload.m_payment_id });
    await db.from('payfast_payments').update({
      raw_itn_payload: payload,
      updated_at: new Date().toISOString(),
    }).eq('id', row.id);
    return NextResponse.json({ ok: false, reason: v.reason }, { status: 400 });
  }

  const status = payload.payment_status;
  const now = new Date().toISOString();

  if (status === 'FAILED' || status === 'CANCELLED') {
    await db.from('payfast_payments').update({
      status: status === 'FAILED' ? 'failed' : 'cancelled',
      raw_itn_payload: payload,
      pf_payment_id: payload.pf_payment_id,
      updated_at: now,
    }).eq('id', row.id);

    if (row.purpose === 'subscription_renewal') {
      await db.from('payment_failures').insert({
        client_id: row.client_id,
        subscription_id: row.subscription_id,
        payfast_payment_id: row.id,
        reason: 'payfast_charge_failed',
      });
    }
    return NextResponse.json({ ok: true });
  }

  if (status === 'REFUND') {
    await db.from('payfast_payments').update({
      status: 'refunded',
      refunded_at: now,
      pf_payment_id: payload.pf_payment_id,
      raw_itn_payload: payload,
      updated_at: now,
    }).eq('id', row.id);
    // Reversal of credits is handled in Phase 2 once topup flows exist.
    return NextResponse.json({ ok: true });
  }

  // status === 'COMPLETE'
  await db.from('payfast_payments').update({
    status: 'captured',
    captured_at: now,
    pf_payment_id: payload.pf_payment_id,
    raw_itn_payload: payload,
    updated_at: now,
  }).eq('id', row.id);

  switch (row.purpose) {
    case 'subscription_setup':
    case 'subscription_renewal':
    case 'upgrade_proration':
      if (row.subscription_id) {
        const periodEnd = computePeriodEnd(payload.billing_date);
        const updates: Record<string, unknown> = {
          status: 'active',
          payfast_token: payload.token ?? undefined,
        };
        if (row.purpose === 'subscription_setup' || row.purpose === 'subscription_renewal') {
          updates.current_period_start = now;
          updates.current_period_end = periodEnd;
        }
        await db.from('subscriptions').update(updates).eq('id', row.subscription_id);

        // Reset grant on setup or renewal
        if (row.purpose !== 'upgrade_proration') {
          const planFromSub = await db.from('subscriptions').select('plan').eq('id', row.subscription_id).maybeSingle();
          const tier = resolvePlan(planFromSub.data?.plan ?? 'trial');
          await db.from('conversation_credits').upsert({
            client_id: row.client_id,
            granted_balance_zar_cents: startingGrantZarCents(tier),
            granted_expires_at: periodEnd,
            updated_at: now,
          }, { onConflict: 'client_id' });
        }

        await applySubscriptionToClient(row.subscription_id);
      }
      break;

    case 'topup_ai_credit':
    case 'topup_leads':
    case 'card_update':
      // Handled in Phase 2 when these routes are wired up.
      break;
  }

  return NextResponse.json({ ok: true });
}

function computePeriodEnd(billingDate?: string): string {
  if (billingDate) {
    return new Date(`${billingDate}T00:00:00Z`).toISOString();
  }
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/qwikly-site && npx vitest run src/app/api/payfast/itn/__tests__/route.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/payfast/itn/route.ts src/app/api/payfast/itn/__tests__/route.test.ts
git commit -m "feat(payfast): ITN endpoint with four-step validation and state machine"
```

---

## Task 17: Reconcile cron (catches missed ITNs)

**Files:**
- Create: `src/app/api/cron/payfast-reconcile/route.ts`

- [ ] **Step 1: Implement the cron**

```typescript
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { fetchPaymentByMPaymentId } from '@/lib/payfast/token';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const STUCK_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const db = supabaseAdmin();
  const cutoff = new Date(Date.now() - STUCK_THRESHOLD_MS).toISOString();

  const { data: stuck } = await db
    .from('payfast_payments')
    .select('id, m_payment_id, amount_zar_cents, subscription_id, client_id, purpose')
    .eq('status', 'pending')
    .lt('expected_at', cutoff)
    .limit(50);

  let resolved = 0, stillPending = 0, failed = 0;

  for (const row of stuck ?? []) {
    try {
      const status = await fetchPaymentByMPaymentId(row.m_payment_id);
      if (!status) {
        // PayFast doesn't know about it; mark as failed so we stop retrying.
        await db.from('payfast_payments').update({
          status: 'failed',
          updated_at: new Date().toISOString(),
        }).eq('id', row.id);
        failed++;
        continue;
      }
      if (status.status === 'pending') { stillPending++; continue; }
      if (status.status === 'failed') {
        await db.from('payfast_payments').update({
          status: 'failed',
          pf_payment_id: status.pf_payment_id ?? null,
          updated_at: new Date().toISOString(),
        }).eq('id', row.id);
        failed++;
        continue;
      }
      // status === 'success' — feed it back through the ITN endpoint logic.
      // Cheapest: POST to our own /api/payfast/itn handler with a reconstructed payload.
      // Out of scope: implement direct apply path here in Phase 2.
      resolved++;
    } catch (err) {
      console.error('[reconcile] error for', row.m_payment_id, err);
    }
  }

  return NextResponse.json({ ok: true, resolved, stillPending, failed, scanned: stuck?.length ?? 0 });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/cron/payfast-reconcile/route.ts
git commit -m "feat(payfast): reconcile cron skeleton for stuck pending payments"
```

---

## Task 18: Trial-sweep cron

**Files:**
- Create: `src/app/api/cron/trial-sweep/route.ts`

- [ ] **Step 1: Implement**

```typescript
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { applySubscriptionToClient } from '@/lib/billing/apply-subscription';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const db = supabaseAdmin();
  const now = new Date().toISOString();

  const { data: expired } = await db
    .from('subscriptions')
    .select('id')
    .eq('plan', 'trial')
    .eq('status', 'active')
    .lt('current_period_end', now)
    .limit(100);

  let processed = 0;
  for (const row of expired ?? []) {
    await db.from('subscriptions').update({ status: 'trial_expired' }).eq('id', row.id);
    await applySubscriptionToClient(row.id);
    processed++;
  }

  return NextResponse.json({ ok: true, processed });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/cron/trial-sweep/route.ts
git commit -m "feat(billing): trial-sweep cron pauses expired trials"
```

---

## Task 19: Renewal-sweep cron skeleton

**Files:**
- Create: `src/app/api/cron/renewal-sweep/route.ts`

- [ ] **Step 1: Implement (skeleton, actual recurring fires from PayFast)**

```typescript
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Renewal sweep — informational cron. PayFast's recurring token fires the
 * actual renewal charge automatically based on the billing_date set at
 * subscription creation. This cron exists to:
 *   1. Surface subscriptions whose period_end has passed but no renewal ITN
 *      arrived (escalates to the reconcile cron).
 *   2. Process pending_plan transitions that should happen at renewal.
 */
export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const db = supabaseAdmin();
  const now = new Date().toISOString();

  const { data: due } = await db
    .from('subscriptions')
    .select('id, client_id, plan, pending_plan, current_period_end, payfast_token')
    .eq('status', 'active')
    .lt('current_period_end', now)
    .limit(100);

  return NextResponse.json({
    ok: true,
    overdue: due?.length ?? 0,
    // Action items get implemented in Phase 2 when the pending_plan upgrade
    // path lands. This route exists so cron config is complete from Phase 1.
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/cron/renewal-sweep/route.ts
git commit -m "feat(billing): renewal-sweep cron skeleton"
```

---

## Task 20: Dunning-sweep cron skeleton

**Files:**
- Create: `src/app/api/cron/dunning-sweep/route.ts`

- [ ] **Step 1: Implement**

```typescript
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { applySubscriptionToClient } from '@/lib/billing/apply-subscription';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PAUSE_AFTER_DAYS = 3;

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const db = supabaseAdmin();
  const cutoff = new Date(Date.now() - PAUSE_AFTER_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: stale } = await db
    .from('payment_failures')
    .select('id, client_id, subscription_id')
    .is('resolved_at', null)
    .lt('failed_at', cutoff)
    .limit(100);

  let paused = 0;
  for (const row of stale ?? []) {
    if (!row.subscription_id) continue;
    await db.from('subscriptions').update({ status: 'paused_unpaid' }).eq('id', row.subscription_id);
    await applySubscriptionToClient(row.subscription_id);
    paused++;
  }

  return NextResponse.json({ ok: true, paused, scanned: stale?.length ?? 0 });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/cron/dunning-sweep/route.ts
git commit -m "feat(billing): dunning-sweep cron escalates past-due to paused_unpaid"
```

---

## Task 21: Wire cron schedule and env vars

**Files:**
- Modify: `vercel.json`

- [ ] **Step 1: Add cron entries to `vercel.json`**

In the `crons` array, append:

```json
    { "path": "/api/cron/payfast-reconcile", "schedule": "0 * * * *" },
    { "path": "/api/cron/renewal-sweep",    "schedule": "15 * * * *" },
    { "path": "/api/cron/trial-sweep",      "schedule": "30 * * * *" },
    { "path": "/api/cron/dunning-sweep",    "schedule": "45 * * * *" }
```

Hourly, staggered by 15 minutes so they don't all hit Supabase at once.

- [ ] **Step 2: Verify JSON parses**

Run: `cd ~/qwikly-site && node -e "JSON.parse(require('fs').readFileSync('vercel.json'))" && echo OK`
Expected: `OK`

- [ ] **Step 3: Document required env vars**

Create `docs/billing-env-vars.md`:

```markdown
# Billing & PayFast environment variables

These must be set in every environment (preview, production) via `vercel env add`.

| Var | Sandbox value | Live value |
|---|---|---|
| PAYFAST_MERCHANT_ID | `10000100` | (from PayFast dashboard) |
| PAYFAST_MERCHANT_KEY | `46f0cd694581a` | (from PayFast dashboard) |
| PAYFAST_PASSPHRASE | `jt7NOE43FZPn` | (from PayFast dashboard, must match dashboard) |
| PAYFAST_MODE | `sandbox` | `live` |
| PAYFAST_RETURN_URL | `https://qwikly.co.za/pay/success` | same |
| PAYFAST_CANCEL_URL | `https://qwikly.co.za/pay/cancel` | same |
| PAYFAST_NOTIFY_URL | `https://qwikly.co.za/api/payfast/itn` | same |
| CRON_SECRET | (random 32-char hex) | (different random 32-char hex) |

Set with:
```bash
vercel env add PAYFAST_MERCHANT_ID preview
vercel env add PAYFAST_MERCHANT_ID production
# ... repeat for each var
```
```

- [ ] **Step 4: Commit**

```bash
git add vercel.json docs/billing-env-vars.md
git commit -m "feat(billing): wire four new crons and document required env vars"
```

---

## Task 22: Final integration test against PayFast sandbox

**Files:** none (manual verification)

- [ ] **Step 1: Set sandbox env vars locally**

Run: `cd ~/qwikly-site && vercel env pull .env.preview`
Confirm all `PAYFAST_*` vars are present.

- [ ] **Step 2: Create a test subscription record in the database**

```sql
-- run via supabase SQL editor
INSERT INTO clients (id, business_id, plan, auth_user_id)
VALUES (999, 1, 'trial', 'test-auth-id-999')
ON CONFLICT (id) DO NOTHING;

INSERT INTO subscriptions (id, client_id, user_id, plan, status, current_period_end)
VALUES (999, 999, 'test-auth-id-999', 'trial', 'active', now() + interval '7 days')
ON CONFLICT (id) DO NOTHING;
```

- [ ] **Step 3: Insert a pending payfast_payments row**

```sql
INSERT INTO payfast_payments (client_id, subscription_id, m_payment_id, purpose, amount_zar_cents, status)
VALUES (999, 999, 'mp_test_001', 'subscription_setup', 69900, 'pending');
```

- [ ] **Step 4: Build a sandbox checkout URL via a script**

```typescript
// scripts/build-sandbox-checkout.ts
import { buildCheckoutUrl } from '@/lib/payfast/checkout';

const url = buildCheckoutUrl({
  m_payment_id: 'mp_test_001',
  amount_zar_cents: 69900,
  item_name: 'Qwikly Starter (sandbox test)',
  client_id: 999,
  subscription_id: 999,
  purpose: 'subscription_setup',
  recurring: true,
  recurring_amount_zar_cents: 69900,
  billing_date: new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10),
});

console.log(url);
```

Run: `npx tsx scripts/build-sandbox-checkout.ts`

- [ ] **Step 5: Open the URL in a browser, complete the sandbox payment**

Use PayFast's sandbox test card: `4000 0000 0000 0002` / any CVV / any future expiry.

- [ ] **Step 6: Verify the ITN landed and state updated**

```sql
SELECT status, captured_at, pf_payment_id FROM payfast_payments WHERE m_payment_id = 'mp_test_001';
SELECT plan, status, current_period_end FROM subscriptions WHERE id = 999;
SELECT granted_balance_zar_cents FROM conversation_credits WHERE client_id = 999;
SELECT plan, assistant_paused FROM clients WHERE id = 999;
```

Expected:
- `payfast_payments.status='captured'`, `captured_at` set, `pf_payment_id` populated
- `subscriptions.plan` unchanged (still 'trial' since this was a sandbox test, but real subscription_setup would have set it to the purchased plan based on `custom_str3`)
- `conversation_credits.granted_balance_zar_cents = 10000` (R100 for Starter)
- `clients.plan` matches subscription, `assistant_paused=false`

- [ ] **Step 7: Replay the same ITN (idempotency check)**

Use PayFast's "Resend ITN" feature on the test transaction. Run the verify queries again. Nothing should change.

- [ ] **Step 8: Clean up test data**

```sql
DELETE FROM payfast_payments WHERE m_payment_id = 'mp_test_001';
DELETE FROM subscriptions WHERE id = 999;
DELETE FROM clients WHERE id = 999;
```

- [ ] **Step 9: Commit verification notes**

Update `docs/billing-env-vars.md` with a "## Sandbox verified" section dated when this passed.

```bash
git add docs/billing-env-vars.md
git commit -m "docs(billing): sandbox verification notes"
```

---

## Phase 1 Done When

- All 22 tasks committed and on the feature branch
- `npx vitest run` passes for every new test file
- `vercel.json` has the four new cron entries
- The sandbox integration test (Task 22) passes end-to-end
- ITN endpoint is idempotent (replay does not double-write)
- `applySubscriptionToClient()` is the only writer to entitlement fields on `clients`

After Phase 1 ships and is verified, Phase 2 plans get written for the customer-facing tracks (signup, upgrade, downgrade, top-up, dashboard meters, cleanup) which can then run as parallel agents.
