import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const db = supabaseAdmin();
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count, error } = await db
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfMonth.toISOString())
      .neq("status", "cancelled");

    if (error) throw error;

    const jobsThisMonth = count ?? 0;
    // Conservative estimated average job value in rands
    const estimatedRevenue = jobsThisMonth * 1800;

    return NextResponse.json(
      { jobsThisMonth, estimatedRevenue },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
        },
      }
    );
  } catch {
    return NextResponse.json({ jobsThisMonth: 0, estimatedRevenue: 0 });
  }
}
