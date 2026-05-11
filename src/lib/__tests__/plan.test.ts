import { describe, it, expect } from 'vitest';
import { hasOutbound, productsForPlan, dailyProspectQuotaForPlan, PLAN_CONFIG, resolvePlan } from '../plan';

describe('hasOutbound', () => {
  it.each(['pro', 'founders', 'business', 'enterprise'] as const)(
    'returns true for %s',
    (plan) => {
      expect(hasOutbound(plan)).toBe(true);
    }
  );

  it.each(['trial', 'starter', 'premium'] as const)(
    'returns false for %s',
    (plan) => {
      expect(hasOutbound(plan)).toBe(false);
    }
  );
});

describe('productsForPlan', () => {
  it('returns inbound-only for trial and starter', () => {
    expect(productsForPlan('trial')).toEqual(['inbound']);
    expect(productsForPlan('starter')).toEqual(['inbound']);
  });

  it('returns inbound + outbound for pro and up', () => {
    expect(productsForPlan('pro')).toEqual(['inbound', 'outbound']);
    expect(productsForPlan('founders')).toEqual(['inbound', 'outbound']);
    expect(productsForPlan('business')).toEqual(['inbound', 'outbound']);
    expect(productsForPlan('enterprise')).toEqual(['inbound', 'outbound']);
  });
});

describe('dailyProspectQuotaForPlan', () => {
  it('returns 0 for inbound-only tiers', () => {
    expect(dailyProspectQuotaForPlan('trial')).toBe(0);
    expect(dailyProspectQuotaForPlan('starter')).toBe(0);
  });

  it('returns the bundle quotas', () => {
    expect(dailyProspectQuotaForPlan('pro')).toBe(5);
    expect(dailyProspectQuotaForPlan('founders')).toBe(5);
    expect(dailyProspectQuotaForPlan('business')).toBe(10);
  });

  it('returns 20 for enterprise', () => {
    expect(dailyProspectQuotaForPlan('enterprise')).toBe(20);
  });
});

describe('PLAN_CONFIG', () => {
  it('includes founders between pro and business', () => {
    expect(PLAN_CONFIG.founders.name).toBe('Founders Concierge');
    expect(PLAN_CONFIG.founders.priceMonthly).toBe(2999);
    expect(PLAN_CONFIG.founders.leadLimit).toBe(100);
  });
});

describe('resolvePlan', () => {
  it('recognises founders', () => {
    expect(resolvePlan('founders')).toBe('founders');
  });

  it('maps legacy pipeline_lite to pro', () => {
    expect(resolvePlan('pipeline_lite')).toBe('pro');
  });

  it('maps legacy pipeline_pro to business', () => {
    expect(resolvePlan('pipeline_pro')).toBe('business');
  });

  it('falls through unknown values to trial', () => {
    expect(resolvePlan('garbage')).toBe('trial');
    expect(resolvePlan(null)).toBe('trial');
    expect(resolvePlan(undefined)).toBe('trial');
  });
});
