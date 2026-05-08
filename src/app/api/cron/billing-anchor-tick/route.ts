import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { generateDraftInvoice } from "@/lib/billing/invoice-generator";
import { todaySast, daysInMonth } from "@/lib/billing/anchor";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

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
  const today = todaySast();
  const dToday = today.getUTCDate();
  const lastDay = daysInMonth(today.getUTCFullYear(), today.getUTCMonth());

  // Pass 1: find clients due today (matches anchor_day OR month-end overflow)
  const dueRes = await sb
    .from("clients")
    .select("id, billing_anchor_day, business_name")
    .not("billing_anchor_day", "is", null)
    .not("crm_status", "in", "(churned,paused,pending_deletion)");

  if (dueRes.error) {
    return NextResponse.json({ error: dueRes.error.message }, { status: 500 });
  }

  // Filter in JS (simpler than complex PostgREST .or() syntax for the overflow case)
  const due = (dueRes.data ?? []).filter(c => {
    const anchor = c.billing_anchor_day as number | null;
    if (!anchor) return false;
    if (anchor === dToday) return true;
    if (dToday === lastDay && anchor > lastDay) return true;
    return false;
  });

  const results: { client_id: number; status: string; reason?: string; invoice_id: string | null }[] = [];
  for (const client of due) {
    const r = await generateDraftInvoice(sb, client.id);
    results.push({ client_id: client.id, ...r });
  }

  // Pass 2: flip overdue (sent invoices past due_at → overdue)
  const todayDateStr = today.toISOString().slice(0, 10);
  const overdueRes = await sb
    .from("qwikly_billing_invoices")
    .update({ status: "overdue" })
    .eq("status", "sent")
    .lt("due_at", todayDateStr)
    .select("id");

  return NextResponse.json({
    ok: true,
    today_sast: todayDateStr,
    drafts_created: results.filter(r => r.status === "draft").length,
    skipped: results.filter(r => r.status === "skipped").length,
    flipped_overdue: (overdueRes.data ?? []).length,
    detail: results,
  });
}
