import 'server-only';
import { getPayfastConfig } from './config';
import { generatePayfastSignature } from './signature';
import type { CheckoutParams } from './types';

function zarCentsToDecimal(cents: number): string {
  const rands = Math.round(cents) / 100;
  return rands.toFixed(2);
}

export function buildCheckoutUrl(params: CheckoutParams): string {
  const cfg = getPayfastConfig();

  // Field order matters for signing. PayFast's documented order:
  // merchant_id, merchant_key, return_url, cancel_url, notify_url,
  // email_address, m_payment_id, amount, item_name, item_description,
  // custom_str1..5, subscription_type, billing_date, recurring_amount,
  // frequency, cycles.
  const fields: Record<string, string | undefined> = {
    merchant_id: cfg.merchantId,
    merchant_key: cfg.merchantKey,
    return_url: cfg.returnUrl,
    cancel_url: cfg.cancelUrl,
    notify_url: cfg.notifyUrl,
    email_address: params.email_address,
    m_payment_id: params.m_payment_id,
    amount: zarCentsToDecimal(params.amount_zar_cents),
    item_name: params.item_name,
    item_description: params.item_description,
    custom_str1: String(params.client_id),
    custom_str2:
      params.subscription_id != null ? String(params.subscription_id) : undefined,
    custom_str3: params.purpose,
  };

  if (params.recurring) {
    fields.subscription_type = '1';
    if (params.billing_date) fields.billing_date = params.billing_date;
    if (params.recurring_amount_zar_cents != null) {
      fields.recurring_amount = zarCentsToDecimal(
        params.recurring_amount_zar_cents,
      );
    }
    fields.frequency = '3'; // 3 = monthly
    fields.cycles = '0'; // 0 = until cancelled
  }

  const signature = generatePayfastSignature(fields, cfg.passphrase);

  const qs = Object.entries(fields)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');

  return `${cfg.processUrl}?${qs}&signature=${signature}`;
}
