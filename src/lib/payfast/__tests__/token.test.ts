import { describe, it, expect, beforeEach, vi } from 'vitest';
import { updateSubscriptionAmount, cancelSubscriptionToken } from '../token';

describe('updateSubscriptionAmount', () => {
  beforeEach(() => {
    process.env.PAYFAST_MERCHANT_ID = '10000100';
    process.env.PAYFAST_MERCHANT_KEY = 'k';
    process.env.PAYFAST_PASSPHRASE = 'p';
    process.env.PAYFAST_MODE = 'sandbox';
    process.env.PAYFAST_RETURN_URL = 'https://x';
    process.env.PAYFAST_CANCEL_URL = 'https://x';
    process.env.PAYFAST_NOTIFY_URL = 'https://x';
  });

  it('PUTs to /subscriptions/{token}/update with new amount', async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ status: 'success' }) });
    vi.stubGlobal('fetch', fetchSpy);

    await updateSubscriptionAmount('subtok_abc', 179900);

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toContain('/subscriptions/subtok_abc/update');
    expect(init.method).toBe('PUT');
    expect(init.body).toContain('amount=1799.00');
  });
});

describe('cancelSubscriptionToken', () => {
  it('PUTs to /subscriptions/{token}/cancel', async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ status: 'success' }) });
    vi.stubGlobal('fetch', fetchSpy);

    await cancelSubscriptionToken('subtok_abc');

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toContain('/subscriptions/subtok_abc/cancel');
    expect(init.method).toBe('PUT');
  });
});
