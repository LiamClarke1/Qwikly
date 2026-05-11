import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { resolvePlan } from "@/lib/plan";
import { trialEndsFromNow } from "@/lib/trial";

// Pipeline (Outbound) plans get products=['outbound'] and a per-tier daily
// prospect quota. resolvePlan() downgrades non-Inbound tiers to 'trial', so
// we preserve the raw plan string for Pipeline tiers separately.
const VALID_PLANS = new Set([
  "trial", "starter", "pro", "business", "enterprise", "premium",
  "pipeline_lite", "pipeline_pro",
]);

function resolvePlanForSignup(raw: string | null): string {
  if (raw && VALID_PLANS.has(raw)) return raw;
  // Fall back to inbound resolvePlan for legacy aliases (lite -> starter, etc.).
  return resolvePlan(raw);
}

function productsForPlan(plan: string): string[] {
  if (plan === "pipeline_lite" || plan === "pipeline_pro") return ["outbound"];
  return ["inbound"];
}

function pipelineDailyQuotaForPlan(plan: string): number {
  if (plan === "pipeline_lite") return 3;
  if (plan === "pipeline_pro") return 8;
  return 3; // default for inbound, never read
}

function isPipelinePlan(plan: string): boolean {
  return plan === "pipeline_lite" || plan === "pipeline_pro";
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const plan = requestUrl.searchParams.get("plan");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );
    await supabase.auth.exchangeCodeForSession(code);

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const db = supabaseAdmin();
      const { data: existingBiz } = await db
        .from("businesses")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!existingBiz) {
        const name =
          user.user_metadata?.business_name ??
          user.user_metadata?.full_name ??
          user.user_metadata?.name ??
          "";
        const resolvedPlan = resolvePlanForSignup(plan);
        const trialEndsAt = resolvedPlan === "trial"
          ? trialEndsFromNow().toISOString()
          : null;

        await db.from("businesses").insert({
          user_id: user.id,
          name,
          contact_email: user.email ?? "",
        });
        await db.from("subscriptions").insert({
          user_id: user.id,
          plan: resolvedPlan,
          billing_cycle: "monthly",
          status: "active",
          ...(trialEndsAt ? { trial_ends_at: trialEndsAt } : {}),
        });

        // Create clients row so the onboarding wizard can find the user
        const { data: existingClient } = await db
          .from("clients")
          .select("id")
          .eq("auth_user_id", user.id)
          .maybeSingle();

        if (!existingClient) {
          await db.from("clients").insert({
            auth_user_id: user.id,
            business_name: name,
            onboarding_step: 1,
            web_widget_enabled: true,
            plan: resolvedPlan,
            products: productsForPlan(resolvedPlan),
            pipeline_daily_quota: pipelineDailyQuotaForPlan(resolvedPlan),
            ...(trialEndsAt ? { trial_ends_at: trialEndsAt } : {}),
          });
        }
      }
    }

    // Redirect to onboarding if the user hasn't completed it yet.
    // Pipeline (Outbound) plans go to the Pipeline wizard, never the Inbound
    // assistant onboarding wizard. The Pipeline setup is what they paid for.
    if (user) {
      const { data: client } = await supabase
        .from("clients")
        .select("id, onboarding_completed_at, plan")
        .eq("auth_user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (!client || !client.onboarding_completed_at) {
        const effectivePlan =
          (client?.plan as string | undefined) ?? resolvePlanForSignup(plan);
        if (isPipelinePlan(effectivePlan)) {
          return NextResponse.redirect(
            new URL("/dashboard/pipeline/setup", requestUrl.origin),
          );
        }
        const onboardingPath = plan
          ? `/dashboard/setup?plan=${plan}`
          : "/dashboard/setup";
        return NextResponse.redirect(new URL(onboardingPath, requestUrl.origin));
      }
    } else {
      return NextResponse.redirect(new URL("/login", requestUrl.origin));
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
