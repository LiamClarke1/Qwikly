import { google } from "googleapis";
import { supabaseAdmin } from "@/lib/supabase-server";

export function getOAuthClient() {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim();
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${siteUrl}/api/calendar/callback`
  );
}

export const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

/**
 * Returns a Google Calendar client that:
 * 1. Auto-refreshes the access token when it expires (via googleapis)
 * 2. Persists the new access token back to the DB on refresh
 * 3. Marks the calendar as disconnected if the refresh token is revoked (401)
 *
 * Pass clientId so token refresh events can be written back to the correct row.
 */
export function calendarClient(
  accessToken: string,
  refreshToken: string,
  tokenExpiry?: number | null,
  clientId?: string
) {
  const auth = getOAuthClient();
  auth.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
    expiry_date: tokenExpiry ?? undefined,
  });

  // Persist refreshed tokens so we don't re-auth unnecessarily.
  if (clientId) {
    auth.on("tokens", async (tokens) => {
      if (tokens.access_token) {
        const db = supabaseAdmin();
        await db
          .from("clients")
          .update({
            google_access_token: tokens.access_token,
            ...(tokens.expiry_date != null && { google_token_expiry: tokens.expiry_date }),
          })
          .eq("id", clientId);
      }
    });
  }

  return google.calendar({ version: "v3", auth });
}

/**
 * Call this when a Google API call throws to determine whether
 * the failure is a revoked/expired refresh token (user disconnected
 * the app from Google). If so, marks the client as disconnected
 * in the DB and returns a user-facing error message.
 *
 * Returns `true` if the error was a 401 (handled); `false` otherwise.
 */
export async function handleCalendarAuthError(
  err: unknown,
  clientId: string
): Promise<boolean> {
  const code = (err as { code?: number | string })?.code;
  const status = (err as { status?: number })?.status;

  if (code === 401 || status === 401 || String(code) === "401") {
    console.error("[google-calendar] Refresh token revoked — marking calendar disconnected", { clientId });
    const db = supabaseAdmin();
    await db
      .from("clients")
      .update({
        google_access_token: null,
        google_refresh_token: null,
        google_token_expiry: null,
      })
      .eq("id", clientId);
    return true;
  }
  return false;
}

export async function getFreshTokens(refreshToken: string) {
  const auth = getOAuthClient();
  auth.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await auth.refreshAccessToken();
  return credentials;
}
