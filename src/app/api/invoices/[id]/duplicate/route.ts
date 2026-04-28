import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
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
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseAdmin();
  const { data: clientRow } = await db.from("clients").select("id").eq("auth_user_id", user.id).maybeSingle();
  if (!clientRow) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: source } = await db
    .from("invoices")
    .select("*, invoice_line_items(*)")
    .eq("id", params.id)
    .eq("client_id", clientRow.id)
    .maybeSingle();

  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Create draft copy
  const { id: _id, invoice_number: _n, status: _s, sent_at: _sa, viewed_at: _va, paid_at: _pa, cancelled_at: _ca,
    issued_at: _ia, customer_viewed_count: _vc, customer_view_log: _vl, customer_view_token: _vt,
    qwikly_commission_zar: _qc, qwikly_commission_locked: _ql, qwikly_billing_invoice_id: _qbi,
    qwikly_ping_sent_at: _qp, delivery_sent_log: _dl, amount_paid_zar: _ap,
    created_at: _cat, updated_at: _uat, created_by: _cb, updated_by: _ub,
    invoice_line_items: lineItems, ...rest } = source;

  const { data: newInvoice, error } = await db
    .from("invoices")
    .insert({
      ...rest,
      status: "draft",
      amount_paid_zar: 0,
      delivery_sent_log: [],
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (lineItems?.length) {
    await db.from("invoice_line_items").insert(
      (lineItems as Array<Record<string, unknown>>).map(({ id: _lid, invoice_id: _liid, created_at: _lcat, ...li }) => ({
        ...li,
        invoice_id: newInvoice.id,
      }))
    );
  }

  await db.from("audit_events").insert({
    actor_id: user.id,
    actor_type: "user",
    event_type: "invoice.duplicated",
    entity_type: "invoice",
    entity_id: newInvoice.id,
    payload: { source_invoice_id: params.id },
  });

  return NextResponse.json({ id: newInvoice.id }, { status: 201 });
}
