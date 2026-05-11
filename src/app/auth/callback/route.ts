import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import {
  productsForPlan,
  dailyProspectQuotaForPlan,
  resolvePlan,
  type InboundPlanTier,
} from "@/lib/plan";
import { trialEndsFromNow } from "@/lib/trial";

// VALID_PLANS becomes the InboundPlanTier list, no pipeline tiers.
const VALID_PLANS: InboundPlanTier[] = ['trial', 'starter', 'pro', 'founders', 'business', 'enterprise', 'premium'];

function resolvePlanForSignup(raw: string | null): InboundPlanTier {
  if (raw && (VALID_PLANS as readonly string[]).includes(raw)) {
    return raw as InboundPlanTier;
  }
  return resolvePlan(raw);
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
            pipeline_daily_quota: dailyProspectQuotaForPlan(resolvedPlan),
            ...(trialEndsAt ? { trial_ends_at: trialEndsAt } : {}),
          });
        }
      }
    }

    // Redirect to onboarding if the user hasn't completed it yet.
    // Every plan now uses the unified /dashboard/setup path.
    if (user) {
      const { data: client } = await supabase
        .from("clients")
        .select("id, onboarding_completed_at")
        .eq("auth_user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (!client || !client.onboarding_completed_at) {
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
