import { describe, it, expect } from 'vitest';
import { wholesaleCapForPlan } from '../cap-check';

describe('wholesaleCapForPlan, bundle tiers', () => {
  it('returns the Pro cap', () => {
    expect(wholesaleCapForPlan('pro')).toBe(25000);
  });
  it('returns the Founders cap (same as Pro)', () => {
    expect(wholesaleCapForPlan('founders')).toBe(25000);
  });
  it('returns the Business cap', () => {
    expect(wholesaleCapForPlan('business')).toBe(75000);
  });
  it('returns the Enterprise cap', () => {
    expect(wholesaleCapForPlan('enterprise')).toBe(200000);
  });
  it('returns 0 for inbound-only tiers', () => {
    expect(wholesaleCapForPlan('starter')).toBe(0);
    expect(wholesaleCapForPlan('trial')).toBe(0);
  });
  it('still resolves legacy pipeline_lite to the Pro cap', () => {
    expect(wholesaleCapForPlan('pipeline_lite')).toBe(25000);
  });
  it('still resolves legacy pipeline_pro to the Business cap', () => {
    expect(wholesaleCapForPlan('pipeline_pro')).toBe(75000);
  });
});
