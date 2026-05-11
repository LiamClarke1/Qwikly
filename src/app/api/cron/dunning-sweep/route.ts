import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { applySubscriptionToClient } from '@/lib/billing/apply-subscription';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PAUSE_AFTER_DAYS = 3;

/**
 * Dunning-sweep cron — escalates past-due failures to `paused_unpaid`.
 *
 * Runs hourly. Finds `payment_failures` rows still unresolved after
 * `PAUSE_AFTER_DAYS` (3) days, flips the underlying subscription to
 * `paused_unpaid`, and re-applies entitlement so `clients.ai_paused` reflects
 * the new state. The grace window between the failure landing and this cron
 * firing is what gives the customer a chance to fix their card before the
 * assistant goes quiet.
 */
export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const db = supabaseAdmin();
  const cutoff = new Date(
    Date.now() - PAUSE_AFTER_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: stale } = await db
    .from('payment_failures')
    .select('id, client_id, subscription_id')
    .is('resolved_at', null)
    .lt('failed_at', cutoff)
    .limit(100);

  let paused = 0;
  for (const row of stale ?? []) {
    if (!row.subscription_id) continue;
    await db
      .from('subscriptions')
      .update({ status: 'paused_unpaid' })
      .eq('id', row.subscription_id);
    await applySubscriptionToClient(row.subscription_id);
    paused++;
  }

  return NextResponse.json({ ok: true, paused, scanned: stale?.length ?? 0 });
}
