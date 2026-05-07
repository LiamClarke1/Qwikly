import { NextResponse } from "next/server";
import { v2Auth } from "@/lib/v2-auth";
import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function POST() {
  const auth = await v2Auth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseAdmin();
  await db
    .from("subscriptions")
    .update({ cancel_at_period_end: true })
    .eq("user_id", auth.userId);

  return NextResponse.json({ ok: true });
}
