# Bundle Plans and Payments Design

**Date:** 2026-05-11
**Status:** Draft, pending implementation plan
**Owner:** Liam Clarke

## Problem

Qwikly currently ships two product lines as separate purchases:

- **Inbound**, the website digital assistant, with tiers `trial`, `starter`, `pro`, `business`, `enterprise`.
- **Outbound (Pipeline)**, hand-picked daily prospects, with tiers `pipeline_lite`, `pipeline_pro`.

This split creates four real problems for new customers:

1. The signup flow forces a "pick a product" decision the customer is not equipped to make on first visit.
2. The data model (`clients.plan` single column + `clients.products` array) cannot cleanly express a customer who has both products.
3. There is no live access flip on payment. A user who pays for Outbound has to refresh, log out, or wait.
4. Paystack has declined the merchant account, so the existing Paystack integration cannot ship to production. A new gateway is needed.

This spec collapses the two product lines into one bundled tier ladder, defines a new gateway choice, and specifies the live access flip.

## Decisions

### Plan ladder

One tier ladder, no product picker. Outbound is a Pro and up feature, not a separate product.

| Tier | Price (ZAR) | Inbound | Outbound | Daily prospects |
|---|---|---|---|---|
| Trial (7 days) | Free | Yes | No | , |
| Starter | R699/mo | Yes | No | , |
| Pro | R1,799/mo | Yes | Yes | 5 |
| Business | R3,999/mo | Yes | Yes | 10 |
| Enterprise | R7,999+/mo | Yes | Yes | Custom |

Annual billing retains the existing 15% discount.

`pipeline_lite` and `pipeline_pro` remain in the database as inactive rows so existing customers (if any) are not broken, but they are hidden from every new flow.

### Payment gateway

**Primary:** PayFast. SA-native, ZAR, recurring via tokenization, mature ITN webhook, most permissive approval of the SA gateways.

**Backup:** Paddle, merchant-of-record. Apply in parallel with PayFast. If both approve, ship PayFast first because it keeps you as the merchant of record and avoids the 5% Paddle take.

The existing Paystack integration is removed from active code paths but kept as dead code for one release in case of rollback need. All migrations, env vars, and webhook handlers tied to Paystack are renamed or deleted in the follow-up cleanup pass.

### Data model

The existing `clients.plan` column stays as the single source of truth. The `clients.products` array becomes derived from `clients.plan`:

```ts
function productsForPlan(plan: PlanTier): ('inbound' | 'outbound')[] {
  if (plan === 'trial' || plan === 'starter') return ['inbound'];
  return ['inbound', 'outbound'];
}
```

No new columns. The `pipeline_daily_quota` column already exists, its default is updated to reflect new tier limits (5 for Pro, 10 for Business).

### Access control

A single helper governs Outbound access across the dashboard and API:

```ts
function hasOutbound(plan: PlanTier): boolean {
  return plan === 'pro' || plan === 'business' || plan === 'enterprise';
}
```

This helper is called by:

- Dashboard route guards on `/dashboard/pipeline/*`
- API route guards on `/api/pipeline/*`
- The dashboard nav, to render the locked-state indicator on the Outbound nav item for Starter and Trial users

For Starter and Trial users hitting any Outbound page, the route renders the real page shell with a locked-state overlay. The overlay shows: a one-sentence explanation, the price of the cheapest upgrade tier (Pro at R1,799), and an "Upgrade to unlock" button that links straight to the payment flow.

The overlay does not block the user from seeing Outbound exists. It is a soft gate that doubles as upsell surface.

### Signup flow

1. Pricing page shows four tiers in one row: Starter, Pro, Business, Enterprise. Trial is offered separately as a "Try free for 7 days" CTA above the grid.
2. Customer clicks "Choose Pro" -> `/signup?plan=pro`.
3. Existing `/api/signup` route creates the Supabase user, `businesses` row, `subscriptions` row, and `clients` row. No changes to this route except dropping the special `productsForPlan` and `pipelineDailyQuotaForPlan` helpers that only existed for Pipeline tiers, replacing them with the single helper above.
4. After signup, paid plans redirect to PayFast hosted checkout. Trial plans redirect straight to `/dashboard/setup`.
5. PayFast checkout completes, redirects back to `/pay/success?ref=...`.
6. Success page calls `GET /api/subscription` once, forces a one-shot Supabase row reload, then renders the dashboard. The user sees their upgraded state within roughly one second of paying.

### Webhook and live access flip

PayFast posts ITN notifications to `/api/payfast/itn`. The handler:

1. Validates the ITN payload using PayFast's signature check.
2. Looks up the `payment_token` to find the matching pending subscription.
3. On `payment_status = COMPLETE`:
   - Updates `subscriptions.status = 'active'` and `subscriptions.plan = <new tier>`
   - Updates `clients.plan` and `clients.pipeline_daily_quota` to match
   - Updates `clients.products` array via the helper
4. On `payment_status = FAILED` or `CANCELLED`: marks subscription `past_due`, leaves `clients.plan` untouched (so the customer keeps their old access until their billing period actually ends).

Because Supabase is the source of truth and dashboard pages read it on every navigation, access flips on the user's next page load. No client cache invalidation needed.

### Trial behavior

Trial mirrors Starter on Inbound (30 leads/month, "Powered by Qwikly" footer, single user). Outbound is locked for trial users with the same overlay as Starter. After 7 days, the trial pauses the account (existing behavior, preserved). The dashboard shows a "Pick a plan to keep going" banner from day 5 onward, deep-linking to the pricing page with the recommended tier preselected.

### Promo codes

Out of scope for this spec. A `promos` table and a `clients.promo_code` column will be added in a follow-up spec when there is a confirmed promo to ship. Building this now is YAGNI.

## Migration plan

1. **Migration `20260512_bundle_plans.sql`**:
   - Sets `plan_prices.is_active = false` for `pipeline_lite` and `pipeline_pro`.
   - Updates `pipeline_daily_quota` defaults: 5 for Pro, 10 for Business, 0 for Starter and Trial.
   - Backfills any existing Pipeline-tier customers (if any) into the equivalent bundle tier and notifies them via email. Likely zero rows in production, but the migration is idempotent.

2. **Code changes**:
   - `src/lib/plan.ts`: remove `PipelinePlanTier`, fold Outbound flags into `PLAN_CONFIG`, expose `hasOutbound(plan)` and `productsForPlan(plan)`.
   - `src/app/api/signup/route.ts`: drop the local `productsForPlan` and `pipelineDailyQuotaForPlan` helpers, use the lib helpers.
   - Dashboard route guards: add the `hasOutbound` check on all `/dashboard/pipeline/*` pages.
   - API route guards: add the same check on all `/api/pipeline/*` routes.
   - New page: `src/components/pipeline/OutboundLockedOverlay.tsx` for the upsell overlay.

3. **Payment integration**:
   - New module `src/lib/payfast/` containing `checkout.ts` (build the redirect URL), `itn.ts` (validate the ITN signature).
   - New API route `src/app/api/payfast/itn/route.ts`.
   - New API route `src/app/api/payfast/checkout/route.ts`.
   - New page `src/app/pay/success/page.tsx`, replacing the current Paystack-flavored variant.
   - Existing Paystack files marked deprecated, removed in a follow-up cleanup PR after one release of stability.

4. **Pricing page collapse**:
   - `(landing)/pricing/page.tsx` shows the four-tier ladder with Outbound badges on Pro and up.
   - `(landing)/pipeline/page.tsx` becomes a marketing page that explains the Outbound feature, linking back to `/pricing`. It no longer has its own pricing.

## Risks and tradeoffs

- **Losing the cheap Outbound entry point**: removing Pipeline Lite as a standalone product means there is no Outbound-only option below R1,799. If we see meaningful demand from prospects who only want Outbound (unlikely, the data so far suggests Inbound is the entry use case), revisit.
- **PayFast approval risk**: PayFast can also decline AI/automation merchants, though less often than Paystack. Paddle is the fallback. If both decline, the spec needs a third option: Yoco Online.
- **Existing Pipeline customers**: low risk because production likely has zero Pipeline-only customers today. The migration is idempotent and the backfill path is explicit.
- **Soft gate vs hard gate on Outbound**: the soft-gate decision (show the page shell with an overlay) means a Starter user sees Outbound features they cannot use. This is intentional, it doubles as upsell surface. If it creates support burden ("why can't I click this"), tighten to a hard gate later.

## Out of scope

- Promo code system
- Annual billing UI changes (existing 15% discount logic is reused)
- Per-product cancellation flows (cancelling the bundle cancels both products by definition)
- Migrating away from Supabase auth or Resend email
- Adding a third or fourth product line in the future, that is a separate spec when it arises
