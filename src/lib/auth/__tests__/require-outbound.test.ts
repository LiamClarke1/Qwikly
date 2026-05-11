import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireOutboundAccess } from '../require-outbound';

const mockMaybeSingle = vi.fn();
const mockFrom = vi.fn(() => ({
  select: () => ({
    eq: () => ({ maybeSingle: mockMaybeSingle }),
  }),
}));

vi.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: () => ({ from: mockFrom }),
}));

describe('requireOutboundAccess', () => {
  beforeEach(() => {
    mockMaybeSingle.mockReset();
  });

  it('returns ok for a pro plan', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { plan: 'pro' }, error: null });
    const result = await requireOutboundAccess('user-1');
    expect(result.ok).toBe(true);
  });

  it('returns not-ok with plan for a starter plan', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { plan: 'starter' }, error: null });
    const result = await requireOutboundAccess('user-1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.plan).toBe('starter');
  });

  it('returns not-ok when no clients row exists', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const result = await requireOutboundAccess('user-1');
    expect(result.ok).toBe(false);
  });

  it('returns ok for a founders plan', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { plan: 'founders' }, error: null });
    const result = await requireOutboundAccess('user-1');
    expect(result.ok).toBe(true);
  });
});
