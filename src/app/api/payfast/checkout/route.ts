import "server-only";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { v2Auth } from "@/lib/v2-auth";
import { buildCheckoutUrl } from "@/lib/payfast/checkout";
import { PLAN_CONFIG, resolvePlan, type InboundPlanTier } from "@/lib/plan";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PAID_TIERS: InboundPlanTier[] = ["starter", "pro", "founders", "business", "enterprise"];

export async function POST(req: Request) {
  const auth = await v2Auth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { plan?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const tier = resolvePlan(body.plan);
  if (!PAID_TIERS.includes(tier)) {
    return NextResponse.json({ error: "invalid_plan" }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { data: client } = await db
    .from("clients")
    .select("id, client_email, notification_email")
    .eq("auth_user_id", auth.userId)
    .maybeSingle();
  if (!client) return NextResponse.json({ error: "no_client" }, { status: 400 });

  const { data: sub } = await db
    .from("subscriptions")
    .select("id")
    .eq("user_id", auth.userId)
    .maybeSingle();
  if (!sub) return NextResponse.json({ error: "no_subscription" }, { status: 400 });

  const amountCents = PLAN_CONFIG[tier].priceMonthly * 100;
  const m_payment_id = `setup_${client.id}_${Date.now()}`;

  const { error: insertErr } = await db.from("payfast_payments").insert({
    client_id: client.id,
    subscription_id: sub.id,
    m_payment_id,
    purpose: "subscription_setup",
    amount_zar_cents: amountCents,
    status: "pending",
  });
  if (insertErr) {
    console.error("[payfast/checkout] insert failed:", insertErr);
    return NextResponse.json({ error: "checkout_failed" }, { status: 500 });
  }

  const billingDate = new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10);

  const url = buildCheckoutUrl({
    m_payment_id,
    amount_zar_cents: amountCents,
    item_name: `Qwikly ${PLAN_CONFIG[tier].name}`,
    item_description: `Monthly subscription, ${PLAN_CONFIG[tier].name} plan`,
    email_address: client.client_email ?? client.notification_email ?? undefined,
    client_id: client.id,
    subscription_id: sub.id,
    purpose: "subscription_setup",
    recurring: true,
    recurring_amount_zar_cents: amountCents,
    billing_date: billingDate,
  });

  return NextResponse.json({ url, plan: tier, amount_zar: amountCents / 100 });
}
