import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "./supabase-server";

export type PlanTier = "starter" | "pro" | "premium";

export type V2AuthContext = {
  userId: string;
  businessId: string;
  plan: PlanTier;
  subscriptionStatus: string;
  paystackCustomerCode: string | null;
  paystackSubscriptionCode: string | null;
  paystackEmailToken: string | null;
  cancelAtPeriodEnd: boolean;
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
      .select("plan, status, paystack_customer_code, paystack_subscription_code, paystack_email_token, cancel_at_period_end")
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
    paystackCustomerCode: sub?.paystack_customer_code ?? null,
    paystackSubscriptionCode: sub?.paystack_subscription_code ?? null,
    paystackEmailToken: sub?.paystack_email_token ?? null,
    cancelAtPeriodEnd: sub?.cancel_at_period_end ?? false,
  };
}
