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
 * Read setup state for a tenant. Tries the JSONB column on clients first,
 * then a dedicated pipeline_setup_state table, then returns a default state.
 * Fail-soft on every error so the page renders even before any migration
 * has been applied.
 */
export async function getSetupState(tenantId: string | number): Promise<PipelineSetupState> {
  const db = supabaseAdmin();

  // Path A: JSONB column on clients.
  try {
    const { data, error } = await db
      .from("clients")
      .select("pipeline_setup_state")
      .eq("id", tenantId)
      .maybeSingle();
    if (!error && data) {
      const c = data as { pipeline_setup_state?: unknown };
      if (c.pipeline_setup_state && typeof c.pipeline_setup_state === "object") {
        return normalize(c.pipeline_setup_state);
      }
      return emptySetupState();
    }
  } catch {
    // ignore, try fallback
  }

  // Path B: dedicated table.
  try {
    const { data } = await db
      .from("pipeline_setup_state")
      .select("state")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (data) {
      const d = data as { state?: unknown };
      return normalize(d.state);
    }
  } catch {
    // ignore
  }

  return emptySetupState();
}

/**
 * Merge a partial update into the tenant's setup state. Reads, mutates,
 * writes. Best-effort. Tries the JSONB column first, then the dedicated
 * table. Returns the next state regardless of whether persistence succeeded.
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

  // Try JSONB column on clients.
  try {
    const res = await db
      .from("clients")
      .update({ pipeline_setup_state: next })
      .eq("id", tenantId);
    if (!res.error) return next;
  } catch {
    // ignore, try the dedicated table
  }

  // Try dedicated table upsert.
  try {
    await db
      .from("pipeline_setup_state")
      .upsert({ tenant_id: tenantId, state: next });
  } catch {
    // soft fail, state is still returned to caller
  }

  return next;
}
