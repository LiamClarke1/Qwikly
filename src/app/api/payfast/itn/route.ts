import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { validateItn } from '@/lib/payfast/itn';
import { applySubscriptionToClient } from '@/lib/billing/apply-subscription';
import { startingGrantZarCents, resolvePlan } from '@/lib/plan';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function parseForm(body: string): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(body));
}

function getSourceIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for') ?? '';
  const first = xff.split(',')[0]?.trim();
  if (first) return first;
  return req.headers.get('x-real-ip') ?? '';
}

function computePeriodEnd(billingDate?: string): string {
  if (billingDate) {
    return new Date(`${billingDate}T00:00:00Z`).toISOString();
  }
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

export async function POST(req: Request) {
  const bodyText = await req.text();
  const payload = parseForm(bodyText);
  const sourceIp = getSourceIp(req);

  const db = supabaseAdmin();

  // Look up the pending row by m_payment_id FIRST so we know the expected
  // amount, purpose, client and subscription before doing any validation.
  const { data: row, error: rowErr } = await db
    .from('payfast_payments')
    .select('id, status, amount_zar_cents, client_id, subscription_id, purpose')
    .eq('m_payment_id', payload.m_payment_id)
    .maybeSingle();

  if (rowErr || !row) {
    console.error('[payfast/itn] unknown m_payment_id', payload.m_payment_id);
    return NextResponse.json({ ok: false, reason: 'unknown_payment' }, { status: 400 });
  }

  // Idempotency: if already captured or refunded, return 200 with no writes.
  // PayFast retries up to 5x over 24 hours, so this path must hold.
  if (row.status === 'captured' || row.status === 'refunded') {
    return NextResponse.json({ ok: true, idempotent: true });
  }

  // Four-step validation (signature, IP, postback validate, amount match).
  const v = await validateItn(payload, sourceIp, row.amount_zar_cents);
  if (!v.valid) {
    console.error('[payfast/itn] validation failed:', v.reason, {
      m_payment_id: payload.m_payment_id,
    });
    await db
      .from('payfast_payments')
      .update({
        raw_itn_payload: payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id);
    return NextResponse.json({ ok: false, reason: v.reason }, { status: 400 });
  }

  const status = payload.payment_status;
  const now = new Date().toISOString();

  if (status === 'FAILED' || status === 'CANCELLED') {
    await db
      .from('payfast_payments')
      .update({
        status: status === 'FAILED' ? 'failed' : 'cancelled',
        raw_itn_payload: payload,
        pf_payment_id: payload.pf_payment_id,
        updated_at: now,
      })
      .eq('id', row.id);

    if (status === 'FAILED' && row.purpose === 'subscription_renewal') {
      await db.from('payment_failures').insert({
        client_id: row.client_id,
        subscription_id: row.subscription_id,
        payfast_payment_id: row.id,
        reason: 'payfast_charge_failed',
      });
    }
    return NextResponse.json({ ok: true });
  }

  if (status === 'REFUND') {
    await db
      .from('payfast_payments')
      .update({
        status: 'refunded',
        refunded_at: now,
        pf_payment_id: payload.pf_payment_id,
        raw_itn_payload: payload,
        updated_at: now,
      })
      .eq('id', row.id);
    // Phase 2: reverse wallet credit / zero out lead_topups for the matching purpose.
    return NextResponse.json({ ok: true });
  }

  // status === 'COMPLETE' (or anything else PayFast sends that we treat as success).
  await db
    .from('payfast_payments')
    .update({
      status: 'captured',
      captured_at: now,
      pf_payment_id: payload.pf_payment_id,
      raw_itn_payload: payload,
      updated_at: now,
    })
    .eq('id', row.id);

  switch (row.purpose) {
    case 'subscription_setup':
    case 'subscription_renewal':
    case 'upgrade_proration': {
      if (row.subscription_id) {
        const periodEnd = computePeriodEnd(payload.billing_date);
        const updates: Record<string, unknown> = {
          status: 'active',
        };
        if (payload.token) {
          updates.payfast_token = payload.token;
        }
        if (
          row.purpose === 'subscription_setup' ||
          row.purpose === 'subscription_renewal'
        ) {
          updates.current_period_start = now;
          updates.current_period_end = periodEnd;
        }
        await db.from('subscriptions').update(updates).eq('id', row.subscription_id);

        // Reset grant on setup or renewal (not on proration — proration just
        // changes the plan tier mid-cycle, the grant stays the same until
        // the next renewal).
        if (row.purpose !== 'upgrade_proration') {
          const { data: planRow } = await db
            .from('subscriptions')
            .select('plan')
            .eq('id', row.subscription_id)
            .maybeSingle();
          const tier = resolvePlan(planRow?.plan ?? 'trial');
          await db
            .from('conversation_credits')
            .upsert(
              {
                client_id: row.client_id,
                granted_balance_zar_cents: startingGrantZarCents(tier),
                granted_expires_at: periodEnd,
                updated_at: now,
              },
              { onConflict: 'client_id' },
            );
        }

        await applySubscriptionToClient(row.subscription_id);
      }
      break;
    }

    case 'topup_ai_credit': {
      // The route puts the pack key in custom_str4 so we can apply the
      // bonus-inclusive credit, not the raw payment amount.
      const pack = (payload.custom_str4 ?? 'small') as 'small' | 'medium' | 'large';
      const creditCents =
        pack === 'large' ? 60000 : pack === 'medium' ? 28000 : 10000;
      const { data: wallet } = await db
        .from('conversation_credits')
        .select('purchased_balance_zar_cents')
        .eq('client_id', row.client_id)
        .maybeSingle();
      const newPurchased =
        (wallet?.purchased_balance_zar_cents ?? 0) + creditCents;
      await db.from('conversation_credits').upsert(
        {
          client_id: row.client_id,
          purchased_balance_zar_cents: newPurchased,
          updated_at: now,
        },
        { onConflict: 'client_id' },
      );
      break;
    }

    case 'topup_leads': {
      const size = parseInt(payload.custom_str4 ?? '0', 10);
      if (size <= 0) {
        console.error('[payfast/itn] topup_leads missing size in custom_str4');
        break;
      }
      // Pack expires at the end of the current billing period.
      let expiresAt: string | null = null;
      if (row.subscription_id) {
        const { data: sub } = await db
          .from('subscriptions')
          .select('current_period_end')
          .eq('id', row.subscription_id)
          .maybeSingle();
        expiresAt = sub?.current_period_end ?? null;
      }
      if (!expiresAt) {
        // Fallback: 30 days from now.
        expiresAt = new Date(Date.now() + 30 * 86400_000).toISOString();
      }
      await db.from('lead_topups').insert({
        client_id: row.client_id,
        subscription_id: row.subscription_id,
        leads_purchased: size,
        zar_cents_paid: row.amount_zar_cents,
        leads_remaining: size,
        expires_at: expiresAt,
        payfast_payment_id: row.id,
      });
      break;
    }

    case 'card_update': {
      // Replace the stored PayFast token with the new one from this R1
      // verification charge. The R1 refund is queued out-of-band (ops or a
      // follow-up sweep), since PayFast's refund endpoint is async anyway.
      if (row.subscription_id && payload.token) {
        await db
          .from('subscriptions')
          .update({ payfast_token: payload.token })
          .eq('id', row.subscription_id);

        // If the subscription was past_due, mark unresolved payment_failures
        // so the next renewal attempt (or admin retry) lifts the pause.
        await db
          .from('payment_failures')
          .update({ resolved_at: now })
          .is('resolved_at', null)
          .eq('subscription_id', row.subscription_id);
      }
      break;
    }
  }

  return NextResponse.json({ ok: true });
}
