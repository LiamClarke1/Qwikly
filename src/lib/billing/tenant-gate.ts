import type { SupabaseClient } from "@supabase/supabase-js";

export type GateReason = "trial_expired" | "paused" | null;

export type GateResult =
  | { ok: true }
  | { ok: false; reason: GateReason; status: 403 };

export type TenantLookup =
  | { kind: "client_id"; id: number | string }
  | { kind: "auth_user_id"; userId: string }
  | { kind: "business_public_key"; publicKey: string }
  | { kind: "tenant_id"; id: string };

type TenantSignals = {
  ai_paused: boolean | null;
  trial_ends_at: string | null;
  plan: string | null;
};

async function loadFromClientRow(
  sb: SupabaseClient,
  column: "id" | "public_key",
  value: string | number,
): Promise<TenantSignals | null> {
  const { data: client, error } = await sb
    .from("clients")
    .select("ai_paused, auth_user_id")
    .eq(column, value)
    .maybeSingle();
  if (error) throw error;
  if (!client) return null;

  let trialEndsAt: string | null = null;
  let plan: string | null = null;
  const authUserId = (client as { auth_user_id?: string | null }).auth_user_id ?? null;
  if (authUserId) {
    const { data: sub, error: subErr } = await sb
      .from("subscriptions")
      .select("plan, trial_ends_at")
      .eq("user_id", authUserId)
      .maybeSingle();
    if (subErr) throw subErr;
    trialEndsAt = (sub as { trial_ends_at?: string | null } | null)?.trial_ends_at ?? null;
    plan = (sub as { plan?: string | null } | null)?.plan ?? null;
  }

  return {
    ai_paused: (client as { ai_paused?: boolean | null }).ai_paused ?? null,
    trial_ends_at: trialEndsAt,
    plan,
  };
}

async function loadFromBusinessRow(
  sb: SupabaseClient,
  column: "api_key" | "id",
  value: string,
): Promise<TenantSignals | null> {
  const { data: business, error } = await sb
    .from("businesses")
    .select("user_id")
    .eq(column, value)
    .maybeSingle();
  if (error) throw error;
  if (!business) return null;

  const userId = (business as { user_id?: string | null }).user_id ?? null;
  let trialEndsAt: string | null = null;
  let plan: string | null = null;
  if (userId) {
    const { data: sub, error: subErr } = await sb
      .from("subscriptions")
      .select("plan, trial_ends_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (subErr) throw subErr;
    trialEndsAt = (sub as { trial_ends_at?: string | null } | null)?.trial_ends_at ?? null;
    plan = (sub as { plan?: string | null } | null)?.plan ?? null;
  }

  return {
    ai_paused: null,
    trial_ends_at: trialEndsAt,
    plan,
  };
}

async function loadFromAuthUserId(
  sb: SupabaseClient,
  userId: string,
): Promise<TenantSignals | null> {
  const { data: sub, error } = await sb
    .from("subscriptions")
    .select("plan, trial_ends_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return {
    ai_paused: null,
    trial_ends_at: (sub as { trial_ends_at?: string | null } | null)?.trial_ends_at ?? null,
    plan: (sub as { plan?: string | null } | null)?.plan ?? null,
  };
}

async function resolveSignals(
  sb: SupabaseClient,
  lookup: TenantLookup,
): Promise<TenantSignals | null> {
  switch (lookup.kind) {
    case "client_id":
      return loadFromClientRow(sb, "id", lookup.id);
    case "tenant_id":
      return loadFromClientRow(sb, "public_key", lookup.id);
    case "business_public_key":
      return loadFromBusinessRow(sb, "api_key", lookup.publicKey);
    case "auth_user_id":
      return loadFromAuthUserId(sb, lookup.userId);
  }
}

export async function assertTenantActive(
  sb: SupabaseClient,
  lookup: TenantLookup,
): Promise<GateResult> {
  let signals: TenantSignals | null;
  try {
    signals = await resolveSignals(sb, lookup);
  } catch {
    return { ok: false, reason: null, status: 403 };
  }

  if (!signals) return { ok: true };

  if (signals.ai_paused === true) {
    return { ok: false, reason: "paused", status: 403 };
  }

  const onTrial = signals.plan === "trial" || signals.plan === null;
  if (
    onTrial &&
    signals.trial_ends_at &&
    new Date(signals.trial_ends_at) < new Date()
  ) {
    return { ok: false, reason: "trial_expired", status: 403 };
  }

  return { ok: true };
}
