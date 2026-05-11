import 'server-only';
import { getPayfastConfig } from './config';
import { generatePayfastSignature } from './signature';
import type { AdhocChargeParams, AdhocChargeResponse } from './types';

function zarCentsToDecimal(cents: number): string {
  return (Math.round(cents) / 100).toFixed(2);
}

function timestampForSigning(): string {
  // PayFast API requires ISO-8601 with seconds precision in UTC.
  return new Date().toISOString().replace(/\.\d{3}Z$/, '+00:00');
}

/**
 * Charge an existing PayFast subscription token for an arbitrary amount.
 * Used for top-ups and upgrade proration.
 */
export async function chargeAdhoc(
  params: AdhocChargeParams,
): Promise<AdhocChargeResponse> {
  const cfg = getPayfastConfig();
  const timestamp = timestampForSigning();

  const body: Record<string, string> = {
    amount: zarCentsToDecimal(params.amount_zar_cents),
    item_name: params.item_name,
    m_payment_id: params.m_payment_id,
  };

  // PayFast API auth: sign all body params + 'merchant-id' header + 'timestamp' header
  // with the passphrase. See https://developers.payfast.co.za/api#tag/Subscriptions.
  const headersForSig: Record<string, string> = {
    'merchant-id': cfg.merchantId,
    timestamp,
    version: 'v1',
  };
  const allFields = { ...headersForSig, ...body };
  const signature = generatePayfastSignature(allFields, cfg.passphrase);

  const formBody = new URLSearchParams(body).toString();

  const url = `${cfg.apiBaseUrl}/subscriptions/${encodeURIComponent(
    params.token,
  )}/adhoc`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...headersForSig,
      signature,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: formBody,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.status === 'failed') {
    return {
      status: 'failed',
      message: json?.message ?? `HTTP ${res.status}`,
    };
  }

  return {
    status: 'success',
    pf_payment_id: json?.data?.response?.pf_payment_id ?? json?.pf_payment_id,
  };
}
