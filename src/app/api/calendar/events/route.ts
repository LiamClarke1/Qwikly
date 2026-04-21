import { NextRequest, NextResponse } from "next/server";
import { calendarClient } from "@/lib/google-calendar";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get("clientId");
  const start = req.nextUrl.searchParams.get("start");
  const end = req.nextUrl.searchParams.get("end");

  if (!clientId || !start || !end) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: client } = await db
    .from("clients")
    .select("google_access_token, google_refresh_token, google_calendar_id")
    .eq("id", clientId)
    .maybeSingle();

  if (!client?.google_access_token) {
    return NextResponse.json({ events: [], connected: false });
  }

  try {
    const cal = calendarClient(client.google_access_token, client.google_refresh_token ?? "");
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
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message, events: [], connected: false }, { status: 500 });
  }
}
