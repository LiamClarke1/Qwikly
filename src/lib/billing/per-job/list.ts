import "server-only";
import { supabaseAdmin } from "@/lib/supabase-server";
import { log } from "@/lib/log";

// Surface for the dashboard. Joins per_job_invoice_lines to bookings so the
// UI can show lead name and the booking's completed_at without a second
// round-trip. The bookings table currently keys on client_id (legacy), so
// we just grab the descriptive fields and trust per_job_invoice_lines to be
// the source of truth for the line itself.

export type PerJobLineStatus =
  | "pending"
  | "approved"
  | "disputed"
  | "invoiced"
  | "waived"
  | "paid";

export interface PerJobLine {
  id: string;
  business_id: string;
  booking_id: string;
  amount_zar: number;
  status: PerJobLineStatus;
  created_at: string;
  reviewed_at: string | null;
  notes: string | null;
  booking: {
    id: string;
    customer_name: string | null;
    completed_at: string | null;
    booking_datetime: string | null;
    status: string | null;
    job_type: string | null;
  } | null;
}

interface RawRow {
  id: string;
  business_id: string;
  booking_id: string;
  amount_zar: number;
  status: PerJobLineStatus;
  created_at: string;
  reviewed_at: string | null;
  notes: string | null;
  bookings: {
    id: string;
    customer_name: string | null;
    completed_at: string | null;
    booking_datetime: string | null;
    status: string | null;
    job_type: string | null;
  } | null;
}

export async function listPerJobLines(
  businessId: string,
  status?: string,
  limit = 50,
): Promise<PerJobLine[]> {
  if (!businessId) return [];

  const db = supabaseAdmin();

  let query = db
    .from("per_job_invoice_lines")
    .select(
      `id,
       business_id,
       booking_id,
       amount_zar,
       status,
       created_at,
       reviewed_at,
       notes,
       bookings:booking_id (
         id,
         customer_name,
         completed_at,
         booking_datetime,
         status,
         job_type
       )`,
    )
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    log("error", "per_job_list_failed", {
      businessId,
      status,
      error: error.message,
    });
    return [];
  }

  const rows = (data ?? []) as unknown as RawRow[];
  return rows.map((row) => ({
    id: row.id,
    business_id: row.business_id,
    booking_id: row.booking_id,
    amount_zar: row.amount_zar,
    status: row.status,
    created_at: row.created_at,
    reviewed_at: row.reviewed_at,
    notes: row.notes,
    booking: row.bookings
      ? {
          id: row.bookings.id,
          customer_name: row.bookings.customer_name,
          completed_at: row.bookings.completed_at,
          booking_datetime: row.bookings.booking_datetime,
          status: row.bookings.status,
          job_type: row.bookings.job_type,
        }
      : null,
  }));
}
