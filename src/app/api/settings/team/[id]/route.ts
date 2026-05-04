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
  const { role } = body as { role?: string };
  if (!role || !["admin", "editor", "viewer"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("team_members")
    .update({ role })
    .eq("id", params.id)
    .eq("client_id", auth.clientId)
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseAdmin();
  const { error } = await db
    .from("team_members")
    .update({ status: "revoked" })
    .eq("id", params.id)
    .eq("client_id", auth.clientId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
