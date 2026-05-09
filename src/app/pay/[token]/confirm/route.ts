import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { verifyInvoicePayToken } from "@/lib/invoiceLinks";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: { token: string } }) {
  const verified = verifyInvoicePayToken(params.token);
  if (!verified.ok) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const sb = supabaseAdmin();

  const inv = await sb
    .from("qwikly_billing_invoices")
    .select("id, status")
    .eq("id", verified.invoiceId)
    .maybeSingle();

  if (inv.error || !inv.data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const status = inv.data.status as string;

  if (status === "paid") {
    return NextResponse.json({ error: "already_paid" }, { status: 409 });
  }

  if (status === "awaiting_verification") {
    return NextResponse.json({ ok: true, status: "awaiting_verification", already: true });
  }

  if (status !== "sent" && status !== "overdue") {
    return NextResponse.json({ error: "invalid_status_transition", from: status }, { status: 409 });
  }

  const nowIso = new Date().toISOString();
  const upd = await sb
    .from("qwikly_billing_invoices")
    .update({
      status: "awaiting_verification",
      client_marked_paid_at: nowIso,
    })
    .eq("id", verified.invoiceId)
    .eq("status", status);

  if (upd.error) {
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: "awaiting_verification" });
}
