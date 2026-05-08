import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Compute average first-response time (seconds) for a client over a time window.
 *
 * Definition: for each conversation that started in the window, find the first
 * user message and the first assistant message after it. Diff in seconds is
 * that conversation's response time. Average across all qualifying conversations.
 *
 * Returns null when there is no data to compute against (no conversations in
 * the window, or no conversation that has both a user and a later assistant
 * message). UIs should render "—" for null rather than fabricating a 0.
 */
export async function avgFirstResponseSeconds(
  sb: SupabaseClient,
  clientId: number,
  windowStart: Date,
  windowEnd: Date,
): Promise<number | null> {
  const convosRes = await sb
    .from("conversations")
    .select("id")
    .eq("client_id", clientId)
    .gte("created_at", windowStart.toISOString())
    .lt("created_at", windowEnd.toISOString());

  if (convosRes.error || !convosRes.data || convosRes.data.length === 0) return null;
  const convoIds = convosRes.data.map(c => c.id as string);

  // Fetch all messages for these conversations in chrono order.
  // Cap at 50k rows to avoid pathological pulls if a conversation is huge.
  const msgsRes = await sb
    .from("messages_log")
    .select("conversation_id, role, created_at")
    .in("conversation_id", convoIds)
    .order("created_at", { ascending: true })
    .limit(50000);

  if (msgsRes.error || !msgsRes.data) return null;

  // Per conversation: find ts of first user message, then first assistant after it.
  const firstUserAt = new Map<string, number>();
  const firstAssistantAfterUser = new Map<string, number>();
  for (const m of msgsRes.data as { conversation_id: string; role: string; created_at: string }[]) {
    const ts = new Date(m.created_at).getTime();
    if (m.role === "user" && !firstUserAt.has(m.conversation_id)) {
      firstUserAt.set(m.conversation_id, ts);
    } else if (m.role === "assistant" && firstUserAt.has(m.conversation_id) && !firstAssistantAfterUser.has(m.conversation_id)) {
      const userTs = firstUserAt.get(m.conversation_id)!;
      if (ts >= userTs) firstAssistantAfterUser.set(m.conversation_id, ts);
    }
  }

  const diffs: number[] = [];
  firstUserAt.forEach((userTs, convoId) => {
    const assistantTs = firstAssistantAfterUser.get(convoId);
    if (assistantTs !== undefined) diffs.push((assistantTs - userTs) / 1000);
  });

  if (diffs.length === 0) return null;
  const sum = diffs.reduce((s, d) => s + d, 0);
  return Math.round(sum / diffs.length);
}
