import { NextResponse } from "next/server";
import { v2Auth } from "@/lib/v2-auth";
import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await v2Auth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseAdmin();
  const { data: sub } = await db
    .from("subscriptions")
    .select("plan, billing_cycle, status, current_period_end, paystack_card_brand, paystack_card_last4, cancel_at_period_end")
    .eq("user_id", auth.userId)
    .maybeSingle();

  const plan = (sub?.plan as string) ?? "starter";
  const cycle = (sub?.billing_cycle as string) ?? "monthly";
  const renewsAt = sub?.current_period_end ?? null;
  const cardBrand = sub?.paystack_card_brand ?? null;
  const cardLast4 = sub?.paystack_card_last4 ?? null;

  return NextResponse.json({
    plan,
    cycle,
    renewsAt,
    status: sub?.status ?? "active",
    cancelAtPeriodEnd: sub?.cancel_at_period_end ?? false,
    paymentMethod: cardBrand && cardLast4 ? { brand: cardBrand, last4: cardLast4 } : null,
  });
}
