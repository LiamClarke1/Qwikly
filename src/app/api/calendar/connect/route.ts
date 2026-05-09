import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getOAuthClient, SCOPES } from "@/lib/google-calendar";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get("clientId");
  if (!clientId) {
    return NextResponse.json({ error: "Missing clientId" }, { status: 400 });
  }

  // Authenticate the caller and verify they own this clientId, otherwise the
  // callback would happily write Google tokens onto someone else's clients row.
  const cookieStore = cookies();
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (s) =>
          s.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
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
    .select("id")
    .eq("id", clientId)
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!ownedClient) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[calendar/connect] CRON_SECRET env var is not set");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }
  const hmac = createHmac("sha256", cronSecret)
    .update(clientId)
    .digest("hex");
  const state = `${clientId}.${hmac}`;

  const auth = getOAuthClient();
  const url = auth.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
    state,
  });

  return NextResponse.redirect(url);
}
