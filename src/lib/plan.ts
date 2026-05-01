export type PlanTier = 'starter' | 'pro' | 'premium';

interface PlanConfig {
  name: string;
  priceMonthly: number;
  leadLimit: number | null;
  removeBranding: boolean;
  customGreeting: boolean;
  csvExport: boolean;
  whatsappRouting: boolean;
  calendarIntegration: boolean;
  apiAccess: boolean;
  supportTier: 'email' | 'priority' | 'dedicated';
}

export const PLAN_CONFIG: Record<PlanTier, PlanConfig> = {
  starter: {
    name: 'Starter',
    priceMonthly: 0,
    leadLimit: 25,
    removeBranding: false,
    customGreeting: false,
    csvExport: false,
    whatsappRouting: false,
    calendarIntegration: false,
    apiAccess: false,
    supportTier: 'email',
  },
  pro: {
    name: 'Pro',
    priceMonthly: 599,
    leadLimit: 200,
    removeBranding: true,
    customGreeting: true,
    csvExport: true,
    whatsappRouting: false,
    calendarIntegration: false,
    apiAccess: false,
    supportTier: 'priority',
  },
  premium: {
    name: 'Premium',
    priceMonthly: 1299,
    leadLimit: null,
    removeBranding: true,
    customGreeting: true,
    csvExport: true,
    whatsappRouting: true,
    calendarIntegration: true,
    apiAccess: true,
    supportTier: 'dedicated',
  },
};

export function resolvePlan(raw: string | null | undefined): PlanTier {
  if (raw === 'pro') return 'pro';
  if (raw === 'premium' || raw === 'business') return 'premium';
  if (raw === 'starter' || raw === 'lite') return 'starter';
  return 'starter';
}

export function nextRenewalDate(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

export const PLAN_TOP_UP_PRICE = 20;
export const PLAN_ANNUAL_DISCOUNT_MONTHS = 2;
