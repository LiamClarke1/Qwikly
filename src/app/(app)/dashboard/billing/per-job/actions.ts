"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-server";
import { v2Auth } from "@/lib/v2-auth";
import { log } from "@/lib/log";

// Server actions backing the Pay-per-job dashboard page. Auth uses v2Auth so
// only the tenant who owns the line/business can mutate state. The service
// role client (supabaseAdmin) is what actually writes the row, RLS policies
// would otherwise block these legitimate writes.

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

const ALLOWED_STATUSES = [
  "pending",
  "approved",
  "disputed",
  "invoiced",
  "waived",
  "paid",
] as const;
type LineStatus = (typeof ALLOWED_STATUSES)[number];

function isLineStatus(s: string): s is LineStatus {
  return (ALLOWED_STATUSES as readonly string[]).includes(s);
}

export async function setLineStatus(
  lineId: string,
  status: string,
  noteRequired = false,
  note?: string,
): Promise<ActionResult> {
  if (!lineId || !isLineStatus(status)) {
    return { ok: false, error: "Invalid status" };
  }
  if (noteRequired && (!note || !note.trim())) {
    return { ok: false, error: "A note is required" };
  }

  const auth = await v2Auth();
  if (!auth) return { ok: false, error: "Not signed in" };

  const db = supabaseAdmin();

  // Confirm the line belongs to this tenant before letting them mutate it.
  const { data: line, error: lineErr } = await db
    .from("per_job_invoice_lines")
    .select("id, business_id")
    .eq("id", lineId)
    .maybeSingle();

  if (lineErr) {
    log("error", "per_job_set_status_lookup_failed", {
      lineId,
      error: lineErr.message,
    });
    return { ok: false, error: "Could not load line" };
  }
  if (!line) return { ok: false, error: "Line not found" };
  if (line.business_id !== auth.businessId) {
    return { ok: false, error: "Not your line" };
  }

  const update: Record<string, unknown> = {
    status,
    reviewed_at: new Date().toISOString(),
  };
  if (note && note.trim()) update.notes = note.trim();

  const { error: updateErr } = await db
    .from("per_job_invoice_lines")
    .update(update)
    .eq("id", lineId);

  if (updateErr) {
    log("error", "per_job_set_status_update_failed", {
      lineId,
      status,
      error: updateErr.message,
    });
    return { ok: false, error: "Could not update line" };
  }

  log("info", "per_job_line_status_changed", {
    lineId,
    status,
    businessId: auth.businessId,
  });

  revalidatePath("/dashboard/billing/per-job");
  return { ok: true };
}

export async function setAddonEnabled(enabled: boolean): Promise<ActionResult> {
  const auth = await v2Auth();
  if (!auth) return { ok: false, error: "Not signed in" };

  const db = supabaseAdmin();
  const { error } = await db
    .from("businesses")
    .update({ per_job_addon_enabled: enabled })
    .eq("id", auth.businessId);

  if (error) {
    log("error", "per_job_set_addon_failed", {
      businessId: auth.businessId,
      enabled,
      error: error.message,
    });
    return { ok: false, error: "Could not save change" };
  }

  log("info", "per_job_addon_toggled", {
    businessId: auth.businessId,
    enabled,
  });

  revalidatePath("/dashboard/billing/per-job");
  return { ok: true };
}
