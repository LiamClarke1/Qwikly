/**
 * Inbound product tiers — the "digital assistant on your website" line of
 * Qwikly. These are the only tiers that flow through PLAN_CONFIG below,
 * because pricing/caps for Inbound are denser (lead caps, conversation caps,
 * branding flags, etc.) than for the Outbound Pipeline product.
 */
export type InboundPlanTier = 'trial' | 'starter' | 'pro' | 'founders' | 'business' | 'enterprise' | 'premium';

/**
 * Outbound (Pipeline) product tiers. Distinct from Inbound because they
 * don't share the PLAN_CONFIG model — Pipeline caps live in
 * src/lib/pipeline/billing/cap-check.ts (wholesale-cost ceilings) and the
 * daily prospect quota lives on clients.pipeline_daily_quota.
 */
export type PipelinePlanTier = 'pipeline_lite' | 'pipeline_pro';

/**
 * Union of every plan a signup can resolve to. Use this for UI surfaces
 * that render any plan card (signup page, dashboard plan badge). Use
 * InboundPlanTier directly when indexing into PLAN_CONFIG, since Pipeline
 * plans intentionally aren't in that config.
 */
export type PlanTier = InboundPlanTier | PipelinePlanTier;

interface PlanConfig {
  name: string;
  priceMonthly: number;
  leadLimit: number | null;
  removeBranding: boolean;
  customGreeting: boolean;
  csvExport: boolean;
  apiAccess: boolean;
  /** Higher tiers unlock priority email and faster response SLAs. */
  supportTier: 'email' | 'priority' | 'dedicated';
  /** Cap on team members allowed on the dashboard. null = unlimited. */
  teamSeats: number | null;
  /** First-response SLA in business hours, used to render the support copy. */
  responseSlaHours: number;
  /** Conversations bundled into the monthly subscription. Beyond this, the
   *  client either depletes top-up credits or hits the overage rate. */
  conversationsIncluded: number;
  /** Per-extra-conversation rate after the included quota AND credits run
   *  out. Charged in cents. Lower tiers pay more per overage; higher tiers
   *  get volume rates. */
  overageCentsPerConversation: number;
  /** Per-extra-lead top-up rate in ZAR. Sized at (or just above) each
   *  tier's effective in-plan per-lead rate so a customer who goes over
   *  their cap pays roughly what they were already paying — not a flat
   *  punitive overage that would penalise higher tiers (whose in-plan
   *  rate is much lower than R20/lead). */
  topUpPricePerLeadZar: number;
  /** Starting AI credit grant in ZAR cents, credited to the
   *  conversation_credits wallet on signup and reset on every renewal.
   *  Plan revenue covers the platform; AI use comes from this grant plus
   *  customer top-ups. See spec Section 1, plan-grants table. */
  startingGrantZarCents: number;
}

// Tier structure (2026-05-11, tightened for API cost control):
//   - trial      : 7-day taste of Starter. 15 leads, 150 conversation cap.
//   - starter    : R699  · 20 leads · solo trades, sole practitioners
//   - pro        : R1,799 · 50 leads · small teams, UNLOCKS custom branding
//   - founders   : R2,999 · 60 leads · Pro + 10 Outbound prospects/day
//   - business   : R3,999 · 200 leads · multi-agent, unlimited users
//   - enterprise : R7,999+ · 600 leads · multi-location, white-label, API
//   - premium    : LEGACY tier kept so existing R1,999 subscriptions keep
//                  resolving cleanly. New signups never land here.
//
// Lead caps reduced (100 → 50 on Pro, 400 → 200 on Business, etc.) to keep
// API costs inside healthy margins. The conversation cap is set at 20× the
// lead cap so no honest customer trips it before their lead cap.
export const PLAN_CONFIG: Record<InboundPlanTier, PlanConfig> = {
  trial: {
    name: 'Trial',
    priceMonthly: 0,
    leadLimit: 15,
    // Trial is a 7-day taste of Starter. 15 leads × 10× conservative ratio
    // = 150 conversations max. Worst-case wholesale: 150 × R1 = R150.
    removeBranding: false,
    customGreeting: false,
    csvExport: false,
    apiAccess: false,
    supportTier: 'email',
    teamSeats: 1,
    responseSlaHours: 24,
    conversationsIncluded: 150,
    overageCentsPerConversation: 750,
    topUpPricePerLeadZar: 35,
    // R30 loss-leader grant for 7-day window.
    startingGrantZarCents: 3000,
  },
  // Conversation caps are sized at the WORST-HONEST-CASE conv:lead ratio
  // (~20× for explore-heavy industries like real-estate) so an honest
  // customer never trips the conversation gate before their LEAD cap.
  // The public pricing page promises "curiosity is free, only paid leads
  // count" — that promise has to actually hold for every honest customer,
  // including the ones with high tire-kicker traffic.
  //
  // Caps stay internal: never displayed on the pricing page, dashboard,
  // or invoices. They exist purely as an abuse floor — a single tenant
  // running at >25× conv:lead is either bot traffic or a misconfigured
  // embed, both of which warrant a manual review rather than silent
  // billing.
  //
  // Wholesale planning constant: R1.00 (measured R0.74 + 33% buffer).
  // Realistic utilisation (~30% of leads, ~7-8× ratio) puts us at 10-15%
  // of the conversation cap → margin profile of 80-90% in the typical
  // case. Worst-case (full cap consumption) compresses margin sharply
  // and is treated as a billing-review trigger, not an expected state.
  starter: {
    name: 'Starter',
    priceMonthly: 699,
    leadLimit: 20,
    removeBranding: false,
    customGreeting: false,
    csvExport: false,
    apiAccess: false,
    supportTier: 'email',
    teamSeats: 1,
    responseSlaHours: 24,
    // 20 leads × 20× = 400 conversations. Covers worst-case explore
    // traffic while keeping API cost manageable on a R699 plan.
    conversationsIncluded: 400,
    overageCentsPerConversation: 750,
    // R35/lead matches Starter in-plan effective rate (R699/20 = R34.95).
    topUpPricePerLeadZar: 35,
    // R100 grant. Worst-case wholesale R37 at planning rate.
    startingGrantZarCents: 10000,
  },
  pro: {
    name: 'Pro',
    priceMonthly: 1799,
    leadLimit: 50,
    removeBranding: true,
    customGreeting: true,
    csvExport: false,
    apiAccess: false,
    supportTier: 'email',
    teamSeats: 3,
    responseSlaHours: 12,
    // 50 leads × 20× = 1,000 conversations. Keeps API cost well inside
    // margin on a R1,799 plan. Worst-case wholesale: R1,000 (planning rate).
    conversationsIncluded: 1000,
    overageCentsPerConversation: 750,
    // R36/lead vs R35.98 in-plan (R1799/50) — minimal nudge to upgrade.
    topUpPricePerLeadZar: 36,
    // R280 grant on R1,799 plan revenue. Covers ~280 typical conversations.
    startingGrantZarCents: 28000,
  },
  founders: {
    name: 'Founders',
    priceMonthly: 2999,
    leadLimit: 60,
    removeBranding: true,
    customGreeting: true,
    csvExport: false,
    apiAccess: false,
    supportTier: 'priority',
    teamSeats: 3,
    responseSlaHours: 4,
    // 60 leads × 20× = 1,200 conversations.
    conversationsIncluded: 1200,
    overageCentsPerConversation: 750,
    topUpPricePerLeadZar: 36,
    // R450 grant on R2,999 plan revenue.
    startingGrantZarCents: 45000,
  },
  business: {
    name: 'Business',
    priceMonthly: 3999,
    leadLimit: 200,
    removeBranding: true,
    customGreeting: true,
    csvExport: true,
    apiAccess: false,
    supportTier: 'priority',
    teamSeats: null,
    responseSlaHours: 4,
    // 200 leads × 20× = 4,000 conversations. Tightened from 400 leads
    // to keep API cost inside a healthy margin on a R3,999 plan.
    conversationsIncluded: 4000,
    overageCentsPerConversation: 750,
    // R20/lead vs R19.99 in-plan (R3999/200) — minimal nudge to upgrade.
    topUpPricePerLeadZar: 20,
    // R650 grant on R3,999 plan revenue.
    startingGrantZarCents: 65000,
  },
  enterprise: {
    name: 'Enterprise',
    priceMonthly: 7999,
    leadLimit: 600,
    removeBranding: true,
    customGreeting: true,
    csvExport: true,
    apiAccess: true,
    supportTier: 'dedicated',
    teamSeats: null,
    responseSlaHours: 1,
    // 600 leads × 20× = 12,000 conversations. Enterprise is negotiated;
    // actual caps are set per contract above this floor.
    conversationsIncluded: 12000,
    overageCentsPerConversation: 750,
    // R14/lead vs R13.33 in-plan (R7999/600) — minimal nudge.
    topUpPricePerLeadZar: 14,
    // R1,500 grant on R7,999 floor plan revenue.
    startingGrantZarCents: 150000,
  },
  // ── Legacy tier ───────────────────────────────────────────
  // Pre-2026-05-10 customers signed up at R1,999 with 250 leads + custom
  // branding. We keep the row so their existing Paystack subscriptions
  // continue resolving without breaking. Billing stays at R1,999 because
  // Paystack locks the amount to the original plan_code; the display
  // shows it as the legacy "Premium" tier in the dashboard.
  premium: {
    name: 'Premium (legacy)',
    priceMonthly: 1999,
    leadLimit: 250,
    removeBranding: true,
    customGreeting: true,
    csvExport: true,
    apiAccess: false,
    supportTier: 'priority',
    teamSeats: null,
    // Legacy cap kept for grandfathered customers — not adjusted under
    // the lead-ratio sizing because Premium is closed to new signups.
    conversationsIncluded: 400,
    overageCentsPerConversation: 750,
    responseSlaHours: 4,
    // Legacy Premium aligns with Business top-up rate (closest equivalent
    // tier in the new structure).
    topUpPricePerLeadZar: 12,
    // Legacy Premium grant matches Pro (closest equivalent in the new
    // grant structure). New signups never land here.
    startingGrantZarCents: 28000,
  },
};

/**
 * Resolves a raw plan string to the Inbound tier that drives PLAN_CONFIG.
 *
 * This function is the gateway to Inbound caps (lead limits, branding flags,
 * conversation quotas). Outbound caps (daily prospect quotas, etc.) are
 * resolved separately via dailyProspectQuotaForPlan and the clients.products
 * array, so this resolver only needs to land on the correct Inbound row.
 *
 * Legacy raw values 'pipeline_lite' and 'pipeline_pro' map to their bundle
 * equivalents — 'pro' and 'business' respectively — because the new pricing
 * model bundles Outbound (Pipeline) into Pro and above. A grandfathered
 * Pipeline customer therefore picks up the matching Inbound caps for the
 * tier their old Pipeline price now sits inside.
 *
 * All other unrecognized values fall through to 'trial' as a defensive
 * default, so an unknown or corrupted plan string can never accidentally
 * unlock a paid tier's caps.
 */
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

export function nextRenewalDate(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

/**
 * Resolve the top-up price (ZAR per extra lead) for a given plan tier.
 * Replaces the old flat PLAN_TOP_UP_PRICE = 20 — the flat rate punished
 * higher-tier customers (Business in-plan = R10/lead, so R20/lead overage
 * felt like a 100% surcharge). Tier-aware top-ups keep the per-lead rate
 * close to what the customer is already paying inside their plan.
 */
export function topUpPricePerLeadZar(tier: InboundPlanTier): number {
  return PLAN_CONFIG[tier].topUpPricePerLeadZar;
}

// 15% discount for annual billing
export const PLAN_ANNUAL_DISCOUNT_PCT = 0.15;

/**
 * MRR in ZAR cents for a given plan + billing cycle.
 * For annual billing the monthly-equivalent (annual / 12) is used so MRR
 * reflects what the customer effectively pays per month.
 * Trial always returns 0.
 */
export function mrrZarCents(tier: InboundPlanTier, billingCycle: string | null | undefined): number {
  const monthly = PLAN_CONFIG[tier].priceMonthly;
  if (monthly === 0) return 0;
  if (billingCycle === "annual") {
    // annual price / 12, rounded to whole cents
    return Math.round((monthly * 12 * (1 - PLAN_ANNUAL_DISCOUNT_PCT)) / 12) * 100;
  }
  return monthly * 100;
}

export function annualPrice(monthlyPrice: number): number {
  return Math.round(monthlyPrice * 12 * (1 - PLAN_ANNUAL_DISCOUNT_PCT));
}

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
      return 5;
    case 'founders':
      return 10;
    case 'business':
      return 10;
    case 'enterprise':
      return 20;
    default:
      return 0;
  }
}

// Tiers that appear on the public Inbound pricing page, in display order.
// 'premium' is intentionally absent — it's a legacy tier only. Pipeline tiers
// (pipeline_lite/pipeline_pro) have their own marketing page at /pipeline and
// are intentionally excluded from this list.
export const PUBLIC_TIERS: InboundPlanTier[] = ['starter', 'pro', 'founders', 'business', 'enterprise'];

/**
 * Starting AI credit grant for a given plan, in ZAR cents. Credited to the
 * conversation_credits wallet on signup and reset on every renewal. See the
 * end-to-end billing spec (Section 1, plan-grants table) for the rationale
 * behind each tier's number.
 */
export function startingGrantZarCents(tier: InboundPlanTier): number {
  return PLAN_CONFIG[tier].startingGrantZarCents;
}
