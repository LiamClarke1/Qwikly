import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('payfast/config', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.PAYFAST_MERCHANT_ID = '10000100';
    process.env.PAYFAST_MERCHANT_KEY = '46f0cd694581a';
    process.env.PAYFAST_PASSPHRASE = 'jt7NOE43FZPn';
    process.env.PAYFAST_MODE = 'sandbox';
    process.env.PAYFAST_RETURN_URL = 'https://qwikly.co.za/pay/success';
    process.env.PAYFAST_CANCEL_URL = 'https://qwikly.co.za/pay/cancel';
    process.env.PAYFAST_NOTIFY_URL = 'https://qwikly.co.za/api/payfast/itn';
  });

  it('loads env in sandbox mode', async () => {
    const { getPayfastConfig } = await import('../config');
    const cfg = getPayfastConfig();
    expect(cfg.mode).toBe('sandbox');
    expect(cfg.processUrl).toBe('https://sandbox.payfast.co.za/eng/process');
    expect(cfg.validateUrl).toBe('https://sandbox.payfast.co.za/eng/query/validate');
    expect(cfg.merchantId).toBe('10000100');
  });

  it('switches URLs in live mode', async () => {
    process.env.PAYFAST_MODE = 'live';
    const { getPayfastConfig } = await import('../config');
    const cfg = getPayfastConfig();
    expect(cfg.processUrl).toBe('https://www.payfast.co.za/eng/process');
    expect(cfg.validateUrl).toBe('https://www.payfast.co.za/eng/query/validate');
  });

  it('throws when required env is missing', async () => {
    delete process.env.PAYFAST_MERCHANT_ID;
    const { getPayfastConfig } = await import('../config');
    expect(() => getPayfastConfig()).toThrow(/PAYFAST_MERCHANT_ID/);
  });

  it('exposes the static IP allowlist', async () => {
    const { PAYFAST_IP_ALLOWLIST } = await import('../config');
    expect(PAYFAST_IP_ALLOWLIST).toContain('197.97.145.144');
    expect(PAYFAST_IP_ALLOWLIST.length).toBeGreaterThanOrEqual(9);
  });
});
