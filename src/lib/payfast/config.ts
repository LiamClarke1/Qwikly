import 'server-only';

/**
 * PayFast static IP allowlist. PayFast does not publish a DNS-resolvable
 * list, so these are hardcoded from their official docs and reviewed on
 * every PayFast network change announcement.
 *
 * Source: https://developers.payfast.co.za/docs#notify_url
 */
export const PAYFAST_IP_ALLOWLIST = [
  '197.97.145.144',
  '197.97.145.145',
  '197.97.145.148',
  '197.97.145.149',
  '197.97.145.150',
  '197.97.145.151',
  '197.97.145.152',
  '197.97.145.153',
  '197.97.145.154',
  '197.97.145.155',
] as const;

export interface PayfastConfig {
  mode: 'sandbox' | 'live';
  merchantId: string;
  merchantKey: string;
  passphrase: string;
  processUrl: string;
  validateUrl: string;
  apiBaseUrl: string;
  returnUrl: string;
  cancelUrl: string;
  notifyUrl: string;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

export function getPayfastConfig(): PayfastConfig {
  const mode = (process.env.PAYFAST_MODE === 'live' ? 'live' : 'sandbox') as
    | 'sandbox'
    | 'live';
  const host = mode === 'live' ? 'www.payfast.co.za' : 'sandbox.payfast.co.za';
  return {
    mode,
    merchantId: requireEnv('PAYFAST_MERCHANT_ID'),
    merchantKey: requireEnv('PAYFAST_MERCHANT_KEY'),
    passphrase: requireEnv('PAYFAST_PASSPHRASE'),
    processUrl: `https://${host}/eng/process`,
    validateUrl: `https://${host}/eng/query/validate`,
    apiBaseUrl: `https://api.payfast.co.za`,
    returnUrl: requireEnv('PAYFAST_RETURN_URL'),
    cancelUrl: requireEnv('PAYFAST_CANCEL_URL'),
    notifyUrl: requireEnv('PAYFAST_NOTIFY_URL'),
  };
}
