import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-server";
import { v2Auth } from "@/lib/v2-auth";

export const dynamic = "force-dynamic";

const PRICE_MAP: Record<string, string | undefined> = {
  pro_monthly:      process.env.STRIPE_PRICE_PRO_MONTHLY,
  pro_annual:       process.env.STRIPE_PRICE_PRO_ANNUAL,
  premium_monthly:  process.env.STRIPE_PRICE_PREMIUM_MONTHLY,
  premium_annual:   process.env.STRIPE_PRICE_PREMIUM_ANNUAL,
};

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.qwikly.co.za";

export async function POST(req: NextRequest) {
  const auth = await v2Auth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  const priceKey = `${plan}_${billing_cycle}`;
  const priceId = PRICE_MAP[priceKey];
  if (!priceId) {
    return NextResponse.json(
      { error: `unsupported plan/cycle: ${priceKey}` },
      { status: 400 }
    );
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

    const customer = await stripe.customers.create({
      email: biz?.contact_email,
      name: biz?.name,
      metadata: { user_id: auth.userId, business_id: auth.businessId },
    });
    customerId = customer.id;

    await db
      .from("subscriptions")
      .update({ stripe_customer_id: customerId })
      .eq("user_id", auth.userId);
  }

  const lineItems: { price: string; quantity: number }[] = [{ price: priceId, quantity: 1 }];

  // Add metered top-up price for Pro
  const topupPriceId = process.env.STRIPE_PRICE_TOPUP_LEAD;
  if (plan === "pro" && topupPriceId) {
    lineItems.push({ price: topupPriceId, quantity: 1 });
  }

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

  return NextResponse.json({ url: session.url });
}
