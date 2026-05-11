import { describe, it, expect, beforeEach, vi } from 'vitest';
import { validateItn } from '../itn';
import { generatePayfastSignature } from '../signature';

const baseEnv = () => {
  process.env.PAYFAST_MERCHANT_ID = '10000100';
  process.env.PAYFAST_MERCHANT_KEY = 'k';
  process.env.PAYFAST_PASSPHRASE = 'p';
  process.env.PAYFAST_MODE = 'sandbox';
  process.env.PAYFAST_RETURN_URL = 'https://x';
  process.env.PAYFAST_CANCEL_URL = 'https://x';
  process.env.PAYFAST_NOTIFY_URL = 'https://x';
};

function signedPayload(fields: Record<string, string>): Record<string, string> {
  const sig = generatePayfastSignature(fields, 'p');
  return { ...fields, signature: sig };
}

describe('validateItn', () => {
  beforeEach(() => {
    baseEnv();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => 'VALID',
      }),
    );
  });

  it('rejects on signature mismatch', async () => {
    const payload = {
      merchant_id: '10000100',
      amount_gross: '699.00',
      signature: 'wrong',
    };
    const result = await validateItn(payload, '197.97.145.144', 69900);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/signature/i);
  });

  it('rejects on disallowed source IP', async () => {
    // Use live mode so IP allowlist enforcement is active.
    process.env.PAYFAST_MODE = 'live';
    const payload = signedPayload({
      merchant_id: '10000100',
      amount_gross: '699.00',
    });
    const result = await validateItn(payload, '1.2.3.4', 69900);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/ip/i);
  });

  it('rejects on amount mismatch', async () => {
    const payload = signedPayload({
      merchant_id: '10000100',
      amount_gross: '699.00',
    });
    const result = await validateItn(payload, '197.97.145.144', 100000);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/amount/i);
  });

  it('rejects when PayFast postback returns INVALID', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, text: async () => 'INVALID' }),
    );
    const payload = signedPayload({
      merchant_id: '10000100',
      amount_gross: '699.00',
    });
    const result = await validateItn(payload, '197.97.145.144', 69900);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/postback/i);
  });

  it('returns valid when all four checks pass', async () => {
    const payload = signedPayload({
      merchant_id: '10000100',
      amount_gross: '699.00',
    });
    const result = await validateItn(payload, '197.97.145.144', 69900);
    expect(result.valid).toBe(true);
  });
});
