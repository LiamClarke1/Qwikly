// POST /api/billing/per-job
//
// Internal endpoint, called from a Supabase database webhook (or any
// server-side handler) when a booking flips to a billable state. Gates on
// `x-qwikly-internal: $QWIKLY_INTERNAL_TOKEN` so random traffic from the
// public internet cannot fan out billing rows on a tenant's account.
//
// Body: { bookingId: string }. Looks up the booking's business and asks
// the per-job logger to insert a draft line. We do NOT call Stripe here,
// the line is just a draft for the tenant to review.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { logPerJobLine } from "@/lib/billing/per-job/log";
import { log } from "@/lib/log";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const expected = process.env.QWIKLY_INTERNAL_TOKEN;
  if (!expected) {
    log("error", "per_job_internal_token_missing");
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }
  const provided = req.headers.get("x-qwikly-internal");
  if (provided !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: { bookingId?: unknown };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const bookingId = typeof payload.bookingId === "string" ? payload.bookingId : null;
  if (!bookingId) {
    return NextResponse.json({ error: "bookingId_required" }, { status: 400 });
  }

  // Resolve the booking's business. bookings.client_id (legacy bigint) maps
  // to clients.id, and clients.auth_user_id maps to businesses.user_id.
  // We do the join in two steps because the legacy id types differ.
  const db = supabaseAdmin();

  const { data: booking, error: bookingErr } = await db
    .from("bookings")
    .select("id, client_id")
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingErr) {
    log("error", "per_job_booking_lookup_failed", {
      bookingId,
      error: bookingErr.message,
    });
    return NextResponse.json({ error: "booking_lookup_failed" }, { status: 500 });
  }
  if (!booking) {
    return NextResponse.json({ error: "booking_not_found" }, { status: 404 });
  }

  const { data: client } = await db
    .from("clients")
    .select("auth_user_id")
    .eq("id", booking.client_id)
    .maybeSingle();

  if (!client?.auth_user_id) {
    return NextResponse.json({ error: "client_unlinked" }, { status: 404 });
  }

  const { data: business } = await db
    .from("businesses")
    .select("id")
    .eq("user_id", client.auth_user_id)
    .maybeSingle();

  if (!business?.id) {
    return NextResponse.json({ error: "business_not_found" }, { status: 404 });
  }

  const result = await logPerJobLine({ businessId: business.id, bookingId });

  if (result.ok) {
    return NextResponse.json(result);
  }
  // Soft-fail on expected outcomes (addon_disabled, already_logged) so the
  // calling webhook does not retry indefinitely.
  return NextResponse.json(result, { status: 200 });
}
