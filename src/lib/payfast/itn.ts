import 'server-only';
import { getPayfastConfig, PAYFAST_IP_ALLOWLIST } from './config';
import { verifyPayfastSignature } from './signature';

export interface ItnValidationResult {
  valid: boolean;
  reason?: string;
}

export async function validateItn(
  payload: Record<string, string>,
  sourceIp: string,
  expectedAmountZarCents: number,
): Promise<ItnValidationResult> {
  const cfg = getPayfastConfig();

  // 1. Signature
  if (!verifyPayfastSignature(payload, cfg.passphrase)) {
    return { valid: false, reason: 'signature mismatch' };
  }

  // 2. Source IP (sandbox is more lenient; live MUST match allowlist)
  if (
    cfg.mode === 'live' &&
    !(PAYFAST_IP_ALLOWLIST as readonly string[]).includes(sourceIp)
  ) {
    return { valid: false, reason: `ip not allowed: ${sourceIp}` };
  }

  // 3. PayFast postback validate
  const formBody = Object.entries(payload)
    .filter(([k]) => k !== 'signature')
    .map(([k, v]) => `${k}=${encodeURIComponent(v).replace(/%20/g, '+')}`)
    .join('&');
  const res = await fetch(cfg.validateUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: formBody,
  });
  const text = (await res.text()).trim();
  if (text !== 'VALID') {
    return { valid: false, reason: `postback validate returned ${text}` };
  }

  // 4. Amount match (PayFast sends "699.00" decimal strings)
  const grossCents = Math.round(parseFloat(payload.amount_gross ?? '0') * 100);
  if (grossCents !== expectedAmountZarCents) {
    return {
      valid: false,
      reason: `amount mismatch: got ${grossCents}, expected ${expectedAmountZarCents}`,
    };
  }

  return { valid: true };
}
