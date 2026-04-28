import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

async function getClientId(): Promise<number | null> {
  const cookieStore = cookies();
  const auth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: (s) => s.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } }
  );
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return null;
  const db = supabaseAdmin();
  const { data } = await db.from("clients").select("id").eq("auth_user_id", user.id).maybeSingle();
  return data?.id ?? null;
}

export async function GET(_req: NextRequest, { params }: { params: { period_id: string } }) {
  const clientId = await getClientId();
  if (!clientId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseAdmin();

  const { data: period } = await db
    .from("qwikly_billing_periods")
    .select(`
      id, period_start, period_end,
      total_invoiced_zar, total_paid_zar, total_paid_ex_vat_zar,
      commission_rate, commission_zar, vat_zar,
      status, locked_at, due_at, paid_at, created_at,
      qwikly_billing_invoices (id, invoice_number, total_zar, vat_zar, status, due_at, sent_at, paid_at, disputed_amount, line_items_jsonb)
    `)
    .eq("id", params.period_id)
    .eq("client_id", clientId)
    .maybeSingle();

  if (!period) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const billingInvoiceId = (period as unknown as { qwikly_billing_invoices?: { id: string } | null }).qwikly_billing_invoices?.id;

  const { data: invoicesSummary } = billingInvoiceId
    ? await db
        .from("invoices")
        .select("id, invoice_number, customer_name, total_zar, amount_paid_zar, qwikly_commission_zar, paid_at")
        .eq("client_id", clientId)
        .eq("qwikly_commission_locked", true)
        .eq("qwikly_billing_invoice_id", billingInvoiceId)
        .order("paid_at", { ascending: false })
    : { data: [] };

  return NextResponse.json({ ...period, invoices_summary: invoicesSummary ?? [] });
}
