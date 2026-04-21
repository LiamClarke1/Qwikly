import { NextRequest, NextResponse } from "next/server";
import { calendarClient } from "@/lib/google-calendar";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { clientId, booking } = body as {
    clientId: string;
    booking: {
      customer_name: string;
      customer_phone: string;
      job_type: string | null;
      area: string | null;
      booking_datetime: string;
    };
  };

  if (!clientId || !booking) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: client } = await db
    .from("clients")
    .select("google_access_token, google_refresh_token, google_calendar_id, business_name")
    .eq("id", clientId)
    .maybeSingle();

  if (!client?.google_access_token) {
    return NextResponse.json({ skipped: true, reason: "calendar_not_connected" });
  }

  try {
    const cal = calendarClient(client.google_access_token, client.google_refresh_token ?? "");
    const calendarId = client.google_calendar_id ?? "primary";

    const start = new Date(booking.booking_datetime);
    const end = new Date(start.getTime() + 60 * 60 * 1000); // 1-hour default

    const descParts = [
      `Customer: ${booking.customer_name}`,
      `Phone: ${booking.customer_phone}`,
      booking.job_type ? `Job: ${booking.job_type}` : null,
      booking.area ? `Area: ${booking.area}` : null,
      `\nBooked via Qwikly`,
    ].filter(Boolean);

    const { data } = await cal.events.insert({
      calendarId,
      requestBody: {
        summary: `${booking.job_type ?? "Service"} — ${booking.customer_name}`,
        description: descParts.join("\n"),
        location: booking.area ?? undefined,
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
      },
    });

    return NextResponse.json({ eventId: data.id, eventLink: data.htmlLink });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
