import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";

export const dynamic    = "force-dynamic";
export const maxDuration = 300; // 5 min Vercel Pro limit

// Runs on the 1st of each month — generates + emails reports for all active clients
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = supabaseAdmin();

  const lastMonth    = subMonths(new Date(), 1);
  const period_start = format(startOfMonth(lastMonth), "yyyy-MM-dd");
  const period_end   = format(endOfMonth(lastMonth), "yyyy-MM-dd");

  // Get active clients with email
  const { data: clients } = await db
    .from("clients")
    .select("id, business_name, client_email, crm_status")
    .eq("active", true)
    .in("crm_status", ["active", "onboarding"]);

  if (!clients?.length) return NextResponse.json({ ok: true, triggered: 0 });

  let triggered = 0;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;

  for (const client of clients) {
    // Create or reset the report record
    const { data: existing } = await db
      .from("crm_reports")
      .select("id")
      .eq("client_id", client.id)
      .eq("period_start", period_start)
      .maybeSingle();

    let reportId: string;
    if (existing) {
      reportId = existing.id;
      await db.from("crm_reports").update({ status: "pending" }).eq("id", reportId);
    } else {
      const { data } = await db.from("crm_reports").insert({
        client_id: client.id, period_start, period_end, status: "pending",
      }).select("id").single();
      if (!data) continue;
      reportId = data.id;
    }

    // Fire the generate endpoint (fire-and-forget with internal auth)
    try {
      await fetch(`${siteUrl}/api/admin/crm/reports/${reportId}/generate`, {
        method:  "POST",
        headers: { "x-cron-secret": process.env.CRON_SECRET! },
      });
      triggered++;
    } catch {
      // Non-fatal — mark failed
      await db.from("crm_reports").update({ status: "failed" }).eq("id", reportId);
    }
  }

  return NextResponse.json({ ok: true, period: period_start, triggered });
}
