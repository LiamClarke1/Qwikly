import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";
import { createHash, randomBytes } from "crypto";

export const dynamic = "force-dynamic";

async function getAuth() {
  const cookieStore = cookies();
  const auth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (s) => s.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  );
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return null;

  const db = supabaseAdmin();
  const { data: client } = await db.from("clients").select("id").eq("auth_user_id", user.id).maybeSingle();
  if (!client) return null;

  return { userId: user.id, clientId: client.id as number };
}

// PATCH /api/settings/api-keys/[id] — rotate key (regenerate raw key)
export async function PATCH(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const raw = `qw_live_${randomBytes(24).toString("hex")}`;
  const hash = createHash("sha256").update(raw).digest("hex");
  const prefix = raw.slice(0, 16);

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("api_keys")
    .update({ key_hash: hash, key_prefix: prefix })
    .eq("id", params.id)
    .eq("client_id", auth.clientId)
    .is("revoked_at", null)
    .select("id, name, key_prefix, scopes, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ...data, full_key: raw });
}

// DELETE /api/settings/api-keys/[id] — revoke key
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseAdmin();
  const { error } = await db
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("client_id", auth.clientId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
