import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const token = params.token;
  if (!token || token.length < 10) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { data: invoice } = await db
    .from("invoices")
    .select(`
      id, invoice_number, version, status,
      customer_name, customer_mobile,
      issued_at, due_at, paid_at,
      subtotal_zar, vat_zar, total_zar, amount_paid_zar,
      notes, payment_terms, bank_details_snapshot,
      delivery_channels, branding_snapshot,
      customer_view_token, customer_viewed_count,
      invoice_line_items (id, sort_order, description, quantity, unit_price_zar, line_total_zar, tax_rate),
      clients (business_name, whatsapp_number, notification_phone, allow_cash_invoices)
    `)
    .eq("customer_view_token", token)
    .maybeSingle();

  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Log view
  const ip = _req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const ua = _req.headers.get("user-agent") ?? null;
  const now = new Date().toISOString();
  const existingLog = (invoice as unknown as { customer_view_log: Array<{ ts: string }> }).customer_view_log ?? [];
  const newEntry = { ts: now, ip, ua };

  const updates: Record<string, unknown> = {
    customer_viewed_count: (invoice.customer_viewed_count ?? 0) + 1,
    customer_view_log: [...existingLog.slice(-99), newEntry],
    updated_at: now,
  };

  if (!["paid", "cancelled", "refunded"].includes(invoice.status) && !(invoice as unknown as Record<string, unknown>).viewed_at) {
    updates.viewed_at = now;
    if (invoice.status === "sent") updates.status = "viewed";
  }

  await db.from("invoices").update(updates).eq("customer_view_token", token);

  // Sort line items
  const lineItems = ((invoice as unknown as { invoice_line_items: Array<Record<string, unknown>> }).invoice_line_items ?? [])
    .sort((a, b) => (a.sort_order as number) - (b.sort_order as number));

  return NextResponse.json({ ...invoice, invoice_line_items: lineItems });
}
