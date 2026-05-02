import { NextResponse } from "next/server";
import { v2Auth } from "@/lib/v2-auth";
import { paystack } from "@/lib/paystack";
import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function POST() {
  const auth = await v2Auth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!auth.paystackSubscriptionCode || !auth.paystackEmailToken) {
    return NextResponse.json({ error: "no_active_subscription" }, { status: 400 });
  }

  try {
    await paystack.subscription.disable({
      code: auth.paystackSubscriptionCode,
      token: auth.paystackEmailToken,
    });
  } catch (err) {
    console.error("[subscription/cancel] Paystack disable error:", err);
    return NextResponse.json({ error: "billing_provider_error" }, { status: 502 });
  }

  const db = supabaseAdmin();
  await db
    .from("subscriptions")
    .update({ cancel_at_period_end: true })
    .eq("user_id", auth.userId);

  return NextResponse.json({ ok: true });
}
