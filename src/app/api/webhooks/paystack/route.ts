import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { supabaseAdmin } from "@/lib/supabase-server";
import { planFromCode } from "@/lib/paystack";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sig = req.headers.get("x-paystack-signature") ?? "";
  const secret = process.env.PAYSTACK_WEBHOOK_SECRET;

  if (!secret) {
    console.error("[paystack-webhook] PAYSTACK_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const expected = createHmac("sha512", secret).update(rawBody).digest("hex");
  if (sig !== expected) {
    console.error("[paystack-webhook] signature mismatch");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: { event: string; data: Record<string, unknown> };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const db = supabaseAdmin();

  try {
    switch (event.event) {
      case "subscription.create":
        await handleSubscriptionCreate(db, event.data);
        break;
      case "charge.success":
        await handleChargeSuccess(db, event.data);
        break;
      case "subscription.disable":
        await handleSubscriptionDisable(db, event.data);
        break;
      case "invoice.payment_failed":
        await handlePaymentFailed(db, event.data);
        break;
    }
  } catch (err) {
    console.error("[paystack-webhook] processing error:", err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// Keep clients.plan in sync whenever subscriptions.plan changes.
async function syncClientPlan(db: ReturnType<typeof supabaseAdmin>, customerCode: string) {
  const { data: sub } = await db
    .from("subscriptions")
    .select("user_id, plan")
    .eq("paystack_customer_code", customerCode)
    .maybeSingle();
  if (!sub?.user_id || !sub?.plan) return;
  await db.from("clients").update({ plan: sub.plan }).eq("auth_user_id", sub.user_id);
}

async function handleSubscriptionCreate(
  db: ReturnType<typeof supabaseAdmin>,
  data: Record<string, unknown>
) {
  const customer = data.customer as Record<string, unknown>;
  const plan = data.plan as Record<string, unknown>;
  const authorization = data.authorization as Record<string, unknown> | undefined;

  const customerCode = customer?.customer_code as string;
  const subscriptionCode = data.subscription_code as string;
  const emailToken = data.email_token as string;
  const nextPaymentDate = data.next_payment_date as string;
  const planCode = plan?.plan_code as string;

  if (!customerCode || !subscriptionCode) {
    console.warn("[paystack-webhook] subscription.create missing customer/subscription code");
    return;
  }

  const resolved = planFromCode(planCode);
  if (!resolved) {
    console.warn("[paystack-webhook] unknown plan_code:", planCode);
    return;
  }

  const updateData: Record<string, unknown> = {
    plan: resolved.plan,
    billing_cycle: resolved.cycle,
    status: "active",
    paystack_customer_code: customerCode,
    paystack_subscription_code: subscriptionCode,
    paystack_email_token: emailToken,
    current_period_start: new Date().toISOString(),
    current_period_end: nextPaymentDate,
    cancel_at_period_end: false,
  };

  if (authorization) {
    updateData.paystack_card_brand = authorization.card_type as string;
    updateData.paystack_card_last4 = authorization.last4 as string;
  }

  const { error } = await db
    .from("subscriptions")
    .update(updateData)
    .eq("paystack_customer_code", customerCode);

  if (error) {
    console.error("[paystack-webhook] subscription.create DB update error:", error.message);
    throw error;
  }

  await syncClientPlan(db, customerCode);
  console.log("[paystack-webhook] subscription.create processed:", subscriptionCode);
}

async function handleChargeSuccess(
  db: ReturnType<typeof supabaseAdmin>,
  data: Record<string, unknown>
) {
  const customer = data.customer as Record<string, unknown>;
  const authorization = data.authorization as Record<string, unknown> | undefined;
  const plan = data.plan_object as Record<string, unknown> | undefined;
  const customerCode = customer?.customer_code as string;

  if (!customerCode) return;

  const updateData: Record<string, unknown> = {
    status: "active",
    cancel_at_period_end: false,
  };

  if (authorization) {
    updateData.paystack_card_brand = authorization.card_type as string;
    updateData.paystack_card_last4 = authorization.last4 as string;
  }

  // Update plan if this charge is for a plan (recurring charge)
  if (plan?.plan_code) {
    const resolved = planFromCode(plan.plan_code as string);
    if (resolved) {
      updateData.plan = resolved.plan;
      updateData.billing_cycle = resolved.cycle;
    }
  }

  await db
    .from("subscriptions")
    .update(updateData)
    .eq("paystack_customer_code", customerCode);

  await syncClientPlan(db, customerCode);
  console.log("[paystack-webhook] charge.success processed for customer:", customerCode);
}

async function handleSubscriptionDisable(
  db: ReturnType<typeof supabaseAdmin>,
  data: Record<string, unknown>
) {
  const subscriptionCode = data.subscription_code as string;
  if (!subscriptionCode) return;

  await db
    .from("subscriptions")
    .update({ status: "canceled" })
    .eq("paystack_subscription_code", subscriptionCode);

  console.log("[paystack-webhook] subscription.disable processed:", subscriptionCode);
}

async function handlePaymentFailed(
  db: ReturnType<typeof supabaseAdmin>,
  data: Record<string, unknown>
) {
  const subscription = data.subscription as Record<string, unknown>;
  const subscriptionCode = subscription?.subscription_code as string;
  if (!subscriptionCode) return;

  await db
    .from("subscriptions")
    .update({ status: "past_due" })
    .eq("paystack_subscription_code", subscriptionCode);

  console.log("[paystack-webhook] invoice.payment_failed processed:", subscriptionCode);
}
