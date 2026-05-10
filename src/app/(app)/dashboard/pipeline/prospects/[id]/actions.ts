"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-server";

// Soft action result. The caller decides what to do with errors, the page
// always re-renders on revalidate so this just needs to not throw.
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

// Try to update a real snoozed_until column. If the column does not exist,
// stuff the timestamp into icp_match.snoozed_until JSONB instead.
export async function snoozeProspect(
  prospectId: string,
  days: number,
): Promise<ActionResult> {
  const id = clean(prospectId);
  if (!id) return { ok: false, error: "Missing prospect id" };
  if (!Number.isFinite(days) || days <= 0) {
    return { ok: false, error: "Invalid snooze window" };
  }

  const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  const db = supabaseAdmin();

  // First try the dedicated column. If the column does not exist, Postgres
  // returns code 42703, which we soft-fall-through.
  const direct = await db
    .from("pipeline_prospects")
    .update({ snoozed_until: until })
    .eq("id", id);

  if (!direct.error) {
    revalidatePath(`/dashboard/pipeline/prospects/${id}`);
    revalidatePath(`/dashboard/pipeline/prospects`);
    return { ok: true };
  }

  // Fallback: read icp_match, merge snoozed_until, write back.
  const { data: row } = await db
    .from("pipeline_prospects")
    .select("icp_match")
    .eq("id", id)
    .maybeSingle();

  const existing =
    (row && (row as { icp_match?: Record<string, unknown> | null }).icp_match) || {};

  const next = { ...existing, snoozed_until: until };

  const { error } = await db
    .from("pipeline_prospects")
    .update({ icp_match: next })
    .eq("id", id);

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

  const db = supabaseAdmin();
  const { error } = await db
    .from("pipeline_prospects")
    .update({ status })
    .eq("id", id);

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

  const db = supabaseAdmin();
  const { data: row } = await db
    .from("pipeline_prospects")
    .select("icp_match")
    .eq("id", id)
    .maybeSingle();

  const existing =
    (row && (row as { icp_match?: Record<string, unknown> | null }).icp_match) || {};

  const next = { ...existing, unique_hook: safeHook };

  const { error } = await db
    .from("pipeline_prospects")
    .update({ icp_match: next })
    .eq("id", id);

  if (error) {
    console.error("[prospects/saveUniqueHook] failed:", error);
    return { ok: false, error: "Could not save hook, try again." };
  }

  revalidatePath(`/dashboard/pipeline/prospects/${id}`);
  return { ok: true };
}
