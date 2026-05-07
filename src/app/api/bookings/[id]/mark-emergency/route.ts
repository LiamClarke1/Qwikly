import { NextRequest, NextResponse } from "next/server";
import { getAuthedClientId } from "@/lib/api-auth";
import { markEmergency, getBooking } from "@/lib/booking-tentative";

export const dynamic = "force-dynamic";

type Body = { value?: boolean };

// POST /api/bookings/:id/mark-emergency — flip the is_emergency flag.
// Used when the tradesman wants to escalate or de-escalate after the fact:
// e.g. visitor downplayed it on the chat but the photo they sent shows
// water everywhere, so the booking gets pulled into the emergency lane.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const clientId = await getAuthedClientId();
  if (!clientId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const booking = await getBooking(params.id);
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (booking.client_id !== clientId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    /* empty body is fine, defaults to true */
  }

  try {
    const updated = await markEmergency(params.id, body.value ?? true);
    return NextResponse.json({ ok: true, booking: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
