import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { assertAdmin } from "@/lib/admin-auth";
import { subDays, subMonths, format, eachDayOfInterval, startOfDay } from "date-fns";

export const dynamic = "force-dynamic";

function rangeFromParam(range: string): { from: Date; to: Date } {
  const to = new Date();
  if (range === "90d")  return { from: subDays(to, 90),   to };
  if (range === "12m")  return { from: subMonths(to, 12), to };
  return { from: subDays(to, 30), to };
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await assertAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = parseInt(params.id, 10);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const range = req.nextUrl.searchParams.get("range") ?? "30d";
  const { from, to } = rangeFromParam(range);
  const fromISO = from.toISOString();
  const toISO   = to.toISOString();

  const db = supabaseAdmin();

  const [convosRes, bookingsRes, messagesRes] = await Promise.all([
    db.from("conversations")
      .select("id, channel, created_at, status")
      .eq("client_id", id)
      .gte("created_at", fromISO)
      .lte("created_at", toISO),
    db.from("bookings")
      .select("id, created_at")
      .eq("client_id", id)
      .gte("created_at", fromISO)
      .lte("created_at", toISO),
    db.from("messages_log")
      .select("id, role, created_at")
      .eq("client_id", id)
      .eq("role", "assistant")
      .gte("created_at", fromISO)
      .lte("created_at", toISO)
      .limit(50000),
  ]);

  const convos   = convosRes.data ?? [];
  const bookings = bookingsRes.data ?? [];
  const aiMsgs   = messagesRes.data ?? [];

  // Build day-by-day buckets
  const days = eachDayOfInterval({ start: from, end: to });
  const dayMap: Record<string, {
    date: string;
    conversations_total: number;
    conversations_whatsapp: number;
    conversations_email: number;
    conversations_web: number;
    leads_captured: number;
    bookings_created: number;
  }> = {};

  for (const d of days) {
    const key = format(d, "yyyy-MM-dd");
    dayMap[key] = { date: key, conversations_total: 0, conversations_whatsapp: 0, conversations_email: 0, conversations_web: 0, leads_captured: 0, bookings_created: 0 };
  }

  for (const c of convos) {
    const key = format(startOfDay(new Date(c.created_at)), "yyyy-MM-dd");
    if (!dayMap[key]) continue;
    dayMap[key].conversations_total++;
    if (c.channel === "whatsapp") dayMap[key].conversations_whatsapp++;
    else if (c.channel === "email") dayMap[key].conversations_email++;
    else if (c.channel === "web_chat") dayMap[key].conversations_web++;
    if (c.status === "lead" || c.status === "converted") dayMap[key].leads_captured++;
  }

  for (const b of bookings) {
    const key = format(startOfDay(new Date(b.created_at)), "yyyy-MM-dd");
    if (dayMap[key]) dayMap[key].bookings_created++;
  }

  const leads_captured  = convos.filter(c => c.status === "lead" || c.status === "converted").length;
  const leads_converted = convos.filter(c => c.status === "converted").length;

  const summary = {
    conversations_total:    convos.length,
    conversations_whatsapp: convos.filter(c => c.channel === "whatsapp").length,
    conversations_email:    convos.filter(c => c.channel === "email").length,
    conversations_web:      convos.filter(c => c.channel === "web_chat").length,
    leads_captured,
    leads_converted,
    bookings_created:       bookings.length,
    messages_handled_by_ai: aiMsgs.length,
    avg_response_time_s:    0, // requires message-level timestamps, skip for now
  };

  return NextResponse.json({
    daily: Object.values(dayMap),
    summary,
  });
}
