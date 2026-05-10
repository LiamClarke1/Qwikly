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
  const { data: client } = await db
    .from("clients")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  const tenantId = (client as { id?: number | string } | null)?.id ?? null;
  if (!tenantId) {
    return { ok: false, reason: "no_tenant" };
  }

  return persistProspects({ input, tenantId });
}

// Shared between the server action and the API route, so behaviour stays in
// one place.
export async function persistProspects(args: {
  input: GenerateProspectInput;
  tenantId: number | string;
}): Promise<GeneratorResult> {
  const { input, tenantId } = args;
  const prospects: MockProspect[] = await runGenerator(input);
  const runId = nanoid();

  const db = supabaseAdmin();
  const rows = prospects.map((p) => ({
    tenant_id: tenantId,
    run_id: runId,
    source: "demo_generator",
    first_name: p.first_name,
    last_name: p.last_name,
    full_name: p.full_name,
    title: p.title,
    company: p.company,
    industry: p.industry,
    employees: p.employees,
    city: p.city,
    email: p.email,
    email_verified: p.email_verified,
    linkedin_url: p.linkedin_url,
    intent_signals: p.intent_signals,
    enrichment_score: p.enrichment_score,
  }));

  const { error } = await db.from("pipeline_prospects").insert(rows);
  if (error) {
    // Postgres "relation does not exist" is 42P01. Fail soft so the UI can
    // show the schema-pending message rather than a generic error.
    const code = (error as { code?: string }).code;
    if (code === "42P01") {
      return { ok: false, reason: "schema_pending" };
    }
    return { ok: false, reason: "insert_failed" };
  }

  return { ok: true, count: rows.length, runId };
}
