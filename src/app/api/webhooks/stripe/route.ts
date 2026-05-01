import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-server";
import Stripe from "stripe";
import { resend, FROM } from "@/lib/resend";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature") ?? "";
  const secret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    console.error("[stripe-webhook] signature mismatch:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const db = supabaseAdmin();

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpserted(db, event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(db, event.data.object as Stripe.Subscription);
        break;

      case "invoice.paid":
        await handleInvoicePaid(db, event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(db, event.data.object as Stripe.Invoice);
        break;
    }
  } catch (err) {
    console.error("[stripe-webhook] processing error:", err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

async function handleSubscriptionUpserted(
  db: ReturnType<typeof supabaseAdmin>,
  sub: Stripe.Subscription
) {
  const userId = sub.metadata?.user_id;
  if (!userId) return;

  const plan = sub.metadata?.plan ?? "starter";
  const billingCycle = sub.metadata?.billing_cycle ?? "monthly";

  // Find the metered top-up item ID if present
  const topupItem = sub.items.data.find(
    (item) => item.price.id === process.env.STRIPE_PRICE_TOPUP_LEAD
  );

  // In Stripe SDK v22, current_period_start/end moved to SubscriptionItem
  const firstItem = sub.items.data[0];

  await db.from("subscriptions").upsert(
    {
      user_id: userId,
      plan,
      billing_cycle: billingCycle,
      stripe_customer_id: sub.customer as string,
      stripe_subscription_id: sub.id,
      stripe_topup_item_id: topupItem?.id ?? null,
      status: sub.status === "active" || sub.status === "trialing" ? "active" : sub.status,
      current_period_start: firstItem
        ? new Date(firstItem.current_period_start * 1000).toISOString()
        : null,
      current_period_end: firstItem
        ? new Date(firstItem.current_period_end * 1000).toISOString()
        : null,
    },
    { onConflict: "user_id" }
  );
}

async function handleSubscriptionDeleted(
  db: ReturnType<typeof supabaseAdmin>,
  sub: Stripe.Subscription
) {
  await db
    .from("subscriptions")
    .update({ plan: "starter", status: "canceled", stripe_subscription_id: null })
    .eq("stripe_subscription_id", sub.id);
}

async function handleInvoicePaid(
  db: ReturnType<typeof supabaseAdmin>,
  invoice: Stripe.Invoice
) {
  // In Stripe SDK v22, subscription is nested under invoice.parent.subscription_details.subscription
  const subscriptionId =
    invoice.parent?.subscription_details?.subscription;

  if (subscriptionId) {
    await db
      .from("subscriptions")
      .update({ status: "active" })
      .eq("stripe_subscription_id", typeof subscriptionId === "string" ? subscriptionId : subscriptionId.id);
  }
}

async function handlePaymentFailed(
  db: ReturnType<typeof supabaseAdmin>,
  invoice: Stripe.Invoice
) {
  // In Stripe SDK v22, subscription is nested under invoice.parent.subscription_details.subscription
  const subscriptionId =
    invoice.parent?.subscription_details?.subscription;

  if (!subscriptionId) return;

  const subId = typeof subscriptionId === "string" ? subscriptionId : subscriptionId.id;

  await db
    .from("subscriptions")
    .update({ status: "past_due" })
    .eq("stripe_subscription_id", subId);

  // Notify owner
  const { data: sub } = await db
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_subscription_id", subId)
    .maybeSingle();

  if (sub?.user_id) {
    const { data: biz } = await db
      .from("businesses")
      .select("contact_email, name")
      .eq("user_id", sub.user_id)
      .maybeSingle();

    if (biz?.contact_email) {
      resend.emails
        .send({
          from: FROM,
          to: [biz.contact_email],
          subject: "Action needed: your Qwikly payment failed",
          html: `<p>Hi ${biz.name}, your latest Qwikly payment failed. Please update your payment method at <a href="https://www.qwikly.co.za/dashboard/billing">your billing page</a> to keep capturing leads.</p>`,
        })
        .catch(() => {});
    }
  }
}
