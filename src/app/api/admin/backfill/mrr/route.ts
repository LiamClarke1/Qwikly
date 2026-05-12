import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { assertAdmin } from "@/lib/admin-auth";
import { resolvePlan, mrrZarCents, type InboundPlanTier } from "@/lib/plan";

export const dynamic = "force-dynamic";

/**
 * One-shot POST: recalculates mrr_zar for every client whose mrr_zar is 0
 * or null, using their current plan + billing_cycle. Safe to call multiple
 * times — skips clients that already have a non-zero mrr_zar.
 */
export async function POST() {
  const auth = await assertAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const db = supabaseAdmin();
  const { data: clients, error } = await db
    .from("clients")
    .select("id, plan, mrr_zar, subscriptions(billing_cycle)")
    .or("mrr_zar.is.null,mrr_zar.eq.0");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let updated = 0;
  for (const c of clients ?? []) {
    const sub = Array.isArray(c.subscriptions) ? c.subscriptions[0] : c.subscriptions;
    const tier = resolvePlan(c.plan) as InboundPlanTier;
    const mrr = mrrZarCents(tier, (sub as { billing_cycle?: string } | null)?.billing_cycle);
    if (mrr === 0) continue; // trial — leave as 0
    await db.from("clients").update({ mrr_zar: mrr }).eq("id", c.id);
    updated++;
  }

  return NextResponse.json({ ok: true, updated, total: (clients ?? []).length });
}
