//
// Hard-stop wholesale cap enforcement for Outbound Pipeline scraping.
// Each tier has a monthly ceiling on wholesale data spend (Google Places +
// Hunter). Before any scraper call that would push past the cap, the
// generator must abort with a 402-style "Top up to continue" response.
//
// Starting cap values are estimates per the spec; calibrate against the
// verification harness once it runs (see Task 27).

import { getMonthlyWholesaleCents } from "./pipeline-usage";

const CAP_CENTS_BY_PLAN: Record<string, number> = {
  // Bundle tiers
  pro:        25000,
  founders:   25000,
  business:   75000,
  enterprise: 200000,
  // Legacy pipeline tiers, kept for one release while the backfill rolls.
  pipeline_lite: 25000,
  pipeline_pro:  75000,
};

// Internal Qwikly tenants. Mirrors INTERNAL_CLIENT_IDS in pipeline-usage.ts.
// Calls for these tenants are tracked (is_internal=true) but bypass the
// plan-tier cap so Liam can run the wizard against his own Qwikly tenant
// without manually setting plan=pipeline_lite/pro on a trial row. Keep this
// list in sync with pipeline-usage.ts.
const INTERNAL_CLIENT_IDS = new Set<string>(["1"]);

// Effectively unlimited cap for internal tenants. High enough that no
// realistic test run hits it; low enough that a runaway loop still trips
// the check before bankrupting us. R100k = ~1.5M Google Places calls.
const INTERNAL_TENANT_CAP_CENTS = 10_000_000;

/** @deprecated Use InboundPlanTier from @/lib/plan. */
export type PipelinePlan = 'pro' | 'founders' | 'business' | 'enterprise';

export function wholesaleCapForPlan(plan: string): number {
  return CAP_CENTS_BY_PLAN[plan] ?? 0;
}

export interface OverCapInput {
  spentCents: number;
  projectedCents: number;
  capCents: number;
}

export function isOverCap(input: OverCapInput): boolean {
  return input.spentCents + input.projectedCents > input.capCents;
}

/**
 * Pull the running monthly spend for a tenant and compare against their
 * plan's cap. Returns `{ over: true, spentCents, capCents }` when the cap
 * is already hit, or when a projected call would push past it.
 *
 * Internal tenants (Qwikly's own client_id=1) bypass the plan lookup and
 * use the INTERNAL_TENANT_CAP_CENTS ceiling so wizard testing works
 * without manually setting plan=pipeline_lite/pipeline_pro on the row.
 */
export async function checkCapForTenant(args: {
  clientId: string | number;
  plan: string;
  projectedCents: number;
}): Promise<{ over: boolean; spentCents: number; capCents: number }> {
  const isInternal = INTERNAL_CLIENT_IDS.has(String(args.clientId));
  const capCents = isInternal
    ? INTERNAL_TENANT_CAP_CENTS
    : wholesaleCapForPlan(args.plan);
  const spentCents = await getMonthlyWholesaleCents(args.clientId);
  return {
    over: isOverCap({ spentCents, projectedCents: args.projectedCents, capCents }),
    spentCents,
    capCents,
  };
}
