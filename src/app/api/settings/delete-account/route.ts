import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

async function getAuth() {
  const cookieStore = cookies();
  const auth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (s) => s.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  );
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return null;

  const db = supabaseAdmin();
  const { data: client } = await db.from("clients").select("id, auth_user_id").eq("auth_user_id", user.id).maybeSingle();
  if (!client) return null;

  return { userId: user.id, clientId: client.id as number };
}

// DELETE /api/settings/delete-account — soft-delete with 30-day grace period
export async function DELETE() {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date().toISOString();
  const db = supabaseAdmin();

  const { error } = await db
    .from("clients")
    .update({ delete_requested_at: now })
    .eq("id", auth.clientId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Notify admin via Resend
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Qwikly <noreply@qwikly.co.za>",
        to: "liam@clarkeagency.co.za",
        subject: `Account deletion requested — client ${auth.clientId}`,
        html: `<p>Client ${auth.clientId} (auth user ${auth.userId}) has requested account deletion. Grace period expires 30 days from ${now}.</p>`,
      }),
    }).catch(() => null);
  }

  return NextResponse.json({ grace_days: 30, delete_after: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() });
}

// POST /api/settings/delete-account — cancel a pending deletion
export async function POST() {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseAdmin();
  const { error } = await db
    .from("clients")
    .update({ delete_requested_at: null })
    .eq("id", auth.clientId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
