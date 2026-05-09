import "server-only";
import { unstable_cache, revalidateTag } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-server";

/**
 * Plan prices in ZAR cents per month, fetched from the plan_prices table.
 *
 * Used as a FALLBACK when a client's clients.mrr_zar column is null or 0
 * (e.g. trial conversion not yet recorded, or admin forgot to set it). Real
 * mrr_zar always wins.
 *
 * Editable from /admin/settings/plans. Reads are cached with a tag, the
 * admin route revalidates that tag on every save.
 */
export const PLAN_PRICES_CACHE_TAG = "plan_prices";

export interface PlanPriceRow {
  id: string;
  plan_key: string;
  display_name: string;
  amount_zar_cents: number;
  billing_cadence: "monthly" | "annual";
  is_active: boolean;
  updated_at: string;
}

const fetchPlanPriceRows = unstable_cache(
  async (): Promise<PlanPriceRow[]> => {
    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("plan_prices")
      .select("id, plan_key, display_name, amount_zar_cents, billing_cadence, is_active, updated_at");
    if (error || !data) return [];
    return data as PlanPriceRow[];
  },
  ["plan_prices_all"],
  { tags: [PLAN_PRICES_CACHE_TAG] },
);

/**
 * Map of plan_key to amount in ZAR cents. Trial is hardcoded to 0, it is
 * never billed and intentionally absent from the plan_prices table.
 */
export async function getPlanPricesZarCents(): Promise<Record<string, number>> {
  const rows = await fetchPlanPriceRows();
  const map: Record<string, number> = { trial: 0 };
  for (const r of rows) {
    if (r.is_active) map[r.plan_key] = r.amount_zar_cents;
  }
  return map;
}

/**
 * All plan_prices rows, including inactive, for the admin settings UI.
 */
export async function listPlanPrices(): Promise<PlanPriceRow[]> {
  return await fetchPlanPriceRows();
}

/**
 * Invalidate the plan_prices cache. Called by the admin save route after a
 * successful update so the next read pulls fresh values.
 */
export function revalidatePlanPrices(): void {
  revalidateTag(PLAN_PRICES_CACHE_TAG);
}

/**
 * Get the effective monthly price (in cents) for a client.
 * Real mrr_zar wins. Falls back to plan price. Trial returns 0.
 */
export async function effectiveMrrCents(client: {
  mrr_zar: number | null;
  plan: string | null;
}): Promise<number> {
  if (client.mrr_zar && client.mrr_zar > 0) return client.mrr_zar;
  if (!client.plan) return 0;
  const prices = await getPlanPricesZarCents();
  return prices[client.plan] ?? 0;
}
