import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { calendarClient, handleCalendarAuthError } from "@/lib/google-calendar";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get("clientId");
  const start = req.nextUrl.searchParams.get("start");
  const end = req.nextUrl.searchParams.get("end");

  if (!clientId || !start || !end) {
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
    .select("google_access_token, google_refresh_token, google_calendar_id, google_token_expiry")
    .eq("id", clientId)
    .maybeSingle();

  if (!client?.google_access_token) {
    return NextResponse.json({ events: [], connected: false });
  }

  try {
    const cal = calendarClient(
      client.google_access_token,
      client.google_refresh_token ?? "",
      client.google_token_expiry,
      clientId
    );
    const calendarId = client.google_calendar_id ?? "primary";

    const { data } = await cal.events.list({
      calendarId,
      timeMin: start,
      timeMax: end,
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 250,
    });

    const events = (data.items ?? []).map((e) => ({
      id: e.id,
      title: e.summary ?? "Event",
      start: e.start?.dateTime ?? e.start?.date,
      end: e.end?.dateTime ?? e.end?.date,
      description: e.description ?? null,
      location: e.location ?? null,
      source: "google",
    }));

    return NextResponse.json({ events, connected: true, calendarId });
  } catch (err: unknown) {
    const wasAuthError = await handleCalendarAuthError(err, clientId);
    if (wasAuthError) {
      return NextResponse.json({ events: [], connected: false, error: "calendar_disconnected" });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[calendar/events] Failed to fetch events", { clientId, error: message });
    // Token exists but a transient error occurred — don't mark as disconnected.
    return NextResponse.json({ error: message, events: [], connected: true }, { status: 500 });
  }
}
