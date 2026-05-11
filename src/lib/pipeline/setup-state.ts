// Pipeline setup state, server-side helpers.
//
// The Pipeline product no longer has a multi-step wizard. The only thing a
// client configures is their Ideal Customer Profile (ICP). Sending domains,
// copy approvals, and launch readiness are internal infrastructure concerns
// that Liam handles invisibly, so they have been removed from the state shape.

import { supabaseAdmin } from "@/lib/supabase-server";

export type PipelineSetupStatus = "pending" | "generated" | "refreshing";

export interface IcpDefinition {
  offer: string;
  industries: string[];
  titles: string[];
  sizeMin: number;
  sizeMax: number;
  locations: string[];
  intentSignals: string[];
  dealValueZar: number;
}

export interface PipelineSetupState {
  icp: IcpDefinition;
  status: PipelineSetupStatus;
  last_generated_at: string | null;
}

export const DEFAULT_ICP: IcpDefinition = {
  offer: "",
  industries: [],
  titles: [],
  sizeMin: 5,
  sizeMax: 50,
  locations: [],
  intentSignals: [],
  dealValueZar: 20000,
};

export function emptySetupState(): PipelineSetupState {
  return {
    icp: { ...DEFAULT_ICP },
    status: "pending",
    last_generated_at: null,
  };
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function asNumber(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function normalize(raw: unknown): PipelineSetupState {
  const base = emptySetupState();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Record<string, unknown>;

  const icpRaw = (r.icp && typeof r.icp === "object" ? r.icp : {}) as Record<string, unknown>;

  // Migrate legacy field names (name, job_titles, company_size_min,
  // company_size_max, pain_point, value_prop) into the new shape if present.
  const offerCandidate =
    typeof icpRaw.offer === "string"
      ? icpRaw.offer
      : typeof icpRaw.value_prop === "string"
        ? icpRaw.value_prop
        : "";

  const titlesCandidate = Array.isArray(icpRaw.titles)
    ? asStringArray(icpRaw.titles)
    : asStringArray(icpRaw.job_titles);

  const sizeMin = asNumber(icpRaw.sizeMin, asNumber(icpRaw.company_size_min, DEFAULT_ICP.sizeMin));
  const sizeMax = asNumber(icpRaw.sizeMax, asNumber(icpRaw.company_size_max, DEFAULT_ICP.sizeMax));

  const statusRaw = r.status;
  const status: PipelineSetupStatus =
    statusRaw === "generated" || statusRaw === "refreshing" ? statusRaw : "pending";

  return {
    icp: {
      offer: offerCandidate,
      industries: asStringArray(icpRaw.industries),
      titles: titlesCandidate,
      sizeMin,
      sizeMax,
      locations: asStringArray(icpRaw.locations),
      intentSignals: asStringArray(icpRaw.intentSignals),
      dealValueZar: asNumber(icpRaw.dealValueZar, DEFAULT_ICP.dealValueZar),
    },
    status,
    last_generated_at: typeof r.last_generated_at === "string" ? r.last_generated_at : null,
  };
}

/**
 * Read setup state for a business. The single source of truth is the
 * `pipeline_setup_state` table from 20260510_pipeline_platform.sql, keyed by
 * business_id (UUID), with the ICP stored in its own JSONB column. The
 * 20260511_outbound_v1_setup_state_fix.sql migration added last_generated_at
 * and widened the status CHECK constraint.
 *
 * Callers MUST pass a business_id (UUID), not clients.id (BIGINT). The two
 * are different tenant keys. Resolve businesses.id via auth.uid() ↔ user_id
 * before calling.
 *
 * Fail-soft: returns the default state on any error so the UI never throws.
 */
export async function getSetupState(tenantId: string | number): Promise<PipelineSetupState> {
  const db = supabaseAdmin();

  try {
    const { data, error } = await db
      .from("pipeline_setup_state")
      .select("icp, status, last_generated_at")
      .eq("business_id", tenantId)
      .maybeSingle();
    if (error || !data) return emptySetupState();
    return normalize({
      icp: (data as { icp?: unknown }).icp,
      status: (data as { status?: unknown }).status,
      last_generated_at: (data as { last_generated_at?: unknown }).last_generated_at,
    });
  } catch {
    return emptySetupState();
  }
}

/**
 * Merge a partial update into the business's setup state. Reads, mutates,
 * writes via upsert on the pipeline_setup_state.business_id UNIQUE
 * constraint. Returns the next state regardless of whether persistence
 * succeeded so callers can render optimistically.
 */
export async function updateSetupState(
  tenantId: string | number,
  partial: Partial<PipelineSetupState>,
): Promise<PipelineSetupState> {
  const current = await getSetupState(tenantId);
  const next: PipelineSetupState = {
    ...current,
    ...partial,
    icp: partial.icp ? { ...current.icp, ...partial.icp } : current.icp,
  };

  const db = supabaseAdmin();
  try {
    await db
      .from("pipeline_setup_state")
      .upsert(
        {
          business_id: tenantId,
          icp: next.icp,
          status: next.status,
          last_generated_at: next.last_generated_at,
        },
        { onConflict: "business_id" },
      );
  } catch {
    // soft fail, state is still returned to caller
  }

  return next;
}
