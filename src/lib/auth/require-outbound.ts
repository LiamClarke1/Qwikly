import { supabaseAdmin } from '@/lib/supabase-server';
import { hasOutbound, resolvePlan } from '@/lib/plan';
import { isInternalClientId } from '@/lib/billing/internal-tenant';

export type OutboundAccessResult =
  | { ok: true; plan: string }
  | { ok: false; plan: string | null };

/**
 * Look up the caller's plan via auth_user_id and return whether they
 * have Outbound access. Returns ok=false with plan=null if no clients
 * row exists yet (e.g. signup is mid-flight).
 *
 * Internal Qwikly tenants (admin / QA) ALWAYS get access, regardless of
 * their plan tier. Admin needs to dogfood Outbound on a trial-plan row
 * without paying. The is_internal flag on usage rows already keeps
 * their spend out of billing aggregates.
 *
 * Server-only. Do not import into client components.
 */
export async function requireOutboundAccess(authUserId: string): Promise<OutboundAccessResult> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from('clients')
    .select('id, plan')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, plan: null };
  }

  if (isInternalClientId(data.id)) {
    return { ok: true, plan: data.plan ?? 'admin' };
  }

  const plan = resolvePlan(data.plan);
  return hasOutbound(plan)
    ? { ok: true, plan: data.plan }
    : { ok: false, plan: data.plan };
}
