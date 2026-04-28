import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { calendarClient, handleCalendarAuthError } from "@/lib/google-calendar";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { clientId, booking } = body as {
    clientId: string;
    booking: {
      customer_name: string;
      customer_phone: string;
      customer_email?: string | null;
      job_type: string | null;
      area: string | null;
      booking_datetime: string;
      service_price?: number | null;
      price_display?: string | null;
      notes?: string | null;
    };
  };

  if (!clientId || !booking) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  // Verify session
  const cookieStore = cookies();
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin();
  const { data: client } = await db
    .from("clients")
    .select("google_access_token, google_refresh_token, google_calendar_id, google_token_expiry, business_name")
    .eq("id", clientId)
    .maybeSingle();

  if (!client?.google_access_token) {
    return NextResponse.json({ skipped: true, reason: "calendar_not_connected" });
  }

  try {
    const cal = calendarClient(
      client.google_access_token,
      client.google_refresh_token ?? "",
      client.google_token_expiry,
      clientId
    );
    const calendarId = client.google_calendar_id ?? "primary";

    const start = new Date(booking.booking_datetime);
    const end = new Date(start.getTime() + 60 * 60 * 1000); // 1-hour default

    const descParts = [
      `Customer: ${booking.customer_name}`,
      `Phone: ${booking.customer_phone}`,
      booking.customer_email ? `Email: ${booking.customer_email}` : null,
      booking.job_type ? `Job: ${booking.job_type}` : null,
      booking.area ? `Area: ${booking.area}` : null,
      (booking.price_display || booking.service_price != null) ? `Price: ${booking.price_display ?? `R${booking.service_price!.toLocaleString("en-ZA")}`}` : null,
      booking.notes ? `\nNotes: ${booking.notes}` : null,
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
    const wasAuthError = await handleCalendarAuthError(err, clientId);
    if (wasAuthError) {
      return NextResponse.json({ error: "Google Calendar disconnected — please reconnect in Settings." }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[calendar/create] Event creation failed", { clientId, error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
