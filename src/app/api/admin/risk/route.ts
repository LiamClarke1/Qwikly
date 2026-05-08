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
    .select("id, business_name, risk_score, risk_flags, crm_status, created_at")
    .order("risk_score", { ascending: false });

  if (!clients || clients.length === 0) return NextResponse.json({ clients: [] });

  // Batched: pull invoices and last-invoice timestamps for ALL clients in two
  // queries instead of two-per-client. Previously this fanned out N+1 and would
  // start failing at ~50 clients.
  const clientIds = clients.map(c => c.id);

  const [invoicesRes, lastInvoiceRes] = await Promise.all([
    db.from("invoices")
      .select("client_id, status, total_zar, amount_paid_zar")
      .in("client_id", clientIds),
    db.from("invoices")
      .select("client_id, created_at")
      .in("client_id", clientIds)
      .order("created_at", { ascending: false }),
  ]);

  const allInvoices = invoicesRes.data ?? [];
  const lastInvoiceByClient = new Map<number, string>();
  for (const row of (lastInvoiceRes.data ?? []) as Array<{ client_id: number; created_at: string }>) {
    if (!lastInvoiceByClient.has(row.client_id)) {
      lastInvoiceByClient.set(row.client_id, row.created_at);
    }
  }

  const invoicesByClient = new Map<number, Array<{ status: string; total_zar: number; amount_paid_zar: number }>>();
  for (const inv of allInvoices as Array<{ client_id: number; status: string; total_zar: number; amount_paid_zar: number }>) {
    const arr = invoicesByClient.get(inv.client_id) ?? [];
    arr.push({ status: inv.status, total_zar: inv.total_zar, amount_paid_zar: inv.amount_paid_zar });
    invoicesByClient.set(inv.client_id, arr);
  }

  const enriched = clients.map(c => {
    const all = invoicesByClient.get(c.id) ?? [];
    const overdue = all.filter(i => i.status === "overdue");
    return {
      ...c,
      invoice_count: all.length,
      overdue_count: overdue.length,
      total_overdue_zar: overdue.reduce((s, i) => s + (i.total_zar - i.amount_paid_zar), 0),
      last_invoice_at: lastInvoiceByClient.get(c.id) ?? null,
    };
  });

  return NextResponse.json({ clients: enriched });
}
