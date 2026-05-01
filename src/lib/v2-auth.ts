import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "./supabase-server";

export type PlanTier = "starter" | "pro" | "premium";

export type V2AuthContext = {
  userId: string;
  businessId: string;
  plan: PlanTier;
  subscriptionStatus: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripeTopupItemId: string | null;
};

export async function v2Auth(): Promise<V2AuthContext | null> {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (s) =>
          s.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          ),
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const db = supabaseAdmin();

  const [{ data: business }, { data: sub }] = await Promise.all([
    db.from("businesses").select("id").eq("user_id", user.id).maybeSingle(),
    db.from("subscriptions")
      .select("plan, status, stripe_customer_id, stripe_subscription_id, stripe_topup_item_id")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (!business) {
    console.warn("[v2-auth] authenticated user has no business row:", user.id);
    return null;
  }

  return {
    userId: user.id,
    businessId: business.id,
    plan: (sub?.plan as PlanTier) ?? "starter",
    subscriptionStatus: sub?.status ?? "active",
    stripeCustomerId: sub?.stripe_customer_id ?? null,
    stripeSubscriptionId: sub?.stripe_subscription_id ?? null,
    stripeTopupItemId: sub?.stripe_topup_item_id ?? null,
  };
}
