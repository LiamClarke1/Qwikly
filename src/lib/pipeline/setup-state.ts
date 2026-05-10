// Pipeline campaign setup state, server-side helpers.
//
// TODO: confirm schema from supabase/migrations/20260510_pipeline_platform.sql
// once the schema agent ships it. We expect either a JSONB column
// `pipeline_setup_state` on `clients`, or a dedicated `pipeline_setup_state`
// table keyed by tenant_id. The helpers below try the column first, then
// fall back to the dedicated table, then fall back to an in-memory default
// so the wizard never blows up pre-migration.

import { supabaseAdmin } from "@/lib/supabase-server";

export type PipelineSetupStatus = "draft" | "ready" | "launched";

export interface IcpProfile {
  name: string;
  industries: string[];
  job_titles: string[];
  company_size_min: number | null;
  company_size_max: number | null;
  locations: string[];
  pain_point: string;
  value_prop: string;
}

export interface SeedListEntry {
  first_name: string;
  last_name: string;
  company: string;
  email: string;
  title: string;
}

export interface SeedListSummary {
  source: "qwikly_generator" | "csv_upload" | "none";
  total_rows: number;
  valid_rows: number;
  warnings: string[];
  rows: SeedListEntry[];
}

export interface DomainsConfig {
  count: number;
  pattern: string;
  notes: string;
}

export interface CopyApproval {
  approve_email_1: boolean;
  approve_email_2: boolean;
  approve_email_3: boolean;
  customisations: string;
}

export interface PipelineSetupState {
  current_step: 1 | 2 | 3 | 4 | 5;
  status: PipelineSetupStatus;
  started_at: string;
  ready_at: string | null;
  icp: IcpProfile;
  seed_list: SeedListSummary;
  domains: DomainsConfig;
  copy: CopyApproval;
}

export const DEFAULT_ICP: IcpProfile = {
  name: "",
  industries: [],
  job_titles: [],
  company_size_min: null,
  company_size_max: null,
  locations: [],
  pain_point: "",
  value_prop: "",
};

export const DEFAULT_SEED_LIST: SeedListSummary = {
  source: "none",
  total_rows: 0,
  valid_rows: 0,
  warnings: [],
  rows: [],
};

export const DEFAULT_DOMAINS: DomainsConfig = {
  count: 3,
  pattern: "",
  notes: "",
};

export const DEFAULT_COPY: CopyApproval = {
  approve_email_1: false,
  approve_email_2: false,
  approve_email_3: false,
  customisations: "",
};

export function emptySetupState(startedAt: string = new Date().toISOString()): PipelineSetupState {
  return {
    current_step: 1,
    status: "draft",
    started_at: startedAt,
    ready_at: null,
    icp: { ...DEFAULT_ICP },
    seed_list: { ...DEFAULT_SEED_LIST, rows: [], warnings: [] },
    domains: { ...DEFAULT_DOMAINS },
    copy: { ...DEFAULT_COPY },
  };
}

function normalize(raw: unknown, fallbackStart: string): PipelineSetupState {
  const base = emptySetupState(fallbackStart);
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Record<string, unknown>;

  const cur = r.current_step;
  const step: 1 | 2 | 3 | 4 | 5 =
    cur === 1 || cur === 2 || cur === 3 || cur === 4 || cur === 5 ? cur : 1;

  const statusRaw = r.status;
  const status: PipelineSetupStatus =
    statusRaw === "ready" || statusRaw === "launched" ? statusRaw : "draft";

  const icp = (r.icp && typeof r.icp === "object" ? r.icp : {}) as Record<string, unknown>;
  const seed = (r.seed_list && typeof r.seed_list === "object" ? r.seed_list : {}) as Record<string, unknown>;
  const dom = (r.domains && typeof r.domains === "object" ? r.domains : {}) as Record<string, unknown>;
  const cp = (r.copy && typeof r.copy === "object" ? r.copy : {}) as Record<string, unknown>;

  return {
    current_step: step,
    status,
    started_at: typeof r.started_at === "string" ? r.started_at : fallbackStart,
    ready_at: typeof r.ready_at === "string" ? r.ready_at : null,
    icp: {
      name: typeof icp.name === "string" ? icp.name : "",
      industries: Array.isArray(icp.industries) ? icp.industries.filter((x): x is string => typeof x === "string") : [],
      job_titles: Array.isArray(icp.job_titles) ? icp.job_titles.filter((x): x is string => typeof x === "string") : [],
      company_size_min: typeof icp.company_size_min === "number" ? icp.company_size_min : null,
      company_size_max: typeof icp.company_size_max === "number" ? icp.company_size_max : null,
      locations: Array.isArray(icp.locations) ? icp.locations.filter((x): x is string => typeof x === "string") : [],
      pain_point: typeof icp.pain_point === "string" ? icp.pain_point : "",
      value_prop: typeof icp.value_prop === "string" ? icp.value_prop : "",
    },
    seed_list: {
      source:
        seed.source === "qwikly_generator" || seed.source === "csv_upload" ? seed.source : "none",
      total_rows: typeof seed.total_rows === "number" ? seed.total_rows : 0,
      valid_rows: typeof seed.valid_rows === "number" ? seed.valid_rows : 0,
      warnings: Array.isArray(seed.warnings) ? seed.warnings.filter((x): x is string => typeof x === "string") : [],
      rows: Array.isArray(seed.rows)
        ? (seed.rows as unknown[]).map((row) => {
            const rr = (row && typeof row === "object" ? row : {}) as Record<string, unknown>;
            return {
              first_name: typeof rr.first_name === "string" ? rr.first_name : "",
              last_name: typeof rr.last_name === "string" ? rr.last_name : "",
              company: typeof rr.company === "string" ? rr.company : "",
              email: typeof rr.email === "string" ? rr.email : "",
              title: typeof rr.title === "string" ? rr.title : "",
            };
          })
        : [],
    },
    domains: {
      count: typeof dom.count === "number" && dom.count >= 2 && dom.count <= 5 ? dom.count : 3,
      pattern: typeof dom.pattern === "string" ? dom.pattern : "",
      notes: typeof dom.notes === "string" ? dom.notes : "",
    },
    copy: {
      approve_email_1: cp.approve_email_1 === true,
      approve_email_2: cp.approve_email_2 === true,
      approve_email_3: cp.approve_email_3 === true,
      customisations: typeof cp.customisations === "string" ? cp.customisations : "",
    },
  };
}

/**
 * Read setup state for a tenant. Tries the JSONB column on clients first,
 * then a dedicated pipeline_setup_state table, then returns a default state.
 * Fail-soft on every error so the wizard renders even before the migration
 * has been applied.
 */
export async function getSetupState(tenantId: string | number): Promise<PipelineSetupState> {
  const fallbackStart = new Date().toISOString();
  const db = supabaseAdmin();

  // Path A: JSONB column on clients.
  try {
    const { data, error } = await db
      .from("clients")
      .select("created_at, pipeline_setup_state")
      .eq("id", tenantId)
      .maybeSingle();
    if (!error && data) {
      const c = data as { created_at?: string | null; pipeline_setup_state?: unknown };
      const start = c.created_at ?? fallbackStart;
      if (c.pipeline_setup_state && typeof c.pipeline_setup_state === "object") {
        return normalize(c.pipeline_setup_state, start);
      }
      // No row yet, return default seeded with the tenant's created_at.
      return emptySetupState(start);
    }
  } catch {
    // ignore, try fallback
  }

  // Path B: dedicated table.
  try {
    const { data } = await db
      .from("pipeline_setup_state")
      .select("state, started_at")
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (data) {
      const d = data as { state?: unknown; started_at?: string | null };
      return normalize(d.state, d.started_at ?? fallbackStart);
    }
  } catch {
    // ignore
  }

  return emptySetupState(fallbackStart);
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
    seed_list: partial.seed_list ? { ...current.seed_list, ...partial.seed_list } : current.seed_list,
    domains: partial.domains ? { ...current.domains, ...partial.domains } : current.domains,
    copy: partial.copy ? { ...current.copy, ...partial.copy } : current.copy,
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
      .upsert({ tenant_id: tenantId, state: next, started_at: next.started_at });
  } catch {
    // soft fail, state is still returned to caller
  }

  return next;
}
