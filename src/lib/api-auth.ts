// Resolves the authed user's client_id from the Supabase session cookie.
// Used by API routes that need to scope writes to the caller's own client.
//
// Returns null when there's no session or no matching client row, so callers
// can return 401 without having to chase down the auth shape themselves.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function getAuthedClientId(): Promise<number | null> {
  const cookieStore = cookies();
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return null;
  const db = supabaseAdmin();
  const { data: client } = await db
    .from("clients")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  return (client as { id?: number } | null)?.id ?? null;
}
