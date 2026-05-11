/**
 * Inbound product tiers — the "digital assistant on your website" line of
 * Qwikly. These are the only tiers that flow through PLAN_CONFIG below,
 * because pricing/caps for Inbound are denser (lead caps, conversation caps,
 * branding flags, etc.) than for the Outbound Pipeline product.
 */
export type InboundPlanTier = 'trial' | 'starter' | 'pro' | 'founders' | 'business' | 'enterprise' | 'premium';

/** @deprecated Use InboundPlanTier. Pipeline tiers retired 2026-05-11. */
export type PipelinePlanTier = 'pipeline_lite' | 'pipeline_pro';

export type PlanTier = InboundPlanTier;

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
}

// Tier structure (2026-05-10, refined):
//   - trial      : 7-day free trial of the Starter tier (NOT full feature
//                  access). Same 30 lead cap, same "Powered by Qwikly"
//                  footer, same single-user limit. After 7 days the
//                  account pauses unless the owner picks a paid plan.
//                  Keeping trial = Starter prevents the misleading
//                  positioning of "trial on every plan" and the awkward
//                  cliff where a Pro-trial user loses custom branding
//                  the moment they have to pay.
//   - starter    : R699  · solo trades, individual agents, sole practitioners
//   - pro        : R1,799 · small multi-person practices, UNLOCKS custom
//                  branding (your logo, no Qwikly footer) so growing solos
//                  have a real reason to upgrade
//   - business   : R3,999 · multi-doctor / multi-agent / busy practices,
//                  adds CSV exports, unlimited users, priority support
//   - enterprise : R7,999+ · multi-location, full white-label, API, SLA
//   - premium    : LEGACY tier kept so existing R1,999 subscriptions keep
//                  resolving cleanly. New signups never land here.
//
// Lead caps tightened from the original sketch (50/200/600 → 30/100/400) so
// genuine growth nudges customers toward the next tier instead of letting
// them sit at Starter forever.
export const PLAN_CONFIG: Record<InboundPlanTier, PlanConfig> = {
  trial: {
    name: 'Trial',
    priceMonthly: 0,
    leadLimit: 30,
    // Trial mirrors Starter on branding/users/greeting. Conversation cap
    // is set at 10× the lead cap (300 = 30 leads × 10×) — enough for
    // typical honest trial use (7-8× × 30 leads + headroom) without the
    // unbounded R600 worst-case wholesale that would hit if we mirrored
    // Starter's full 20× cap. A 7-day trial is a taste, not a full
    // month. Worst-case wholesale per trial: 300 × R1 = R300.
    removeBranding: false,
    customGreeting: false,
    csvExport: false,
    apiAccess: false,
    supportTier: 'email',
    teamSeats: 1,
    responseSlaHours: 24,
    conversationsIncluded: 300,
    overageCentsPerConversation: 750,
    // Trial mirrors Starter top-up rate so a converted trial signup
    // doesn't see a price change in their first month past cap.
    topUpPricePerLeadZar: 23,
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
    leadLimit: 30,
    removeBranding: false,
    customGreeting: false,
    csvExport: false,
    apiAccess: false,
    supportTier: 'email',
    teamSeats: 1,
    responseSlaHours: 24,
    // 30 leads × 20× ratio = 600 conversations. Sized for the worst-
    // honest-case conversion rate (real-estate-style explore traffic) so
    // the customer NEVER hits the conversation cap before their lead
    // cap. Realistic utilisation (~7-8× × 30% of leads) sits at 10-15%
    // of cap → 90% margin in the typical month.
    conversationsIncluded: 600,
    overageCentsPerConversation: 750,
    // R23/lead matches the Starter in-plan effective rate (R699/30 =
    // R23.30), so a customer who goes one lead over pays the same per-
    // lead rate they were already paying — not a punitive flat overage.
    topUpPricePerLeadZar: 23,
  },
  pro: {
    name: 'Pro',
    priceMonthly: 1799,
    leadLimit: 100,
    removeBranding: true,
    customGreeting: true,
    csvExport: false,
    apiAccess: false,
    supportTier: 'email',
    teamSeats: 3,
    responseSlaHours: 12,
    // 100 leads × 20× = 2,000 conversations. Same explore-headroom as
    // Starter — Pro customers have similar conv:lead profiles, just
    // more volume.
    conversationsIncluded: 2000,
    overageCentsPerConversation: 750,
    // R20/lead vs R17.99 in-plan = ~11% nudge to upgrade rather than top
    // up indefinitely, but still close enough to the in-plan rate to not
    // feel punitive.
    topUpPricePerLeadZar: 20,
  },
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
  business: {
    name: 'Business',
    priceMonthly: 3999,
    leadLimit: 400,
    removeBranding: true,
    customGreeting: true,
    csvExport: true,
    apiAccess: false,
    supportTier: 'priority',
    teamSeats: null,
    responseSlaHours: 4,
    // 400 leads × 15× = 6,000 conversations. Slightly tighter ratio
    // than Starter/Pro because Business customers have proven volume
    // (the 15× still covers real-estate-style explore traffic). At
    // realistic utilisation (~30% × 7×) we sit at ~14% of cap, leaving
    // a comfortable margin profile.
    conversationsIncluded: 6000,
    overageCentsPerConversation: 750,
    // R12/lead vs R9.99 in-plan = ~20% nudge. Business customers tend
    // to top up rather than upgrade to Enterprise (which is custom-
    // priced), so the nudge keeps them honest about which tier they
    // actually need.
    topUpPricePerLeadZar: 12,
  },
  enterprise: {
    name: 'Enterprise',
    priceMonthly: 7999,
    leadLimit: 1500,
    removeBranding: true,
    customGreeting: true,
    csvExport: true,
    apiAccess: true,
    supportTier: 'dedicated',
    teamSeats: null,
    responseSlaHours: 1,
    // 1,500 leads × 15× = 22,500 conversations as the published starting
    // point. Enterprise is "from R7,999" with negotiated caps — actual
    // contracts get tuned per customer based on observed traffic. Cap is
    // generous enough that no honest Enterprise customer will trip it.
    conversationsIncluded: 22500,
    overageCentsPerConversation: 750,
    // R8/lead vs R5.33 in-plan = ~50% premium, but Enterprise is
    // negotiated anyway and overages above the published cap are
    // treated as a contract-renegotiation trigger.
    topUpPricePerLeadZar: 8,
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

// Tiers that appear on the public Inbound pricing page, in display order.
// 'premium' is intentionally absent — it's a legacy tier only. Pipeline tiers
// (pipeline_lite/pipeline_pro) have their own marketing page at /pipeline and
// are intentionally excluded from this list.
export const PUBLIC_TIERS: InboundPlanTier[] = ['starter', 'pro', 'founders', 'business', 'enterprise'];
