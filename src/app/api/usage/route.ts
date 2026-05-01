import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { v2Auth } from "@/lib/v2-auth";
import { PLAN_CONFIG, resolvePlan } from "@/lib/plan";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await v2Auth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseAdmin();
  const now = new Date();

  const { data: usage } = await db
    .from("usage_periods")
    .select("id, period_start, period_end, leads_captured, top_up_count")
    .eq("business_id", auth.businessId)
    .lte("period_start", now.toISOString())
    .gte("period_end", now.toISOString())
    .maybeSingle();

  const planConfig = PLAN_CONFIG[resolvePlan(auth.plan)];
  const cap = planConfig.leadLimit; // null = unlimited (Premium)

  return NextResponse.json({
    plan: auth.plan,
    cap,
    leads_captured: usage?.leads_captured ?? 0,
    top_up_count: usage?.top_up_count ?? 0,
    period_start: usage?.period_start ?? null,
    period_end: usage?.period_end ?? null,
    at_cap: cap !== null && (usage?.leads_captured ?? 0) >= cap,
  });
}
