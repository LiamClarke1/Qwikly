// GET /api/pipeline/quota
//
// Returns the current tenant's plan info: plan name and daily prospect quota.
// Used by the Pipeline dashboard to show the plan badge and per-plan delivery
// count. Session-auth gated, always responds with safe defaults on error.

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";
import { resolvePlan, dailyProspectQuotaForPlan } from "@/lib/plan";

export const dynamic = "force-dynamic";

export async function GET() {
  const fallback = { plan: "pro", daily_quota: 5 };

  try {
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
    if (!user) return NextResponse.json(fallback);

    const db = supabaseAdmin();
    const { data: client } = await db
      .from("clients")
      .select("plan")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    const row = client as { plan?: string } | null;
    if (!row) return NextResponse.json(fallback);

    const resolvedPlan = resolvePlan(row.plan ?? null);
    return NextResponse.json({
      plan: row.plan ?? "pro",
      daily_quota: dailyProspectQuotaForPlan(resolvedPlan),
    });
  } catch {
    return NextResponse.json(fallback);
  }
}
