import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { v2Auth } from "@/lib/v2-auth";

export const dynamic = "force-dynamic";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.qwikly.co.za";

export async function POST() {
  const auth = await v2Auth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!auth.stripeCustomerId) {
    return NextResponse.json(
      { error: "No billing account found. Upgrade first." },
      { status: 400 }
    );
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: auth.stripeCustomerId,
      return_url: `${BASE}/dashboard/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[billing/portal] session create error:", err);
    return NextResponse.json({ error: "billing_provider_error" }, { status: 502 });
  }
}
