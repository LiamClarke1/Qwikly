import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

async function assertAdmin(): Promise<boolean> {
  const cookieStore = cookies();
  const auth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: (s) => s.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } }
  );
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return false;
  const db = supabaseAdmin();
  const { data } = await db.from("admin_users").select("id").eq("user_id", user.id).maybeSingle();
  return !!data;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await assertAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = supabaseAdmin();
  const [clientRes, convosRes, kbRes] = await Promise.all([
    db.from("clients").select("*").eq("id", params.id).maybeSingle(),
    db.from("conversations")
      .select("id, customer_name, customer_phone, channel, status, created_at, summary, intent, next_action, email, visitor_id, page_url")
      .eq("client_id", params.id)
      .order("created_at", { ascending: false })
      .limit(100),
    db.from("kb_articles")
      .select("id, title, body, is_active, updated_at")
      .eq("client_id", params.id)
      .order("updated_at", { ascending: false }),
  ]);

  if (!clientRes.data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    client: clientRes.data,
    conversations: convosRes.data ?? [],
    kb_articles: kbRes.data ?? [],
  });
}
