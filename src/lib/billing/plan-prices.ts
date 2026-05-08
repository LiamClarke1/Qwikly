/**
 * Plan prices in ZAR cents per month.
 *
 * Used as a FALLBACK when a client's `mrr_zar` column is null or 0 (e.g. trial
 * conversion not yet recorded, or admin forgot to set it). Real `mrr_zar` always
 * wins.
 *
 * EDIT THESE VALUES to match your actual subscription pricing. The placeholders
 * below are sensible South African SaaS guesses, NOT confirmed prices. Until
 * you replace them, the Pipeline forecast for any client without an explicit
 * mrr_zar will show these numbers.
 *
 * Stored in cents (integer) to match clients.mrr_zar convention.
 */
export const PLAN_PRICES_ZAR_CENTS: Record<string, number> = {
  trial:    0,
  starter:  29900,    // R299/month  -- placeholder
  pro:      69900,    // R699/month  -- placeholder
  premium:  149900,   // R1,499/month -- placeholder
  billions: 399900,   // R3,999/month -- placeholder
};

/**
 * Get the effective monthly price (in cents) for a client.
 * Real mrr_zar wins. Falls back to plan price. Trial returns 0.
 */
export function effectiveMrrCents(client: { mrr_zar: number | null; plan: string | null }): number {
  if (client.mrr_zar && client.mrr_zar > 0) return client.mrr_zar;
  if (!client.plan) return 0;
  return PLAN_PRICES_ZAR_CENTS[client.plan] ?? 0;
}
