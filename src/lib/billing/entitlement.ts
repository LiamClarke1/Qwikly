import 'server-only';
import { supabaseAdmin } from '@/lib/supabase-server';
import {
  PLAN_CONFIG,
  resolvePlan,
  hasOutbound,
  dailyProspectQuotaForPlan,
} from '@/lib/plan';

/**
 * Aggregate entitlement snapshot returned by `getEntitlement()`. Every
 * runtime gate (pre-chat, lead capture, Outbound pipeline, dashboard
 * meters) reads from this single shape so caps and feature flags can never
 * disagree between surfaces.
 *
 * Feature flags like `leadLimit`, `hasOutbound`, and `pipelineDailyQuota`
 * are derived at read time from `PLAN_CONFIG[plan]` rather than stored on
 * the `clients` row. That keeps the writer (`applySubscriptionToClient`)
 * narrow and means a tier-config change auto-propagates with no migration.
 */
export interface Entitlement {
  plan: string;
  status: string;
  assistantPaused: boolean;
  leadsThisMonth: number;
  leadLimit: number;
  topupLeadsRemaining: number;
  totalLeadsAvailable: number;
  aiCreditGrantedZarCents: number;
  aiCreditPurchasedZarCents: number;
  aiCreditTotalZarCents: number;
  hasOutbound: boolean;
  pipelineDailyQuota: number;
  periodStart: Date | null;
  periodEnd: Date | null;
  trialEndsAt: Date | null;
  cancelAtPeriodEnd: boolean;
  pendingPlan: string | null;
}

type LeadTopupRow = { leads_remaining: number | null };

/**
 * Aggregate entitlement reader for the chat runtime, lead capture, dashboard
 * meters, and Outbound guards. Single query path so feature flags and caps
 * are guaranteed coherent inside a request.
 *
 * Reads:
 *   - clients (for ai_paused + the derived plan if no subscription exists)
 *   - subscriptions (source of truth for plan, status, period anchors)
 *   - conversation_credits (split granted + purchased balances)
 *   - usage_periods (leads captured in the active billing window)
 *   - lead_topups (non-expired lead packs, summed for capacity headroom)
 *
 * Derives:
 *   - leadLimit, hasOutbound, pipelineDailyQuota from PLAN_CONFIG
 *   - aiCreditTotalZarCents = granted + purchased
 *   - totalLeadsAvailable   = max(0, leadLimit - used) + topupLeadsRemaining
 */
export async function getEntitlement(clientId: number): Promise<Entitlement> {
  const db = supabaseAdmin();
  const now = new Date();

  const [clientRow, subRow, creditsRow, usageRow, topupsRow] = await Promise.all([
    db
      .from('clients')
      .select('id, plan, ai_paused, auth_user_id')
      .eq('id', clientId)
      .maybeSingle(),
    db
      .from('subscriptions')
      .select(
        'plan, status, current_period_start, current_period_end, cancel_at_period_end, pending_plan, trial_ends_at',
      )
      .eq('client_id', clientId)
      .maybeSingle(),
    db
      .from('conversation_credits')
      .select('granted_balance_zar_cents, purchased_balance_zar_cents')
      .eq('client_id', clientId)
      .maybeSingle(),
    db
      .from('usage_periods')
      .select('leads_captured')
      .eq('client_id', clientId)
      .maybeSingle(),
    db
      .from('lead_topups')
      .select('leads_remaining, expires_at')
      .eq('client_id', clientId)
      .gt('leads_remaining', 0)
      .gt('expires_at', now.toISOString()),
  ]);

  const client = (clientRow as { data: { plan?: string; ai_paused?: boolean; auth_user_id?: string } | null }).data ?? null;
  const subscription = (subRow as {
    data: {
      plan?: string;
      status?: string;
      current_period_start?: string | null;
      current_period_end?: string | null;
      cancel_at_period_end?: boolean | null;
      pending_plan?: string | null;
      trial_ends_at?: string | null;
    } | null;
  }).data ?? null;
  const credits = (creditsRow as {
    data: { granted_balance_zar_cents?: number; purchased_balance_zar_cents?: number } | null;
  }).data ?? null;
  const usage = (usageRow as { data: { leads_captured?: number } | null }).data ?? null;
  const topups =
    ((topupsRow as { data: LeadTopupRow[] | null }).data ?? []) as LeadTopupRow[];

  const tier = resolvePlan(subscription?.plan ?? client?.plan ?? 'trial');
  const cfg = PLAN_CONFIG[tier];

  // Owner account gets unlimited access regardless of plan.
  if (client?.auth_user_id) {
    const ownerEmail = process.env.OWNER_EMAIL ?? 'liamclarke21@outlook.com';
    const { data: authUser } = await db.auth.admin.getUserById(client.auth_user_id);
    if (authUser?.user?.email?.toLowerCase() === ownerEmail.toLowerCase()) {
      return {
        plan: 'enterprise',
        status: 'active',
        assistantPaused: false,
        leadsThisMonth: 0,
        leadLimit: Number.MAX_SAFE_INTEGER,
        topupLeadsRemaining: 0,
        totalLeadsAvailable: Number.MAX_SAFE_INTEGER,
        aiCreditGrantedZarCents: 9_999_999_99,
        aiCreditPurchasedZarCents: 0,
        aiCreditTotalZarCents: 9_999_999_99,
        hasOutbound: true,
        pipelineDailyQuota: 999,
        periodStart: null,
        periodEnd: null,
        trialEndsAt: null,
        cancelAtPeriodEnd: false,
        pendingPlan: null,
      };
    }
  }

  const grantedCents = credits?.granted_balance_zar_cents ?? 0;
  const purchasedCents = credits?.purchased_balance_zar_cents ?? 0;
  const totalCents = grantedCents + purchasedCents;

  const leadsThisMonth = usage?.leads_captured ?? 0;
  // null leadLimit on PLAN_CONFIG means unlimited (legacy Premium tier).
  const leadLimit = cfg.leadLimit ?? Number.MAX_SAFE_INTEGER;
  const topupLeadsRemaining = topups.reduce(
    (sum, row) => sum + (row.leads_remaining ?? 0),
    0,
  );

  return {
    plan: subscription?.plan ?? client?.plan ?? 'trial',
    status: subscription?.status ?? 'active',
    assistantPaused: client?.ai_paused ?? false,
    leadsThisMonth,
    leadLimit,
    topupLeadsRemaining,
    totalLeadsAvailable: Math.max(0, leadLimit - leadsThisMonth) + topupLeadsRemaining,
    aiCreditGrantedZarCents: grantedCents,
    aiCreditPurchasedZarCents: purchasedCents,
    aiCreditTotalZarCents: totalCents,
    hasOutbound: hasOutbound(tier),
    pipelineDailyQuota: dailyProspectQuotaForPlan(tier),
    periodStart: subscription?.current_period_start
      ? new Date(subscription.current_period_start)
      : null,
    periodEnd: subscription?.current_period_end
      ? new Date(subscription.current_period_end)
      : null,
    trialEndsAt: subscription?.trial_ends_at ? new Date(subscription.trial_ends_at) : null,
    cancelAtPeriodEnd: subscription?.cancel_at_period_end ?? false,
    pendingPlan: subscription?.pending_plan ?? null,
  };
}
