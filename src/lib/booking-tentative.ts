// Helpers for emergency + multi-day follow-up bookings.
//
// All operations go through supabaseAdmin() because the call sites are server
// actions / API routes that already authenticated the user against the
// owning client_id. RLS on the bookings table also gates row access for
// regular client reads, so this module trusts its callers to pass the
// correct client_id and id pair.

import { supabaseAdmin } from "@/lib/supabase-server";

// bookings.id is bigint in production. Supabase-JS returns bigints as
// JavaScript numbers, but route handlers receive the id as a string from
// the URL, so accept both shapes and coerce at the DB boundary.
export type BookingId = number | string;

export type BookingRow = {
  id: BookingId;
  client_id: number;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  job_type: string | null;
  area: string | null;
  booking_datetime: string | null;
  status: "booked" | "completed" | "cancelled" | "no-show" | "tentative";
  is_emergency: boolean;
  parent_booking_id: BookingId | null;
  tentative_until: string | null;
  tentative_action: "confirm" | "release" | null;
  notes: string | null;
  service_price: number | null;
  price_display: string | null;
};

type CreateBookingInput = {
  clientId: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  jobType?: string | null;
  area?: string | null;
  bookingDatetime: string;
  notes?: string | null;
  servicePrice?: number | null;
  priceDisplay?: string | null;
  /** Visitor flagged the job as urgent. Default false. */
  isEmergency?: boolean;
  /** When set, this booking starts as 'tentative' and the cron resolves it
   *  at this time per tentativeAction. Use for emergency hold-windows. */
  tentativeUntil?: string | null;
  /** Used together with tentativeUntil. Default 'confirm' for emergencies,
   *  'release' for follow-up days. */
  tentativeAction?: "confirm" | "release" | null;
  /** Set on follow-up days to link them to the original day-1 booking. */
  parentBookingId?: BookingId | null;
};

export async function createBooking(input: CreateBookingInput): Promise<BookingRow> {
  const db = supabaseAdmin();
  const isTentative = !!input.tentativeUntil;
  const { data, error } = await db
    .from("bookings")
    .insert({
      client_id: input.clientId,
      customer_name: input.customerName,
      customer_phone: input.customerPhone,
      customer_email: input.customerEmail ?? null,
      job_type: input.jobType ?? null,
      area: input.area ?? null,
      booking_datetime: input.bookingDatetime,
      status: isTentative ? "tentative" : "booked",
      is_emergency: !!input.isEmergency,
      parent_booking_id: input.parentBookingId ?? null,
      tentative_until: input.tentativeUntil ?? null,
      tentative_action: isTentative ? (input.tentativeAction ?? "confirm") : null,
      notes: input.notes ?? null,
      service_price: input.servicePrice ?? null,
      price_display: input.priceDisplay ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(`createBooking failed: ${error.message}`);
  return data as BookingRow;
}

export async function getBooking(id: BookingId): Promise<BookingRow | null> {
  const db = supabaseAdmin();
  const { data } = await db.from("bookings").select("*").eq("id", id).maybeSingle();
  return (data as BookingRow | null) ?? null;
}

/** Flip an existing booking's is_emergency flag. Useful when a tradesman
 *  realises a normal booking has actually become urgent (escalation). */
export async function markEmergency(id: BookingId, value = true): Promise<BookingRow> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("bookings")
    .update({ is_emergency: value, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(`markEmergency failed: ${error.message}`);
  return data as BookingRow;
}

/** Promote a tentative booking to fully 'booked'. No-op if already booked. */
export async function confirmTentative(id: BookingId): Promise<BookingRow> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("bookings")
    .update({
      status: "booked",
      tentative_until: null,
      tentative_action: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .in("status", ["tentative", "booked"])
    .select("*")
    .single();
  if (error) throw new Error(`confirmTentative failed: ${error.message}`);
  return data as BookingRow;
}

/** Cancel a tentative booking and free the slot for someone else. */
export async function releaseTentative(id: BookingId): Promise<BookingRow> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("bookings")
    .update({
      status: "cancelled",
      tentative_until: null,
      tentative_action: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "tentative")
    .select("*")
    .single();
  if (error) throw new Error(`releaseTentative failed: ${error.message}`);
  return data as BookingRow;
}

type AddFollowUpDayInput = {
  parentId: BookingId;
  /** Number of days to offset from the parent's booking_datetime. Defaults to 1. */
  daysFromParent?: number;
  /** Override start time on the new day. If omitted, reuses parent's time. */
  isoStart?: string;
  /** Tentative deadline. Defaults to the parent's start + 24h, i.e. "confirm
   *  by the end of day 1 or it gets released for someone else". */
  tentativeUntil?: string;
};

/** Create a follow-up day for an existing job. Starts as 'tentative' so the
 *  tradesman has to actively confirm it once they've assessed day 1. */
export async function addFollowUpDay(input: AddFollowUpDayInput): Promise<BookingRow> {
  const parent = await getBooking(input.parentId);
  if (!parent) throw new Error("addFollowUpDay: parent booking not found");
  if (!parent.booking_datetime) throw new Error("addFollowUpDay: parent has no booking_datetime");

  const dayOffset = input.daysFromParent ?? 1;
  const parentStart = new Date(parent.booking_datetime);
  const childStart = input.isoStart
    ? new Date(input.isoStart)
    : new Date(parentStart.getTime() + dayOffset * 24 * 60 * 60 * 1000);

  // Default expiry: end of day 1 (parent start + 24h). After that the slot
  // is released so it doesn't sit reserved indefinitely if the tradesman
  // forgets to confirm.
  const tentativeUntil = input.tentativeUntil
    ?? new Date(parentStart.getTime() + 24 * 60 * 60 * 1000).toISOString();

  return createBooking({
    clientId: parent.client_id,
    customerName: parent.customer_name ?? "",
    customerPhone: parent.customer_phone ?? "",
    customerEmail: parent.customer_email,
    jobType: parent.job_type,
    area: parent.area,
    bookingDatetime: childStart.toISOString(),
    notes: parent.notes,
    servicePrice: null,
    priceDisplay: null,
    isEmergency: false,
    parentBookingId: parent.id,
    tentativeUntil,
    tentativeAction: "release",
  });
}

type CreateBookingWithFollowUpsInput = Omit<CreateBookingInput, "parentBookingId" | "tentativeUntil" | "tentativeAction"> & {
  /** How many days the job is expected to span. 1 means a single visit
   *  (no follow-ups created). 2+ creates that many additional tentative
   *  days, each 24h apart from the previous. Capped at 14. */
  expectedDays?: number;
};

/** One-shot helper for the chat or dashboard "book this job" path: writes the
 *  day-1 booking firmly + N tentative follow-up days. */
export async function createBookingWithFollowUps(
  input: CreateBookingWithFollowUpsInput
): Promise<{ parent: BookingRow; followUps: BookingRow[] }> {
  const dayCount = Math.max(1, Math.min(input.expectedDays ?? 1, 14));

  const parent = await createBooking({
    ...input,
    parentBookingId: null,
    tentativeUntil: input.isEmergency
      // Emergencies hold for 15 minutes while the tradesman confirms or
      // reroutes. The cron auto-confirms after that so the visitor still
      // gets a usable slot if the tradesman doesn't respond.
      ? new Date(Date.now() + 15 * 60_000).toISOString()
      : null,
    tentativeAction: input.isEmergency ? "confirm" : null,
  });

  if (dayCount <= 1) return { parent, followUps: [] };

  const followUps: BookingRow[] = [];
  for (let i = 1; i < dayCount; i++) {
    const child = await addFollowUpDay({ parentId: parent.id, daysFromParent: i });
    followUps.push(child);
  }
  return { parent, followUps };
}

/** Run during the cron tick. Resolves any tentative bookings whose deadline
 *  has passed: emergencies auto-confirm, follow-ups auto-release. Returns
 *  counts so the cron route can log a summary. */
export async function expireTentativeBookings(): Promise<{
  confirmed: number;
  released: number;
}> {
  const db = supabaseAdmin();
  const nowIso = new Date().toISOString();

  const { data: due } = await db
    .from("bookings")
    .select("id, tentative_action")
    .eq("status", "tentative")
    .not("tentative_until", "is", null)
    .lte("tentative_until", nowIso);

  const rows = (due as { id: BookingId; tentative_action: "confirm" | "release" | null }[] | null) ?? [];
  let confirmed = 0;
  let released = 0;

  for (const row of rows) {
    if ((row.tentative_action ?? "confirm") === "confirm") {
      await db
        .from("bookings")
        .update({
          status: "booked",
          tentative_until: null,
          tentative_action: null,
          updated_at: nowIso,
        })
        .eq("id", row.id)
        .eq("status", "tentative");
      confirmed += 1;
    } else {
      await db
        .from("bookings")
        .update({
          status: "cancelled",
          tentative_until: null,
          tentative_action: null,
          updated_at: nowIso,
        })
        .eq("id", row.id)
        .eq("status", "tentative");
      released += 1;
    }
  }

  return { confirmed, released };
}
