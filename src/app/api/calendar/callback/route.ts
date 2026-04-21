import { NextRequest, NextResponse } from "next/server";
import { getOAuthClient } from "@/lib/google-calendar";
import { google } from "googleapis";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state"); // clientId
  const error = req.nextUrl.searchParams.get("error");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  if (error || !code || !state) {
    return NextResponse.redirect(`${siteUrl}/dashboard/settings?tab=integrations&cal=error`);
  }

  const auth = getOAuthClient();
  const { tokens } = await auth.getToken(code);
  auth.setCredentials(tokens);

  // Get the connected calendar email
  let calendarEmail: string | null = null;
  try {
    const oauth2 = google.oauth2({ version: "v2", auth });
    const { data } = await oauth2.userinfo.get();
    calendarEmail = data.email ?? null;
  } catch {
    // non-fatal — we still store tokens
  }

  const db = supabaseAdmin();
  await db.from("clients").update({
    google_access_token: tokens.access_token,
    google_refresh_token: tokens.refresh_token ?? null,
    google_token_expiry: tokens.expiry_date ?? null,
    google_calendar_id: calendarEmail ?? undefined,
  }).eq("id", state);

  return NextResponse.redirect(`${siteUrl}/dashboard/settings?tab=integrations&cal=connected`);
}
