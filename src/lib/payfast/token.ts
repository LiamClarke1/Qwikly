import 'server-only';
import { getPayfastConfig } from './config';
import { generatePayfastSignature } from './signature';

function zarCentsToDecimal(cents: number): string {
  return (Math.round(cents) / 100).toFixed(2);
}

function timestampForSigning(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, '+00:00');
}

function signedHeaders(body: Record<string, string>): Record<string, string> {
  const cfg = getPayfastConfig();
  const headersForSig: Record<string, string> = {
    'merchant-id': cfg.merchantId,
    timestamp: timestampForSigning(),
    version: 'v1',
  };
  const signature = generatePayfastSignature(
    { ...headersForSig, ...body },
    cfg.passphrase,
  );
  return {
    ...headersForSig,
    signature,
    'content-type': 'application/x-www-form-urlencoded',
  };
}

export async function updateSubscriptionAmount(
  token: string,
  amount_zar_cents: number,
): Promise<void> {
  const cfg = getPayfastConfig();
  const body = { amount: zarCentsToDecimal(amount_zar_cents) };
  const res = await fetch(
    `${cfg.apiBaseUrl}/subscriptions/${encodeURIComponent(token)}/update`,
    {
      method: 'PUT',
      headers: signedHeaders(body),
      body: new URLSearchParams(body).toString(),
    },
  );
  if (!res.ok) throw new Error(`PayFast update failed: HTTP ${res.status}`);
}

export async function cancelSubscriptionToken(token: string): Promise<void> {
  const cfg = getPayfastConfig();
  const res = await fetch(
    `${cfg.apiBaseUrl}/subscriptions/${encodeURIComponent(token)}/cancel`,
    {
      method: 'PUT',
      headers: signedHeaders({}),
    },
  );
  if (!res.ok) throw new Error(`PayFast cancel failed: HTTP ${res.status}`);
}

export async function fetchPaymentByMPaymentId(m_payment_id: string): Promise<{
  status: 'pending' | 'success' | 'failed';
  pf_payment_id?: string;
} | null> {
  const cfg = getPayfastConfig();
  const res = await fetch(
    `${cfg.apiBaseUrl}/query/payment/${encodeURIComponent(m_payment_id)}`,
    {
      method: 'GET',
      headers: signedHeaders({}),
    },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`PayFast query failed: HTTP ${res.status}`);
  const json = await res.json();
  return {
    status: json?.data?.status ?? 'pending',
    pf_payment_id: json?.data?.pf_payment_id,
  };
}
