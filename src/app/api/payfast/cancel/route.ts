import { NextResponse } from 'next/server';
import { v2Auth } from '@/lib/v2-auth';
import { supabaseAdmin } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Mark the subscription to cancel at the current period end. No PayFast
 * call happens here. The renewal-sweep cron picks up the flag at
 * current_period_end and calls /subscriptions/{token}/cancel against
 * PayFast at that point, so the customer keeps access for everything
 * they've already paid for.
 */
export async function POST() {
  const auth = await v2Auth();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = supabaseAdmin();

  const { data: sub } = await db
    .from('subscriptions')
    .select('id, status, current_period_end')
    .eq('user_id', auth.userId)
    .maybeSingle();

  if (!sub || sub.status !== 'active') {
    return NextResponse.json({ error: 'no_active_subscription' }, { status: 400 });
  }

  await db
    .from('subscriptions')
    .update({ cancel_at_period_end: true })
    .eq('id', sub.id);

  return NextResponse.json({
    ok: true,
    ends_at: sub.current_period_end,
  });
}
