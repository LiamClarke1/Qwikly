import { NextRequest, NextResponse } from "next/server";
import { paystack, PLAN_MAP, PLAN_AMOUNTS } from "@/lib/paystack";
import { supabaseAdmin } from "@/lib/supabase-server";
import { v2Auth } from "@/lib/v2-auth";

export const dynamic = "force-dynamic";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.qwikly.co.za";

export async function POST(req: NextRequest) {
  const auth = await v2Auth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { plan?: string; billing_cycle?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { plan, billing_cycle } = body;
  if (!plan || !billing_cycle) {
    return NextResponse.json({ error: "plan and billing_cycle are required" }, { status: 400 });
  }

  const planKey = `${plan}_${billing_cycle}`;
  const planCode = PLAN_MAP[planKey];
  const amount = PLAN_AMOUNTS[planKey];

  if (!planCode || !amount) {
    return NextResponse.json({ error: "unsupported_plan" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: biz } = await db
    .from("businesses")
    .select("name, contact_email")
    .eq("id", auth.businessId)
    .maybeSingle();

  if (!biz?.contact_email) {
    return NextResponse.json({ error: "business_email_missing" }, { status: 400 });
  }

  let customerCode = auth.paystackCustomerCode;
  if (!customerCode) {
    try {
      const customer = await paystack.customer.create({ email: biz.contact_email, first_name: biz.name });
      customerCode = customer.customer_code;
      await db
        .from("subscriptions")
        .upsert({ user_id: auth.userId, paystack_customer_code: customerCode }, { onConflict: "user_id" });
    } catch (err) {
      console.error("[billing/checkout] customer create error:", err);
      return NextResponse.json({ error: "billing_provider_error" }, { status: 502 });
    }
  }

  try {
    const tx = await paystack.transaction.initialize({
      email: biz.contact_email,
      amount,
      plan: planCode,
      callback_url: `${BASE}/dashboard/billing?upgraded=1`,
      metadata: { user_id: auth.userId, business_id: auth.businessId, plan, cycle: billing_cycle },
    });
    return NextResponse.json({ url: tx.authorization_url });
  } catch (err) {
    console.error("[billing/checkout] transaction initialize error:", err);
    return NextResponse.json({ error: "billing_provider_error" }, { status: 502 });
  }
}
