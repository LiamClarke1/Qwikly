import type { SupabaseClient } from "@supabase/supabase-js";

export interface BillingStat {
  key: string;
  label: string;
  value: number | string;
  /** Optional sub-breakdown shown indented on invoice. */
  breakdown?: { label: string; value: number | string }[];
}

export interface StatsAggregationResult {
  stats: BillingStat[];
  warnings: string[];
}

const HUMAN_HANDLE_TIME_MIN = 5;

/**
 * Aggregate Qwikly usage stats for a client over a billing window.
 * Missing data is omitted (not faked). Warnings are logged for admin review.
 */
export async function aggregateStats(
  sb: SupabaseClient,
  clientId: number,
  windowStart: Date,
  windowEnd: Date,
): Promise<StatsAggregationResult> {
  const stats: BillingStat[] = [];
  const warnings: string[] = [];
  const startIso = windowStart.toISOString();
  const endIso = windowEnd.toISOString();

  // 1. Conversation count (total + by channel)
  const conv = await sb
    .from("conversations")
    .select("channel", { count: "exact" })
    .eq("client_id", clientId)
    .gte("created_at", startIso)
    .lt("created_at", endIso);

  const totalConvs = conv.count ?? 0;
  if (conv.error) {
    warnings.push(`conversations query failed: ${conv.error.message}`);
  } else if (totalConvs > 0) {
    const byChannel: Record<string, number> = {};
    for (const c of (conv.data ?? []) as { channel: string | null }[]) {
      const k = c.channel ?? "unknown";
      byChannel[k] = (byChannel[k] ?? 0) + 1;
    }
    stats.push({
      key: "conversations",
      label: "Conversations handled by your Qwikly digital assistant",
      value: totalConvs,
      breakdown: Object.entries(byChannel).map(([ch, n]) => ({
        label: ch,
        value: n,
      })),
    });
  }

  // 2. Qualified leads (conversations with is_lead=true)
  const leads = await sb
    .from("conversations")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .eq("is_lead", true)
    .gte("created_at", startIso)
    .lt("created_at", endIso);

  if (leads.error) {
    warnings.push(`leads query failed: ${leads.error.message}`);
  } else if ((leads.count ?? 0) > 0) {
    stats.push({
      key: "qualified_leads",
      label: "Qualified leads captured",
      value: leads.count!,
    });
  }

  // 3. Bookings created
  const bookings = await sb
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .gte("created_at", startIso)
    .lt("created_at", endIso);

  if (bookings.error) {
    warnings.push(`bookings query failed: ${bookings.error.message}`);
  } else if ((bookings.count ?? 0) > 0) {
    stats.push({
      key: "bookings",
      label: "Bookings created via Qwikly",
      value: bookings.count!,
    });
  }

  // 4. Estimated time saved (conversations × avg human handle time)
  if (totalConvs > 0) {
    const minutesSaved = totalConvs * HUMAN_HANDLE_TIME_MIN;
    const hours = Math.round((minutesSaved / 60) * 10) / 10;
    stats.push({
      key: "time_saved_hours",
      label: "Estimated staff time saved",
      value: `${hours} hours`,
    });
  }

  return { stats, warnings };
}
