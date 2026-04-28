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
  const { data: clients } = await db
    .from("clients")
    .select("id, business_name, risk_score, risk_flags, status, created_at")
    .order("risk_score", { ascending: false });

  if (!clients) return NextResponse.json({ clients: [] });

  const enriched = await Promise.all(clients.map(async c => {
    const [invoiceStats, lastInvoice] = await Promise.all([
      db.from("invoices").select("status, total_zar, amount_paid_zar").eq("client_id", c.id),
      db.from("invoices").select("created_at").eq("client_id", c.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    const all = invoiceStats.data ?? [];
    const overdue = all.filter(i => i.status === "overdue");
    return {
      ...c,
      invoice_count: all.length,
      overdue_count: overdue.length,
      total_overdue_zar: overdue.reduce((s, i) => s + (i.total_zar - i.amount_paid_zar), 0),
      last_invoice_at: lastInvoice.data?.created_at ?? null,
    };
  }));

  return NextResponse.json({ clients: enriched });
}
