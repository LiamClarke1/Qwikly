import "server-only";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { v2Auth } from "@/lib/v2-auth";
import { buildCheckoutUrl } from "@/lib/payfast/checkout";
import { resolvePlan, topUpPricePerLeadZar } from "@/lib/plan";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID_SIZES = [10, 25, 50] as const;
type PackSize = (typeof VALID_SIZES)[number];

// 10% bonus on the large pack: 50 leads for the price of 45.
function leadPackPriceZarCents(rateZar: number, size: PackSize): number {
  if (size === 50) return Math.round(rateZar * 45 * 100);
  return rateZar * size * 100;
}

export async function POST(req: Request) {
  const auth = await v2Auth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { size?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const size = body.size as PackSize;
  if (!VALID_SIZES.includes(size)) {
    return NextResponse.json({ error: "invalid_size" }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { data: client } = await db
    .from("clients")
    .select("id, plan, client_email, notification_email")
    .eq("auth_user_id", auth.userId)
    .maybeSingle();
  if (!client) return NextResponse.json({ error: "no_client" }, { status: 400 });

  const tier = resolvePlan(client.plan);
  const rate = topUpPricePerLeadZar(tier);
  const priceCents = leadPackPriceZarCents(rate, size);

  const { data: sub } = await db
    .from("subscriptions")
    .select("id")
    .eq("user_id", auth.userId)
    .maybeSingle();

  const m_payment_id = `leads_${client.id}_${size}_${Date.now()}`;

  const { error: insertErr } = await db.from("payfast_payments").insert({
    client_id: client.id,
    subscription_id: sub?.id ?? null,
    m_payment_id,
    purpose: "topup_leads",
    amount_zar_cents: priceCents,
    status: "pending",
  });
  if (insertErr) {
    console.error("[topup-leads] insert failed:", insertErr);
    return NextResponse.json({ error: "checkout_failed" }, { status: 500 });
  }

  const url = buildCheckoutUrl({
    m_payment_id,
    amount_zar_cents: priceCents,
    item_name: `Qwikly +${size} leads`,
    item_description: `Lead pack top-up`,
    email_address: client.client_email ?? client.notification_email ?? undefined,
    client_id: client.id,
    subscription_id: sub?.id,
    purpose: "topup_leads",
    recurring: false,
  });

  // ITN handler reads custom_str4 to know the pack size and credit the wallet.
  const finalUrl = `${url}&custom_str4=${size}`;

  return NextResponse.json({
    url: finalUrl,
    size,
    price_zar: priceCents / 100,
  });
}
