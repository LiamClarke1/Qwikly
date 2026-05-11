import type { InboundPlanTier } from "@/lib/plan";

/**
 * Per-plan starting AI conversation credit grant, in ZAR cents.
 *
 * Source: docs/superpowers/specs/2026-05-11-end-to-end-billing-design.md
 * § Plan grants (75% margin floor, even at planning wholesale).
 *
 * The dashboard usage meter compares the current wallet balance against
 * this value to decide whether to surface the "Running low — top up?"
 * banner (fires below 20% of the starting grant). Keeping the table here
 * lets the meter math stay synchronous on a server component without
 * an extra DB read.
 */
const STARTING_AI_GRANT_ZAR_CENTS: Record<InboundPlanTier, number> = {
  trial: 30_00,
  starter: 100_00,
  pro: 280_00,
  founders: 450_00,
  business: 650_00,
  enterprise: 1500_00,
  // Legacy Premium tier — same wholesale envelope as Business so the
  // grant matches what the entitlement reader currently provisions for
  // grandfathered subscribers.
  premium: 650_00,
};

export function startingAiGrantZarCents(tier: InboundPlanTier): number {
  return STARTING_AI_GRANT_ZAR_CENTS[tier] ?? 0;
}
