import { describe, it, expect, vi, beforeEach } from 'vitest';

interface DbState {
  sub: {
    id: number;
    plan: string;
    status: string;
    current_period_end: string | null;
  } | null;
  subscription_updates: Array<Record<string, unknown>>;
}

const dbState: DbState = {
  sub: null,
  subscription_updates: [],
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
      return {};
    },
  }),
}));

import { POST } from '../route';

function makeRequest(body: unknown): import('next/server').NextRequest {
  return new Request('https://x/api/payfast/downgrade', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  }) as unknown as import('next/server').NextRequest;
}

describe('POST /api/payfast/downgrade', () => {
  beforeEach(() => {
    dbState.sub = null;
    dbState.subscription_updates = [];
    mockAuth.value = { userId: 'user-1' };
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.value = null;
    const res = await POST(makeRequest({ plan: 'starter' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when there is no active subscription', async () => {
    dbState.sub = null;
    const res = await POST(makeRequest({ plan: 'starter' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('no_active_subscription');
  });

  it('returns 400 when the subscription is not active (e.g. past_due)', async () => {
    dbState.sub = {
      id: 1,
      plan: 'pro',
      status: 'past_due',
      current_period_end: new Date().toISOString(),
    };
    const res = await POST(makeRequest({ plan: 'starter' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('no_active_subscription');
  });

  it('rejects same-tier with use_upgrade', async () => {
    dbState.sub = {
      id: 1,
      plan: 'pro',
      status: 'active',
      current_period_end: new Date().toISOString(),
    };
    const res = await POST(makeRequest({ plan: 'pro' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('use_upgrade');
  });

  it('rejects higher-tier with use_upgrade', async () => {
    dbState.sub = {
      id: 1,
      plan: 'starter',
      status: 'active',
      current_period_end: new Date().toISOString(),
    };
    const res = await POST(makeRequest({ plan: 'pro' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('use_upgrade');
  });

  it('writes pending_plan and returns takes_effect_at on a real downgrade', async () => {
    const periodEnd = new Date(Date.now() + 12 * 86400000).toISOString();
    dbState.sub = {
      id: 1,
      plan: 'pro',
      status: 'active',
      current_period_end: periodEnd,
    };
    const res = await POST(makeRequest({ plan: 'starter' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.takes_effect_at).toBe(periodEnd);
    expect(dbState.subscription_updates).toHaveLength(1);
    expect(dbState.subscription_updates[0]).toMatchObject({ pending_plan: 'starter' });
  });
});
