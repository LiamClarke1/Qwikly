import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Renewal sweep — informational cron.
 *
 * PayFast's recurring token fires the actual renewal charge automatically
 * based on the billing_date set at subscription creation, so this cron does
 * NOT initiate any payments. It exists to:
 *   1. Surface subscriptions whose `current_period_end` has passed but no
 *      renewal ITN has arrived (those escalate to the reconcile cron).
 *   2. Process `pending_plan` transitions that should land at renewal.
 *
 * Action items for (1) and (2) get implemented in Phase 2. This route exists
 * so the cron wiring is complete from Phase 1.
 */
export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const db = supabaseAdmin();
  const now = new Date().toISOString();

  const { data: due } = await db
    .from('subscriptions')
    .select('id, client_id, plan, pending_plan, current_period_end, payfast_token')
    .eq('status', 'active')
    .lt('current_period_end', now)
    .limit(100);

  return NextResponse.json({
    ok: true,
    overdue: due?.length ?? 0,
  });
}
