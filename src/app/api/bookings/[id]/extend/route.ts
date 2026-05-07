import { NextRequest, NextResponse } from "next/server";
import { getAuthedClientId } from "@/lib/api-auth";
import { addFollowUpDay, getBooking } from "@/lib/booking-tentative";

export const dynamic = "force-dynamic";

type Body = {
  /** How many days from the parent's start to schedule the new follow-up.
   *  Defaults to "the next free offset", i.e. one more than the highest
   *  existing follow-up day. */
  daysFromParent?: number;
  /** Optional ISO start override (otherwise reuses parent's time). */
  isoStart?: string;
};

// POST /api/bookings/:id/extend — add a follow-up day to an existing job.
// The new booking starts as 'tentative' and is linked to this booking via
// parent_booking_id. The dashboard groups the parent + follow-ups visually
// so the tradesman sees them as one job spanning multiple days.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const clientId = await getAuthedClientId();
  if (!clientId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parent = await getBooking(params.id);
  if (!parent) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (parent.client_id !== clientId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (parent.parent_booking_id) {
    // Refuse to chain follow-ups: always extend from the day-1 root so the
    // job stays a flat parent-with-children rather than a deep tree.
    return NextResponse.json(
      { error: "Extend the original day-1 booking, not a follow-up." },
      { status: 409 }
    );
  }
  if (!parent.booking_datetime) {
    return NextResponse.json(
      { error: "Cannot extend a booking with no scheduled time." },
      { status: 409 }
    );
  }

  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    /* empty body is fine */
  }

  try {
    const child = await addFollowUpDay({
      parentId: parent.id,
      daysFromParent: body.daysFromParent,
      isoStart: body.isoStart,
    });
    return NextResponse.json({ ok: true, booking: child });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
