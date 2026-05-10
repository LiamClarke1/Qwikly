export type PlanTier = 'trial' | 'starter' | 'pro' | 'business' | 'enterprise' | 'premium';

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
export const PLAN_CONFIG: Record<PlanTier, PlanConfig> = {
  trial: {
    name: 'Trial',
    priceMonthly: 0,
    leadLimit: 30,
    // Trial mirrors Starter exactly: same branding (Powered by Qwikly),
    // same single user, same lack of custom greeting. So a trial user
    // experiences what they will actually keep paying R699 for.
    removeBranding: false,
    customGreeting: false,
    csvExport: false,
    apiAccess: false,
    supportTier: 'email',
    teamSeats: 1,
    responseSlaHours: 24,
    conversationsIncluded: 200,
    overageCentsPerConversation: 300,
  },
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
    conversationsIncluded: 200,
    overageCentsPerConversation: 300,
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
    conversationsIncluded: 700,
    overageCentsPerConversation: 250,
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
    conversationsIncluded: 2500,
    overageCentsPerConversation: 200,
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
    conversationsIncluded: 10000,
    overageCentsPerConversation: 150,
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
    conversationsIncluded: 1500,
    overageCentsPerConversation: 250,
    responseSlaHours: 4,
  },
};

export function resolvePlan(raw: string | null | undefined): PlanTier {
  if (raw === 'trial') return 'trial';
  if (raw === 'starter' || raw === 'lite') return 'starter';
  if (raw === 'pro') return 'pro';
  if (raw === 'business') return 'business';
  if (raw === 'enterprise') return 'enterprise';
  // Backward compat: existing 'premium' subscriptions resolve to the legacy
  // tier (kept above) so billing + caps stay correct for grandfathered users.
  if (raw === 'premium') return 'premium';
  return 'trial';
}

export function nextRenewalDate(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

// R20 per extra lead above plan cap
export const PLAN_TOP_UP_PRICE = 20;

// 15% discount for annual billing
export const PLAN_ANNUAL_DISCOUNT_PCT = 0.15;

export function annualPrice(monthlyPrice: number): number {
  return Math.round(monthlyPrice * 12 * (1 - PLAN_ANNUAL_DISCOUNT_PCT));
}

// Tiers that appear on the public pricing page, in display order.
// 'premium' is intentionally absent — it's a legacy tier only.
export const PUBLIC_TIERS: PlanTier[] = ['starter', 'pro', 'business', 'enterprise'];
