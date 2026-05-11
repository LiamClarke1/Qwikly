import "server-only";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { v2Auth } from "@/lib/v2-auth";
import { buildCheckoutUrl } from "@/lib/payfast/checkout";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Flat AI credit packs (same price for every tier). Bonus increases with pack size
// to nudge larger top-ups. Bonus is delivered server-side by the ITN handler,
// which reads custom_str4 to know which pack was purchased.
const AI_CREDIT_PACKS = {
  small:  { price_zar_cents: 10000, credit_zar_cents: 10000 },  // R100 -> R100
  medium: { price_zar_cents: 25000, credit_zar_cents: 28000 },  // R250 -> R280 (12% bonus)
  large:  { price_zar_cents: 50000, credit_zar_cents: 60000 },  // R500 -> R600 (20% bonus)
} as const;

type PackKey = keyof typeof AI_CREDIT_PACKS;

export async function POST(req: Request) {
  const auth = await v2Auth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { pack?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.pack || !(body.pack in AI_CREDIT_PACKS)) {
    return NextResponse.json({ error: "invalid_pack" }, { status: 400 });
  }
  const pack: PackKey = body.pack as PackKey;
  const { price_zar_cents } = AI_CREDIT_PACKS[pack];

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

  const m_payment_id = `ai_${client.id}_${pack}_${Date.now()}`;

  const { error: insertErr } = await db.from("payfast_payments").insert({
    client_id: client.id,
    subscription_id: sub?.id ?? null,
    m_payment_id,
    purpose: "topup_ai_credit",
    amount_zar_cents: price_zar_cents,
    status: "pending",
  });
  if (insertErr) {
    console.error("[topup-ai] insert failed:", insertErr);
    return NextResponse.json({ error: "checkout_failed" }, { status: 500 });
  }

  const url = buildCheckoutUrl({
    m_payment_id,
    amount_zar_cents: price_zar_cents,
    item_name: `Qwikly AI credit (${pack})`,
    item_description: `Top up AI conversation credit`,
    email_address: client.client_email ?? client.notification_email ?? undefined,
    client_id: client.id,
    subscription_id: sub?.id,
    purpose: "topup_ai_credit",
    recurring: false,
  });

  // PayFast's hosted checkout uses custom_str4 to tell the ITN handler which
  // pack was bought, so it can credit the bonus-inclusive amount, not the
  // raw payment amount.
  const finalUrl = `${url}&custom_str4=${encodeURIComponent(pack)}`;

  return NextResponse.json({
    url: finalUrl,
    pack,
    price_zar: price_zar_cents / 100,
    credit_zar: AI_CREDIT_PACKS[pack].credit_zar_cents / 100,
  });
}
