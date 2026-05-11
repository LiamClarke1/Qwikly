import { NextRequest, NextResponse } from 'next/server';
import { v2Auth } from '@/lib/v2-auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { buildCheckoutUrl } from '@/lib/payfast/checkout';
import { PLAN_CONFIG, resolvePlan, type InboundPlanTier } from '@/lib/plan';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Ordered tier list used to validate upgrade direction. trial < starter <
 * pro < founders < business < enterprise. Premium is a legacy bucket and
 * is intentionally not in the upgrade flow.
 */
const TIER_ORDER: InboundPlanTier[] = [
  'trial',
  'starter',
  'pro',
  'founders',
  'business',
  'enterprise',
];

function tierIndex(tier: InboundPlanTier): number {
  return TIER_ORDER.indexOf(tier);
}

export async function POST(req: NextRequest) {
  const auth = await v2Auth();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { plan?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const newPlan = resolvePlan(body.plan);
  if (!TIER_ORDER.includes(newPlan)) {
    return NextResponse.json({ error: 'invalid_plan' }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { data: sub } = await db
    .from('subscriptions')
    .select(
      'id, plan, status, current_period_end, payfast_token, pending_plan',
    )
    .eq('user_id', auth.userId)
    .maybeSingle();

  if (!sub) {
    return NextResponse.json({ error: 'no_subscription' }, { status: 400 });
  }

  const currentPlan = resolvePlan(sub.plan ?? 'trial');

  // Reject same-tier or down-tier requests so the caller routes through
  // /api/payfast/downgrade instead (no money moves on a downgrade).
  if (tierIndex(newPlan) <= tierIndex(currentPlan)) {
    return NextResponse.json({ error: 'use_downgrade' }, { status: 400 });
  }

  const newPriceCents = PLAN_CONFIG[newPlan].priceMonthly * 100;
  const oldPriceCents = PLAN_CONFIG[currentPlan].priceMonthly * 100;

  const now = Date.now();
  const periodEndMs = sub.current_period_end
    ? new Date(sub.current_period_end).getTime()
    : now;
  const daysRemaining = Math.max(0, (periodEndMs - now) / 86400000);

  const newTierRemaining = (newPriceCents / 30) * daysRemaining;
  const oldTierCredit = (oldPriceCents / 30) * daysRemaining;
  const prorationCents = Math.max(
    0,
    Math.round(newTierRemaining - oldTierCredit),
  );

  // Sub-R10 proration is too small to be worth charging the customer. We
  // schedule the upgrade for next renewal instead, matching the downgrade
  // mechanic (pending_plan settles at the next period boundary).
  if (prorationCents < 1000) {
    await db
      .from('subscriptions')
      .update({ pending_plan: newPlan })
      .eq('id', sub.id);
    return NextResponse.json({ scheduled: true });
  }

  // Find the client_id payfast_payments requires (the table FK's into
  // clients, not subscriptions, because client_id is the customer-facing
  // unit of access).
  const { data: client } = await db
    .from('clients')
    .select('id')
    .eq('auth_user_id', auth.userId)
    .maybeSingle();

  if (!client) {
    return NextResponse.json({ error: 'no_client' }, { status: 400 });
  }

  const m_payment_id = `up_${sub.id}_${Date.now()}`;
  const { error: insertErr } = await db.from('payfast_payments').insert({
    client_id: client.id,
    subscription_id: sub.id,
    m_payment_id,
    purpose: 'upgrade_proration',
    status: 'pending',
    amount_zar_cents: prorationCents,
  });
  if (insertErr) {
    console.error('[payfast/upgrade] failed to insert pending payment', insertErr);
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
  }

  const url = buildCheckoutUrl({
    m_payment_id,
    amount_zar_cents: prorationCents,
    item_name: `Qwikly ${PLAN_CONFIG[newPlan].name} upgrade`,
    item_description: `Prorated upgrade from ${PLAN_CONFIG[currentPlan].name} to ${PLAN_CONFIG[newPlan].name}`,
    client_id: client.id,
    subscription_id: sub.id,
    purpose: 'upgrade_proration',
    recurring: false,
  });

  return NextResponse.json({ url });
}
