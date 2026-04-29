import { NextResponse } from "next/server";
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

export async function GET() {
  if (!(await assertAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = supabaseAdmin();
  const [clientsRes, convoRes] = await Promise.all([
    db.from("clients")
      .select("id, business_name, trade, owner_name, client_email, web_widget_domain, web_widget_status, onboarding_complete, created_at")
      .order("created_at", { ascending: false }),
    db.from("conversations")
      .select("client_id, created_at")
      .order("created_at", { ascending: false })
      .limit(5000),
  ]);

  const clients = clientsRes.data ?? [];
  const convos = convoRes.data ?? [];

  const countMap: Record<number, number> = {};
  const lastMap: Record<number, string> = {};
  for (const c of convos) {
    countMap[c.client_id] = (countMap[c.client_id] ?? 0) + 1;
    if (!lastMap[c.client_id]) lastMap[c.client_id] = c.created_at;
  }

  return NextResponse.json({
    clients: clients.map(c => ({
      ...c,
      conversation_count: countMap[c.id] ?? 0,
      last_activity: lastMap[c.id] ?? null,
    })),
  });
}
