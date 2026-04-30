# Qwikly — Subscription Billing System Design
**Date:** 2026-04-30
**Scope:** Full money path — pricing page, checkout, plan enforcement, billing portal, invoices, webhooks
**Target:** qwikly.co.za (repo: ~/qwikly-site)

---

## 1. Context

Qwikly currently runs a commission-only model: 8% per booked job, invoiced monthly via Yoco. This system handles client-to-customer payments. The new subscription system is a separate, parallel layer — Qwikly charges its own clients a monthly platform fee. The 8% commission continues unchanged for existing clients. New clients sign up to a subscription plan; existing clients remain on commission until manually migrated.

---

## 2. Payment Provider

**Paystack** — ZAR-native, recurring billing API, hosted checkout, strong webhook coverage. Paystack Plans + Subscriptions handles the recurring charge and proration. We own the UX (pricing page, billing portal, invoice list) and sync Paystack's subscription state into Supabase via webhooks.

No Stripe. Yoco remains for client invoice payments only (unchanged).

---

## 3. Plans

| Plan | Price | Conversations/mo | Embed Sites | Team Seats | Follow-up Emails/mo |
|------|-------|-----------------|-------------|------------|---------------------|
| Free Trial | R0 / 14 days | 50 | 1 | 1 | 100 |
| Starter | R349/mo | 200 | 1 | 1 | 500 |
| Growth | R799/mo | 600 | 3 | 3 | 2,000 |
| Business | R1,499/mo | 2,000 | 10 | 10 | 10,000 |
| Enterprise | Contact us | Unlimited | Custom | Custom | Unlimited |

Storage is not enforced in v1 (Supabase free tier is sufficient for current scale).

**Paystack plan codes** are seeded into `subscription_plans` at migration time, one per paid tier. Free Trial and Enterprise have no Paystack plan code (no card required).

---

## 4. Database Schema

### New tables

```sql
-- Plan definitions (seeded, not user-editable)
CREATE TABLE subscription_plans (
  id            text PRIMARY KEY,           -- 'free_trial' | 'starter' | 'growth' | 'business' | 'enterprise'
  name          text NOT NULL,
  price_zar     numeric(10,2) NOT NULL,     -- 0 for free/enterprise
  conversations_limit  int,                -- NULL = unlimited
  sites_limit          int,
  seats_limit          int,
  emails_limit         int,
  paystack_plan_code   text,               -- NULL for free/enterprise
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now()
);

-- One active subscription per client
CREATE TABLE subscriptions (
  id                       uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id                bigint REFERENCES clients(id) ON DELETE CASCADE NOT NULL UNIQUE,
  plan_id                  text REFERENCES subscription_plans(id) NOT NULL,
  status                   text NOT NULL DEFAULT 'trialing'
    CHECK (status IN ('trialing','active','past_due','canceled','paused')),
  paystack_subscription_code text,         -- Paystack's subscription code
  paystack_customer_code     text,
  current_period_start     timestamptz,
  current_period_end       timestamptz,
  cancel_at_period_end     boolean DEFAULT false,
  trial_ends_at            timestamptz,
  canceled_at              timestamptz,
  created_at               timestamptz DEFAULT now(),
  updated_at               timestamptz DEFAULT now()
);

-- Invoice record for every Paystack charge event
CREATE TABLE subscription_invoices (
  id                text PRIMARY KEY,       -- Paystack invoice reference
  client_id         bigint REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  subscription_id   uuid REFERENCES subscriptions(id),
  plan_id           text REFERENCES subscription_plans(id),
  amount_zar        numeric(10,2) NOT NULL,
  vat_zar           numeric(10,2) NOT NULL DEFAULT 0,
  total_zar         numeric(10,2) NOT NULL,
  status            text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','paid','failed','refunded')),
  pdf_path          text,                   -- Supabase Storage path
  pdf_url           text,                   -- signed URL (regenerated on request)
  billing_email     text,
  period_start      timestamptz,
  period_end        timestamptz,
  paid_at           timestamptz,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

-- Monthly rolling usage counters (reset at billing cycle start)
CREATE TABLE usage_counters (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id       bigint REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  period_start    timestamptz NOT NULL,
  conversations   int NOT NULL DEFAULT 0,
  emails          int NOT NULL DEFAULT 0,
  updated_at      timestamptz DEFAULT now(),
  UNIQUE (client_id, period_start)
);
```

### Clients table extensions
```sql
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS subscription_plan_id text REFERENCES subscription_plans(id) DEFAULT 'free_trial',
  ADD COLUMN IF NOT EXISTS subscription_status  text DEFAULT 'trialing';
```

### Webhook idempotency
Reuse existing `webhook_events` table with `provider = 'paystack'`.

---

## 5. API Routes

### New routes

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/subscriptions/checkout` | Create Paystack subscription session, return hosted URL |
| POST | `/api/webhooks/paystack` | Idempotent Paystack webhook handler |
| GET | `/api/subscriptions/current` | Current plan + subscription status for dashboard |
| GET | `/api/subscriptions/usage` | Current period usage vs limits |
| POST | `/api/subscriptions/cancel` | Set `cancel_at_period_end = true` |
| POST | `/api/subscriptions/reactivate` | Undo cancellation if still in period |
| GET | `/api/subscriptions/invoices` | List subscription invoices |
| GET | `/api/subscriptions/invoices/[id]/pdf` | Serve or generate branded PDF |
| POST | `/api/subscriptions/change-plan` | Upgrade/downgrade (Paystack plan change) |

### Existing routes untouched
All `/api/billing/*`, `/api/invoices/*`, `/api/webhooks/yoco` — commission model unchanged.

---

## 6. Pages

### `/pricing` (rewrite)
- Plan cards: Free Trial, Starter, Growth, Business, Enterprise
- Feature comparison table
- "Start free trial" → signup flow → auto-assigns `free_trial` plan
- "Upgrade" buttons → `/api/subscriptions/checkout` → Paystack hosted page → return to `/dashboard/billing?success=1`
- Enterprise card → `/contact`
- Existing 8% commission section stays below the plan table (for context)

### `/dashboard/billing` (extend existing)
Current page shows commission billing periods. Add a new top section:
- **Plan card**: plan name, status badge, next renewal date, cancel/upgrade CTAs
- **Usage widget**: progress bars for conversations, emails (80% = amber, 100% = red + upgrade CTA)
- **Payment method**: masked card, "Update" link → Paystack update URL
- Commission billing periods section stays below (unchanged)

### `/dashboard/billing/invoices` (new)
- Table: invoice number, date, period, amount, VAT, status badge, Download PDF button
- Separate from commission invoices (which live at `/dashboard/billing/[period_id]`)

---

## 7. Limit Enforcement

### `src/lib/subscriptions/limits.ts`
```typescript
type Dimension = 'conversations' | 'emails' | 'sites' | 'seats'
type LimitResult = { status: 'ok' | 'warning' | 'blocked'; used: number; limit: number | null }

async function checkLimit(clientId: number, dimension: Dimension): Promise<LimitResult>
async function incrementUsage(clientId: number, dimension: Dimension): Promise<void>
```

- `checkLimit` reads `usage_counters` + `subscription_plans` for the client's current plan
- 80% threshold → `warning`
- 100% → `blocked`
- `null` limit (enterprise/unlimited) → always `ok`
- Called at the start of: `POST /api/web/chat` (conversations), `POST /api/email/send` (emails)
- `incrementUsage` is called after successful operation

### Enforcement response (blocked)
```json
{ "error": "limit_reached", "dimension": "conversations", "upgrade_url": "/pricing" }
```
HTTP 402. The widget and dashboard show a hard block with upgrade CTA.

### Dashboard warning banner
Shown when any dimension is at `warning` or `blocked`. Dismissed per-session, re-shown on next login.

---

## 8. Webhooks

Handler at `POST /api/webhooks/paystack`. Verified via HMAC-SHA512 (`x-paystack-signature` header, `PAYSTACK_WEBHOOK_SECRET` env var). Idempotent via `webhook_events` table.

| Event | Action |
|-------|--------|
| `charge.success` | Mark `subscription_invoice` as paid, generate PDF, email to `billing_email`, reset/extend `current_period_end` |
| `subscription.create` | Upsert `subscriptions` row, update `clients.subscription_plan_id` and `subscription_status` |
| `subscription.update` (plan change) | Update plan, limits take effect immediately |
| `subscription.disable` | Set `status = canceled`, `cancel_at_period_end = true`; downgrade to `free_trial` at `current_period_end` |
| `invoice.payment_failed` | Set dunning flag on client, email billing contact, show dashboard banner with retry link |

---

## 9. Invoice PDFs

Reuse `@react-pdf/renderer` (already a dependency). A new `SubscriptionInvoicePDF` component renders:
- Qwikly logo + brand colours (`#E85A2C`)
- Client business name + billing email
- Invoice number, date, period
- Line item: plan name + price (ex-VAT)
- VAT line: 15% of ex-VAT amount
- Total
- "VAT registered under SARS — VAT No: [QWIKLY_VAT_NUMBER]" footer

PDF generated on `charge.success` webhook, stored at `subscription-invoices/{client_id}/{invoice_id}.pdf` in Supabase Storage. Signed URL returned from `/api/subscriptions/invoices/[id]/pdf`. Also emailed to `billing_email` via Resend on issue.

---

## 10. Checkout Flow

1. User clicks "Upgrade to Starter" on `/pricing` or `/dashboard/billing`
2. `POST /api/subscriptions/checkout` → creates/retrieves Paystack customer, initialises subscription with the Paystack plan code, returns `authorization_url`
3. User completes card entry on Paystack hosted page
4. Paystack redirects to `NEXT_PUBLIC_BASE_URL/dashboard/billing?checkout=success`
5. `subscription.create` webhook fires → DB updated → plan active → welcome email sent via Resend (fired from webhook, not redirect, to avoid double-send)

Failed payment on checkout: Paystack shows error on their page. No state written to DB until `charge.success`.

---

## 11. Plan Changes (Upgrade/Downgrade)

- **Upgrade**: Paystack plan change → prorated charge for remainder of period → `subscription.update` webhook → new limits active immediately
- **Downgrade**: Paystack plan change → no refund → new (lower) limits active at next billing date
- **Cancel**: `cancel_at_period_end = true` → access continues to `current_period_end` → `subscription.disable` webhook → downgrade to `free_trial`

---

## 12. Environment Variables Required

```
PAYSTACK_SECRET_KEY=sk_live_...
PAYSTACK_PUBLIC_KEY=pk_live_...
PAYSTACK_WEBHOOK_SECRET=...
QWIKLY_VAT_NUMBER=...       # for invoice PDFs
```

Test keys for local dev: `sk_test_...` / `pk_test_...`

---

## 13. What This Does NOT Touch

- `T2` — assistant runtime (chat API, WhatsApp, widget)
- `T3` — analytics dashboard (beyond the usage/limit widget, which is new and owned here)
- Yoco webhook handler
- Commission billing system (`/api/billing/*`, `billing_periods`, `commissions` tables)
- Existing invoice system (`/api/invoices/*`)

---

## 14. Acceptance Tests

1. Subscribe to each plan with Paystack test cards → DB shows correct `plan_id`, `status`, and limits
2. Hit conversation limit → 80% shows warning banner, 100% returns 402 from chat API with upgrade CTA
3. Upgrade mid-cycle → proration charge correct, new limits active immediately
4. Cancel → access continues to period end, then plan reverts to `free_trial`
5. Failed payment webhook → dashboard shows dunning banner + retry link; `subscription_invoices.status = failed`
6. Download invoice PDF → branded, VAT line present, totals correct
