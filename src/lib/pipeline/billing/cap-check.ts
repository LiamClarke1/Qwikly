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
  pipeline_lite: 25000, // R250
  pipeline_pro: 75000, // R750
};

export type PipelinePlan = "pipeline_lite" | "pipeline_pro";

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
 */
export async function checkCapForTenant(args: {
  clientId: string | number;
  plan: string;
  projectedCents: number;
}): Promise<{ over: boolean; spentCents: number; capCents: number }> {
  const capCents = wholesaleCapForPlan(args.plan);
  const spentCents = await getMonthlyWholesaleCents(args.clientId);
  return {
    over: isOverCap({ spentCents, projectedCents: args.projectedCents, capCents }),
    spentCents,
    capCents,
  };
}
