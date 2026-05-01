import { NextResponse } from "next/server";
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

export async function GET() {
  const clientId = await getClientId();
  if (!clientId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseAdmin();
  const { data } = await db
    .from("qwikly_billing_invoices")
    .select(`
      id, invoice_number, total_zar, vat_zar, status,
      due_at, paid_at, created_at,
      qwikly_billing_periods (period_start, period_end)
    `)
    .eq("client_id", clientId)
    .neq("status", "draft")
    .order("created_at", { ascending: false });

  return NextResponse.json({ invoices: data ?? [] });
}
