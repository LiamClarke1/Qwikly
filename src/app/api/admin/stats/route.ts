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
  const [clientsRes, invoicesRes, periodsRes, disputesRes] = await Promise.all([
    db.from("clients").select("id, onboarding_complete, risk_score"),
    db.from("invoices").select("total_zar, amount_paid_zar, qwikly_commission_zar, status"),
    db.from("qwikly_billing_periods").select("commission_zar, status, period_start").order("period_start", { ascending: false }).limit(50),
    db.from("disputes").select("id").eq("status", "open"),
  ]);

  const clients = clientsRes.data ?? [];
  const invoices = invoicesRes.data ?? [];
  const periods = periodsRes.data ?? [];

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  return NextResponse.json({
    total_clients: clients.length,
    active_clients: clients.filter(c => c.onboarding_complete === true).length,
    high_risk_clients: clients.filter(c => (c.risk_score ?? 0) >= 70).length,
    total_invoices_sent: invoices.length,
    total_paid_zar: invoices.reduce((s, i) => s + (i.amount_paid_zar ?? 0), 0),
    total_commission_zar: invoices.reduce((s, i) => s + (i.qwikly_commission_zar ?? 0), 0),
    current_period_commission: periods.filter(p => p.period_start >= monthStart).reduce((s, p) => s + (p.commission_zar ?? 0), 0),
    open_disputes: disputesRes.data?.length ?? 0,
  });
}
