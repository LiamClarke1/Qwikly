import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Risk + health scoring for CRM clients.
 *
 * Risk score (0-100, higher = more risk):
 *   +30  any qwikly_billing_invoice currently 'overdue'
 *   +20  last_activity_at older than 30 days (or never, account >30d old)
 *   +20  any dispute opened in the last 90 days
 *   +10  onboarding incomplete AND account older than 7 days
 *   +20  on a paid plan but mrr_zar is 0 or null
 * Capped at 100. Bands: >=70 high, 40-69 medium, <40 low.
 *
 * Health score (0-100, higher = healthier):
 *   Starts at 100, then per-trigger penalties mirror the risk inputs above.
 *   +20 engagement bonus if any conversation in the last 30 days.
 *   Floored at 0.
 *
 * Both are pure functions of the inputs object so callers (cron + tests + ad-hoc
 * recompute on demand) all see the same numbers. The inputs are pre-fetched by
 * the cron in batch queries so we never make a per-client round-trip.
 */

export interface ScoreInputs {
  has_overdue_invoice: boolean;
  last_activity_at: string | null;
  account_created_at: string;
  recent_dispute_count: number;        // disputes opened in last 90d
  onboarding_complete: boolean;
  mrr_zar: number | null;              // cents
  plan: string | null;
  recent_conversation_count: number;   // conversations in last 30d
}

export interface ScoreResult {
  risk_score: number;
  risk_flags: string[];
  health_score: number;
}

const DAY_MS = 86_400_000;

export function computeScores(inputs: ScoreInputs, now: Date = new Date()): ScoreResult {
  const flags: string[] = [];
  let risk = 0;
  let health = 100;

  if (inputs.has_overdue_invoice) {
    risk += 30;
    health -= 30;
    flags.push("overdue_invoice");
  }

  const lastActivityMs = inputs.last_activity_at ? new Date(inputs.last_activity_at).getTime() : null;
  const accountAgeDays = (now.getTime() - new Date(inputs.account_created_at).getTime()) / DAY_MS;
  const inactiveDays = lastActivityMs !== null
    ? (now.getTime() - lastActivityMs) / DAY_MS
    : accountAgeDays;
  if (inactiveDays > 30) {
    risk += 20;
    health -= 20;
    flags.push("inactive_30d");
  }

  if (inputs.recent_dispute_count > 0) {
    risk += 20;
    health -= 20;
    flags.push("recent_dispute");
  }

  if (!inputs.onboarding_complete && accountAgeDays > 7) {
    risk += 10;
    health -= 10;
    flags.push("stuck_onboarding");
  }

  const isPaidPlan = inputs.plan !== null && inputs.plan !== "trial";
  const hasMrr = inputs.mrr_zar !== null && inputs.mrr_zar > 0;
  // Asymmetric on purpose: missing MRR is a stronger risk signal than it is a health signal. Tune here if needed.
  if (isPaidPlan && !hasMrr) {
    risk += 20;
    health -= 10;
    flags.push("missing_mrr");
  }

  if (inputs.recent_conversation_count > 0) {
    health += 20;
  }

  return {
    risk_score: Math.min(100, Math.max(0, risk)),
    risk_flags: flags,
    health_score: Math.min(100, Math.max(0, health)),
  };
}

/**
 * Recompute scores for every non-deleted client and write back to the DB.
 * Returns counts so the cron caller can log progress.
 *
 * Strategy:
 *   1. Pull all client ids in one query.
 *   2. Pull aggregate signals in batched queries (overdue invoices, recent
 *      disputes, recent conversations) so we never do a per-client roundtrip.
 *   3. Compute scores in JS, write back per-client. Writes are sequential
 *      to avoid hammering the DB but use service role so RLS is not in the way.
 */
export async function recomputeAllClientScores(
  sb: SupabaseClient,
  now: Date = new Date(),
): Promise<{ updated: number; skipped: number; errors: number }> {
  const clientsRes = await sb
    .from("clients")
    .select("id, last_activity_at, created_at, onboarding_complete, mrr_zar, plan, crm_status")
    .neq("crm_status", "pending_deletion");

  if (clientsRes.error || !clientsRes.data) return { updated: 0, skipped: 0, errors: 1 };

  const clients = clientsRes.data as Array<{
    id: number;
    last_activity_at: string | null;
    created_at: string;
    onboarding_complete: boolean | null;
    mrr_zar: number | null;
    plan: string | null;
    crm_status: string;
  }>;
  const clientIds = clients.map(c => c.id);
  if (clientIds.length === 0) return { updated: 0, skipped: 0, errors: 0 };

  // Batch signal 1: which clients have any 'overdue' qwikly_billing_invoice?
  const overdueRes = await sb
    .from("qwikly_billing_invoices")
    .select("client_id")
    .in("client_id", clientIds)
    .eq("status", "overdue");
  const overdueSet = new Set<number>((overdueRes.data ?? []).map(r => r.client_id as number));

  // Batch signal 2: count recent disputes per client (last 90 days).
  const ninetyDaysAgo = new Date(now.getTime() - 90 * DAY_MS).toISOString();
  const disputesRes = await sb
    .from("disputes")
    .select("client_id")
    .in("client_id", clientIds)
    .gte("created_at", ninetyDaysAgo);
  const disputeCount = new Map<number, number>();
  for (const d of (disputesRes.data ?? []) as Array<{ client_id: number }>) {
    disputeCount.set(d.client_id, (disputeCount.get(d.client_id) ?? 0) + 1);
  }

  // Batch signal 3: count recent conversations per client (last 30 days).
  const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS).toISOString();
  const convosRes = await sb
    .from("conversations")
    .select("client_id")
    .in("client_id", clientIds)
    .gte("created_at", thirtyDaysAgo);
  const convoCount = new Map<number, number>();
  for (const c of (convosRes.data ?? []) as Array<{ client_id: number }>) {
    convoCount.set(c.client_id, (convoCount.get(c.client_id) ?? 0) + 1);
  }

  let updated = 0;
  let errors = 0;

  for (const client of clients) {
    const inputs: ScoreInputs = {
      has_overdue_invoice: overdueSet.has(client.id),
      last_activity_at: client.last_activity_at,
      account_created_at: client.created_at,
      recent_dispute_count: disputeCount.get(client.id) ?? 0,
      onboarding_complete: !!client.onboarding_complete,
      mrr_zar: client.mrr_zar,
      plan: client.plan,
      recent_conversation_count: convoCount.get(client.id) ?? 0,
    };
    const result = computeScores(inputs, now);

    const upd = await sb
      .from("clients")
      .update({
        risk_score: result.risk_score,
        risk_flags: result.risk_flags,
        health_score: result.health_score,
      })
      .eq("id", client.id);

    if (upd.error) {
      errors++;
      console.error(`[risk-health] update failed for client ${client.id}:`, upd.error.message);
    } else {
      updated++;
    }
  }

  return { updated, skipped: 0, errors };
}
