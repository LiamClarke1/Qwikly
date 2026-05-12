"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { nanoid } from "nanoid";
import { supabaseAdmin } from "@/lib/supabase-server";
import { runGenerator } from "@/lib/pipeline/generator/run";
import {
  generateProspectInputSchema,
  GenerateProspectInput,
  GeneratorResult,
  MockProspect,
} from "@/lib/pipeline/generator/types";

// Strip undefined values from an object before passing to Supabase. The PostgREST
// client rejects undefined column values, so we coerce them out entirely. Nulls
// are kept (a null is a meaningful column write).
function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const k of Object.keys(obj) as (keyof T)[]) {
    if (obj[k] !== undefined) {
      out[k] = obj[k];
    }
  }
  return out;
}

// Server action used by the in-dashboard form. Re-used logic is also exposed
// over HTTP via /api/pipeline/generate for internal callers.
export async function generateProspects(
  raw: unknown,
): Promise<GeneratorResult> {
  const parsed = generateProspectInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, reason: "invalid_input" };
  }
  const input: GenerateProspectInput = parsed.data;

  // Auth: resolve the current tenant via the Supabase session cookie. Mirrors
  // src/app/(app)/dashboard/onboarding/actions.ts.
  const cookieStore = cookies();
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    },
  );
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) {
    return { ok: false, reason: "not_signed_in" };
  }

  const db = supabaseAdmin();
  // pipeline_prospects.business_id FK references businesses(id), not clients(id).
  // Resolve the tenant via businesses.user_id = auth.uid().
  const { data: business } = await db
    .from("businesses")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  const tenantId = (business as { id?: string } | null)?.id ?? null;
  if (!tenantId) {
    return { ok: false, reason: "no_tenant" };
  }

  // Resolve clients.id (BIGINT) for usage tagging. Different table key than
  // businesses.id, linked via auth_user_id ↔ auth.uid(). Soft-fail to null so
  // a missing clients row does not block the legacy generate flow.
  let clientId: number | string | null = null;
  try {
    const { data: clientRow } = await db
      .from("clients")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    clientId = (clientRow as { id?: number | string } | null)?.id ?? null;
  } catch {
    clientId = null;
  }

  return persistProspects({ input, tenantId, clientId });
}

// Shared between the server action and the API route, so behaviour stays in
// one place.
//
// Shape of each inserted pipeline_prospects row matches the canonical columns
// from supabase/migrations/20260510_pipeline_platform.sql. Extra fields the
// generator emits (phone, website, rating, reviews_count, business_status,
// place_types, email_verification_status, site_recon, score_breakdown,
// unique_hook, suburb) live inside icp_match JSONB, since the table does not
// have dedicated columns for them. enrichment_score in the schema is INTEGER
// 0 to 100, while p.score is 1 to 10, so we multiply by 10.
export async function persistProspects(args: {
  input: GenerateProspectInput;
  tenantId: number | string;
  clientId?: number | string | null;
}): Promise<GeneratorResult> {
  const { input, tenantId, clientId } = args;
  // Pass clientId so the wrapped Google Places + Hunter calls tag the right
  // billing tenant in pipeline_api_usage. Falls back to "0" (no tenant) when
  // the caller does not have one, preserving the legacy behaviour for any
  // test harnesses or internal callers that have not been updated yet.
  const prospects: MockProspect[] = await runGenerator(input, clientId ?? "0");
  const runId = nanoid();

  const db = supabaseAdmin();
  const rows = prospects.map((p) => {
    const enrichmentScoreRaw = Math.round((p.score ?? 0) * 10);
    const enrichmentScore = Math.max(0, Math.min(100, enrichmentScoreRaw));
    const row = {
      business_id: tenantId,
      campaign_id: null,
      first_name: p.first_name,
      last_name: p.last_name,
      title: p.title,
      company: p.company,
      industry: p.industry,
      employees: p.employees,
      city: p.city,
      country: "ZA",
      email: p.email,
      email_verified: p.email_verified,
      linkedin_url: p.linkedin_url,
      intent_signals: p.intent_signals,
      enrichment_score: enrichmentScore,
      status: "new",
      source: "google_places",
      icp_match: {
        run_id: runId,
        phone: p.phone ?? null,
        website: p.website ?? null,
        rating: p.rating ?? null,
        reviews_count: p.reviews_count ?? null,
        business_status: p.business_status ?? null,
        place_types: p.place_types ?? null,
        email_verification_status: p.email_verification_status ?? null,
        email_source: p.email_source ?? null,
        site_recon: p.site_recon ?? null,
        score_breakdown: p.score_breakdown ?? null,
        unique_hook: p.unique_hook ?? null,
        suburb: p.city ?? null,
      },
    };
    return stripUndefined(row);
  });

  const { error } = await db.from("pipeline_prospects").insert(rows);
  if (error) {
    // Postgres "relation does not exist" is 42P01. Fail soft so the UI can
    // show the schema-pending message rather than a generic error.
    const code = (error as { code?: string }).code;
    if (code === "42P01") {
      return { ok: false, reason: "schema_pending" };
    }
    // Log the full error so server logs surface the underlying cause, and
    // bubble the message up to the UI so it is not just a generic red box.
    console.error("[pipeline/persistProspects] insert failed", {
      code,
      message: (error as { message?: string }).message,
      details: (error as { details?: string }).details,
      hint: (error as { hint?: string }).hint,
    });
    return {
      ok: false,
      reason: (error as { message?: string }).message ?? "insert_failed",
    };
  }

  return { ok: true, count: rows.length, runId };
}
