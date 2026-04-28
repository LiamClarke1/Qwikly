import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TRADE_EMOJIS: Record<string, string> = {
  plumber: "🔧",
  plumbing: "🔧",
  electrician: "⚡",
  electrical: "⚡",
  roofer: "🏠",
  roofing: "🏠",
  aircon: "❄️",
  "air conditioning": "❄️",
  hvac: "❄️",
  pool: "🏊",
  solar: "☀️",
  locksmith: "🔑",
  pest: "🐛",
  landscaping: "🌿",
  garden: "🌿",
  painting: "🎨",
  security: "🛡️",
  cleaning: "🧹",
  handyman: "🔨",
};

function tradeEmoji(trade: string): string {
  const lower = (trade ?? "").toLowerCase();
  for (const [key, emoji] of Object.entries(TRADE_EMOJIS)) {
    if (lower.includes(key)) return emoji;
  }
  return "🔧";
}

function firstNameOnly(name: string | null): string {
  if (!name) return "A customer";
  return name.split(" ")[0];
}

function minutesAgo(isoString: string): number {
  return Math.floor((Date.now() - new Date(isoString).getTime()) / 60000);
}

export async function GET() {
  try {
    const db = supabaseAdmin();

    const { data, error } = await db
      .from("bookings")
      .select("id, customer_name, area, job_type, created_at, client_id, clients(business_name, trade)")
      .neq("status", "cancelled")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;

    const items = (data ?? []).map((b: {
      id: string;
      customer_name: string | null;
      area: string | null;
      job_type: string | null;
      created_at: string;
      // Supabase join returns array or single depending on relation type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      clients: any;
    }) => {
      const client = Array.isArray(b.clients) ? b.clients[0] : b.clients;
      const trade = client?.trade ?? "Service";
      const businessName = client?.business_name ?? "Local business";
      const suburb = b.area ?? "South Africa";
      const mins = minutesAgo(b.created_at);
      const timeLabel = mins < 1 ? "just now" : `${mins} min ago`;

      return {
        id: b.id,
        emoji: tradeEmoji(trade),
        text: `${businessName} booked a ${b.job_type ?? trade.toLowerCase()} ${timeLabel} in ${suburb}`,
      };
    });

    return NextResponse.json(
      { items },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=10",
        },
      }
    );
  } catch {
    return NextResponse.json({ items: [] });
  }
}
