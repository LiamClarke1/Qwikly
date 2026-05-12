import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getEntitlement } from '../entitlement';

const fromMock = vi.fn();
vi.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: () => ({ from: fromMock }),
}));

type Row = Record<string, unknown> | null;
type RowList = Row[] | null;

// Rows can be normal data rows OR a number (meaning it's a count-only query).
function buildFromMock(rows: Record<string, Row | RowList | number>) {
  fromMock.mockImplementation((table: string) => {
    const value = rows[table];
    const isCount = typeof value === 'number';
    const list = !isCount && Array.isArray(value) ? (value as Row[]) : null;
    const single = !isCount && list === null ? (value as Row) : null;
    const count = isCount ? (value as number) : null;

    const terminal = {
      maybeSingle: async () => ({ data: single, error: null }),
      single: async () => ({ data: single, error: null }),
      then: (cb: (r: { data: RowList; count: number | null; error: null }) => unknown) =>
        cb({ data: list, count, error: null }),
    };

    const chain: Record<string, (...args: unknown[]) => unknown> = {};
    const proxy = new Proxy(terminal, {
      get(target, prop: string) {
        if (prop in target) return (target as Record<string, unknown>)[prop];
        // Any unknown chain method returns the proxy itself, so any
        // sequence of .eq()/.gt()/.lte()/.gte()/.order()/.limit()/.select()
        // resolves back to a terminal that returns the right row(s).
        chain[prop] = () => proxy;
        return chain[prop];
      },
    });

    return proxy;
  });
}

describe('getEntitlement', () => {
  beforeEach(() => fromMock.mockReset());

  it('returns aggregate entitlement for an active Starter customer', async () => {
    buildFromMock({
      clients: { id: 42, plan: 'starter', ai_paused: false },
      subscriptions: {
        plan: 'starter',
        status: 'active',
        current_period_start: '2026-05-01T00:00:00Z',
        current_period_end: '2026-06-01T00:00:00Z',
        cancel_at_period_end: false,
        pending_plan: null,
        trial_ends_at: null,
      },
      conversation_credits: {
        granted_balance_zar_cents: 8000,
        purchased_balance_zar_cents: 5000,
      },
      conversations: 12,
      lead_topups: [],
    });

    const e = await getEntitlement(42);
    expect(e.plan).toBe('starter');
    expect(e.status).toBe('active');
    expect(e.assistantPaused).toBe(false);
    expect(e.leadsThisMonth).toBe(12);
    expect(e.leadLimit).toBe(20);
    expect(e.aiCreditTotalZarCents).toBe(13000);
  });

  it('derives Pro feature flags from PLAN_CONFIG (not from clients columns)', async () => {
    buildFromMock({
      clients: { id: 7, plan: 'pro', ai_paused: false },
      subscriptions: {
        plan: 'pro',
        status: 'active',
        current_period_start: '2026-05-01T00:00:00Z',
        current_period_end: '2026-06-01T00:00:00Z',
        cancel_at_period_end: false,
        pending_plan: null,
        trial_ends_at: null,
      },
      conversation_credits: null,
      conversations: 0,
      lead_topups: [],
    });

    const e = await getEntitlement(7);
    expect(e.plan).toBe('pro');
    expect(e.leadLimit).toBe(50);
    expect(e.hasOutbound).toBe(true);
    expect(e.pipelineDailyQuota).toBe(5);
    // No credits row: total is zero
    expect(e.aiCreditTotalZarCents).toBe(0);
    expect(e.aiCreditGrantedZarCents).toBe(0);
    expect(e.aiCreditPurchasedZarCents).toBe(0);
    // Zero leads used; full cap available + zero top-ups
    expect(e.leadsThisMonth).toBe(0);
    expect(e.totalLeadsAvailable).toBe(50);
    expect(e.topupLeadsRemaining).toBe(0);
  });

  it('sums leads_remaining across non-expired lead_topups packs', async () => {
    buildFromMock({
      clients: { id: 5, plan: 'starter', ai_paused: false },
      subscriptions: {
        plan: 'starter',
        status: 'active',
        current_period_start: '2026-05-01T00:00:00Z',
        current_period_end: '2026-06-01T00:00:00Z',
        cancel_at_period_end: false,
        pending_plan: null,
        trial_ends_at: null,
      },
      conversation_credits: null,
      conversations: 30,
      lead_topups: [
        { leads_remaining: 10, expires_at: '2026-06-01T00:00:00Z' },
        { leads_remaining: 25, expires_at: '2026-06-01T00:00:00Z' },
      ],
    });

    // starter leadLimit=20, leadsThisMonth=30 → 0 included left, plus 35 topup
    const e = await getEntitlement(5);
    expect(e.topupLeadsRemaining).toBe(35);
    expect(e.totalLeadsAvailable).toBe(35);
  });

  it('reports assistantPaused=true when clients.ai_paused is true', async () => {
    buildFromMock({
      clients: { id: 9, plan: 'trial', ai_paused: true },
      subscriptions: {
        plan: 'trial',
        status: 'trial_expired',
        current_period_start: null,
        current_period_end: null,
        cancel_at_period_end: false,
        pending_plan: null,
        trial_ends_at: '2026-05-08T00:00:00Z',
      },
      conversation_credits: null,
      conversations: 0,
      lead_topups: [],
    });

    const e = await getEntitlement(9);
    expect(e.assistantPaused).toBe(true);
    expect(e.status).toBe('trial_expired');
    expect(e.plan).toBe('trial');
    expect(e.trialEndsAt).toBeInstanceOf(Date);
  });
});
