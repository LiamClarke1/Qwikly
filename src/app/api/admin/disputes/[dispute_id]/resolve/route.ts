import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

async function assertAdmin(): Promise<boolean> {
  const cookieStore = cookies();
  const auth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: (s) => s.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } }
  );
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return false;
  const db = supabaseAdmin();
  const { data } = await db.from("admin_users").select("id").eq("user_id", user.id).maybeSingle();
  return !!data;
}

export async function POST(req: NextRequest, { params }: { params: { dispute_id: string } }) {
  if (!(await assertAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { status, resolution_notes, credit_amount } = await req.json();
  if (!["resolved", "rejected"].includes(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  const db = supabaseAdmin();
  const now = new Date().toISOString();

  await db.from("disputes").update({
    status,
    resolution_notes: resolution_notes ?? null,
    resolved_at: now,
    updated_at: now,
  }).eq("id", params.dispute_id);

  if (status === "resolved" && credit_amount > 0) {
    const { data: dispute } = await db.from("disputes").select("entity_id, entity_type").eq("id", params.dispute_id).maybeSingle();
    if (dispute?.entity_type === "billing_period") {
      const { data: period } = await db.from("qwikly_billing_periods").select("qwikly_billing_invoice_id").eq("id", dispute.entity_id).maybeSingle();
      if (period?.qwikly_billing_invoice_id) {
        await db.from("qwikly_billing_invoices")
          .update({ disputed_amount: credit_amount, updated_at: now })
          .eq("id", period.qwikly_billing_invoice_id);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
