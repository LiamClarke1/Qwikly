// 24-hour onboarding checklist, server-side state helpers.
//
// SCHEMA NOTE
// ───────────
// We expect a JSONB column `onboarding_state` on `clients`. See
// supabase/migrations/20260510_onboarding_state.sql for the migration.
// Shape:
//   {
//     step1: boolean,
//     step2: boolean,
//     step3: boolean,
//     step4: boolean,
//     step5: boolean,
//     started_at: ISO timestamp
//   }
//
// If the migration has not yet been applied in a given environment, the
// helpers here gracefully fall back to a default empty state and best-guess
// from existing client fields, so the page never blows up.

import { supabaseAdmin } from "@/lib/supabase-server";

export type OnboardingStepKey = "step1" | "step2" | "step3" | "step4" | "step5";

export interface OnboardingState {
  step1: boolean;
  step2: boolean;
  step3: boolean;
  step4: boolean;
  step5: boolean;
  started_at: string;
}

export const ONBOARDING_WINDOW_MS = 24 * 60 * 60 * 1000;
export const STALE_TENANT_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;

export function emptyState(startedAt: string = new Date().toISOString()): OnboardingState {
  return {
    step1: false,
    step2: false,
    step3: false,
    step4: false,
    step5: false,
    started_at: startedAt,
  };
}

export function isComplete(state: OnboardingState): boolean {
  return state.step1 && state.step2 && state.step3 && state.step4 && state.step5;
}

export function completedCount(state: OnboardingState): number {
  return [state.step1, state.step2, state.step3, state.step4, state.step5].filter(Boolean).length;
}

function normalize(raw: unknown, fallbackStart: string): OnboardingState {
  const base = emptyState(fallbackStart);
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Record<string, unknown>;
  return {
    step1: r.step1 === true,
    step2: r.step2 === true,
    step3: r.step3 === true,
    step4: r.step4 === true,
    step5: r.step5 === true,
    started_at: typeof r.started_at === "string" ? r.started_at : fallbackStart,
  };
}

/**
 * Best-guess pre-tick steps for tenants that pre-date the checklist page.
 * Only used when no onboarding_state row exists AND the tenant is older
 * than 7 days, so brand-new signups always start on a clean slate.
 */
export function bestGuessFromClient(client: ClientGuessFields): OnboardingState {
  const widgetEmbedded = !!client.web_widget_last_seen_at || client.web_widget_status === "verified";
  const instantReplyConfigured = !!client.notification_phone && !!client.notification_email;
  const hasGreetingTweak = !!(client.web_widget_greeting && client.web_widget_greeting.trim().length > 0);
  const contactConfirmed = !!client.notification_email && !!client.notification_phone;
  return {
    step1: widgetEmbedded,
    step2: instantReplyConfigured,
    step3: hasGreetingTweak,
    step4: false, // can never auto-detect a real test lead
    step5: contactConfirmed,
    started_at: client.created_at ?? new Date().toISOString(),
  };
}

export interface ClientGuessFields {
  created_at?: string | null;
  web_widget_last_seen_at?: string | null;
  web_widget_status?: string | null;
  web_widget_greeting?: string | null;
  notification_email?: string | null;
  notification_phone?: string | null;
}

/**
 * Reads the onboarding state for a tenant. If the column does not exist or
 * is empty:
 *   - new tenant (created within 7 days): return clean empty state
 *   - older tenant: return best-guess pre-ticks
 * Never throws on missing column, so the dashboard keeps working pre-migration.
 */
export async function getOnboardingState(tenantId: string | number): Promise<{
  state: OnboardingState;
  client: ClientGuessFields;
  isStale: boolean;
  isFreshRow: boolean;
}> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("clients")
    .select(
      "id, created_at, onboarding_state, web_widget_last_seen_at, web_widget_status, web_widget_greeting, notification_email, notification_phone, website_url, business_name, onboarding_completed_at",
    )
    .eq("id", tenantId)
    .maybeSingle();

  // If the column is missing, Supabase returns a column error. Re-query
  // without onboarding_state so the page still renders.
  if (error && /onboarding_state/.test(error.message)) {
    const fallback = await db
      .from("clients")
      .select(
        "id, created_at, web_widget_last_seen_at, web_widget_status, web_widget_greeting, notification_email, notification_phone, website_url, business_name, onboarding_completed_at",
      )
      .eq("id", tenantId)
      .maybeSingle();
    const c = (fallback.data ?? {}) as ClientGuessFields;
    const ageMs = c.created_at ? Date.now() - new Date(c.created_at).getTime() : 0;
    const isStale = ageMs > STALE_TENANT_THRESHOLD_MS;
    return {
      state: isStale ? bestGuessFromClient(c) : emptyState(c.created_at ?? new Date().toISOString()),
      client: c,
      isStale,
      isFreshRow: true,
    };
  }

  const c = (data ?? {}) as ClientGuessFields & { onboarding_state?: unknown };
  const rawState = c.onboarding_state;
  const ageMs = c.created_at ? Date.now() - new Date(c.created_at).getTime() : 0;
  const isStale = ageMs > STALE_TENANT_THRESHOLD_MS;

  const hasRow = !!(rawState && typeof rawState === "object" && Object.keys(rawState as object).length > 0);
  if (!hasRow) {
    // First visit, persist either a clean slate or a best-guess depending on age.
    const seed = isStale ? bestGuessFromClient(c) : emptyState(c.created_at ?? new Date().toISOString());
    await db.from("clients").update({ onboarding_state: seed }).eq("id", tenantId);
    return { state: seed, client: c, isStale, isFreshRow: true };
  }

  return {
    state: normalize(rawState, c.created_at ?? new Date().toISOString()),
    client: c,
    isStale,
    isFreshRow: false,
  };
}

/**
 * Upsert a single step. Reads, mutates, writes. Cheap and good enough for
 * this volume of writes (at most five toggles per tenant lifetime).
 */
export async function setOnboardingStep(
  tenantId: string | number,
  step: 1 | 2 | 3 | 4 | 5,
  done: boolean,
): Promise<OnboardingState> {
  const db = supabaseAdmin();
  const { data } = await db
    .from("clients")
    .select("onboarding_state, created_at, onboarding_completed_at")
    .eq("id", tenantId)
    .maybeSingle();

  const fallbackStart =
    (data && typeof data === "object" && "created_at" in data && typeof (data as { created_at?: string }).created_at === "string"
      ? (data as { created_at?: string }).created_at
      : null) ?? new Date().toISOString();
  const current = normalize((data as { onboarding_state?: unknown } | null)?.onboarding_state, fallbackStart);
  const next: OnboardingState = { ...current, [`step${step}`]: done } as OnboardingState;

  const updates: Record<string, unknown> = { onboarding_state: next };
  // Mirror completion to the existing onboarding_complete column so the rest
  // of the dashboard (home screen, banners) reacts immediately.
  if (isComplete(next) && !(data as { onboarding_completed_at?: string | null } | null)?.onboarding_completed_at) {
    updates.onboarding_complete = true;
    updates.onboarding_completed_at = new Date().toISOString();
  }

  await db.from("clients").update(updates).eq("id", tenantId);
  return next;
}

/**
 * Window math for the live countdown. Returns the remaining ms in the
 * 24-hour window, the "actual" ms taken if completion timestamp is given,
 * and convenience flags.
 */
export function windowMath(startedAtIso: string, completedAtIso: string | null): {
  msLeft: number;
  msTaken: number | null;
  expired: boolean;
} {
  const started = new Date(startedAtIso).getTime();
  const completed = completedAtIso ? new Date(completedAtIso).getTime() : null;
  const msLeft = started + ONBOARDING_WINDOW_MS - Date.now();
  const msTaken = completed ? completed - started : null;
  return {
    msLeft,
    msTaken,
    expired: msLeft <= 0,
  };
}
