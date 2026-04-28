import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

async function getClientId(): Promise<number | null> {
  const cookieStore = cookies();
  const auth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: (s) => s.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } }
  );
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return null;
  const db = supabaseAdmin();
  const { data } = await db.from("clients").select("id").eq("auth_user_id", user.id).maybeSingle();
  return data?.id ?? null;
}

export async function POST(req: NextRequest, { params }: { params: { period_id: string } }) {
  const clientId = await getClientId();
  if (!clientId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reason, disputed_amount } = await req.json();
  if (!reason?.trim()) return NextResponse.json({ error: "Reason required" }, { status: 400 });

  const db = supabaseAdmin();
  const { data: period } = await db
    .from("qwikly_billing_periods")
    .select("id, status, commission_zar, qwikly_billing_invoice_id")
    .eq("id", params.period_id)
    .eq("client_id", clientId)
    .maybeSingle();

  if (!period) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const now = new Date().toISOString();

  await db.from("disputes").insert({
    client_id: clientId,
    entity_type: "billing_period",
    entity_id: params.period_id,
    reason,
    disputed_amount: disputed_amount || period.commission_zar,
    status: "open",
    created_at: now,
    updated_at: now,
  });

  if (period.qwikly_billing_invoice_id) {
    await db.from("qwikly_billing_invoices")
      .update({ disputed_amount: disputed_amount || period.commission_zar, updated_at: now })
      .eq("id", period.qwikly_billing_invoice_id);
  }

  return NextResponse.json({ ok: true });
}
