import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";

const REVENUE_PER_JOB_ZAR = 3500;
const CONFIRMED_STATUSES = ["booked", "completed"] as const;

export interface ScoreboardStats {
  jobsBooked: number;
  revenueGenerated: number;
  revenueIsEstimate: boolean;
  businessesPowered: number;
}

const ZERO_STATS: ScoreboardStats = {
  jobsBooked: 0,
  revenueGenerated: 0,
  revenueIsEstimate: true,
  businessesPowered: 0,
};

const fetchScoreboard = unstable_cache(
  async (): Promise<ScoreboardStats> => {
    try {
      const db = supabaseAdmin();
      const jobsRes = await db
        .from("bookings")
        .select("client_id", { count: "exact" })
        .in("status", CONFIRMED_STATUSES as unknown as string[]);

      if (jobsRes.error) throw jobsRes.error;

      const jobsBooked = jobsRes.count ?? 0;
      const rows = (jobsRes.data ?? []) as Array<{ client_id: number | string }>;
      const businessesPowered = new Set(
        rows.map((r) => r.client_id).filter((v) => v !== null && v !== undefined),
      ).size;

      return {
        jobsBooked,
        revenueGenerated: jobsBooked * REVENUE_PER_JOB_ZAR,
        revenueIsEstimate: true,
        businessesPowered,
      };
    } catch {
      return ZERO_STATS;
    }
  },
  ["landing-scoreboard-v1"],
  { revalidate: 300, tags: ["landing-scoreboard"] },
);

export async function GET() {
  const stats = await fetchScoreboard();
  return NextResponse.json(stats, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
