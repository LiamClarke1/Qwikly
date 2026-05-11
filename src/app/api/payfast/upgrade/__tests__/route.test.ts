import { describe, it, expect, vi, beforeEach } from 'vitest';

interface DbState {
  sub: {
    id: number;
    plan: string;
    status: string;
    current_period_end: string | null;
    payfast_token: string | null;
    pending_plan: string | null;
  } | null;
  client: { id: number } | null;
  subscription_updates: Array<Record<string, unknown>>;
  payment_inserts: Array<Record<string, unknown>>;
  insert_error: { message: string } | null;
}

const dbState: DbState = {
  sub: null,
  client: null,
  subscription_updates: [],
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
          update: (vals: Record<string, unknown>) => {
            dbState.subscription_updates.push(vals);
            return { eq: () => ({ error: null }) };
          },
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

function makeRequest(body: unknown): import('next/server').NextRequest {
  return new Request('https://x/api/payfast/upgrade', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  }) as unknown as import('next/server').NextRequest;
}

describe('POST /api/payfast/upgrade', () => {
  beforeEach(() => {
    dbState.sub = null;
    dbState.client = { id: 7 };
    dbState.subscription_updates = [];
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
    const res = await POST(makeRequest({ plan: 'pro' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when there is no subscription row', async () => {
    dbState.sub = null;
    const res = await POST(makeRequest({ plan: 'pro' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('no_subscription');
  });

  it('rejects same-tier upgrade with use_downgrade', async () => {
    dbState.sub = {
      id: 1,
      plan: 'pro',
      status: 'active',
      current_period_end: new Date(Date.now() + 15 * 86400000).toISOString(),
      payfast_token: 'tok_x',
      pending_plan: null,
    };
    const res = await POST(makeRequest({ plan: 'pro' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('use_downgrade');
  });

  it('rejects a lower-tier "upgrade" with use_downgrade', async () => {
    dbState.sub = {
      id: 1,
      plan: 'business',
      status: 'active',
      current_period_end: new Date(Date.now() + 15 * 86400000).toISOString(),
      payfast_token: 'tok_x',
      pending_plan: null,
    };
    const res = await POST(makeRequest({ plan: 'pro' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('use_downgrade');
  });

  it('schedules upgrade for next renewal when proration is under R10', async () => {
    // Starter -> Pro at ~0.4 days remaining: (1799 - 699) * 100 / 30 * 0.4
    // ≈ 1466 cents, but we'll set period end at +0.1 days so proration ≈
    // 366 cents which is under the 1000-cent gate.
    dbState.sub = {
      id: 1,
      plan: 'starter',
      status: 'active',
      current_period_end: new Date(Date.now() + 0.1 * 86400000).toISOString(),
      payfast_token: 'tok_x',
      pending_plan: null,
    };
    const res = await POST(makeRequest({ plan: 'pro' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.scheduled).toBe(true);
    expect(dbState.subscription_updates).toHaveLength(1);
    expect(dbState.subscription_updates[0]).toMatchObject({ pending_plan: 'pro' });
    expect(dbState.payment_inserts).toHaveLength(0);
  });

  it('creates a pending payfast_payments row and returns a checkout URL when proration is at or over R10', async () => {
    // Starter -> Pro at 20 days remaining: (1799 - 699) * 100 / 30 * 20
    // = 73,333 cents ≈ R733 proration.
    dbState.sub = {
      id: 42,
      plan: 'starter',
      status: 'active',
      current_period_end: new Date(Date.now() + 20 * 86400000).toISOString(),
      payfast_token: 'tok_x',
      pending_plan: null,
    };
    dbState.client = { id: 7 };

    const res = await POST(makeRequest({ plan: 'pro' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.url).toBe('string');
    expect(body.url).toContain('sandbox.payfast.co.za/eng/process');
    expect(body.url).toContain('custom_str3=upgrade_proration');
    expect(body.url).toContain('custom_str1=7');

    expect(dbState.payment_inserts).toHaveLength(1);
    expect(dbState.payment_inserts[0]).toMatchObject({
      client_id: 7,
      subscription_id: 42,
      purpose: 'upgrade_proration',
      status: 'pending',
    });
    expect(dbState.payment_inserts[0].amount_zar_cents).toBeGreaterThanOrEqual(1000);
    // No subscription mutation on the upgrade-with-charge path — the ITN
    // handler flips plan + token after the customer actually pays.
    expect(dbState.subscription_updates).toHaveLength(0);
  });

  it('returns 400 when the auth user has no clients row', async () => {
    dbState.sub = {
      id: 1,
      plan: 'starter',
      status: 'active',
      current_period_end: new Date(Date.now() + 20 * 86400000).toISOString(),
      payfast_token: 'tok_x',
      pending_plan: null,
    };
    dbState.client = null;
    const res = await POST(makeRequest({ plan: 'pro' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('no_client');
  });
});
