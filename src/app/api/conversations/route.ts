import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";

async function getClientId(): Promise<number | null> {
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
  if (!user) return null;
  const db = supabaseAdmin();
  const { data: client } = await db
    .from("clients")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  return client?.id ?? null;
}

// DELETE /api/conversations — clears all conversations for the authed user's client
export async function DELETE(_req: NextRequest) {
  const clientId = await getClientId();
  if (!clientId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseAdmin();

  // Get conversation IDs scoped to this client
  const { data: convos, error: fetchError } = await db
    .from("conversations")
    .select("id")
    .eq("client_id", clientId);

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  const ids = (convos ?? []).map((c: { id: string }) => c.id);
  if (ids.length === 0) return NextResponse.json({ ok: true, deleted: 0 });

  // messages_log has ON DELETE CASCADE but we delete explicitly for clarity
  await db.from("messages_log").delete().in("conversation_id", ids);

  const { error } = await db.from("conversations").delete().in("id", ids);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, deleted: ids.length });
}
