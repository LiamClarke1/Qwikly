import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";
import {
  getOnboardingState,
  STALE_TENANT_THRESHOLD_MS,
} from "@/lib/onboarding/state";
import CountdownCard from "@/components/onboarding/CountdownCard";
import Checklist from "@/components/onboarding/Checklist";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  // Resolve session via server cookies, same pattern as the rest of the v2
  // dashboard. Anonymous visitors get punted to /login by the parent layout
  // already, but we double-belt here so the server action context is clean.
  const cookieStore = cookies();
  const auth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    },
  );
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) redirect("/login");

  const db = supabaseAdmin();
  const { data: client } = await db
    .from("clients")
    .select("id, business_name, website_url, created_at, onboarding_completed_at")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!client) {
    // No client row, send them to the original setup wizard.
    redirect("/dashboard/setup");
  }

  const tenantId = (client as { id: number | string }).id;
  const businessName = (client as { business_name?: string | null }).business_name ?? null;
  const websiteUrl = (client as { website_url?: string | null }).website_url ?? null;
  const createdAt = (client as { created_at?: string | null }).created_at ?? new Date().toISOString();
  const completedAt = (client as { onboarding_completed_at?: string | null }).onboarding_completed_at ?? null;

  const { state, isStale } = await getOnboardingState(tenantId);

  const ageMs = Date.now() - new Date(createdAt).getTime();
  const isReturningTenant = isStale && ageMs > STALE_TENANT_THRESHOLD_MS;

  return (
    <div className="space-y-7 max-w-3xl">
      {/* ── HEADER ──────────────────────────────────────────────────── */}
      <div>
        <p className="eyebrow text-ember mb-2">Live in 24 hours</p>
        {isReturningTenant ? (
          <>
            <h1 className="display-md text-ink leading-tight tracking-tight">
              Welcome back. Want to make sure your setup is dialled in?
            </h1>
            <p className="text-body text-ink-500 mt-2">
              We have pre-ticked anything that already looks done from your account.
              Run through the rest, it takes about ten minutes.
            </p>
          </>
        ) : (
          <>
            <h1 className="display-md text-ink leading-tight tracking-tight">
              Your Qwikly setup checklist.
            </h1>
            <p className="text-body text-ink-500 mt-2">
              Five steps. Done in an afternoon. The countdown started the moment you signed up
              {businessName ? `, ${businessName}` : ""}.
            </p>
          </>
        )}
      </div>

      {/* ── COUNTDOWN ───────────────────────────────────────────────── */}
      <CountdownCard startedAt={state.started_at ?? createdAt} completedAt={completedAt} />

      {/* ── CHECKLIST ───────────────────────────────────────────────── */}
      <Checklist initialState={state} websiteUrl={websiteUrl} />
    </div>
  );
}
