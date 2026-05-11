import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { applySubscriptionToClient } from '@/lib/billing/apply-subscription';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Trial-sweep cron — pauses expired trials.
 *
 * Runs hourly. Finds subscriptions on the `trial` plan whose
 * `current_period_end` has passed, marks them `trial_expired`, then funnels
 * each through `applySubscriptionToClient()` so the derived `clients.ai_paused`
 * column flips to true. The chat runtime reads `clients.ai_paused` on every
 * turn, so the assistant goes quiet immediately for trials that didn't
 * convert.
 */
export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const db = supabaseAdmin();
  const now = new Date().toISOString();

  const { data: expired } = await db
    .from('subscriptions')
    .select('id')
    .eq('plan', 'trial')
    .eq('status', 'active')
    .lt('current_period_end', now)
    .limit(100);

  let processed = 0;
  for (const row of expired ?? []) {
    await db
      .from('subscriptions')
      .update({ status: 'trial_expired' })
      .eq('id', row.id);
    await applySubscriptionToClient(row.id);
    processed++;
  }

  return NextResponse.json({ ok: true, processed });
}
