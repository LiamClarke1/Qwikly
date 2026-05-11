import 'server-only';
import { createHash } from 'node:crypto';

/**
 * Build a PayFast-canonical query string from a field map.
 *
 * PayFast's signing protocol:
 *  - Field order = the order they appear in the request (NOT alphabetical)
 *  - Skip empty values entirely
 *  - URL-encode values; spaces become '+' (application/x-www-form-urlencoded style)
 */
export function canonicalizeFields(
  fields: Record<string, string | undefined>,
): string {
  return Object.entries(fields)
    .filter(([, v]) => v != null && v !== '')
    .map(
      ([k, v]) =>
        `${k}=${encodeURIComponent(String(v)).replace(/%20/g, '+')}`,
    )
    .join('&');
}

export function generatePayfastSignature(
  fields: Record<string, string | undefined>,
  passphrase: string,
): string {
  const canonical = canonicalizeFields(fields);
  const withPassphrase = passphrase
    ? `${canonical}&passphrase=${encodeURIComponent(passphrase).replace(
        /%20/g,
        '+',
      )}`
    : canonical;
  return createHash('md5').update(withPassphrase).digest('hex');
}

export function verifyPayfastSignature(
  fieldsWithSignature: Record<string, string | undefined>,
  passphrase: string,
): boolean {
  const { signature, ...rest } = fieldsWithSignature;
  if (!signature || typeof signature !== 'string') return false;
  const expected = generatePayfastSignature(rest, passphrase);
  return timingSafeEqual(expected, signature);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
