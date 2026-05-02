import { NextResponse } from "next/server";
import { v2Auth } from "@/lib/v2-auth";
import { paystack } from "@/lib/paystack";

export const dynamic = "force-dynamic";

export async function POST() {
  const auth = await v2Auth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!auth.paystackSubscriptionCode) {
    return NextResponse.json({ error: "no_active_subscription" }, { status: 400 });
  }

  try {
    const { link } = await paystack.subscription.manageLink(auth.paystackSubscriptionCode);
    return NextResponse.json({ url: link });
  } catch (err) {
    console.error("[subscription/payment-method] Paystack manage link error:", err);
    return NextResponse.json({ error: "billing_provider_error" }, { status: 502 });
  }
}
