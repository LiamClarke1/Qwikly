import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { assertAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/**
 * Admin endpoint: manually grant top-up credits to a tenant. Used while
 * the self-serve Paystack top-up flow isn't live yet, or for goodwill /
 * comp credits when an owner has paid via EFT.
 *
 * Owner emails Liam → confirms payment → Liam hits this endpoint with
 * { client_id, amount_zar_cents, note }. The wallet increments and a
 * credit_topups audit row is written. The tenant's assistant resumes
 * automatically because the chat-route gate re-checks balance on the
 * next visitor message.
 *
 * Body:
 *   {
 *     client_id: number,
 *     amount_zar_cents: number,   // positive grant only
 *     note?: string,               // appears on the audit row
 *     source?: 'paystack' | 'manual_admin' | 'plan_signup_bonus'
 *   }
 */
export async function POST(req: NextRequest) {
  const auth = await assertAdmin();
  if (!auth.ok) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: {
    client_id?: number;
    amount_zar_cents?: number;
    note?: string;
    source?: "paystack" | "manual_admin" | "plan_signup_bonus";
    paystack_reference?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const clientId = Number(body.client_id);
  const amountCents = Number(body.amount_zar_cents);
  if (!clientId || !Number.isFinite(amountCents) || amountCents <= 0) {
    return NextResponse.json(
      { error: "client_id and positive amount_zar_cents are required" },
      { status: 400 },
    );
  }

  const db = supabaseAdmin();

  // Read the current wallet so we can write the new balance + lifetime totals.
  const { data: existing, error: readErr } = await db
    .from("conversation_credits")
    .select("purchased_balance_zar_cents, total_topped_up_zar_cents")
    .eq("client_id", clientId)
    .maybeSingle();
  if (readErr) {
    console.error("[admin/credits/grant] read failed:", readErr.message);
    return NextResponse.json({ error: "read_failed" }, { status: 500 });
  }

  // The auto-provision trigger should have created this row at signup, but
  // backstop with an upsert in case the trigger failed historically.
  const newPurchasedBalance = (existing?.purchased_balance_zar_cents ?? 0) + amountCents;
  const newLifetimeToppedUp =
    Number(existing?.total_topped_up_zar_cents ?? 0) + amountCents;

  const { error: walletErr } = await db
    .from("conversation_credits")
    .upsert(
      {
        client_id: clientId,
        purchased_balance_zar_cents: newPurchasedBalance,
        total_topped_up_zar_cents: newLifetimeToppedUp,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "client_id" },
    );
  if (walletErr) {
    console.error("[admin/credits/grant] wallet write failed:", walletErr.message);
    return NextResponse.json({ error: "wallet_write_failed" }, { status: 500 });
  }

  // Audit row, so we can answer "who got how much when, paid via what"
  // questions later without sifting through commit logs.
  const { error: auditErr } = await db.from("credit_topups").insert({
    client_id: clientId,
    amount_zar_cents: amountCents,
    paystack_reference: body.paystack_reference ?? null,
    source: body.source ?? "manual_admin",
    note: body.note ?? `Granted by admin ${auth.userId}`,
  });
  if (auditErr) {
    // Don't fail the whole request, the wallet is already topped up. But log
    // loudly so we can reconcile.
    console.error("[admin/credits/grant] audit write failed:", auditErr.message);
  }

  return NextResponse.json({
    ok: true,
    client_id: clientId,
    new_purchased_balance_zar_cents: newPurchasedBalance,
    granted_zar_cents: amountCents,
  });
}
