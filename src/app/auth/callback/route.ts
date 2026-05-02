import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

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
        await db.from("businesses").insert({
          user_id: user.id,
          name,
          contact_email: user.email ?? "",
        });
        await db.from("subscriptions").insert({
          user_id: user.id,
          plan: "starter",
          billing_cycle: "monthly",
          status: "active",
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
          });
        }
      }
    }

    // Redirect to onboarding if the user hasn't completed it yet
    const { data: client } = await supabase
      .from("clients")
      .select("id, onboarding_completed_at")
      .limit(1)
      .maybeSingle();

    if (!client || !client.onboarding_completed_at) {
      const onboardingPath = plan
        ? `/onboarding/website?plan=${plan}`
        : "/onboarding/website";
      return NextResponse.redirect(new URL(onboardingPath, requestUrl.origin));
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
