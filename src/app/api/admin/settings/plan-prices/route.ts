import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-server";
import { assertAdmin } from "@/lib/admin-auth";
import { listPlanPrices, revalidatePlanPrices } from "@/lib/billing/plan-prices";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  id: z.string().uuid(),
  display_name: z.string().min(1).max(100),
  // Amount accepted in ZAR (rands), at most 2 decimal places, non-negative.
  amount_zar: z.number().nonnegative().multipleOf(0.01),
  billing_cadence: z.enum(["monthly", "annual"]),
  is_active: z.boolean(),
});

export async function GET() {
  const auth = await assertAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rows = await listPlanPrices();
  rows.sort((a, b) => a.amount_zar_cents - b.amount_zar_cents);
  return NextResponse.json({ plans: rows });
}

export async function PATCH(req: NextRequest) {
  const auth = await assertAdmin();
  if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { id, display_name, amount_zar, billing_cadence, is_active } = parsed.data;
  const amount_zar_cents = Math.round(amount_zar * 100);

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("plan_prices")
    .update({
      display_name,
      amount_zar_cents,
      billing_cadence,
      is_active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePlanPrices();

  return NextResponse.json({ plan: data });
}
