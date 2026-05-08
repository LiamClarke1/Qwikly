import { NextResponse } from "next/server";
import { getAvailableSlots, sastDayKey } from "@/lib/booking-availability";

const QWIKLY_OWN_CLIENT_ID = process.env.QWIKLY_OWNER_CLIENT_ID ?? "1";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS });
}

export type ContactAvailabilitySlot = {
  start: string;
  end: string;
  label: string;
  short_label: string;
};

export type ContactAvailabilityResponse =
  | { ok: true; availability: Record<string, ContactAvailabilitySlot[]> }
  | {
      ok: false;
      reason: "calendar_not_connected" | "calendar_disconnected" | "error";
      message?: string;
    };

export async function GET() {
  const result = await getAvailableSlots(QWIKLY_OWN_CLIENT_ID, {
    lookaheadDays: 30,
    maxSlots: 400,
    maxPerDay: 12,
    weekendMaxPerDay: 12,
    workingHoursStart: 8,
    workingHoursEnd: 19,
    weekendHoursStart: 8,
    weekendHoursEnd: 19,
    granularityMin: 60,
  });

  if (!result.ok) {
    const status = result.reason === "error" ? 503 : 200;
    return NextResponse.json(
      { ok: false, reason: result.reason, message: result.message },
      { status, headers: CORS }
    );
  }

  const grouped: Record<string, ContactAvailabilitySlot[]> = {};
  for (const slot of result.slots) {
    const key = sastDayKey(new Date(slot.start));
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(slot);
  }

  return NextResponse.json({ ok: true, availability: grouped }, { headers: CORS });
}
