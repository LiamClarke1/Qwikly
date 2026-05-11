import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applySubscriptionToClient } from '../apply-subscription';

// Test stub for supabaseAdmin
const fromMock = vi.fn();
vi.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: () => ({ from: fromMock }),
}));

describe('applySubscriptionToClient', () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it('reads subscription then writes derived fields to clients', async () => {
    const subscription = {
      id: 1,
      client_id: 42,
      plan: 'pro',
      status: 'active',
      cancel_at_period_end: false,
    };

    fromMock.mockImplementation((table: string) => {
      if (table === 'subscriptions') {
        return {
          select: () => ({
            eq: () => ({ single: async () => ({ data: subscription, error: null }) }),
          }),
        };
      }
      if (table === 'clients') {
        return {
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        };
      }
      return {};
    });

    await applySubscriptionToClient(1);

    // The clients table mock should have been called
    const clientsCalls = fromMock.mock.calls.filter(([t]) => t === 'clients');
    expect(clientsCalls.length).toBeGreaterThan(0);
  });

  it('sets ai_paused=true for trial_expired status', async () => {
    let captured: Record<string, unknown> | null = null;
    fromMock.mockImplementation((table: string) => {
      if (table === 'subscriptions') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: {
                  id: 1,
                  client_id: 42,
                  plan: 'trial',
                  status: 'trial_expired',
                  cancel_at_period_end: false,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        update: (vals: Record<string, unknown>) => {
          captured = vals;
          return { eq: vi.fn().mockResolvedValue({ error: null }) };
        },
      };
    });

    await applySubscriptionToClient(1);
    expect(captured).toMatchObject({ ai_paused: true });
  });

  it('sets ai_paused=false for active status', async () => {
    let captured: Record<string, unknown> | null = null;
    fromMock.mockImplementation((table: string) => {
      if (table === 'subscriptions') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: {
                  id: 1,
                  client_id: 42,
                  plan: 'starter',
                  status: 'active',
                  cancel_at_period_end: false,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        update: (vals: Record<string, unknown>) => {
          captured = vals;
          return { eq: vi.fn().mockResolvedValue({ error: null }) };
        },
      };
    });

    await applySubscriptionToClient(1);
    expect(captured).toMatchObject({ ai_paused: false, plan: 'starter' });
  });

  it('does NOT write derived feature flag columns that do not exist on clients', async () => {
    let captured: Record<string, unknown> | null = null;
    fromMock.mockImplementation((table: string) => {
      if (table === 'subscriptions') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: {
                  id: 1,
                  client_id: 42,
                  plan: 'enterprise',
                  status: 'active',
                  cancel_at_period_end: false,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        update: (vals: Record<string, unknown>) => {
          captured = vals;
          return { eq: vi.fn().mockResolvedValue({ error: null }) };
        },
      };
    });

    await applySubscriptionToClient(1);
    expect(captured).not.toBeNull();
    // These are derived at read time from PLAN_CONFIG, not stored on clients.
    expect(captured).not.toHaveProperty('lead_limit');
    expect(captured).not.toHaveProperty('remove_branding');
    expect(captured).not.toHaveProperty('custom_greeting');
    expect(captured).not.toHaveProperty('csv_export');
    expect(captured).not.toHaveProperty('api_access');
    expect(captured).not.toHaveProperty('assistant_paused');
    // And these are the actual columns we DO write.
    expect(captured).toHaveProperty('plan');
    expect(captured).toHaveProperty('products');
    expect(captured).toHaveProperty('pipeline_daily_quota');
    expect(captured).toHaveProperty('ai_paused');
  });
});
