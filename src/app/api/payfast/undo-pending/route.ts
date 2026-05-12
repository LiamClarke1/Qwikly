import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/**
 * Clears any scheduled-end-of-period change on the caller's subscription:
 *   - `subscriptions.pending_plan` → NULL
 *   - `subscriptions.cancel_at_period_end` → false
 *
 * Used by the "Undo" button in the billing settings page after the user
 * has scheduled a downgrade or cancellation and changes their mind. The
 * billing CTAs that *create* pending changes (downgrade, cancel) live in
 * other PayFast routes maintained by sibling agents; this endpoint is the
 * narrow inverse so the dashboard surface stays self-healing.
 */
export async function POST() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin();

  const { error: updErr } = await db
    .from("subscriptions")
    .update({
      pending_plan: null,
      cancel_at_period_end: false,
    })
    .eq("user_id", user.id);

  if (updErr) {
    console.error("[undo-pending] update failed:", updErr.message);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
