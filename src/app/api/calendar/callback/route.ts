import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { getOAuthClient } from "@/lib/google-calendar";
import { google } from "googleapis";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").trim();

  if (error || !code || !state) {
    return NextResponse.redirect(`${siteUrl}/dashboard/settings?tab=integrations&cal=error`);
  }

  const dotIndex = state.lastIndexOf(".");
  if (dotIndex === -1) {
    return NextResponse.redirect(`${siteUrl}/dashboard/settings?tab=integrations&cal=error`);
  }
  const clientId = state.slice(0, dotIndex);
  const receivedHmac = state.slice(dotIndex + 1);
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[calendar/callback] CRON_SECRET env var is not set");
    return NextResponse.redirect(`${siteUrl}/dashboard/settings?tab=integrations&cal=error`);
  }
  const expectedHmac = createHmac("sha256", cronSecret)
    .update(clientId)
    .digest("hex");
  if (receivedHmac !== expectedHmac) {
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
  } catch (err) {
    console.error("[calendar/callback] Failed to fetch Google account email — tokens stored without email", err);
    // non-fatal — calendar still works without the email label
  }

  const db = supabaseAdmin();
  await db.from("clients").update({
    google_access_token: tokens.access_token,
    google_refresh_token: tokens.refresh_token ?? null,
    google_token_expiry: tokens.expiry_date ?? null,
    google_calendar_id: calendarEmail ?? undefined,
  }).eq("id", clientId);

  return NextResponse.redirect(`${siteUrl}/dashboard/settings?tab=integrations&cal=connected`);
}
