import { NextRequest, NextResponse } from "next/server";
import { getAuthedClientId } from "@/lib/api-auth";
import { confirmTentative, getBooking } from "@/lib/booking-tentative";

export const dynamic = "force-dynamic";

// POST /api/bookings/:id/confirm — promote a tentative booking to 'booked'.
// Used by the dashboard's "Confirm" buttons in both the emergency lane (the
// tradesman accepts the urgent slot) and the multi-day lane (the tradesman
// keeps the held follow-up day).
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const clientId = await getAuthedClientId();
  if (!clientId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const booking = await getBooking(params.id);
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (booking.client_id !== clientId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const updated = await confirmTentative(params.id);
    return NextResponse.json({ ok: true, booking: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
