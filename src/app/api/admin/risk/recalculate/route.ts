import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { assertAdmin } from "@/lib/admin-auth";
import { recomputeAllClientScores } from "@/lib/analytics/risk-health";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Admin-triggered manual recompute of risk + health scores for every client.
 * Same logic as the daily cron at /api/cron/calc-risk-and-health, but gated
 * by admin auth instead of CRON_SECRET so it can be called from the Risk page.
 */
export async function POST(_req: NextRequest) {
  const auth = await assertAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sb = supabaseAdmin();
  const startedAt = Date.now();
  const result = await recomputeAllClientScores(sb);
  const elapsedMs = Date.now() - startedAt;

  return NextResponse.json({
    ok: true,
    ...result,
    elapsed_ms: elapsedMs,
  });
}
