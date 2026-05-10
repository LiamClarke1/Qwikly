import "server-only";
import { supabaseAdmin } from "@/lib/supabase-server";
import { log } from "@/lib/log";

// Insert a draft pay-per-job invoice line for a single booking.
// Called from a Supabase webhook (or server-side handler) when a booking
// flips to 'completed' or 'paid' for a tenant that has opted into the add-on.
//
// Idempotent by virtue of UNIQUE(booking_id) on per_job_invoice_lines, so
// duplicate fires from the database trigger are absorbed without raising.
//
// Never throws. Returns a tagged result so the caller can log the reason
// without trying to interpret raw Postgres errors.

export type LogPerJobLineResult =
  | { ok: true; lineId: string }
  | { ok: false; reason: string };

const DEFAULT_RATE_ZAR = 350;

export async function logPerJobLine({
  businessId,
  bookingId,
}: {
  businessId: string;
  bookingId: string;
}): Promise<LogPerJobLineResult> {
  if (!businessId || !bookingId) {
    return { ok: false, reason: "missing_args" };
  }

  const db = supabaseAdmin();

  try {
    const { data: business, error: bizErr } = await db
      .from("businesses")
      .select("id, per_job_addon_enabled, per_job_rate_zar")
      .eq("id", businessId)
      .maybeSingle();

    if (bizErr) {
      log("error", "per_job_log_business_lookup_failed", {
        businessId,
        bookingId,
        error: bizErr.message,
      });
      return { ok: false, reason: "business_lookup_failed" };
    }

    if (!business) {
      return { ok: false, reason: "business_not_found" };
    }

    if (!business.per_job_addon_enabled) {
      return { ok: false, reason: "addon_disabled" };
    }

    const rate =
      typeof business.per_job_rate_zar === "number" && business.per_job_rate_zar > 0
        ? business.per_job_rate_zar
        : DEFAULT_RATE_ZAR;

    const { data: existing } = await db
      .from("per_job_invoice_lines")
      .select("id")
      .eq("booking_id", bookingId)
      .maybeSingle();

    if (existing?.id) {
      return { ok: false, reason: "already_logged" };
    }

    const { data: inserted, error: insertErr } = await db
      .from("per_job_invoice_lines")
      .insert({
        business_id: businessId,
        booking_id: bookingId,
        amount_zar: rate,
        status: "pending",
      })
      .select("id")
      .single();

    if (insertErr || !inserted) {
      // Race: a concurrent insert can hit the UNIQUE(booking_id) constraint
      // (Postgres error 23505). Treat as already-logged, not a hard failure.
      if (insertErr?.code === "23505") {
        return { ok: false, reason: "already_logged" };
      }
      log("error", "per_job_log_insert_failed", {
        businessId,
        bookingId,
        error: insertErr?.message,
      });
      return { ok: false, reason: "insert_failed" };
    }

    log("info", "per_job_line_logged", {
      businessId,
      bookingId,
      lineId: inserted.id,
      amountZar: rate,
    });

    return { ok: true, lineId: inserted.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown_error";
    log("error", "per_job_log_unexpected", {
      businessId,
      bookingId,
      error: msg,
    });
    return { ok: false, reason: "unexpected_error" };
  }
}
