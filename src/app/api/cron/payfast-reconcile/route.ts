import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { fetchPaymentByMPaymentId } from '@/lib/payfast/token';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const STUCK_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

/**
 * PayFast reconcile cron — catches missed ITNs.
 *
 * Runs hourly. Finds `payfast_payments` rows still in 'pending' status whose
 * `expected_at` is older than 10 minutes ago, then asks PayFast's payment
 * query API what actually happened. Results are folded back into the row:
 *   - 404 from PayFast → mark failed (PayFast never saw it).
 *   - still pending → leave it.
 *   - failed → mark failed.
 *   - success → log as 'resolved' (full re-application of entitlement runs
 *     through the ITN handler in Phase 2; here we just count it so ops can
 *     see how many drifted).
 */
export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const db = supabaseAdmin();
  const cutoff = new Date(Date.now() - STUCK_THRESHOLD_MS).toISOString();

  const { data: stuck } = await db
    .from('payfast_payments')
    .select('id, m_payment_id, amount_zar_cents, subscription_id, client_id, purpose')
    .eq('status', 'pending')
    .lt('expected_at', cutoff)
    .limit(50);

  let resolved = 0;
  let stillPending = 0;
  let failed = 0;

  for (const row of stuck ?? []) {
    try {
      const status = await fetchPaymentByMPaymentId(row.m_payment_id);
      if (!status) {
        // PayFast doesn't know about it; mark as failed so we stop retrying.
        await db
          .from('payfast_payments')
          .update({ status: 'failed', updated_at: new Date().toISOString() })
          .eq('id', row.id);
        failed++;
        continue;
      }
      if (status.status === 'pending') {
        stillPending++;
        continue;
      }
      if (status.status === 'failed') {
        await db
          .from('payfast_payments')
          .update({
            status: 'failed',
            pf_payment_id: status.pf_payment_id ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', row.id);
        failed++;
        continue;
      }
      // status === 'success' — feed it back through the ITN endpoint logic
      // in Phase 2. For now just count so ops can monitor drift.
      resolved++;
    } catch (err) {
      console.error('[reconcile] error for', row.m_payment_id, err);
    }
  }

  return NextResponse.json({
    ok: true,
    resolved,
    stillPending,
    failed,
    scanned: stuck?.length ?? 0,
  });
}
