import { supabaseAdmin } from "@/lib/supabase-server";
import { isInternalClientId } from "@/lib/billing/internal-tenant";

// Wholesale USD rates per request, sourced from each provider's published pricing.
// Update when providers ship price changes.
//   Google Places: https://developers.google.com/maps/billing-and-pricing/pricing
//   Hunter: https://hunter.io/api
const PRICE_USD_PER_REQUEST: Record<string, Record<string, number>> = {
  google_places: {
    text_search: 0.032,
    place_details: 0.017,
    find_place: 0.017,
  },
  hunter: {
    email_finder: 0.098,
    email_verifier: 0.02,
  },
};

const USD_ZAR_RATE = 18.5;

export interface PipelineCallSpec {
  provider: "google_places" | "hunter";
  endpoint: string;
  units?: number;
}

export interface PipelineCallCost {
  wholesaleCents: number;
}

export function computePipelineCallCost(spec: PipelineCallSpec): PipelineCallCost {
  const usdPerUnit = PRICE_USD_PER_REQUEST[spec.provider]?.[spec.endpoint] ?? 0;
  const units = spec.units ?? 1;
  // Ceil per-unit so per-request billing matches the published rate, then scale.
  const centsPerUnit = Math.ceil(usdPerUnit * USD_ZAR_RATE * 100);
  const cents = centsPerUnit * units;
  return { wholesaleCents: cents };
}

export interface RecordPipelineUsageInput {
  clientId: string | number | null | undefined;
  provider: "google_places" | "hunter";
  endpoint: string;
  units?: number;
}

/**
 * Insert one row into pipeline_api_usage. Fire-and-forget. Failures
 * must never break the scraper or wizard. Mirrors api-usage.ts.
 */
export async function recordPipelineUsage(input: RecordPipelineUsageInput): Promise<void> {
  if (input.clientId == null) return;
  const isInternal = isInternalClientId(input.clientId);

  const { wholesaleCents } = computePipelineCallCost({
    provider: input.provider,
    endpoint: input.endpoint,
    units: input.units,
  });

  try {
    const db = supabaseAdmin();
    await db.from("pipeline_api_usage").insert({
      client_id: input.clientId,
      provider: input.provider,
      endpoint: input.endpoint,
      unit_count: input.units ?? 1,
      wholesale_cost_zar_cents: wholesaleCents,
      is_internal: isInternal,
    });
  } catch (err) {
    console.error("[pipeline-usage] insert failed", err);
  }
}

/**
 * Sum a tenant's wholesale spend in the current billing period.
 * Used by cap-check.ts before each scraper call.
 */
export async function getMonthlyWholesaleCents(clientId: string | number): Promise<number> {
  try {
    const db = supabaseAdmin();
    const period = new Date();
    period.setUTCDate(1);
    period.setUTCHours(0, 0, 0, 0);
    const periodIso = period.toISOString().slice(0, 10);

    const { data, error } = await db
      .from("pipeline_api_usage")
      .select("wholesale_cost_zar_cents")
      .eq("client_id", clientId)
      .eq("billing_period", periodIso);
    if (error || !data) return 0;
    return data.reduce(
      (acc, row) => acc + (row as { wholesale_cost_zar_cents: number }).wholesale_cost_zar_cents,
      0,
    );
  } catch {
    return 0;
  }
}
