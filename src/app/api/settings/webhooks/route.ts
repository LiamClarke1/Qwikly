import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";
import { randomBytes } from "crypto";

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

export async function GET() {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("webhooks")
    .select("id, url, events, is_active, created_at, last_fired_at, last_status")
    .eq("client_id", auth.clientId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { url, events } = body as { url?: string; events?: string[] };

  if (!url?.trim()) return NextResponse.json({ error: "url is required" }, { status: 400 });
  if (!Array.isArray(events) || events.length === 0) {
    return NextResponse.json({ error: "at least one event is required" }, { status: 400 });
  }

  try { new URL(url); } catch {
    return NextResponse.json({ error: "url must be a valid URL" }, { status: 400 });
  }

  const secret = randomBytes(16).toString("hex");

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("webhooks")
    .insert({ client_id: auth.clientId, url: url.trim(), events, secret, is_active: true })
    .select("id, url, events, is_active, created_at, last_fired_at, last_status")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  // Return secret once on creation
  return NextResponse.json({ ...data, secret }, { status: 201 });
}
