// GET /api/pipeline/setup-status
//
// Returns the current tenant's outbound enrollment + Pipeline setup status,
// used by the dashboard layout to decide whether to render the
// PipelineSetupBanner and the yellow nav dot. Session-auth gated, resolves
// the tenant from the user cookie. Fail-soft, always responds with
// { hasOutbound, status } even when something goes wrong, so the UI never
// blocks on this.

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";
import { getSetupState, type PipelineSetupStatus } from "@/lib/pipeline/setup-state";

export const dynamic = "force-dynamic";

export async function GET() {
  const fallback = { hasOutbound: false, status: "pending" as PipelineSetupStatus };

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
    if (!user) {
      return NextResponse.json(fallback, { status: 200 });
    }

    const db = supabaseAdmin();
    const { data: client } = await db
      .from("clients")
      .select("id, products")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    const row = client as { id: number | string; products?: unknown } | null;
    if (!row?.id) {
      return NextResponse.json(fallback, { status: 200 });
    }

    const products = Array.isArray(row.products) ? (row.products as unknown[]) : [];
    const hasOutbound = products.includes("outbound");

    if (!hasOutbound) {
      return NextResponse.json({ hasOutbound: false, status: "pending" as PipelineSetupStatus });
    }

    const state = await getSetupState(row.id);
    return NextResponse.json({ hasOutbound: true, status: state.status });
  } catch {
    return NextResponse.json(fallback, { status: 200 });
  }
}
