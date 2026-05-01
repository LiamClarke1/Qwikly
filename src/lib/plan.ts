export type PlanTier = 'lite' | 'pro' | 'business';

interface PlanConfig {
  name: string;
  priceMonthly: number;
  bookingLimit: number | null;
  noShowRecovery: boolean;
  webWidget: boolean;
  calendarSync: boolean;
  performanceReport: boolean;
  teamAccounts: boolean;
  customBranding: boolean;
  apiAccess: boolean;
}

export const PLAN_CONFIG: Record<PlanTier, PlanConfig> = {
  lite: {
    name: 'Lite',
    priceMonthly: 399,
    bookingLimit: 25,
    noShowRecovery: false,
    webWidget: false,
    calendarSync: false,
    performanceReport: false,
    teamAccounts: false,
    customBranding: false,
    apiAccess: false,
  },
  pro: {
    name: 'Pro',
    priceMonthly: 799,
    bookingLimit: null,
    noShowRecovery: true,
    webWidget: true,
    calendarSync: true,
    performanceReport: true,
    teamAccounts: false,
    customBranding: false,
    apiAccess: false,
  },
  business: {
    name: 'Business',
    priceMonthly: 1499,
    bookingLimit: null,
    noShowRecovery: true,
    webWidget: true,
    calendarSync: true,
    performanceReport: true,
    teamAccounts: true,
    customBranding: true,
    apiAccess: true,
  },
};

export function resolvePlan(raw: string | null | undefined): PlanTier {
  if (raw === 'pro') return 'pro';
  if (raw === 'business') return 'business';
  return 'lite';
}

export function nextRenewalDate(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}
