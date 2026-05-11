import { describe, it, expect, beforeEach, vi } from 'vitest';
import { chargeAdhoc } from '../adhoc';

describe('chargeAdhoc', () => {
  beforeEach(() => {
    process.env.PAYFAST_MERCHANT_ID = '10000100';
    process.env.PAYFAST_MERCHANT_KEY = '46f0cd694581a';
    process.env.PAYFAST_PASSPHRASE = 'jt7NOE43FZPn';
    process.env.PAYFAST_MODE = 'sandbox';
    process.env.PAYFAST_RETURN_URL = 'https://x';
    process.env.PAYFAST_CANCEL_URL = 'https://x';
    process.env.PAYFAST_NOTIFY_URL = 'https://x';
  });

  it('POSTs to /subscriptions/{token}/adhoc with signed payload', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        status: 'success',
        data: { response: { pf_payment_id: 'pf_999' } },
      }),
    });
    vi.stubGlobal('fetch', fetchSpy);

    const result = await chargeAdhoc({
      token: 'subtok_abc',
      amount_zar_cents: 25000,
      item_name: 'AI credit top-up R250',
      m_payment_id: 'mp_topup_1',
    });

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toContain('/subscriptions/subtok_abc/adhoc');
    expect(init.method).toBe('POST');
    expect(init.headers['merchant-id']).toBe('10000100');
    expect(init.headers['signature']).toMatch(/^[a-f0-9]{32}$/);
    expect(result.status).toBe('success');
    expect(result.pf_payment_id).toBe('pf_999');
  });

  it('returns failure on non-2xx response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ status: 'failed', message: 'Insufficient funds' }),
      }),
    );

    const result = await chargeAdhoc({
      token: 'subtok_abc',
      amount_zar_cents: 25000,
      item_name: 'x',
      m_payment_id: 'mp_topup_2',
    });

    expect(result.status).toBe('failed');
    expect(result.message).toContain('Insufficient');
  });
});
