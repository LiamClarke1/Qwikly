import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { recomputeAllClientScores } from "@/lib/analytics/risk-health";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Daily risk + health recomputation.
 *
 * Reads clients + recent disputes + recent conversations + overdue invoices
 * in batched queries, then writes risk_score / risk_flags / health_score
 * back per client. Schedule once a day in vercel.json (02:00 SAST).
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const legacyHeader = req.headers.get("x-cron-secret");
  const secret = process.env.CRON_SECRET;
  if (
    !secret ||
    (authHeader !== `Bearer ${secret}` && legacyHeader !== secret)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
