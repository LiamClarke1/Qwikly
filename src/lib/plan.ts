export type PlanTier = 'trial' | 'starter' | 'pro' | 'premium' | 'billions';

interface PlanConfig {
  name: string;
  priceMonthly: number;
  leadLimit: number | null;
  removeBranding: boolean;
  customGreeting: boolean;
  csvExport: boolean;
  calendarIntegration: boolean;
  apiAccess: boolean;
  supportTier: 'email' | 'priority' | 'dedicated';
}

export const PLAN_CONFIG: Record<PlanTier, PlanConfig> = {
  trial: {
    name: 'Trial',
    priceMonthly: 0,
    leadLimit: 25,
    removeBranding: true,
    customGreeting: true,
    csvExport: true,
    calendarIntegration: false,
    apiAccess: false,
    supportTier: 'priority',
  },
  starter: {
    name: 'Starter',
    priceMonthly: 399,
    leadLimit: 75,
    removeBranding: false,
    customGreeting: false,
    csvExport: false,
    calendarIntegration: false,
    apiAccess: false,
    supportTier: 'email',
  },
  pro: {
    name: 'Pro',
    priceMonthly: 999,
    leadLimit: 250,
    removeBranding: true,
    customGreeting: true,
    csvExport: true,
    calendarIntegration: false,
    apiAccess: false,
    supportTier: 'priority',
  },
  premium: {
    name: 'Premium',
    priceMonthly: 2499,
    leadLimit: 1000,
    removeBranding: true,
    customGreeting: true,
    csvExport: true,
    calendarIntegration: true,
    apiAccess: true,
    supportTier: 'dedicated',
  },
  billions: {
    name: 'Billions',
    priceMonthly: 4999,
    leadLimit: 5000,
    removeBranding: true,
    customGreeting: true,
    csvExport: true,
    calendarIntegration: true,
    apiAccess: true,
    supportTier: 'dedicated',
  },
};

export function resolvePlan(raw: string | null | undefined): PlanTier {
  if (raw === 'trial') return 'trial';
  if (raw === 'pro') return 'pro';
  if (raw === 'premium' || raw === 'business') return 'premium';
  if (raw === 'starter' || raw === 'lite') return 'starter';
  if (raw === 'billions') return 'billions';
  return 'starter';
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
