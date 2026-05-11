import { supabaseAdmin } from '@/lib/supabase-server';
import { hasOutbound, resolvePlan } from '@/lib/plan';

export type OutboundAccessResult =
  | { ok: true; plan: string }
  | { ok: false; plan: string | null };

/**
 * Look up the caller's plan via auth_user_id and return whether they
 * have Outbound access. Returns ok=false with plan=null if no clients
 * row exists yet (e.g. signup is mid-flight).
 *
 * Server-only. Do not import into client components.
 */
export async function requireOutboundAccess(authUserId: string): Promise<OutboundAccessResult> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from('clients')
    .select('plan')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, plan: null };
  }

  const plan = resolvePlan(data.plan);
  return hasOutbound(plan)
    ? { ok: true, plan: data.plan }
    : { ok: false, plan: data.plan };
}
