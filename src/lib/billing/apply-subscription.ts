import 'server-only';
import { supabaseAdmin } from '@/lib/supabase-server';
import {
  resolvePlan,
  productsForPlan,
  dailyProspectQuotaForPlan,
} from '@/lib/plan';

/**
 * Subscription statuses that should pause the assistant on the derived
 * `clients` row. Everything else (e.g. 'active', 'past_due') leaves the
 * assistant running so the customer keeps access during a short grace
 * period; pause only fires once the renewal-sweep or trial-sweep cron
 * has confirmed the subscription is no longer entitled.
 */
const PAUSED_STATUSES = new Set(['trial_expired', 'paused_unpaid', 'cancelled']);

/**
 * Single funnel for writing entitlement to `clients`.
 *
 * `subscriptions` is the source of truth for what the customer is paying
 * for. `clients` is a derived view that the chat runtime, lead capture, and
 * Outbound guards read on every request.
 *
 * This is the ONLY function in the codebase that writes `clients.plan`,
 * `clients.products`, `clients.pipeline_daily_quota`, or `clients.ai_paused`.
 * Every entitlement-mutating code path (signup, ITN handler, renewal cron,
 * trial-sweep, dunning-sweep, manual admin tools) must call this function
 * instead of touching those columns directly.
 *
 * Feature flags like remove_branding, custom_greeting, csv_export, api_access,
 * and the lead cap are intentionally NOT stored on `clients` — they're
 * derived at read time from `PLAN_CONFIG[plan]` via `getEntitlement()`.
 * That keeps the writer narrow and means a tier-config change auto-applies
 * to every customer on next read with no migration or backfill.
 */
export async function applySubscriptionToClient(subscriptionId: number): Promise<void> {
  const db = supabaseAdmin();

  const { data: sub, error: subErr } = await db
    .from('subscriptions')
    .select('id, client_id, plan, status, cancel_at_period_end, current_period_end, pending_plan')
    .eq('id', subscriptionId)
    .single();

  if (subErr || !sub) {
    throw new Error(
      `applySubscriptionToClient: subscription ${subscriptionId} not found: ${subErr?.message ?? 'no row'}`,
    );
  }

  const tier = resolvePlan(sub.plan);
  const aiPaused = PAUSED_STATUSES.has(sub.status);

  const updates = {
    plan: sub.plan,
    products: productsForPlan(tier),
    pipeline_daily_quota: dailyProspectQuotaForPlan(tier),
    ai_paused: aiPaused,
  };

  const { error: updErr } = await db
    .from('clients')
    .update(updates)
    .eq('id', sub.client_id);

  if (updErr) {
    throw new Error(`applySubscriptionToClient: write failed: ${updErr.message}`);
  }
}
