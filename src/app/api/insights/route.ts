import { NextRequest, NextResponse } from "next/server";
import { getAuthedClientId } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

type ConvRow = {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  is_lead: boolean | null;
  booking_intent: boolean | null;
  created_at: string;
  updated_at: string;
};

type MsgRow = {
  conversation_id: string;
  role: string;
  content: string;
  created_at: string;
};

// Phrases the assistant tends to use when it doesn't have a confident answer
// and is deferring to the human team. We use this as a proxy for "this question
// could have a better KB-backed answer." Not perfect, but catches the obvious cases.
const HEDGE_PHRASES = [
  "i'd want to confirm with the team",
  "i'd want to check with the team",
  "let me capture your details",
  "let me grab your details",
  "let me get your details",
  "let me get your contact",
  "let me grab your contact",
  "i'll have someone reach out",
  "i'll get someone to reach out",
  "i would not want to give",
  "i wouldn't want to give",
  "i don't want to commit to",
  "i don't have that info",
  "i don't have that information",
  "i'm not entirely sure",
  "i'm not 100% sure",
  "i'm not 100 percent sure",
  "best to confirm with the team",
];

// Convert a UTC timestamp into Africa/Johannesburg (UTC+2, no DST) hour + weekday.
// Mon=0, Sun=6 to match the heatmap row order.
function sastDayHour(iso: string): { day: number; hour: number } {
  const t = new Date(iso).getTime() + 2 * 60 * 60 * 1000;
  const d = new Date(t);
  return { day: (d.getUTCDay() + 6) % 7, hour: d.getUTCHours() };
}

export async function GET(req: NextRequest) {
  const clientId = await getAuthedClientId();
  if (!clientId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const requested = parseInt(url.searchParams.get("range") || "7", 10);
  const range: 7 | 30 | 90 = ([7, 30, 90] as const).includes(requested as 7 | 30 | 90)
    ? (requested as 7 | 30 | 90)
    : 7;

  const now = Date.now();
  const start = new Date(now - range * 86400000);
  const prevStart = new Date(now - range * 2 * 86400000);

  const db = supabaseAdmin();

  const { data: convsRaw, error: convErr } = await db
    .from("conversations")
    .select(
      "id, customer_name, customer_phone, customer_email, is_lead, booking_intent, created_at, updated_at"
    )
    .eq("client_id", clientId)
    .gte("created_at", prevStart.toISOString())
    .order("created_at", { ascending: false });

  if (convErr) {
    return NextResponse.json({ error: convErr.message }, { status: 500 });
  }
  const convs = (convsRaw ?? []) as ConvRow[];

  let messages: MsgRow[] = [];
  if (convs.length) {
    const ids = convs.map((c) => c.id);
    const { data: msgs, error: msgErr } = await db
      .from("messages_log")
      .select("conversation_id, role, content, created_at")
      .in("conversation_id", ids);
    if (msgErr) {
      return NextResponse.json({ error: msgErr.message }, { status: 500 });
    }
    messages = (msgs ?? []) as MsgRow[];
  }

  const msgsByConv = new Map<string, MsgRow[]>();
  for (const m of messages) {
    const arr = msgsByConv.get(m.conversation_id);
    if (arr) arr.push(m);
    else msgsByConv.set(m.conversation_id, [m]);
  }
  msgsByConv.forEach((arr) => {
    arr.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
  });

  const periodConvs: ConvRow[] = [];
  const prevConvs: ConvRow[] = [];
  for (const c of convs) {
    const t = new Date(c.created_at).getTime();
    if (t >= start.getTime()) periodConvs.push(c);
    else if (t >= prevStart.getTime()) prevConvs.push(c);
  }

  function summary(arr: ConvRow[]) {
    const total = arr.length;
    const leads = arr.reduce((n, c) => n + (c.is_lead ? 1 : 0), 0);
    return {
      conversations: total,
      qualifiedLeads: leads,
      captureRate: total > 0 ? leads / total : 0,
    };
  }

  // Funnel
  const visitorsStarted = periodConvs.length;
  let engaged = 0;
  let nameCaptured = 0;
  let contactCaptured = 0;
  let bookingIntent = 0;
  for (const c of periodConvs) {
    const ms = msgsByConv.get(c.id) ?? [];
    if (ms.length >= 3) engaged++;
    if (c.customer_name && c.customer_name.trim().length > 0) nameCaptured++;
    if (c.is_lead) contactCaptured++;
    if (c.booking_intent) bookingIntent++;
  }

  // Stalled
  const stalled = periodConvs
    .map((c) => {
      const ms = msgsByConv.get(c.id) ?? [];
      const lastCustomer = [...ms].reverse().find((m) => m.role === "customer");
      const firstCustomer = ms.find((m) => m.role === "customer");
      return {
        c,
        count: ms.length,
        lastQuestion: (lastCustomer?.content ?? firstCustomer?.content ?? "").slice(0, 240),
      };
    })
    .filter((row) => row.count >= 4 && !row.c.is_lead)
    .sort(
      (a, b) =>
        new Date(b.c.updated_at).getTime() - new Date(a.c.updated_at).getTime()
    )
    .slice(0, 10)
    .map((row) => ({
      id: row.c.id,
      messageCount: row.count,
      lastQuestion: row.lastQuestion,
      customerName: row.c.customer_name,
      updatedAt: row.c.updated_at,
      createdAt: row.c.created_at,
    }));

  // Low-quality assistant replies, grouped by preceding visitor question.
  const topics = new Map<
    string,
    { question: string; count: number; sampleAnswer: string }
  >();
  for (const c of periodConvs) {
    const ms = msgsByConv.get(c.id) ?? [];
    for (let i = 0; i < ms.length; i++) {
      const m = ms[i];
      if (m.role !== "assistant") continue;
      const lc = m.content.toLowerCase();
      if (!HEDGE_PHRASES.some((h) => lc.includes(h))) continue;

      let q = "";
      for (let j = i - 1; j >= 0; j--) {
        if (ms[j].role === "customer") {
          q = ms[j].content;
          break;
        }
      }
      if (!q) continue;
      const key = q.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 100);
      const existing = topics.get(key);
      if (existing) existing.count++;
      else
        topics.set(key, {
          question: q.trim().slice(0, 220),
          count: 1,
          sampleAnswer: m.content.trim().slice(0, 220),
        });
    }
  }
  const lowQuality = Array.from(topics.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Heatmap, 7 (Mon-Sun) x 24 (0-23), in SAST.
  const heatmap: number[][] = Array.from({ length: 7 }, () =>
    Array.from({ length: 24 }, () => 0)
  );
  for (const c of periodConvs) {
    const { day, hour } = sastDayHour(c.created_at);
    heatmap[day][hour]++;
  }

  return NextResponse.json({
    range,
    thisPeriod: summary(periodConvs),
    prevPeriod: summary(prevConvs),
    funnel: {
      visitorsStarted,
      engaged,
      nameCaptured,
      contactCaptured,
      bookingIntent,
    },
    stalled,
    lowQuality,
    heatmap,
  });
}
