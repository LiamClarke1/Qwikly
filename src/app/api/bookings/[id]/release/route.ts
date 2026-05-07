import { NextRequest, NextResponse } from "next/server";
import { getAuthedClientId } from "@/lib/api-auth";
import { releaseTentative, getBooking } from "@/lib/booking-tentative";

export const dynamic = "force-dynamic";

// POST /api/bookings/:id/release — cancel a tentative booking and free the
// slot. Used when the tradesman decides not to keep a held follow-up day.
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
  if (booking.status !== "tentative") {
    return NextResponse.json(
      { error: "Only tentative bookings can be released" },
      { status: 409 }
    );
  }

  try {
    const updated = await releaseTentative(params.id);
    return NextResponse.json({ ok: true, booking: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
