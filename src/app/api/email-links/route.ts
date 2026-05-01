import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";
import { nanoid } from "nanoid";

export const dynamic = "force-dynamic";

async function getClientId(req: NextRequest): Promise<number | null> {
  const cookieStore = cookies();
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cs) { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); },
      },
    }
  );
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return null;
  const db = supabaseAdmin();
  const { data } = await db.from("clients").select("id").eq("auth_user_id", user.id).maybeSingle();
  return data ? (data.id as number) : null;
}

export async function GET(req: NextRequest) {
  const clientId = await getClientId(req);
  if (!clientId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseAdmin();
  const { data } = await db
    .from("email_links")
    .select("id, slug, destination_url, campaign, utm_source, utm_medium, utm_content, click_count, unique_clicks, created_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const clientId = await getClientId(req);
  if (!clientId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.destination_url) return NextResponse.json({ error: "destination_url is required" }, { status: 400 });

  const slug = body.slug?.trim() || nanoid(8);
  const db = supabaseAdmin();

  const { data, error } = await db
    .from("email_links")
    .insert({
      client_id: clientId,
      slug,
      destination_url: body.destination_url,
      campaign: body.campaign ?? null,
      utm_source: body.utm_source ?? "qwikly",
      utm_medium: body.utm_medium ?? "email",
      utm_content: body.utm_content ?? null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "That slug is already taken" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
