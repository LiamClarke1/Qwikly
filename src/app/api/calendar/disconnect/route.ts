import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const { clientId } = await req.json();
  if (!clientId) return NextResponse.json({ error: "Missing clientId" }, { status: 400 });

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

  const { data: ownedClient } = await db
    .from("clients")
    .select("id, google_access_token, google_refresh_token")
    .eq("id", clientId)
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!ownedClient) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Revoke the Google OAuth token so the permission is removed from the user's Google account.
  // Prefer the refresh token — revoking it invalidates all access tokens derived from it.
  const tokenToRevoke = ownedClient.google_refresh_token ?? ownedClient.google_access_token;
  if (tokenToRevoke) {
    try {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(tokenToRevoke)}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
    } catch {
      // Non-fatal — token may already be expired. Still clear DB fields.
    }
  }

  await db.from("clients").update({
    google_access_token: null,
    google_refresh_token: null,
    google_token_expiry: null,
  }).eq("id", clientId);

  return NextResponse.json({ ok: true });
}
