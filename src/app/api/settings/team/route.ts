import { NextRequest, NextResponse } from "next/server";
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

  return { userId: user.id, email: user.email ?? "", clientId: client.id as number };
}

export async function GET() {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("team_members")
    .select("id, email, user_id, role, status, invited_at, accepted_at")
    .eq("client_id", auth.clientId)
    .neq("status", "revoked")
    .order("invited_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { email, role } = body as { email?: string; role?: string };

  if (!email || !role) return NextResponse.json({ error: "email and role are required" }, { status: 400 });
  if (!["admin", "editor", "viewer"].includes(role)) {
    return NextResponse.json({ error: "role must be admin, editor, or viewer" }, { status: 400 });
  }

  const db = supabaseAdmin();

  // Upsert: allow re-inviting a revoked member
  const { data, error } = await db
    .from("team_members")
    .upsert(
      { client_id: auth.clientId, email: email.toLowerCase(), role, status: "pending", invited_at: new Date().toISOString() },
      { onConflict: "client_id,email" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Send invite email via Resend if configured
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Qwikly <noreply@qwikly.co.za>",
        to: email,
        subject: "You've been invited to Qwikly",
        html: `<p>You've been invited as a team member (${role}). <a href="https://app.qwikly.co.za/signup">Sign up or log in</a> to accept.</p>`,
      }),
    }).catch(() => null);
  }

  return NextResponse.json(data, { status: 201 });
}
