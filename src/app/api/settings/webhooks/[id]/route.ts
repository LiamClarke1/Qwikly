import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";

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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};
  if (typeof body.url === "string") {
    try { new URL(body.url); } catch { return NextResponse.json({ error: "Invalid URL" }, { status: 400 }); }
    patch.url = body.url.trim();
  }
  if (Array.isArray(body.events)) patch.events = body.events;
  if (typeof body.is_active === "boolean") patch.is_active = body.is_active;

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("webhooks")
    .update(patch)
    .eq("id", params.id)
    .eq("client_id", auth.clientId)
    .select("id, url, events, is_active, created_at, last_fired_at, last_status")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseAdmin();
  const { error } = await db
    .from("webhooks")
    .delete()
    .eq("id", params.id)
    .eq("client_id", auth.clientId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
