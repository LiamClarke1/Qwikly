// Summarises a tenant's recent inbound chat + booking history into a compact
// context block fed to the ICP synthesis prompt. The idea: who they have
// ACTUALLY been talking to and booking lately is the strongest signal for
// who they should be PROSPECTING. We never invent customers; if the tenant
// has no inbound history (e.g. outbound-only) the summary is empty and the
// synthesis falls back to website + offer + GBP alone.
//
// Pulls from three tables, all keyed by clients.id:
//   - bookings: most reliable signal. job_type + area on every row.
//   - conversations: customer_name + customer_email + notes per session.
//   - messages_log (role='customer'): first message per conversation as
//     an "enquiry topic" signal.
//
// Reads happen with the service role via supabaseAdmin(), so RLS is bypassed.
// Volume is capped to keep token costs sane: last 60 days, 100 rows max
// per table.

import { supabaseAdmin } from "@/lib/supabase-server";

const LOOKBACK_DAYS = 60;
const MAX_ROWS_PER_TABLE = 100;
const MAX_TOP_ITEMS = 5;
const MAX_NOTES = 5;
const NOTE_CHAR_CAP = 240;

export interface InboundHistorySummary {
  /** Total bookings in the lookback window. */
  bookingCount: number;
  /** Total inbound conversations in the lookback window. */
  conversationCount: number;
  /** Top job_type frequencies from bookings, e.g. [["plumbing", 12], ...]. */
  topJobTypes: Array<[string, number]>;
  /** Top area frequencies from bookings, e.g. [["Cape Town", 18], ...]. */
  topAreas: Array<[string, number]>;
  /** Top channel mix from conversations: [["web_chat", 30], ["whatsapp", 8]]. */
  channelMix: Array<[string, number]>;
  /** Up to MAX_NOTES recent non-empty conversation notes (truncated). */
  recentNotes: string[];
  /** True when at least one signal landed. False = empty summary, skip in prompt. */
  hasData: boolean;
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

function tally(values: Array<string | null | undefined>, topN: number): Array<[string, number]> {
  const counts = new Map<string, number>();
  for (const v of values) {
    if (typeof v !== "string") continue;
    const key = v.trim();
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN);
}

/**
 * Read recent bookings + conversations for the tenant and reduce them to a
 * compact summary safe to inline into the synthesis prompt. Soft-fails on
 * every query — a missing table or a permissions error yields an empty
 * summary, never an exception.
 */
export async function summariseInboundHistory(
  clientId: string | number,
): Promise<InboundHistorySummary> {
  const empty: InboundHistorySummary = {
    bookingCount: 0,
    conversationCount: 0,
    topJobTypes: [],
    topAreas: [],
    channelMix: [],
    recentNotes: [],
    hasData: false,
  };

  const since = isoDaysAgo(LOOKBACK_DAYS);
  const db = supabaseAdmin();

  // Bookings: the strongest signal (job_type + area are first-class columns).
  let bookings: Array<{ job_type: string | null; area: string | null }> = [];
  try {
    const { data } = await db
      .from("bookings")
      .select("job_type, area")
      .eq("client_id", clientId)
      .gte("created_at", since)
      .limit(MAX_ROWS_PER_TABLE);
    if (Array.isArray(data)) {
      bookings = data as typeof bookings;
    }
  } catch {
    // ignore
  }

  // Conversations: channel mix + notes. The customer_phone/email aren't
  // useful for ICP synthesis (PII) so we don't read them here.
  let convs: Array<{ channel: string | null; notes: string | null }> = [];
  try {
    const { data } = await db
      .from("conversations")
      .select("channel, notes")
      .eq("client_id", clientId)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(MAX_ROWS_PER_TABLE);
    if (Array.isArray(data)) {
      convs = data as typeof convs;
    }
  } catch {
    // ignore
  }

  const topJobTypes = tally(
    bookings.map((b) => b.job_type),
    MAX_TOP_ITEMS,
  );
  const topAreas = tally(
    bookings.map((b) => b.area),
    MAX_TOP_ITEMS,
  );
  const channelMix = tally(
    convs.map((c) => c.channel),
    MAX_TOP_ITEMS,
  );
  const recentNotes = convs
    .map((c) => c.notes)
    .filter((n): n is string => typeof n === "string" && n.trim().length > 0)
    .map((n) => n.trim().slice(0, NOTE_CHAR_CAP))
    .slice(0, MAX_NOTES);

  const hasData =
    bookings.length > 0 ||
    convs.length > 0 ||
    topJobTypes.length > 0 ||
    topAreas.length > 0 ||
    recentNotes.length > 0;

  if (!hasData) return empty;

  return {
    bookingCount: bookings.length,
    conversationCount: convs.length,
    topJobTypes,
    topAreas,
    channelMix,
    recentNotes,
    hasData: true,
  };
}
