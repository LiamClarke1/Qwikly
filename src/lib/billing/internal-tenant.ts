// Single source of truth for which tenants are Qwikly's own internal tenants
// (Liam's marketing site, admin/QA accounts, etc.). Internal tenants:
//
//   - Have their cost rows tagged with is_internal=true so they roll out of
//     every billing aggregation (see api-usage.ts and pipeline-usage.ts).
//   - Bypass every monthly cap: lead cap, conversation cap, pipeline
//     wholesale cap. The admin needs to dogfood the product without being
//     blocked by limits sized for paying customers.
//
// Add a client_id here BEFORE running any QA tenant against production so
// its costs and quotas don't accidentally hit a real customer's billing
// total or trigger a cap-reached message in front of a visitor.

const IDS = new Set<string>([
  "1", // Qwikly's own marketing tenant — admin (liamclarke21@outlook.com)
]);

export function isInternalClientId(
  clientId: string | number | null | undefined,
): boolean {
  if (clientId == null) return false;
  return IDS.has(String(clientId));
}

/** Exposed for backwards compatibility with files that imported the raw set. */
export const INTERNAL_CLIENT_IDS = IDS;
