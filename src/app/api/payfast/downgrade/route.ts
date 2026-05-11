import { NextRequest, NextResponse } from 'next/server';
import { v2Auth } from '@/lib/v2-auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { resolvePlan, type InboundPlanTier } from '@/lib/plan';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Ordered tier list, mirrored from the upgrade route. trial < starter <
 * pro < founders < business < enterprise. Premium is legacy and not part
 * of the up/down ladder.
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
    .select('id, plan, status, current_period_end')
    .eq('user_id', auth.userId)
    .maybeSingle();

  // Downgrade requires an active subscription; trial users have nothing to
  // step down from.
  if (!sub || sub.status !== 'active') {
    return NextResponse.json({ error: 'no_active_subscription' }, { status: 400 });
  }

  const currentPlan = resolvePlan(sub.plan ?? 'trial');

  // Reject same-tier or up-tier requests so the caller routes through
  // /api/payfast/upgrade instead (proration money has to move on an
  // upgrade).
  if (tierIndex(newPlan) >= tierIndex(currentPlan)) {
    return NextResponse.json({ error: 'use_upgrade' }, { status: 400 });
  }

  await db
    .from('subscriptions')
    .update({ pending_plan: newPlan })
    .eq('id', sub.id);

  return NextResponse.json({
    ok: true,
    takes_effect_at: sub.current_period_end,
  });
}
