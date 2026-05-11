import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/payfast/itn', () => ({
  validateItn: vi.fn().mockResolvedValue({ valid: true }),
}));

interface PendingRow {
  id: string;
  status: string;
  amount_zar_cents: number;
  client_id: number | null;
  subscription_id: number | null;
  purpose: string;
}

interface DbState {
  pending_row: PendingRow | null;
  subscription_plan: string;
  payments_updates: Array<Record<string, unknown>>;
  subscriptions_updates: Array<Record<string, unknown>>;
  credits_upserts: Array<Record<string, unknown>>;
  failures_inserts: Array<Record<string, unknown>>;
  captured_calls: number;
  failed_calls: number;
  applied_calls: number;
}

const dbState: DbState = {
  pending_row: null,
  subscription_plan: 'starter',
  payments_updates: [],
  subscriptions_updates: [],
  credits_upserts: [],
  failures_inserts: [],
  captured_calls: 0,
  failed_calls: 0,
  applied_calls: 0,
};

vi.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: () => ({
    from: (table: string) => {
      if (table === 'payfast_payments') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: dbState.pending_row, error: null }),
            }),
          }),
          update: (vals: Record<string, unknown>) => {
            dbState.payments_updates.push(vals);
            if (vals.status === 'captured') dbState.captured_calls++;
            if (vals.status === 'failed') dbState.failed_calls++;
            return { eq: () => ({ error: null }) };
          },
        };
      }
      if (table === 'subscriptions') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { plan: dbState.subscription_plan },
                error: null,
              }),
            }),
          }),
          update: (vals: Record<string, unknown>) => {
            dbState.subscriptions_updates.push(vals);
            return { eq: () => ({ error: null }) };
          },
        };
      }
      if (table === 'conversation_credits') {
        return {
          upsert: (vals: Record<string, unknown>) => {
            dbState.credits_upserts.push(vals);
            return { error: null };
          },
        };
      }
      if (table === 'payment_failures') {
        return {
          insert: (vals: Record<string, unknown>) => {
            dbState.failures_inserts.push(vals);
            return { error: null };
          },
        };
      }
      return { update: () => ({ eq: () => ({ error: null }) }) };
    },
  }),
}));

vi.mock('@/lib/billing/apply-subscription', () => ({
  applySubscriptionToClient: vi.fn(async () => {
    dbState.applied_calls++;
  }),
}));

import { validateItn } from '@/lib/payfast/itn';
import { applySubscriptionToClient } from '@/lib/billing/apply-subscription';
import { POST } from '../route';

function makeRequest(fields: Record<string, string>): Request {
  const body = new URLSearchParams(fields).toString();
  return new Request('https://x/api/payfast/itn', {
    method: 'POST',
    body,
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'x-forwarded-for': '197.97.145.144',
    },
  });
}

describe('POST /api/payfast/itn', () => {
  beforeEach(() => {
    dbState.pending_row = null;
    dbState.subscription_plan = 'starter';
    dbState.payments_updates = [];
    dbState.subscriptions_updates = [];
    dbState.credits_upserts = [];
    dbState.failures_inserts = [];
    dbState.captured_calls = 0;
    dbState.failed_calls = 0;
    dbState.applied_calls = 0;
    vi.mocked(validateItn).mockResolvedValue({ valid: true });
    vi.mocked(applySubscriptionToClient).mockClear();
  });

  it('is a no-op when the row is already captured', async () => {
    dbState.pending_row = {
      id: 'uuid-1',
      status: 'captured',
      amount_zar_cents: 69900,
      client_id: 1,
      subscription_id: 1,
      purpose: 'subscription_setup',
    };

    const req = makeRequest({
      m_payment_id: 'mp_1',
      pf_payment_id: 'pf_1',
      payment_status: 'COMPLETE',
      amount_gross: '699.00',
      merchant_id: '10000100',
      signature: 'x',
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(dbState.captured_calls).toBe(0);
    expect(dbState.payments_updates).toHaveLength(0);
    expect(dbState.applied_calls).toBe(0);
    expect(vi.mocked(applySubscriptionToClient)).not.toHaveBeenCalled();
  });

  it('is a no-op when the row is already refunded', async () => {
    dbState.pending_row = {
      id: 'uuid-r',
      status: 'refunded',
      amount_zar_cents: 69900,
      client_id: 1,
      subscription_id: 1,
      purpose: 'subscription_setup',
    };

    const req = makeRequest({
      m_payment_id: 'mp_r',
      payment_status: 'COMPLETE',
      amount_gross: '699.00',
      signature: 'x',
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(dbState.payments_updates).toHaveLength(0);
  });

  it('returns 400 when the m_payment_id is unknown', async () => {
    dbState.pending_row = null;
    const req = makeRequest({
      m_payment_id: 'mp_missing',
      payment_status: 'COMPLETE',
      amount_gross: '699.00',
      signature: 'x',
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(dbState.payments_updates).toHaveLength(0);
  });

  it('returns 400 when signature/validation fails and persists raw payload', async () => {
    dbState.pending_row = {
      id: 'uuid-bad',
      status: 'pending',
      amount_zar_cents: 69900,
      client_id: 1,
      subscription_id: 1,
      purpose: 'subscription_setup',
    };
    vi.mocked(validateItn).mockResolvedValueOnce({
      valid: false,
      reason: 'signature mismatch',
    });

    const req = makeRequest({
      m_payment_id: 'mp_bad',
      payment_status: 'COMPLETE',
      amount_gross: '699.00',
      signature: 'wrong',
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(dbState.captured_calls).toBe(0);
    expect(dbState.applied_calls).toBe(0);
    // We persisted the raw payload for forensics but did NOT mark captured.
    expect(dbState.payments_updates).toHaveLength(1);
    expect(dbState.payments_updates[0]).toMatchObject({
      raw_itn_payload: expect.objectContaining({ m_payment_id: 'mp_bad' }),
    });
    expect(dbState.payments_updates[0].status).toBeUndefined();
  });

  it('marks captured and applies subscription on COMPLETE + subscription_setup', async () => {
    dbState.pending_row = {
      id: 'uuid-setup',
      status: 'pending',
      amount_zar_cents: 69900,
      client_id: 7,
      subscription_id: 42,
      purpose: 'subscription_setup',
    };
    dbState.subscription_plan = 'starter';

    const req = makeRequest({
      m_payment_id: 'mp_setup',
      pf_payment_id: 'pf_setup',
      payment_status: 'COMPLETE',
      amount_gross: '699.00',
      token: 'tok_abc',
      billing_date: '2026-06-11',
      signature: 'x',
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(dbState.captured_calls).toBe(1);
    expect(dbState.payments_updates[0]).toMatchObject({
      status: 'captured',
      pf_payment_id: 'pf_setup',
    });

    // Subscription was activated with the token and a period window.
    expect(dbState.subscriptions_updates).toHaveLength(1);
    expect(dbState.subscriptions_updates[0]).toMatchObject({
      status: 'active',
      payfast_token: 'tok_abc',
    });
    expect(dbState.subscriptions_updates[0].current_period_start).toBeDefined();
    expect(dbState.subscriptions_updates[0].current_period_end).toBeDefined();

    // Credit grant was reset for the resolved tier.
    expect(dbState.credits_upserts).toHaveLength(1);
    expect(dbState.credits_upserts[0]).toMatchObject({
      client_id: 7,
      granted_balance_zar_cents: 10000, // Starter starting grant.
    });

    expect(dbState.applied_calls).toBe(1);
    expect(vi.mocked(applySubscriptionToClient)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(applySubscriptionToClient)).toHaveBeenCalledWith(42);
  });

  it('marks failed and inserts payment_failures on FAILED + subscription_renewal', async () => {
    dbState.pending_row = {
      id: 'uuid-fail',
      status: 'pending',
      amount_zar_cents: 69900,
      client_id: 9,
      subscription_id: 55,
      purpose: 'subscription_renewal',
    };

    const req = makeRequest({
      m_payment_id: 'mp_fail',
      pf_payment_id: 'pf_fail',
      payment_status: 'FAILED',
      amount_gross: '699.00',
      signature: 'x',
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(dbState.failed_calls).toBe(1);
    expect(dbState.payments_updates[0]).toMatchObject({
      status: 'failed',
      pf_payment_id: 'pf_fail',
    });
    expect(dbState.failures_inserts).toHaveLength(1);
    expect(dbState.failures_inserts[0]).toMatchObject({
      client_id: 9,
      subscription_id: 55,
      payfast_payment_id: 'uuid-fail',
      reason: 'payfast_charge_failed',
    });
    // Subscriptions row is NOT mutated on FAILED (existing access stays until period_end).
    expect(dbState.subscriptions_updates).toHaveLength(0);
    expect(dbState.applied_calls).toBe(0);
  });
});
