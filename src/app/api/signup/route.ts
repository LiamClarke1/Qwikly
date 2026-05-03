import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string; businessName?: string; plan?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { email, password, businessName, plan: planParam } = body;
  if (!email || !password) {
    return NextResponse.json({ error: "email and password are required" }, { status: 400 });
  }

  const validPlans = ["trial", "starter", "pro", "premium", "billions"];
  const resolvedPlan = validPlans.includes(planParam ?? "") ? planParam! : "trial";

  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (s) =>
          s.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  );

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (data.user) {
    const db = supabaseAdmin();

    const { error: bizError } = await db.from("businesses").upsert({
      user_id: data.user.id,
      name: businessName ?? "",
      contact_email: email,
    }, { onConflict: "user_id" });

    if (bizError) {
      return NextResponse.json({ error: "account_setup_failed" }, { status: 500 });
    }

    const trialEndsAt = resolvedPlan === "trial"
      ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const { error: subError } = await db.from("subscriptions").upsert({
      user_id: data.user.id,
      plan: resolvedPlan,
      billing_cycle: "monthly",
      status: "active",
      ...(trialEndsAt ? { trial_ends_at: trialEndsAt } : {}),
    }, { onConflict: "user_id" });

    if (subError) {
      return NextResponse.json({ error: "account_setup_failed" }, { status: 500 });
    }

    // Create a clients row if one doesn't exist — the onboarding wizard reads from this table
    const { data: existingClient } = await db
      .from("clients")
      .select("id")
      .eq("auth_user_id", data.user.id)
      .maybeSingle();

    if (!existingClient) {
      await db.from("clients").insert({
        auth_user_id: data.user.id,
        business_name: businessName ?? "",
        onboarding_step: 1,
        web_widget_enabled: true,
      });
    }
  }

  return NextResponse.json(
    {
      user: { id: data.user?.id, email: data.user?.email },
      needsConfirmation: !data.session,
    },
    { status: 201 }
  );
}
