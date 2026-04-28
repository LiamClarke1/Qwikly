import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";
import { add, multiply, toZar } from "@/lib/money";
import { isEditable, assertTransition } from "@/lib/invoices/stateMachine";
import type { InvoiceStatus } from "@/lib/invoices/types";

export const dynamic = "force-dynamic";

async function getAuth(): Promise<{ userId: string; clientId: number } | null> {
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
  const { data } = await db.from("clients").select("id").eq("auth_user_id", user.id).maybeSingle();
  if (!data) return null;
  return { userId: user.id, clientId: data.id as number };
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseAdmin();
  const { data } = await db
    .from("invoices")
    .select("*, invoice_line_items(*), payments(*), invoice_attachments(*)")
    .eq("id", params.id)
    .eq("client_id", auth.clientId)
    .maybeSingle();

  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseAdmin();
  const { data: existing } = await db
    .from("invoices")
    .select("*")
    .eq("id", params.id)
    .eq("client_id", auth.clientId)
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();

  // If invoice has been sent, snapshot the current version before editing
  if (!isEditable(existing.status as InvoiceStatus)) {
    const snapshot = { ...existing };
    await db.from("invoice_versions").insert({
      invoice_id: params.id,
      version_no: existing.version,
      snapshot_jsonb: snapshot,
      edited_by: auth.userId,
      reason: body.edit_reason ?? "Revision",
    });
  }

  // Recompute totals if line items provided
  let updates: Record<string, unknown> = {
    ...body,
    updated_by: auth.userId,
    updated_at: new Date().toISOString(),
  };
  delete updates.line_items;
  delete updates.edit_reason;

  if (body.line_items) {
    let subtotal = 0;
    let discountTotal = 0;
    let vatTotal = 0;

    const computedItems = (body.line_items as Array<{
      description: string;
      quantity: number;
      unit_price_zar: number;
      tax_rate: number;
      discount_amount_zar: number;
      discount_pct: number;
      booking_id?: number | null;
      sort_order: number;
    }>).map((li, idx) => {
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
    updates = { ...updates, subtotal_zar: subtotal, discount_total_zar: discountTotal, vat_zar: vatTotal, total_zar: total };

    // Replace line items
    await db.from("invoice_line_items").delete().eq("invoice_id", params.id);
    if (computedItems.length > 0) {
      await db.from("invoice_line_items").insert(computedItems.map((li) => ({ ...li, invoice_id: params.id })));
    }
  }

  // Increment version if editing a sent invoice
  if (!isEditable(existing.status as InvoiceStatus)) {
    updates.version = (existing.version as number) + 1;
  }

  const { data, error } = await db
    .from("invoices")
    .update(updates)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await db.from("audit_events").insert({
    actor_id: auth.userId,
    actor_type: "user",
    event_type: "invoice.updated",
    entity_type: "invoice",
    entity_id: params.id,
    payload: { fields_changed: Object.keys(body) },
  });

  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseAdmin();
  const { data: existing } = await db
    .from("invoices")
    .select("status")
    .eq("id", params.id)
    .eq("client_id", auth.clientId)
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const status = existing.status as InvoiceStatus;
  try {
    assertTransition(status, "cancelled");
  } catch {
    return NextResponse.json({ error: "Only draft invoices can be deleted. Use cancel for sent invoices." }, { status: 400 });
  }

  if (status === "draft") {
    await db.from("invoice_line_items").delete().eq("invoice_id", params.id);
    await db.from("invoices").delete().eq("id", params.id);
  } else {
    await db.from("invoices").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", params.id);
  }

  await db.from("audit_events").insert({
    actor_id: auth.userId,
    actor_type: "user",
    event_type: status === "draft" ? "invoice.deleted" : "invoice.cancelled",
    entity_type: "invoice",
    entity_id: params.id,
    payload: {},
  });

  return NextResponse.json({ ok: true });
}
