import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

export const dynamic = "force-dynamic";

// Called nightly by Vercel Cron — rolls yesterday's raw events into crm_stats_daily
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const yesterday = subDays(new Date(), 1);
  const dateStr   = format(yesterday, "yyyy-MM-dd");
  const fromISO   = startOfDay(yesterday).toISOString();
  const toISO     = endOfDay(yesterday).toISOString();

  const db = supabaseAdmin();

  // Get all active clients
  const { data: clients } = await db
    .from("clients")
    .select("id")
    .eq("active", true);

  if (!clients?.length) return NextResponse.json({ ok: true, processed: 0 });

  const ids = clients.map(c => c.id);
  let processed = 0;

  // Fetch all conversations + bookings for yesterday across all clients
  const [convosRes, bookingsRes, aiMsgsRes] = await Promise.all([
    db.from("conversations").select("client_id, channel, status").in("client_id", ids)
      .gte("created_at", fromISO).lte("created_at", toISO),
    db.from("bookings").select("client_id").in("client_id", ids)
      .gte("created_at", fromISO).lte("created_at", toISO),
    db.from("messages_log").select("client_id").in("client_id", ids).eq("role", "assistant")
      .gte("created_at", fromISO).lte("created_at", toISO).limit(200000),
  ]);

  const convos   = convosRes.data ?? [];
  const bookings = bookingsRes.data ?? [];
  const aiMsgs   = aiMsgsRes.data ?? [];

  // Group by client
  const byClient: Record<number, {
    conversations_total: number;
    conversations_whatsapp: number;
    conversations_email: number;
    conversations_web: number;
    leads_captured: number;
    leads_converted: number;
    bookings_created: number;
    messages_handled_by_ai: number;
  }> = {};

  for (const id of ids) {
    byClient[id] = { conversations_total: 0, conversations_whatsapp: 0, conversations_email: 0, conversations_web: 0, leads_captured: 0, leads_converted: 0, bookings_created: 0, messages_handled_by_ai: 0 };
  }

  for (const c of convos) {
    if (!byClient[c.client_id]) continue;
    byClient[c.client_id].conversations_total++;
    if (c.channel === "whatsapp") byClient[c.client_id].conversations_whatsapp++;
    else if (c.channel === "email") byClient[c.client_id].conversations_email++;
    else if (c.channel === "web_chat") byClient[c.client_id].conversations_web++;
    if (c.status === "lead" || c.status === "converted") byClient[c.client_id].leads_captured++;
    if (c.status === "converted") byClient[c.client_id].leads_converted++;
  }

  for (const b of bookings) {
    if (byClient[b.client_id]) byClient[b.client_id].bookings_created++;
  }

  for (const m of aiMsgs) {
    if (byClient[m.client_id]) byClient[m.client_id].messages_handled_by_ai++;
  }

  // Upsert stats rows (only for clients with activity)
  const rows = ids
    .filter(id => byClient[id].conversations_total > 0 || byClient[id].bookings_created > 0)
    .map(id => ({ client_id: id, date: dateStr, ...byClient[id] }));

  if (rows.length > 0) {
    await db.from("crm_stats_daily").upsert(rows, { onConflict: "client_id,date" });
    processed = rows.length;
  }

  return NextResponse.json({ ok: true, date: dateStr, processed });
}
