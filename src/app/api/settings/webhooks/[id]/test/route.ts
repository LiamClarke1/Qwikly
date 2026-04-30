import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";
import { createHmac } from "crypto";

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
  const { data: client } = await db.from("clients").select("id").eq("auth_user_id", user.id).maybeSingle();
  if (!client) return null;

  return { userId: user.id, clientId: client.id as number };
}

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseAdmin();
  const { data: webhook, error: fetchErr } = await db
    .from("webhooks")
    .select("url, secret")
    .eq("id", params.id)
    .eq("client_id", auth.clientId)
    .single();

  if (fetchErr || !webhook) return NextResponse.json({ error: "Webhook not found" }, { status: 404 });

  const payload = JSON.stringify({
    event: "test",
    timestamp: new Date().toISOString(),
    data: { message: "This is a test event from Qwikly." },
  });

  const sig = createHmac("sha256", webhook.secret).update(payload).digest("hex");

  let status = 0;
  try {
    const res = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Qwikly-Event": "test",
        "X-Qwikly-Signature-256": `sha256=${sig}`,
      },
      body: payload,
      signal: AbortSignal.timeout(8000),
    });
    status = res.status;
  } catch {
    status = 0;
  }

  await db
    .from("webhooks")
    .update({ last_fired_at: new Date().toISOString(), last_status: status })
    .eq("id", params.id);

  const ok = status >= 200 && status < 300;
  return NextResponse.json({ ok, status }, { status: ok ? 200 : 422 });
}
