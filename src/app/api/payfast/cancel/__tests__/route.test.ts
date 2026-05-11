import { describe, it, expect, vi, beforeEach } from 'vitest';

interface DbState {
  sub: {
    id: number;
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

describe('POST /api/payfast/cancel', () => {
  beforeEach(() => {
    dbState.sub = null;
    dbState.subscription_updates = [];
    mockAuth.value = { userId: 'user-1' };
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.value = null;
    const res = await POST();
    expect(res.status).toBe(401);
  });

  it('returns 400 when there is no subscription row', async () => {
    dbState.sub = null;
    const res = await POST();
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('no_active_subscription');
  });

  it('returns 400 when the subscription is not active', async () => {
    dbState.sub = {
      id: 1,
      status: 'paused_unpaid',
      current_period_end: new Date().toISOString(),
    };
    const res = await POST();
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('no_active_subscription');
  });

  it('flips cancel_at_period_end and returns ends_at', async () => {
    const periodEnd = new Date(Date.now() + 7 * 86400000).toISOString();
    dbState.sub = {
      id: 1,
      status: 'active',
      current_period_end: periodEnd,
    };
    const res = await POST();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.ends_at).toBe(periodEnd);
    expect(dbState.subscription_updates).toHaveLength(1);
    expect(dbState.subscription_updates[0]).toMatchObject({
      cancel_at_period_end: true,
    });
  });
});
