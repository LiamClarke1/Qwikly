import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";
import { resend, FROM } from "@/lib/resend";
import { sendWhatsAppMessage } from "@/lib/twilio-whatsapp";
import { invoiceReceiptHtml } from "@/lib/invoices/email";
import { invoiceReceiptWa, clientPaymentReceivedWa, customerAuditPingWa } from "@/lib/invoices/whatsapp";
import { add, exVat, commission, toZar } from "@/lib/money";
import { assertTransition } from "@/lib/invoices/stateMachine";
import type { InvoiceStatus } from "@/lib/invoices/types";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.qwikly.co.za";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
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
  const { data: clientRow } = await db.from("clients").select("*").eq("auth_user_id", user.id).maybeSingle();
  if (!clientRow) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: invoice } = await db
    .from("invoices")
    .select("*")
    .eq("id", params.id)
    .eq("client_id", clientRow.id)
    .maybeSingle();

  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const amountPaid: number = parseFloat(body.amount_zar);
  if (!amountPaid || amountPaid <= 0) return NextResponse.json({ error: "Amount must be positive" }, { status: 400 });

  const currentStatus = invoice.status as InvoiceStatus;
  const newAmountPaid = add(invoice.amount_paid_zar, amountPaid);
  const amountDue = toZar(invoice.total_zar - newAmountPaid);
  const newStatus: InvoiceStatus = amountDue <= 0 ? "paid" : "partial_paid";

  // Validate transition (from any active status to paid/partial)
  // Allow from: sent, viewed, partial_paid, overdue, disputed
  const validSources: InvoiceStatus[] = ["sent", "viewed", "partial_paid", "overdue", "disputed"];
  if (!validSources.includes(currentStatus)) {
    try { assertTransition(currentStatus, newStatus); } catch {
      return NextResponse.json({ error: `Cannot record payment on invoice with status '${currentStatus}'` }, { status: 400 });
    }
  }

  const now = new Date().toISOString();

  // Compute commission on the paid portion's ex-VAT value
  const vatRate = invoice.vat_zar > 0 ? 0.15 : 0;
  const paidExVat = vatRate > 0 ? exVat(amountPaid, vatRate) : amountPaid;
  const commissionRate: number = (clientRow.commission_rate as number) ?? 0.08;
  const commissionZar = commission(paidExVat, commissionRate);

  // Insert payment record
  const idempotencyKey = body.idempotency_key ?? `${params.id}-${now}`;
  const { data: payment, error: payErr } = await db.from("payments").insert({
    invoice_id: params.id,
    client_id: clientRow.id,
    amount_zar: amountPaid,
    paid_at: body.paid_at ?? now,
    method: body.method ?? "other",
    external_ref: body.external_ref ?? null,
    payer_name: body.payer_name ?? null,
    proof_url: body.proof_url ?? null,
    source: "client_marked",
    verified: true,
    verified_at: now,
    verified_by: user.id,
    qwikly_commission_zar: commissionZar,
    notes: body.notes ?? null,
    idempotency_key: idempotencyKey,
  }).select().single();

  if (payErr) {
    if (payErr.code === "23505") return NextResponse.json({ error: "Duplicate payment" }, { status: 409 });
    return NextResponse.json({ error: payErr.message }, { status: 500 });
  }

  // Update invoice
  const invoiceUpdate: Record<string, unknown> = {
    amount_paid_zar: newAmountPaid,
    status: newStatus,
    updated_at: now,
    updated_by: user.id,
  };
  if (newStatus === "paid") {
    invoiceUpdate.paid_at = now;
    invoiceUpdate.qwikly_commission_zar = commissionZar;
  }
  await db.from("invoices").update(invoiceUpdate).eq("id", params.id);

  // Issue receipt
  let seqData: string | null = null;
  try { const r = await db.rpc("nextval", { sequence_name: "receipt_number_seq" }).maybeSingle(); seqData = r.data as string | null; } catch { seqData = null; }
  const receiptNumber = `REC-${new Date().getFullYear()}-${String(seqData ?? Date.now()).padStart(4, "0")}`;

  await db.from("receipts").insert({
    invoice_id: params.id,
    payment_id: payment.id,
    client_id: clientRow.id,
    receipt_number: receiptNumber,
    total_zar: amountPaid,
    issued_at: now,
    channels: invoice.delivery_channels,
  });

  const publicUrl = `${BASE_URL}/i/${invoice.customer_view_token}`;

  // Send receipt to customer
  if (invoice.customer_mobile) {
    sendWhatsAppMessage(invoice.customer_mobile, invoiceReceiptWa({
      customerName: invoice.customer_name,
      businessName: clientRow.business_name ?? "Your service provider",
      amountPaidZar: amountPaid,
      receiptNumber,
      publicUrl,
    })).catch(() => {});
  }

  if (invoice.customer_email) {
    resend.emails.send({
      from: FROM,
      to: [invoice.customer_email],
      subject: `Receipt ${receiptNumber} — ${clientRow.business_name}`,
      html: invoiceReceiptHtml({
        customerName: invoice.customer_name,
        businessName: clientRow.business_name ?? "Your service provider",
        invoiceNumber: invoice.invoice_number ?? params.id.slice(0, 8),
        amountPaidZar: amountPaid,
        paidAt: now,
        receiptNumber,
        publicUrl,
        accentColor: (clientRow.invoice_accent_color as string) ?? "#E85A2C",
      }),
    }).catch(() => {});
  }

  // Notify client
  if (clientRow.whatsapp_number) {
    const invoiceUrl = `${BASE_URL}/dashboard/invoices/${params.id}`;
    sendWhatsAppMessage(clientRow.whatsapp_number, clientPaymentReceivedWa({
      businessName: clientRow.business_name ?? "",
      customerName: invoice.customer_name,
      amountPaidZar: amountPaid,
      invoiceNumber: invoice.invoice_number ?? params.id.slice(0, 8),
      method: body.method ?? "other",
      invoiceUrl,
    })).catch(() => {});
  }

  // Layer 3: Schedule audit ping for cash/client_marked payments (5–10% sample)
  const isCashOrManual = (body.method === "cash" || !body.method || body.method === "other");
  if (isCashOrManual && invoice.customer_mobile && Math.random() < 0.08) {
    setTimeout(async () => {
      try {
        await db.from("audit_pings").insert({
          invoice_id: params.id,
          payment_id: payment.id,
          client_id: clientRow.id,
          customer_mobile: invoice.customer_mobile,
          customer_name: invoice.customer_name,
          amount_zar: amountPaid,
        });
        await sendWhatsAppMessage(invoice.customer_mobile, customerAuditPingWa({
          customerName: invoice.customer_name,
          businessName: clientRow.business_name ?? "",
          amountZar: amountPaid,
          paidAt: now,
          serviceDescription: invoice.invoice_line_items?.[0]?.description,
        }));
      } catch { /* non-fatal */ }
    }, 24 * 60 * 60 * 1000);
  }

  await db.from("audit_events").insert({
    actor_id: user.id,
    actor_type: "user",
    event_type: "invoice.payment_recorded",
    entity_type: "invoice",
    entity_id: params.id,
    payload: { amount_zar: amountPaid, method: body.method, new_status: newStatus, commission_zar: commissionZar },
  });

  return NextResponse.json({ ok: true, payment_id: payment.id, receipt_number: receiptNumber, new_status: newStatus, commission_zar: commissionZar });
}
