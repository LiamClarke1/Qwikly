import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";
import { add, multiply, toZar } from "@/lib/money";

export const dynamic = "force-dynamic";

async function getAuth(): Promise<{ userId: string; clientId: number; client: Record<string, unknown> } | null> {
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
  const { data: client } = await db.from("clients").select("*").eq("auth_user_id", user.id).maybeSingle();
  if (!client) return null;
  return { userId: user.id, clientId: client.id as number, client };
}

export async function GET(req: NextRequest) {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseAdmin();
  const params = req.nextUrl.searchParams;
  const status = params.get("status");
  const from = params.get("from");
  const to = params.get("to");
  const limit = Math.min(parseInt(params.get("limit") ?? "50"), 100);
  const offset = parseInt(params.get("offset") ?? "0");

  let query = db
    .from("invoices")
    .select("*, invoice_line_items(*)", { count: "exact" })
    .eq("client_id", auth.clientId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status && status !== "all") query = query.eq("status", status);
  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ invoices: data ?? [], total: count ?? 0 });
}

export async function POST(req: NextRequest) {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check account restrictions
  if ((auth.client as Record<string, unknown>).crm_status === "paused") {
    return NextResponse.json({ error: "Account paused. Please settle your outstanding Qwikly balance." }, { status: 403 });
  }

  const body = await req.json();

  if (!body.customer_name?.trim()) {
    return NextResponse.json({ error: "Customer name is required" }, { status: 400 });
  }

  const lineItems: Array<{
    description: string;
    quantity: number;
    unit_price_zar: number;
    tax_rate: number;
    discount_amount_zar: number;
    discount_pct: number;
    booking_id?: number | null;
    sort_order: number;
  }> = body.line_items ?? [];

  if (lineItems.length === 0) {
    return NextResponse.json({ error: "At least one line item is required" }, { status: 400 });
  }

  // Compute totals
  let subtotal = 0;
  let discountTotal = 0;
  let vatTotal = 0;

  const computedItems = lineItems.map((li, idx) => {
    const gross = multiply(li.unit_price_zar, li.quantity);
    const discAmt = li.discount_pct > 0 ? toZar(gross * li.discount_pct) : li.discount_amount_zar;
    const lineNet = toZar(gross - discAmt);
    const lineTax = toZar(lineNet * li.tax_rate);
    subtotal = add(subtotal, lineNet);
    discountTotal = add(discountTotal, discAmt);
    vatTotal = add(vatTotal, lineTax);
    return { ...li, sort_order: idx, line_total_zar: lineNet, discount_amount_zar: discAmt };
  });

  const total = add(subtotal, vatTotal);
  if (total <= 0) return NextResponse.json({ error: "Invoice total must be greater than zero" }, { status: 400 });

  const db = supabaseAdmin();
  const client = auth.client as Record<string, unknown>;

  const { data: invoice, error: invErr } = await db
    .from("invoices")
    .insert({
      client_id: auth.clientId,
      status: body.scheduled_send_at ? "scheduled" : "draft",
      customer_id: body.customer_id ?? null,
      customer_name: body.customer_name.trim(),
      customer_mobile: body.customer_mobile ?? null,
      customer_email: body.customer_email ?? null,
      customer_address: body.customer_address ?? null,
      customer_vat_number: body.customer_vat_number ?? null,
      due_at: body.due_at ?? null,
      scheduled_send_at: body.scheduled_send_at ?? null,
      subtotal_zar: subtotal,
      discount_total_zar: discountTotal,
      vat_zar: vatTotal,
      total_zar: total,
      notes: body.notes ?? null,
      internal_notes: body.internal_notes ?? null,
      payment_terms: body.payment_terms ?? (client.invoice_terms_default as string | null) ?? "Net 7",
      bank_details_snapshot: {
        bank_name: client.bank_name,
        bank_account_number: client.bank_account_number,
        bank_branch_code: client.bank_branch_code,
        bank_account_type: client.bank_account_type,
      },
      delivery_channels: body.delivery_channels ?? ["whatsapp", "email"],
      delivery_scheduled: !!body.scheduled_send_at,
      branding_snapshot: {
        logo_url: client.invoice_logo_url,
        accent_color: client.invoice_accent_color ?? "#E85A2C",
        footer_text: client.invoice_footer_text,
      },
      created_by: auth.userId,
      updated_by: auth.userId,
    })
    .select()
    .single();

  if (invErr) return NextResponse.json({ error: invErr.message }, { status: 500 });

  // Insert line items
  if (computedItems.length > 0) {
    await db.from("invoice_line_items").insert(
      computedItems.map((li) => ({ ...li, invoice_id: invoice.id }))
    );
  }

  // Log audit event
  await db.from("audit_events").insert({
    actor_id: auth.userId,
    actor_type: "user",
    event_type: "invoice.created",
    entity_type: "invoice",
    entity_id: invoice.id,
    payload: { total_zar: total, customer_name: body.customer_name },
  });

  return NextResponse.json(invoice, { status: 201 });
}
