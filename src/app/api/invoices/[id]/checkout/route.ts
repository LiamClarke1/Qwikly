import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/**
 * Creates a Yoco hosted checkout session for a given invoice.
 * Called from the public invoice page — no auth, validated by invoice token.
 *
 * NOTE: Requires YOCO_SECRET_KEY env var. Get it from app.yoco.com → Developers → Keys.
 * Webhook for payment confirmations must be configured at:
 *   https://www.qwikly.co.za/api/webhooks/yoco
 * Yoco dashboard → Developers → Webhooks → Add endpoint → events: payment.succeeded, payment.failed
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.qwikly.co.za";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const token: string = body.token;

  const db = supabaseAdmin();

  const { data: invoice } = await db
    .from("invoices")
    .select("*, clients(business_name, invoice_accent_color)")
    .eq("id", params.id)
    .eq("customer_view_token", token)
    .maybeSingle();

  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  if (invoice.status === "paid") {
    return NextResponse.json({ error: "Invoice already paid" }, { status: 400 });
  }
  if (invoice.status === "cancelled") {
    return NextResponse.json({ error: "Invoice cancelled" }, { status: 400 });
  }

  const amountDue = Math.max(0, invoice.total_zar - invoice.amount_paid_zar);
  if (amountDue <= 0) return NextResponse.json({ error: "No balance due" }, { status: 400 });

  const yocoKey = process.env.YOCO_SECRET_KEY;

  if (!yocoKey) {
    // Yoco not configured — return instructions for EFT instead
    return NextResponse.json({
      mode: "eft_only",
      message: "Card payments not configured. Please pay via EFT using the bank details on this invoice.",
    });
  }

  // Create Yoco checkout session
  const idempotencyKey = `invoice-${params.id}-${Date.now()}`;
  const checkoutRes = await fetch("https://payments.yoco.com/api/checkouts", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${yocoKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({
      amount: Math.round(amountDue * 100), // Yoco expects cents
      currency: "ZAR",
      successUrl: `${BASE_URL}/i/${token}?payment=success`,
      cancelUrl: `${BASE_URL}/i/${token}?payment=cancelled`,
      failureUrl: `${BASE_URL}/i/${token}?payment=failed`,
      metadata: {
        invoice_id: params.id,
        customer_view_token: token,
        invoice_number: invoice.invoice_number ?? "",
        customer_name: invoice.customer_name,
      },
    }),
  });

  if (!checkoutRes.ok) {
    const err = await checkoutRes.json().catch(() => ({}));
    console.error("Yoco checkout error:", err);
    return NextResponse.json({ error: "Payment provider error. Please try EFT or contact the business." }, { status: 502 });
  }

  const checkout = await checkoutRes.json();

  // Log the checkout attempt
  await db.from("webhook_events").insert({
    provider: "yoco",
    event_type: "checkout.created",
    external_id: checkout.id,
    payload: { invoice_id: params.id, amount_zar: amountDue, checkout_id: checkout.id },
    processed: false,
  });
  // best-effort log — ignore errors

  return NextResponse.json({ redirectUrl: checkout.redirectUrl, checkout_id: checkout.id });
}
