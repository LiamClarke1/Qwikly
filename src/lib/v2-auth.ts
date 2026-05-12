import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "./supabase-server";

export type PlanTier = "trial" | "starter" | "pro" | "founders" | "business" | "enterprise" | "premium";

export type V2AuthContext = {
  userId: string;
  businessId: string;
  plan: PlanTier;
  subscriptionStatus: string;
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

  const [{ data: existingBusiness }, { data: sub }] = await Promise.all([
    db.from("businesses").select("id").eq("user_id", user.id).maybeSingle(),
    db.from("subscriptions")
      .select("plan, status, cancel_at_period_end")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  // Self-heal for legacy accounts that pre-date the businesses table.
  // These users have a clients row but no businesses row, so every v2
  // endpoint was returning 401. Create the row on the fly using whatever
  // identity data we can find on the auth user / clients row.
  let business = existingBusiness;
  if (!business) {
    const { data: legacyClient } = await db
      .from("clients")
      .select("business_name, notification_email, client_email")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    const inserted = await db
      .from("businesses")
      .insert({
        user_id: user.id,
        name: legacyClient?.business_name ?? user.user_metadata?.business_name ?? "",
        contact_email: legacyClient?.client_email ?? user.email ?? "",
        notification_email: legacyClient?.notification_email ?? user.email ?? null,
      })
      .select("id")
      .single();

    if (inserted.error || !inserted.data) {
      console.error("[v2-auth] failed to self-heal businesses row:", { userId: user.id, error: inserted.error });
      return null;
    }
    business = inserted.data;
  }

  return {
    userId: user.id,
    businessId: business.id,
    plan: (sub?.plan as PlanTier) ?? "trial",
    subscriptionStatus: sub?.status ?? "active",
    cancelAtPeriodEnd: sub?.cancel_at_period_end ?? false,
  };
}
