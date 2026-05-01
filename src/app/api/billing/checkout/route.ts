import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-server";
import { v2Auth } from "@/lib/v2-auth";

export const dynamic = "force-dynamic";

const PRICE_MAP: Record<string, string | undefined> = {
  pro_monthly:     process.env.STRIPE_PRICE_PRO_MONTHLY,
  pro_annual:      process.env.STRIPE_PRICE_PRO_ANNUAL,
  premium_monthly: process.env.STRIPE_PRICE_PREMIUM_MONTHLY,
  premium_annual:  process.env.STRIPE_PRICE_PREMIUM_ANNUAL,
};

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.qwikly.co.za";

export async function POST(req: NextRequest) {
  const auth = await v2Auth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (auth.stripeSubscriptionId) {
    return NextResponse.json(
      { error: "active_subscription_exists" },
      { status: 409 }
    );
  }

  let body: { plan?: string; billing_cycle?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { plan, billing_cycle } = body;
  if (!plan || !billing_cycle) {
    return NextResponse.json(
      { error: "plan and billing_cycle are required" },
      { status: 400 }
    );
  }

  const priceId = PRICE_MAP[`${plan}_${billing_cycle}`];
  if (!priceId) {
    return NextResponse.json({ error: "unsupported_plan" }, { status: 400 });
  }

  const db = supabaseAdmin();

  // Get or create Stripe customer
  let customerId = auth.stripeCustomerId;
  if (!customerId) {
    const { data: biz } = await db
      .from("businesses")
      .select("name, contact_email")
      .eq("id", auth.businessId)
      .maybeSingle();

    try {
      const customer = await stripe.customers.create({
        email: biz?.contact_email,
        name: biz?.name,
        metadata: { user_id: auth.userId, business_id: auth.businessId },
      });
      customerId = customer.id;
    } catch (err) {
      console.error("[billing/checkout] customer create error:", err);
      return NextResponse.json({ error: "billing_provider_error" }, { status: 502 });
    }

    const { error: updateErr } = await db
      .from("subscriptions")
      .update({ stripe_customer_id: customerId })
      .eq("user_id", auth.userId);

    if (updateErr) {
      console.error("[billing/checkout] failed to persist stripe_customer_id:", updateErr.message);
    }
  }

  // Metered top-up price must have no quantity (Stripe rejects quantity for metered prices)
  const lineItems: Array<{ price: string; quantity?: number }> = [
    { price: priceId, quantity: 1 },
  ];
  const topupPriceId = process.env.STRIPE_PRICE_TOPUP_LEAD;
  if (plan === "pro" && topupPriceId) {
    lineItems.push({ price: topupPriceId });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: lineItems,
      success_url: `${BASE}/dashboard/billing?upgraded=1`,
      cancel_url: `${BASE}/dashboard/billing`,
      subscription_data: {
        metadata: {
          user_id: auth.userId,
          business_id: auth.businessId,
          plan,
          billing_cycle,
        },
      },
      allow_promotion_codes: true,
    });

    if (!session.url) {
      return NextResponse.json({ error: "checkout_url_missing" }, { status: 502 });
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[billing/checkout] session create error:", err);
    return NextResponse.json({ error: "billing_provider_error" }, { status: 502 });
  }
}
