# Qwikly End-to-End Billing, Credits and Plan System

**Date:** 2026-05-11
**Status:** Draft, pending implementation plan
**Owner:** Liam Clarke
**Supersedes:** `2026-04-30-subscription-billing-design.md` (8% commission model), parts of `2026-05-11-bundle-and-payments-design.md` (PayFast surfaces and signup wiring)

---

## Problem

Qwikly has half-built billing infrastructure: tier-aware plan caps in `plan.ts`, an `api_usage` table tracking per-tenant Anthropic spend, a `conversation_credits` wallet, and stubs for subscription change and cancellation routes. Four problems block this from being production-ready:

1. **Four tables can disagree** about a customer's entitlement (`clients.plan`, `subscriptions.plan`, `clients.products`, `conversation_credits.balance_zar_cents`). Every "I paid but it didn't unlock" support ticket lives in that gap.
2. **The plan revenue model is upside-down.** Starter at 600 included conversations × R1.50 wholesale = R900 of API exposure on R699 of plan revenue. Negative margin in the worst case.
3. **No active payment gateway.** Paystack was rejected. PayFast is the chosen replacement but the integration is not wired in.
4. **No coherent end-to-end flow.** Signup, trial expiry, upgrade, downgrade, top-up, cancellation, dunning, and payment-method updates are each half-built in disconnected places.

This spec defines the single source of truth, the PayFast integration, every customer-facing flow, the usage gates, and the cleanup of the legacy commission system.

---

## Decisions (locked in during brainstorming)

1. **PayFast is the gateway.** Yoco's 8%-commission system and Paystack code paths are removed.
2. **Customer-facing usage is denominated in leads.** Conversation/token cost is internal abuse floor only.
3. **Trial = Starter caps for 7 days, no card.** Day 8 pauses the chat (no AI calls, no lead capture). Dashboard stays accessible. Owner can pick a plan to resume.
4. **Upgrade = Claude-style proration.** Pay the difference for remaining days, instant access, billing anchor unchanged. Downgrade takes effect at end of current period.
5. **Top-up packs expire at billing reset.** Three sizes per tier, 10% bonus on the large pack.
6. **Re-confirm every customer-initiated charge** through PayFast hosted checkout. Renewals charge the stored token silently.
7. **Refresh shows new state** via `force-dynamic` server reads and webhook-first state writes. No Realtime websocket required.
8. **75% minimum gross margin** across all plan + grant + top-up scenarios.
9. **AI conversation cost is a pass-through to the customer**, not subsidised by plan revenue. Plan price covers platform; AI use comes from a per-plan starting grant plus top-ups.

---

## Section 1: Data model and single source of truth

### The rule

`subscriptions` is the source of truth for what a customer is paying for. `clients` is a derived view that the runtime reads. A single function, `applySubscriptionToClient(subscriptionId)`, copies the relevant fields in a transaction. Every entitlement-mutating code path calls only that function. No other code writes `clients.plan`, `clients.products`, or `clients.pipeline_daily_quota`.

### New columns on `subscriptions`

| Column | Purpose |
|---|---|
| `payfast_token` | Stored PayFast subscription token for ad-hoc charges and renewals |
| `current_period_start` | Anchor for proration and trial expiry |
| `current_period_end` | Anchor for downgrade-at-period-end and renewal |
| `pending_plan` | Scheduled downgrade target, read by renewal cron |
| `proration_credit_zar_cents` | Unused credit accounting on refund/cancellation edge cases |

### New table: `payfast_payments` (audit + pending tracker)

```sql
payfast_payments (
  id,
  client_id, subscription_id,
  m_payment_id,                    -- our internal reference sent to PayFast
  pf_payment_id UNIQUE,            -- PayFast reference, populated on ITN
  purpose,                         -- 'subscription_setup'|'subscription_renewal'
                                   --  |'topup_leads'|'topup_ai_credit'
                                   --  |'upgrade_proration'|'card_update'
  status,                          -- 'pending'|'captured'|'failed'|'cancelled'|'refunded'
  amount_zar_cents,
  expected_at, captured_at, refunded_at,
  raw_itn_payload jsonb,
  invoice_pdf_url,                 -- Supabase Storage signed URL
  created_at, updated_at
)
```

Indexes: `(m_payment_id)`, `(client_id, created_at desc)`, UNIQUE on `pf_payment_id`.

### New table: `lead_topups` (lead packs, expire at period end)

```sql
lead_topups (
  id,
  client_id, subscription_id,
  leads_purchased,
  zar_cents_paid,
  leads_remaining,
  expires_at,                      -- = subscriptions.current_period_end at purchase
  payfast_payment_id,
  created_at
)
```

Capture decrements oldest non-expired pack FIFO. Expired rows are ignored, not deleted, so the audit trail is preserved.

### Modified table: `conversation_credits` (split balance)

Replace the single `balance_zar_cents` with two columns:

```sql
conversation_credits (
  client_id PRIMARY KEY,
  granted_balance_zar_cents,       -- plan grant, resets on renewal
  granted_expires_at,              -- = subscriptions.current_period_end
  purchased_balance_zar_cents,     -- top-ups, never expire
  zero_balance_behaviour,          -- 'pause'|'overage'
  updated_at
)
```

Drain order: granted first, purchased second. Migration backfills `purchased_balance` from existing `balance` so no top-up money is lost.

### New table: `payment_failures` (dunning state)

```sql
payment_failures (
  id,
  client_id, subscription_id,
  payfast_payment_id,
  failed_at,
  reason,
  retry_count,
  resolved_at,
  notification_sent_at
)
```

Cron at `/api/cron/dunning-sweep` reads this hourly.

### Plan grants (75% margin floor, even at planning wholesale)

| Plan | Plan Price | Starting AI Grant | Wholesale Exposure @ Planning | Worst-Case Margin |
|---|---|---|---|---|
| Trial (7 days) | R0 | R30 | R11.25 | Loss-leader, capped |
| Starter | R699 | R100 | R37.50 | 94.6% |
| Pro | R1,799 | R280 | R105.00 | 94.2% |
| Founders | R2,999 | R450 | R168.75 | 94.4% |
| Business | R3,999 | R650 | R243.75 | 93.9% |
| Enterprise | R7,999+ | R1,500 | R562.50 | 93.0% |

All values are well above the 75% floor with FX and Anthropic-price headroom.

### Top-up packs

**AI credit packs** (flat across tiers, drains the wallet):

| Pack | Price | Credit added | Approx. conversations |
|---|---|---|---|
| Small | R100 | R100 | ~135 |
| Medium | R250 | R280 (12% bonus) | ~378 |
| Large | R500 | R600 (20% bonus) | ~810 |

**Lead packs** (priced per tier, expire at period end):

| Tier | Small (+10) | Medium (+25) | Large (+50, 10% bonus) |
|---|---|---|---|
| Starter | R230 | R575 | R1,035 (50 leads for the price of 45) |
| Pro | R200 | R500 | R900 |
| Founders | R200 | R500 | R900 |
| Business | R120 | R300 | R540 |
| Enterprise | R80 | R200 | R360 |

---

## Section 2: PayFast integration architecture

### Surfaces

1. **Hosted Checkout** for subscription setup, plan upgrades, top-ups, and card updates
2. **ITN webhook** at `/api/payfast/itn`, the source of truth for all state changes
3. **Tokenized recurring** for monthly renewals via stored `payfast_token`
4. **Ad-hoc charges** against a stored token for proration and top-ups

### File structure

```
src/lib/payfast/
  config.ts         - Env, sandbox/live toggle, IP allowlist (static list of 9 IPs)
  signature.ts      - MD5 signature generation and verification
  checkout.ts       - Build signed redirect URLs
  itn.ts            - Validate incoming ITN (signature, IP, postback validate, DB match)
  adhoc.ts          - Charge a stored token (top-ups, proration)
  token.ts          - Create, update, cancel subscriptions via PayFast API
  types.ts          - Payload and ITN event types

src/app/api/payfast/
  itn/route.ts          - POST handler, validates and applies state transitions
  checkout/route.ts     - POST, returns signed checkout URL for subscription setup
  upgrade/route.ts      - POST, proration + return signed URL
  topup-leads/route.ts  - POST, lead pack purchase
  topup-ai/route.ts     - POST, AI credit top-up
  update-card/route.ts  - POST, R1 verification flow for new card
  cancel/route.ts       - POST, mark cancel_at_period_end
```

### ITN four-step validation

Every ITN must pass all four before any DB write:

1. **Signature check**: MD5 of received fields (excluding signature), spec field order, passphrase appended
2. **Source IP check**: must match PayFast's published static IP list (hardcoded in `config.ts`, reviewed on PayFast incident announcements)
3. **Postback validate**: POST the received payload to `https://www.payfast.co.za/eng/query/validate`, expect `VALID`
4. **DB amount and reference match**: `m_payment_id` must match a pending `payfast_payments` row, `amount_gross` must equal `payfast_payments.amount_zar_cents / 100`

### State transitions

```
ITN: payment_status=COMPLETE, type=SUBSCRIPTION_PAYMENT (first payment)
  1. Update subscriptions.status='active', payfast_token=<received>,
     current_period_start=now, current_period_end=now+1mo, plan=<purchased tier>
  2. Credit conversation_credits.granted_balance_zar_cents = plan grant for tier
  3. Call applySubscriptionToClient()
  4. Mark payfast_payments row captured
  5. Generate VAT invoice PDF, email via Resend

ITN: payment_status=COMPLETE, type=SUBSCRIPTION_PAYMENT (renewal)
  1. Update subscriptions.current_period_start=now, current_period_end=now+1mo
  2. If pending_plan is set: set plan=pending_plan, pending_plan=null,
     call PayFast /subscriptions/{token}/update with new amount
  3. Reset granted_balance_zar_cents = grant for current plan
  4. Reset granted_expires_at = current_period_end
  5. Call applySubscriptionToClient()
  6. Mark payfast_payments row captured
  7. Generate VAT invoice, email

ITN: payment_status=COMPLETE, type=ADHOC purpose='upgrade_proration'
  1. Update subscriptions.plan=<new tier> (current_period_end unchanged)
  2. Call PayFast /subscriptions/{token}/update to change recurring amount
  3. Call applySubscriptionToClient() to flip features on
  4. Mark payfast_payments row captured
  5. Generate VAT invoice, email

ITN: payment_status=COMPLETE, type=ADHOC purpose='topup_ai_credit'
  1. Increment conversation_credits.purchased_balance_zar_cents
  2. Mark payfast_payments row captured
  3. Generate VAT invoice, email

ITN: payment_status=COMPLETE, type=ADHOC purpose='topup_leads'
  1. Insert lead_topups row: leads_remaining=leads_purchased,
     expires_at=subscriptions.current_period_end
  2. Mark payfast_payments row captured
  3. Generate VAT invoice, email

ITN: payment_status=COMPLETE, type=ADHOC purpose='card_update'
  1. Replace subscriptions.payfast_token with new token
  2. Queue R1 refund via PayFast API
  3. If subscription was 'past_due', retry the original failed charge

ITN: payment_status=FAILED or CANCELLED
  1. Mark payfast_payments row failed
  2. Insert payment_failures row if this was a renewal
  3. Don't mutate subscriptions or clients (existing access continues until period_end)

ITN: payment_status=REFUND
  1. Mark payfast_payments row refunded
  2. If purpose was topup_ai_credit: reverse the wallet credit
  3. If purpose was topup_leads: zero out the lead_topups row's leads_remaining
  4. If purpose was subscription_setup or renewal: this is an escalation, alert ops
```

### Idempotency

`payfast_payments.pf_payment_id` has a UNIQUE constraint. Status transitions are one-way (`pending` → `captured` only). A second ITN for an already-captured row returns 200 OK with no DB write. PayFast retries up to 5× over 24 hours; idempotency must hold across all retries.

### Cron jobs

Three cron routes drive time-based state transitions:

- **`/api/cron/payfast-reconcile`** (hourly). For every `payfast_payments` row stuck in `pending` for more than 10 minutes, calls PayFast's `/query/payment/{m_payment_id}` and applies the matching state transition if PayFast reports success. Guarantees no "paid but not credited" state survives longer than one hour.
- **`/api/cron/renewal-sweep`** (hourly). Finds subscriptions where `status='active'` and `current_period_end <= now`. For each: triggers PayFast's recurring token to charge the next month's amount (if `pending_plan` is set, charges the new tier and updates the subscription token amount in PayFast). The ITN from that charge runs the `renewal` flow.
- **`/api/cron/trial-sweep`** (hourly). Finds trials where `plan='trial'` and `current_period_end < now`. Sets `status='trial_expired'` and pauses the assistant. Sends the "your trial ended" email.
- **`/api/cron/dunning-sweep`** (hourly). Reads `payment_failures` and escalates: at >3 days since first failure with no `resolved_at`, pauses the assistant and sends the final "your subscription is paused" email.

### The `applySubscriptionToClient(subscriptionId)` function

The single funnel through which `clients` is updated. Behaviour:

1. Read `subscriptions` row for the given ID
2. In a transaction, write to `clients` (the derived view):
   - `plan` = `subscriptions.plan`
   - `products` = `productsForPlan(plan)`
   - `pipeline_daily_quota` = `dailyProspectQuotaForPlan(plan)`
   - `lead_limit` = `PLAN_CONFIG[plan].leadLimit`
   - `assistant_paused` = `subscriptions.status IN ('trial_expired', 'paused_unpaid', 'cancelled')`
   - `remove_branding`, `custom_greeting`, `csv_export`, `api_access` from `PLAN_CONFIG[plan]`
3. Emit a `clients_entitlement_changed` event (for analytics / future Realtime)

This is the **only** function in the codebase that writes those columns on `clients`. A code-search guard (a lint rule or pre-commit check) enforces it.

### Env vars

```
PAYFAST_MERCHANT_ID
PAYFAST_MERCHANT_KEY
PAYFAST_PASSPHRASE
PAYFAST_MODE              # 'live' or 'sandbox'
PAYFAST_RETURN_URL
PAYFAST_CANCEL_URL
PAYFAST_NOTIFY_URL
```

Deployed via `vercel env`. Sandbox values for preview deploys; live values for production only.

---

## Section 3: End-to-end customer flows

All flows below are the only paths that move money or change entitlement. Every state change starts here and goes through the ITN handler.

### 3.1 Brand new signup → Trial active

1. `/pricing` "Start free 7-day trial" CTA → `/signup`
2. Supabase email+password creates `users`, `businesses`, `clients`, `subscriptions` in one transaction
3. `subscriptions.plan='trial'`, `status='active'`, `current_period_end=now+7d`, `payfast_token=null`
4. `conversation_credits.granted_balance_zar_cents = 3000` (R30), `granted_expires_at = current_period_end`
5. `applySubscriptionToClient()` writes `clients.plan='trial'`, `products=['inbound']`, `lead_limit=30`, `assistant_paused=false`
6. Redirect to `/dashboard/setup`

No card captured.

### 3.2 Trial → Paid (during the 7 days)

1. Dashboard trial banner "Upgrade now" → pricing card → `POST /api/payfast/checkout` with `{ plan: 'starter' }`
2. Server: create pending `payfast_payments` row, build signed PayFast URL, return `{ url }`
3. Browser redirects to PayFast hosted checkout, customer pays first month
4. PayFast posts ITN; success page polls `/api/subscription` every 2s up to 10s
5. ITN handler runs the `SUBSCRIPTION_PAYMENT (first payment)` flow
6. Dashboard reloads, shows the new tier

### 3.3 Trial expires day 7 → Pause

1. Hourly cron `/api/cron/trial-sweep` finds trials where `current_period_end < now`
2. `subscriptions.status='trial_expired'`, `applySubscriptionToClient()` sets `clients.assistant_paused=true`
3. Chat widget on the customer's site checks `assistant_paused`. If true, returns the fixed offline message:

   *"This site isn't taking new enquiries right now. Try again soon."*

   No Anthropic call, no token spend, no lead capture.
4. Owner gets email: "Your trial ended. Pick a plan to switch the assistant back on."
5. Dashboard remains fully readable. Data preserved.

### 3.4 Upgrade (mid-cycle, Claude-style proration)

1. `/dashboard/settings/billing` "Upgrade to Pro" → confirmation screen shows proration amount and new billing date
2. `POST /api/payfast/upgrade` calculates:
   ```
   days_remaining = (current_period_end - now) / 1 day
   new_tier_remaining = (new_price / 30) * days_remaining
   old_tier_credit    = (old_price / 30) * days_remaining
   proration_zar      = max(0, new_tier_remaining - old_tier_credit)
   ```
3. If proration < R10: skip the charge, schedule the upgrade for next renewal
4. Else: create pending `payfast_payments` row purpose='upgrade_proration', return signed PayFast URL
5. Customer pays proration at PayFast
6. ITN runs the `upgrade_proration` flow, calls PayFast `/subscriptions/{token}/update` to change recurring amount, updates `subscriptions.plan` and `applySubscriptionToClient()`
7. `granted_balance_zar_cents` is **not** topped up at upgrade; grant resets at renewal only

### 3.5 Downgrade

1. `/dashboard/settings/billing` "Switch to Starter" → confirmation explains "You keep Pro until [current_period_end]"
2. Password re-entry required (no money moves today)
3. `POST /api/payfast/downgrade` writes `subscriptions.pending_plan='starter'`. No PayFast call.
4. Renewal cron at `current_period_end` runs the renewal flow with `pending_plan` set:
   - Calls PayFast `/subscriptions/{token}/update` with the new tier amount
   - Sets `plan=pending_plan`, `pending_plan=null`
   - `applySubscriptionToClient()` flips features off
   - Credits the new tier's smaller grant

### 3.6 Top-up leads

1. "Out of leads" banner → `/dashboard/billing/topup-leads`
2. UI shows 3 packs at customer's tier rate (from the lead pack table)
3. Confirmation via PayFast hosted checkout
4. ITN runs `topup_leads` flow, inserts `lead_topups` row
5. Capture logic: if monthly cap hit AND any `lead_topups` row has `leads_remaining > 0 AND expires_at > now`, capture and decrement oldest pack FIFO

### 3.7 Top-up AI credits

1. "AI credit running low" banner (fires at 20% remaining) → `/dashboard/billing/topup-ai`
2. UI shows 3 flat packs
3. Confirmation via PayFast hosted checkout
4. ITN runs `topup_ai_credit` flow, increments `purchased_balance_zar_cents`
5. Wallet drains granted first, purchased second; purchased never expires

### 3.8 Cancel

1. "Cancel subscription" → confirmation: "You keep access until [period_end]"
2. Password re-entry
3. `subscriptions.cancel_at_period_end=true`, no PayFast call
4. Renewal cron at `period_end`: calls PayFast `/subscriptions/{token}/cancel`, sets `status='cancelled'`, `applySubscriptionToClient()` writes `assistant_paused=true`
5. Data preserved indefinitely; reactivation reuses existing rows

### 3.9 Update payment method

1. `/dashboard/settings/billing` "Update card" → `POST /api/payfast/update-card`
2. Server creates pending `payfast_payments` row purpose='card_update', amount R1, returns signed PayFast URL
3. Customer pays R1 with new card at PayFast
4. ITN runs `card_update` flow: replace `payfast_token`, queue R1 refund
5. If `subscriptions.status='past_due'`: retry the failed charge immediately

### 3.10 Failed renewal → Dunning

1. PayFast charge fails on renewal date (day 0) → ITN `payment_status=FAILED`
2. Handler inserts `payment_failures` row, sets `subscriptions.status='past_due'`. `clients.plan` unchanged (grace period).
3. Email immediately: "We couldn't charge your card. Please update it within 3 days."
4. PayFast retries automatically at day+1 and day+3 from the first failure
5. After 3 days since first failure with no successful charge: `/api/cron/dunning-sweep` sets `status='paused_unpaid'`, `applySubscriptionToClient()` writes `assistant_paused=true`. Second email: "Your subscription is paused. Update payment to reactivate."
6. Customer updates card via 3.9; we retry the original failed charge immediately; on success unpause

---

## Section 4: Usage tracking, cap enforcement, refresh

### The single entitlement function

```ts
async function getEntitlement(clientId): Promise<Entitlement>
```

Returns a structured snapshot containing plan, status, paused flag, leads used and available, AI credit grant and purchased balances, Outbound access, pipeline quota, period dates, trial expiry, cancel flag, pending plan.

In-process cached for 5 seconds per request to avoid hammering the DB on a single page render. Cache busts on any mutation in the same request.

### Pre-chat gate (every Anthropic call)

1. Fetch entitlement
2. If `assistantPaused`: return fixed offline message. No API call. Log a `paused_request` row.
3. If `aiCreditTotalZarCents <= 0` and `zero_balance_behaviour='pause'`: same as above with a "top up to reactivate" message
4. If `aiCreditTotalZarCents <= 0` and `zero_balance_behaviour='overage'`: proceed; end-of-month statement charges the overage
5. Otherwise: proceed. After the call, decrement `granted_balance_zar_cents` first, then `purchased_balance_zar_cents`, in a transaction with the `api_usage` insert

### Lead capture gate

1. Fetch entitlement
2. If `leadsThisMonth < leadLimit`: capture normally, increment counter
3. Else if `topupLeadsRemaining > 0`: capture, decrement oldest non-expired `lead_topups` pack
4. Else: capture happens but `lead.locked_by_cap=true`; owner sees "locked, top up to unlock" section

The locked-by-cap path exists because lead notifications must always reach the client end-to-end. Capacity pressure converts to revenue rather than lost data.

### Dashboard meters

`/dashboard/usage` shows two cards:

1. **Leads this month**, progress bar, "23 of 30 used", top-up CTA at 80%
2. **AI conversation credit** in ZAR, "R[granted] from plan + R[purchased] in top-ups", top-up CTA at 20%

Both cards are server components with `force-dynamic`. No client-side polling.

### Refresh-shows-new-state mechanism

Three layers:

1. **`force-dynamic`** on every entitlement-reading page (`/dashboard/*`, `/dashboard/settings/*`, `/api/usage`, `/api/subscription`)
2. **Webhook-first state writes**: every entitlement change is in the DB before the customer sees a redirect or banner
3. **Success page polling**: `/pay/success` polls `/api/subscription` every 2s up to 10s, then falls back to "confirming, check email"

Reconcile cron is the safety net for any pending payment older than 10 minutes.

### Internal abuse floor

Per-plan hidden conversation cap (Starter 600, Pro 2000, Business 6000, Enterprise 22500) acts as a second safety layer above the wallet. If a tenant exceeds this in a billing period, the chat pauses for that tenant pending admin review. Catches bot traffic, broken embeds, and runaway costs.

---

## Section 5: Cleanup, error handling, rollout

### Code we're deleting

- `/api/webhooks/yoco` and any Yoco-specific lib code
- `/dashboard/billing/per-job` (commission tracker)
- `/dashboard/billing/page.tsx` is rewritten from "commission stats" to "subscription stats"
- Paystack-flavoured routes and lib code (`src/lib/paystack/` if present)

### Tables marked deprecated, kept for audit

- `commissions`
- `billing_periods`

Drop after one billing cycle of confidence in the new system.

### Code we're keeping (and adjusting)

- `api_usage` table and `recordApiUsage()` (unchanged)
- `conversation_credits` (split balance into granted + purchased)
- `credit_topups` (renamed conceptually to AI credit topups, joined with new `lead_topups`)
- `plan.ts` tier config with grant sizes from this spec
- `subscriptions` table with new columns

### Migration order

1. **Schema additions**: new columns, new tables, split `conversation_credits.balance_zar_cents` into granted + purchased. Backfill `purchased_balance` from existing `balance` so no top-up money is lost.
2. **PayFast modules + ITN endpoint** deployed behind a feature flag.
3. **Signup, upgrade, downgrade, top-up routes** wired to new tables, flag still off in production.
4. **Backfill `applySubscriptionToClient()`** for every existing customer.
5. **Flag flip**: new signups go through PayFast. Existing customers continue on their current state.
6. **One billing cycle later**: cleanup pass. Remove the old codepath, drop deprecated tables.

### Test plan (non-negotiable before flag flip)

- Unit: signature generation, signature verification, proration math, drain-order math, expired-topup filtering
- Integration: end-to-end signup → trial → upgrade → top-up → downgrade → cancel against PayFast sandbox
- Idempotency: replay same ITN 5× and confirm no double-credit
- Reconcile cron: simulate ITN delivery failure, confirm cron catches and applies the state change within an hour
- Failure injection: Anthropic returns 500 mid-conversation, confirm wallet is not decremented
- Trial expiry: day 7 → day 8, confirm chat goes offline, dashboard still works
- Failed renewal: simulate card decline, confirm 3-day grace then pause
- Lead-cap-then-topup: hit 30 leads, buy 10 more, lead 31 captures successfully
- AI-credit-zero behaviour in both pause and overage modes

### Monitoring

- Sentry breadcrumbs on every ITN handler with `m_payment_id` and `purpose`
- Daily reconcile summary email: pending payments resolved, signature failures, stuck rows
- Weekly margin report: revenue, wholesale Anthropic spend, gross margin %. Alert if below 80%.
- Daily failed-ITN alert with full payload for any ITN that failed signature verification

---

## Risks and tradeoffs

- **PayFast IP list is hardcoded.** PayFast does not currently publish a DNS-resolvable allowlist. A network change on their side requires a config update on ours. Mitigation: log warnings on any ITN from outside the list rather than rejecting silently, so we can detect and react.
- **The wallet-pause behaviour can interrupt a live conversation.** A visitor's third reply hits zero balance and the chat goes offline mid-thread. Mitigation: pre-chat gate checks balance against a 50-cent threshold, not 0, so a single in-flight conversation always finishes even if it dips negative.
- **Lead caps locked-by-cap rows can grow unbounded if owner never tops up.** Mitigation: after 30 days unviewed and locked, archive them to a separate `archived_leads` table to keep the active dashboard fast.
- **Card-update R1 verification charge.** Some banks reject R1 as suspected fraud. Mitigation: clear in the UI that there will be a R1 hold which is refunded immediately; if it fails, fall back to PayFast's zero-amount tokenization if their merchant agreement allows.
- **VAT invoice numbering must be sequential per SARS.** A failed invoice generation in the ITN handler could create gaps. Mitigation: use a Postgres sequence dedicated to invoice numbers, generate the invoice number BEFORE generating the PDF, retry PDF generation independently if it fails.
- **Trial abuse via multiple signups.** Same person creates multiple accounts to extend the trial. Mitigation: phone verification at signup (out of scope for this spec) or simple email-domain rate limiting (low priority).

---

## Out of scope (named explicitly so future-me doesn't drift)

- BYOK (customer supplies own Anthropic API key). Considered for Phase 2 on Business+ tiers.
- Annual billing UI (existing 15% discount logic is reused, no changes to flows here)
- Promo codes
- Multi-currency support (ZAR only)
- Refund self-service (Phase 1: refunds happen via ops, recorded in `payfast_payments.refunded_at`)
- Multi-team/seat licensing
- Per-team invoice splitting

---

## Acceptance criteria

1. A new signup can complete trial → paid in under 60 seconds with the dashboard reflecting the new tier on refresh of `/dashboard`
2. An upgrade charges the correct proration, flips features within 10s of payment, and PayFast's stored token now charges the new tier amount at next renewal
3. A downgrade preserves access until period end and switches at renewal with the correct new grant
4. A top-up of leads or AI credit reflects in the dashboard on refresh within 10s of payment
5. A failed renewal triggers dunning emails and pauses the chat after 3 days
6. An expired trial pauses the chat (no API calls) and leaves the dashboard accessible
7. A replayed ITN does not double-credit any wallet or invoice
8. A pending payment older than 10 minutes is resolved by the reconcile cron within an hour
9. The weekly margin report shows ≥80% gross margin in every billing cycle
10. The chat runtime never makes an Anthropic call when `aiCreditTotalZarCents <= 50` cents in pause mode
