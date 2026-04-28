import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { resend, FROM } from "@/lib/resend";
import { sendWhatsAppMessage } from "@/lib/twilio-whatsapp";
import { invoiceReceiptHtml } from "@/lib/invoices/email";
import { invoiceReceiptWa, clientPaymentReceivedWa } from "@/lib/invoices/whatsapp";
import { add, exVat, commission } from "@/lib/money";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.qwikly.co.za";

/**
 * Yoco payment webhook.
 * Configure in Yoco dashboard → Developers → Webhooks:
 *   URL: https://www.qwikly.co.za/api/webhooks/yoco
 *   Events: payment.succeeded, payment.failed, payment.refunded
 * Set YOCO_WEBHOOK_SECRET env var to the webhook signing secret from Yoco dashboard.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-yoco-signature") ?? "";

  // Signature verification (Yoco uses HMAC-SHA256)
  const webhookSecret = process.env.YOCO_WEBHOOK_SECRET;
  if (webhookSecret) {
    const { createHmac } = await import("crypto");
    const expected = createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
    if (signature !== expected) {
      console.error("Yoco webhook signature mismatch");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const eventType = event.type as string;
  const paymentData = event.payload as Record<string, unknown> ?? {};
  const externalId = (paymentData.id ?? event.id) as string;

  // Idempotency: reject duplicate webhook events
  const { data: existing } = await db
    .from("webhook_events")
    .select("id")
    .eq("provider", "yoco")
    .eq("external_id", externalId)
    .eq("processed", true)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  // Log incoming event
  const { data: logged } = await db.from("webhook_events").upsert({
    provider: "yoco",
    event_type: eventType,
    external_id: externalId,
    payload: event,
    processed: false,
  }, { onConflict: "provider,external_id", ignoreDuplicates: false }).select().single();

  try {
    if (eventType === "payment.succeeded") {
      await handlePaymentSucceeded(db, paymentData, logged?.id);
    } else if (eventType === "payment.refunded") {
      await handlePaymentRefunded(db, paymentData);
    }
    // payment.failed — no action needed, customer stays on invoice page

    if (logged?.id) {
      await db.from("webhook_events").update({ processed: true, processed_at: new Date().toISOString() }).eq("id", logged.id);
    }
  } catch (err) {
    console.error("Yoco webhook processing error:", err);
    if (logged?.id) {
      await db.from("webhook_events").update({ error: String(err) }).eq("id", logged.id);
    }
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

async function handlePaymentSucceeded(
  db: ReturnType<typeof supabaseAdmin>,
  paymentData: Record<string, unknown>,
  webhookEventId?: string
) {
  const metadata = paymentData.metadata as Record<string, string> ?? {};
  const invoiceId = metadata.invoice_id;
  const token = metadata.customer_view_token;

  if (!invoiceId) throw new Error("No invoice_id in Yoco payment metadata");

  const { data: invoice } = await db
    .from("invoices")
    .select("*, clients(*)")
    .eq("id", invoiceId)
    .maybeSingle();

  if (!invoice) throw new Error(`Invoice ${invoiceId} not found`);
  if (invoice.status === "paid") return; // already processed

  const amountPaidCents = paymentData.amount as number;
  const amountPaidZar = amountPaidCents / 100;
  const clientRow = invoice.clients as Record<string, unknown>;

  const newAmountPaid = add(invoice.amount_paid_zar, amountPaidZar);
  const amountDue = Math.max(0, invoice.total_zar - newAmountPaid);
  const newStatus = amountDue <= 0 ? "paid" : "partial_paid";

  const vatRate = invoice.vat_zar > 0 ? 0.15 : 0;
  const paidExVat = vatRate > 0 ? exVat(amountPaidZar, vatRate) : amountPaidZar;
  const commissionRate: number = (clientRow.commission_rate as number) ?? 0.08;
  const commissionZar = commission(paidExVat, commissionRate);

  const now = new Date().toISOString();
  const idempotencyKey = `yoco-${paymentData.id}`;

  const { data: payment } = await db.from("payments").insert({
    invoice_id: invoiceId,
    client_id: invoice.client_id,
    amount_zar: amountPaidZar,
    paid_at: now,
    method: "yoco_card",
    external_ref: paymentData.id as string,
    source: "webhook",
    verified: true,
    verified_at: now,
    verified_by: "yoco_webhook",
    qwikly_commission_zar: commissionZar,
    idempotency_key: idempotencyKey,
  }).select().single();

  await db.from("invoices").update({
    amount_paid_zar: newAmountPaid,
    status: newStatus,
    paid_at: newStatus === "paid" ? now : null,
    qwikly_commission_zar: newStatus === "paid" ? commissionZar : null,
    updated_at: now,
  }).eq("id", invoiceId);

  // Issue receipt
  const receiptNumber = `REC-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
  await db.from("receipts").insert({
    invoice_id: invoiceId,
    payment_id: payment?.id,
    client_id: invoice.client_id,
    receipt_number: receiptNumber,
    total_zar: amountPaidZar,
    issued_at: now,
    channels: invoice.delivery_channels,
  });

  const publicUrl = `${BASE_URL}/i/${token ?? invoice.customer_view_token}`;

  // Customer receipt
  if (invoice.customer_mobile) {
    sendWhatsAppMessage(invoice.customer_mobile, invoiceReceiptWa({
      customerName: invoice.customer_name,
      businessName: (clientRow.business_name as string) ?? "Your service provider",
      amountPaidZar,
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
        businessName: (clientRow.business_name as string) ?? "Your service provider",
        invoiceNumber: invoice.invoice_number ?? invoiceId.slice(0, 8),
        amountPaidZar,
        paidAt: now,
        receiptNumber,
        publicUrl,
        accentColor: (clientRow.invoice_accent_color as string) ?? "#E85A2C",
      }),
    }).catch(() => {});
  }

  // Notify client
  if (clientRow.whatsapp_number) {
    sendWhatsAppMessage(clientRow.whatsapp_number as string, clientPaymentReceivedWa({
      businessName: (clientRow.business_name as string) ?? "",
      customerName: invoice.customer_name,
      amountPaidZar,
      invoiceNumber: invoice.invoice_number ?? invoiceId.slice(0, 8),
      method: "card (Yoco)",
      invoiceUrl: `${BASE_URL}/dashboard/invoices/${invoiceId}`,
    })).catch(() => {});
  }

  await db.from("audit_events").insert({
    actor_id: "yoco_webhook",
    actor_type: "system",
    event_type: "invoice.payment_received_webhook",
    entity_type: "invoice",
    entity_id: invoiceId,
    payload: { amount_zar: amountPaidZar, method: "yoco_card", new_status: newStatus, webhook_event_id: webhookEventId },
  });
}

async function handlePaymentRefunded(
  db: ReturnType<typeof supabaseAdmin>,
  paymentData: Record<string, unknown>
) {
  const metadata = paymentData.metadata as Record<string, string> ?? {};
  const invoiceId = metadata.invoice_id;
  if (!invoiceId) return;

  const refundAmountZar = (paymentData.refundedAmount as number ?? 0) / 100;

  await db.from("invoices").update({
    status: "refunded",
    updated_at: new Date().toISOString(),
  }).eq("id", invoiceId);

  await db.from("credit_notes").insert({
    invoice_id: invoiceId,
    amount_zar: refundAmountZar,
    reason: "Yoco refund",
    refunded_via: "yoco_card",
    created_by: "yoco_webhook",
  });

  await db.from("audit_events").insert({
    actor_id: "yoco_webhook",
    actor_type: "system",
    event_type: "invoice.refunded",
    entity_type: "invoice",
    entity_id: invoiceId,
    payload: { refund_amount_zar: refundAmountZar },
  });
}
