import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { calendarClient, handleCalendarAuthError } from "@/lib/google-calendar";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function DELETE(req: NextRequest) {
  const { clientId, eventId, calendarId: calId } = await req.json() as {
    clientId: string;
    eventId: string;
    calendarId?: string;
  };

  if (!clientId || !eventId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const cookieStore = cookies();
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseAdmin();
  const { data: client } = await db
    .from("clients")
    .select("google_access_token, google_refresh_token, google_calendar_id, google_token_expiry")
    .eq("id", clientId)
    .maybeSingle();

  if (!client?.google_access_token) {
    return NextResponse.json({ error: "Calendar not connected" }, { status: 400 });
  }

  try {
    const cal = calendarClient(client.google_access_token, client.google_refresh_token ?? "", client.google_token_expiry, clientId);
    const calendarId = calId ?? client.google_calendar_id ?? "primary";
    await cal.events.delete({ calendarId, eventId });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const wasAuthError = await handleCalendarAuthError(err, clientId);
    if (wasAuthError) return NextResponse.json({ error: "calendar_disconnected" }, { status: 401 });
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[calendar/delete]", { clientId, eventId, error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
