import { NextRequest, NextResponse } from "next/server";
import { expireTentativeBookings } from "@/lib/booking-tentative";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Runs every 5 minutes via Vercel Cron. Resolves any tentative bookings
// whose deadline has passed:
//   • emergency tentative slots auto-confirm (visitor keeps their hold time)
//   • follow-up day tentative slots auto-release (frees the slot if the
//     tradesman didn't actively confirm it after day 1)
//
// 5-minute granularity is fine for both: the emergency hold window is 15
// minutes by default, and the follow-up window is the rest of day 1.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  const legacyHeader = req.headers.get("x-cron-secret");
  if (
    !secret ||
    (authHeader !== `Bearer ${secret}` && legacyHeader !== secret)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await expireTentativeBookings();
    console.log("[cron/expire-tentative]", result);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[cron/expire-tentative] failed", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

