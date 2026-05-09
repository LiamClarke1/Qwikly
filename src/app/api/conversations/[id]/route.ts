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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const clientId = await getClientId();
  if (!clientId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseAdmin();

  // Verify this conversation belongs to the authenticated client.
  const { data: convo } = await db
    .from("conversations")
    .select("id")
    .eq("id", id)
    .eq("client_id", clientId)
    .maybeSingle();

  if (!convo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // POPIA soft-delete: set deleted_at on conversation, messages, and documents.
  // Audit trail is preserved; the daily /api/cron/data-retention pass hard-
  // deletes everything (and removes the storage objects) within 24 hours.
  const now = new Date().toISOString();

  const { error: convErr } = await db
    .from("conversations")
    .update({ deleted_at: now })
    .eq("id", id);
  if (convErr) return NextResponse.json({ error: convErr.message }, { status: 500 });

  await db
    .from("messages_log")
    .update({ deleted_at: now })
    .eq("conversation_id", id)
    .is("deleted_at", null);

  await db
    .from("conversation_documents")
    .update({ deleted_at: now, status: "deleted" })
    .eq("conversation_id", id)
    .is("deleted_at", null);

  return NextResponse.json({ ok: true, soft_deleted: true });
}
