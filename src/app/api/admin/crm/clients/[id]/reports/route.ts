import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { assertAdmin } from "@/lib/admin-auth";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await assertAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = parseInt(params.id, 10);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("crm_reports")
    .select("*")
    .eq("client_id", id)
    .order("period_start", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reports: data ?? [] });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await assertAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = parseInt(params.id, 10);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const target = body?.month ? new Date(body.month) : subMonths(new Date(), 1);
  const period_start = format(startOfMonth(target), "yyyy-MM-dd");
  const period_end   = format(endOfMonth(target), "yyyy-MM-dd");

  const db = supabaseAdmin();

  // Check for duplicate
  const { data: existing } = await db
    .from("crm_reports")
    .select("id, status")
    .eq("client_id", id)
    .eq("period_start", period_start)
    .maybeSingle();

  if (existing?.status === "generating") {
    return NextResponse.json({ error: "Report already generating" }, { status: 409 });
  }

  // Gather stats snapshot
  const [convosRes, bookingsRes] = await Promise.all([
    db.from("conversations").select("channel, status").eq("client_id", id)
      .gte("created_at", `${period_start}T00:00:00Z`)
      .lte("created_at", `${period_end}T23:59:59Z`),
    db.from("bookings").select("id").eq("client_id", id)
      .gte("created_at", `${period_start}T00:00:00Z`)
      .lte("created_at", `${period_end}T23:59:59Z`),
  ]);

  const convos = convosRes.data ?? [];
  const metrics_snapshot = {
    conversations_total:    convos.length,
    conversations_whatsapp: convos.filter(c => c.channel === "whatsapp").length,
    conversations_email:    convos.filter(c => c.channel === "email").length,
    conversations_web:      convos.filter(c => c.channel === "web_chat").length,
    leads_captured:         convos.filter(c => c.status === "lead" || c.status === "converted").length,
    leads_converted:        convos.filter(c => c.status === "converted").length,
    bookings_created:       bookingsRes.data?.length ?? 0,
  };

  const upsertData = {
    client_id: id,
    period_start,
    period_end,
    status: "pending" as const,
    metrics_snapshot,
  };

  let report;
  if (existing) {
    const { data } = await db.from("crm_reports").update(upsertData).eq("id", existing.id).select().single();
    report = data;
  } else {
    const { data } = await db.from("crm_reports").insert(upsertData).select().single();
    report = data;
  }

  await db.from("crm_events").insert({
    client_id: id,
    actor_id: auth.userId,
    event_type: "report_requested",
    payload: { report_id: report?.id, period_start, period_end },
  });

  return NextResponse.json({ report }, { status: 201 });
}
