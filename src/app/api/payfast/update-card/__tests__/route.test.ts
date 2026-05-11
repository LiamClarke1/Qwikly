import { describe, it, expect, vi, beforeEach } from 'vitest';

interface DbState {
  sub: { id: number; status: string } | null;
  client: { id: number } | null;
  payment_inserts: Array<Record<string, unknown>>;
  insert_error: { message: string } | null;
}

const dbState: DbState = {
  sub: null,
  client: null,
  payment_inserts: [],
  insert_error: null,
};

const mockAuth: { value: { userId: string } | null } = { value: { userId: 'user-1' } };

vi.mock('@/lib/v2-auth', () => ({
  v2Auth: async () => mockAuth.value,
}));

vi.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: () => ({
    from: (table: string) => {
      if (table === 'subscriptions') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: dbState.sub, error: null }),
            }),
          }),
        };
      }
      if (table === 'clients') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: dbState.client, error: null }),
            }),
          }),
        };
      }
      if (table === 'payfast_payments') {
        return {
          insert: async (vals: Record<string, unknown>) => {
            dbState.payment_inserts.push(vals);
            return { error: dbState.insert_error };
          },
        };
      }
      return {};
    },
  }),
}));

import { POST } from '../route';

describe('POST /api/payfast/update-card', () => {
  beforeEach(() => {
    dbState.sub = null;
    dbState.client = { id: 7 };
    dbState.payment_inserts = [];
    dbState.insert_error = null;
    mockAuth.value = { userId: 'user-1' };

    process.env.PAYFAST_MERCHANT_ID = '10000100';
    process.env.PAYFAST_MERCHANT_KEY = '46f0cd694581a';
    process.env.PAYFAST_PASSPHRASE = 'jt7NOE43FZPn';
    process.env.PAYFAST_MODE = 'sandbox';
    process.env.PAYFAST_RETURN_URL = 'https://qwikly.co.za/pay/success';
    process.env.PAYFAST_CANCEL_URL = 'https://qwikly.co.za/pay/cancel';
    process.env.PAYFAST_NOTIFY_URL = 'https://qwikly.co.za/api/payfast/itn';
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.value = null;
    const res = await POST();
    expect(res.status).toBe(401);
  });

  it('returns 400 when the user has no subscription row', async () => {
    dbState.sub = null;
    const res = await POST();
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('no_subscription');
  });

  it('returns 400 when the user has no clients row', async () => {
    dbState.sub = { id: 1, status: 'active' };
    dbState.client = null;
    const res = await POST();
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('no_client');
  });

  it('inserts a pending R1 card_update payment and returns a checkout URL', async () => {
    dbState.sub = { id: 42, status: 'active' };
    dbState.client = { id: 7 };

    const res = await POST();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.url).toBe('string');
    expect(body.url).toContain('sandbox.payfast.co.za/eng/process');
    expect(body.url).toContain('amount=1.00');
    expect(body.url).toContain('custom_str3=card_update');
    expect(body.url).toContain('custom_str1=7');

    expect(dbState.payment_inserts).toHaveLength(1);
    expect(dbState.payment_inserts[0]).toMatchObject({
      client_id: 7,
      subscription_id: 42,
      purpose: 'card_update',
      status: 'pending',
      amount_zar_cents: 100,
    });
  });

  it('allows update-card when subscription is past_due (covers the dunning recovery path)', async () => {
    dbState.sub = { id: 42, status: 'past_due' };
    dbState.client = { id: 7 };

    const res = await POST();
    expect(res.status).toBe(200);
    expect(dbState.payment_inserts).toHaveLength(1);
  });

  it('returns 500 if the pending row fails to insert', async () => {
    dbState.sub = { id: 42, status: 'active' };
    dbState.client = { id: 7 };
    dbState.insert_error = { message: 'pg unique violation' };

    const res = await POST();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('insert_failed');
  });
});
