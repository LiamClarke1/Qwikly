"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

const VALID_STATUSES = new Set([
  "new",
  "contacted",
  "replied",
  "qualified",
  "booked",
  "dead",
]);

function clean(input: unknown): string {
  return typeof input === "string" ? input.trim() : "";
}

async function resolveBusinessId(): Promise<string | null> {
  const cookieStore = cookies();
  const auth = createServerClient(
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
  } = await auth.auth.getUser();
  if (!user) return null;

  const db = supabaseAdmin();
  const { data: biz } = await db
    .from("businesses")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  return (biz as { id?: string } | null)?.id ?? null;
}

export async function snoozeProspect(
  prospectId: string,
  days: number,
): Promise<ActionResult> {
  const id = clean(prospectId);
  if (!id) return { ok: false, error: "Missing prospect id" };
  if (!Number.isFinite(days) || days <= 0) {
    return { ok: false, error: "Invalid snooze window" };
  }

  const businessId = await resolveBusinessId();
  if (!businessId) return { ok: false, error: "Not signed in" };

  const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  const db = supabaseAdmin();

  const direct = await db
    .from("pipeline_prospects")
    .update({ snoozed_until: until })
    .eq("id", id)
    .eq("business_id", businessId);

  if (!direct.error) {
    revalidatePath(`/dashboard/pipeline/prospects/${id}`);
    revalidatePath(`/dashboard/pipeline/prospects`);
    return { ok: true };
  }

  // Fallback: merge snoozed_until into icp_match JSONB if the column doesn't exist.
  const { data: row } = await db
    .from("pipeline_prospects")
    .select("icp_match")
    .eq("id", id)
    .eq("business_id", businessId)
    .maybeSingle();

  const existing =
    (row && (row as { icp_match?: Record<string, unknown> | null }).icp_match) || {};

  const next = { ...existing, snoozed_until: until };

  const { error } = await db
    .from("pipeline_prospects")
    .update({ icp_match: next })
    .eq("id", id)
    .eq("business_id", businessId);

  if (error) {
    console.error("[prospects/snoozeProspect] failed:", error);
    return { ok: false, error: "Could not snooze, try again." };
  }

  revalidatePath(`/dashboard/pipeline/prospects/${id}`);
  revalidatePath(`/dashboard/pipeline/prospects`);
  return { ok: true };
}

export async function setProspectStatus(
  prospectId: string,
  newStatus: string,
): Promise<ActionResult> {
  const id = clean(prospectId);
  const status = clean(newStatus).toLowerCase();
  if (!id) return { ok: false, error: "Missing prospect id" };
  if (!VALID_STATUSES.has(status)) {
    return { ok: false, error: "Invalid status" };
  }

  const businessId = await resolveBusinessId();
  if (!businessId) return { ok: false, error: "Not signed in" };

  const db = supabaseAdmin();
  const { error } = await db
    .from("pipeline_prospects")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("business_id", businessId);

  if (error) {
    console.error("[prospects/setProspectStatus] failed:", error);
    return { ok: false, error: "Could not update status, try again." };
  }

  revalidatePath(`/dashboard/pipeline/prospects/${id}`);
  revalidatePath(`/dashboard/pipeline/prospects`);
  revalidatePath(`/dashboard/pipeline`);
  return { ok: true };
}

export async function saveUniqueHook(
  prospectId: string,
  hook: string,
): Promise<ActionResult> {
  const id = clean(prospectId);
  if (!id) return { ok: false, error: "Missing prospect id" };
  const safeHook = clean(hook);

  const businessId = await resolveBusinessId();
  if (!businessId) return { ok: false, error: "Not signed in" };

  const db = supabaseAdmin();
  const { data: row } = await db
    .from("pipeline_prospects")
    .select("icp_match")
    .eq("id", id)
    .eq("business_id", businessId)
    .maybeSingle();

  const existing =
    (row && (row as { icp_match?: Record<string, unknown> | null }).icp_match) || {};

  const next = { ...existing, unique_hook: safeHook };

  const { error } = await db
    .from("pipeline_prospects")
    .update({ icp_match: next })
    .eq("id", id)
    .eq("business_id", businessId);

  if (error) {
    console.error("[prospects/saveUniqueHook] failed:", error);
    return { ok: false, error: "Could not save hook, try again." };
  }

  revalidatePath(`/dashboard/pipeline/prospects/${id}`);
  return { ok: true };
}
