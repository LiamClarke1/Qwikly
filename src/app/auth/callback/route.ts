import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
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
      }
    }

    // Check if this user has any clients yet; if not, send them to setup.
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .limit(1)
      .maybeSingle();

    if (!client) {
      return NextResponse.redirect(new URL("/dashboard/setup", requestUrl.origin));
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
