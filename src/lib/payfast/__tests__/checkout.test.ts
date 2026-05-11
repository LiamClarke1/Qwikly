import { describe, it, expect, beforeEach } from 'vitest';
import { buildCheckoutUrl } from '../checkout';

describe('buildCheckoutUrl', () => {
  beforeEach(() => {
    process.env.PAYFAST_MERCHANT_ID = '10000100';
    process.env.PAYFAST_MERCHANT_KEY = '46f0cd694581a';
    process.env.PAYFAST_PASSPHRASE = 'jt7NOE43FZPn';
    process.env.PAYFAST_MODE = 'sandbox';
    process.env.PAYFAST_RETURN_URL = 'https://qwikly.co.za/pay/success';
    process.env.PAYFAST_CANCEL_URL = 'https://qwikly.co.za/pay/cancel';
    process.env.PAYFAST_NOTIFY_URL = 'https://qwikly.co.za/api/payfast/itn';
  });

  it('builds a sandbox URL for a one-off charge', () => {
    const url = buildCheckoutUrl({
      m_payment_id: 'mp_001',
      amount_zar_cents: 69900,
      item_name: 'Qwikly Starter',
      client_id: 42,
      purpose: 'subscription_setup',
      recurring: false,
    });

    expect(url).toContain('sandbox.payfast.co.za/eng/process');
    expect(url).toContain('amount=699.00');
    expect(url).toContain('m_payment_id=mp_001');
    expect(url).toContain('custom_str1=42');
    expect(url).toContain('custom_str3=subscription_setup');
    expect(url).toContain('signature=');
  });

  it('includes recurring fields when recurring=true', () => {
    const url = buildCheckoutUrl({
      m_payment_id: 'mp_002',
      amount_zar_cents: 69900,
      item_name: 'Qwikly Starter',
      client_id: 42,
      purpose: 'subscription_setup',
      recurring: true,
      recurring_amount_zar_cents: 69900,
      billing_date: '2026-06-11',
    });

    expect(url).toContain('subscription_type=1');
    expect(url).toContain('billing_date=2026-06-11');
    expect(url).toContain('recurring_amount=699.00');
    expect(url).toContain('frequency=3'); // monthly
    expect(url).toContain('cycles=0'); // until cancelled
  });

  it('formats decimal amounts correctly', () => {
    const url = buildCheckoutUrl({
      m_payment_id: 'mp_003',
      amount_zar_cents: 12345,
      item_name: 'Test',
      client_id: 1,
      purpose: 'topup_ai_credit',
      recurring: false,
    });
    expect(url).toContain('amount=123.45');
  });
});
