import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { runGeneratorAndInsert } from "@/lib/pipeline/generator/run";
import { resolvePlan, dailyProspectQuotaForPlan } from "@/lib/plan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Daily trickle cron. Vercel cron hits this at 06:00 UTC Mon-Fri. For every
 * tenant with `products` including 'outbound' and `pipeline_daily_quota > 0`,
 * generate that many prospects tagged as 'daily_trickle' for today.
 */
export async function GET(req: Request) {
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (req.headers.get("authorization") !== expected) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }

  // Weekend guard (defence in depth; cron schedule already excludes weekends)
  const dow = new Date().getUTCDay();
  if (dow === 0 || dow === 6) {
    return NextResponse.json({ skipped: "weekend" });
  }

  const db = supabaseAdmin();

  const { data: tenants } = await db
    .from("clients")
    .select("id, auth_user_id, plan, products, pipeline_daily_quota")
    .contains("products", ["outbound"])
    .gt("pipeline_daily_quota", 0);

  const results: Array<{ clientId: number | string; created: number; capReached: boolean; skipped?: string }> = [];

  for (const t of (tenants ?? []) as Array<{
    id: number | string;
    auth_user_id: string;
    plan: string;
    products: string[];
    pipeline_daily_quota: number;
  }>) {
    try {
      // Cap the daily count to the plan's allowed quota. The DB column is an
      // admin override; the plan config is the billing source of truth. If
      // someone manually set pipeline_daily_quota higher than the plan allows,
      // we honour the lower of the two so tenants are never billed for more
      // prospects than their plan entitles them to receive.
      const planQuota = dailyProspectQuotaForPlan(resolvePlan(t.plan));
      const count = Math.min(t.pipeline_daily_quota, planQuota);
      if (count === 0) {
        results.push({ clientId: t.id, created: 0, capReached: false, skipped: "plan_quota_zero" });
        continue;
      }

      // Resolve the linked business_id via auth_user_id ↔ user_id
      const { data: business } = await db
        .from("businesses")
        .select("id")
        .eq("user_id", t.auth_user_id)
        .maybeSingle();

      if (!business) {
        console.warn(`[trickle] no businesses row for client ${t.id} (auth_user_id=${t.auth_user_id})`);
        results.push({ clientId: t.id, created: 0, capReached: false, skipped: "no_business_row" });
        continue;
      }

      const businessId = (business as { id: string }).id;
      const r = await runGeneratorAndInsert({
        clientId: t.id,
        businessId,
        plan: t.plan,
        count,
        batchKind: "daily_trickle",
      });
      results.push({ clientId: t.id, created: r.created, capReached: r.capReached });
    } catch (err) {
      console.error(`[trickle] generator failed for ${t.id}`, err);
      results.push({ clientId: t.id, created: 0, capReached: false });
    }
  }

  return NextResponse.json({ ran: results.length, results });
}
