import { NextResponse } from 'next/server';
import { v2Auth } from '@/lib/v2-auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { buildCheckoutUrl } from '@/lib/payfast/checkout';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * R1 (100 cents) "tokenisation" charge. PayFast doesn't expose a card-
 * vault-only endpoint, so we charge the smallest amount that produces a
 * new subscription token. The ITN handler swaps payfast_token on
 * capture and queues a refund of this R1.
 */
const CARD_UPDATE_AMOUNT_CENTS = 100;

export async function POST() {
  const auth = await v2Auth();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = supabaseAdmin();

  const { data: sub } = await db
    .from('subscriptions')
    .select('id, status')
    .eq('user_id', auth.userId)
    .maybeSingle();

  if (!sub) {
    return NextResponse.json({ error: 'no_subscription' }, { status: 400 });
  }

  const { data: client } = await db
    .from('clients')
    .select('id')
    .eq('auth_user_id', auth.userId)
    .maybeSingle();

  if (!client) {
    return NextResponse.json({ error: 'no_client' }, { status: 400 });
  }

  const m_payment_id = `card_${sub.id}_${Date.now()}`;
  const { error: insertErr } = await db.from('payfast_payments').insert({
    client_id: client.id,
    subscription_id: sub.id,
    m_payment_id,
    purpose: 'card_update',
    status: 'pending',
    amount_zar_cents: CARD_UPDATE_AMOUNT_CENTS,
  });
  if (insertErr) {
    console.error('[payfast/update-card] failed to insert pending payment', insertErr);
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
  }

  const url = buildCheckoutUrl({
    m_payment_id,
    amount_zar_cents: CARD_UPDATE_AMOUNT_CENTS,
    item_name: 'Qwikly card update',
    item_description: 'R1 charge to update your payment method (refunded automatically)',
    client_id: client.id,
    subscription_id: sub.id,
    purpose: 'card_update',
    recurring: false,
  });

  return NextResponse.json({ url });
}
