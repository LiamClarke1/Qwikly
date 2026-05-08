import type { SupabaseClient } from "@supabase/supabase-js";
import { aggregateStats } from "./stats-aggregator";
import { billingWindowEndingAt, todaySast } from "./anchor";

interface GenerateResult {
  invoice_id: string | null;
  status: "draft" | "skipped";
  reason?: string;
  warnings?: string[];
}

const VAT_RATE = 0.15;

/**
 * Generate a draft Qwikly→client invoice for today's anchor.
 * Creates the qwikly_billing_invoices row with status='draft' and snapshots
 * the period's usage stats into line_items_jsonb. Does NOT send the invoice;
 * the admin sends manually from /admin/invoicing.
 *
 * Idempotent: returns 'skipped' if an invoice already exists for this client today.
 */
export async function generateDraftInvoice(
  sb: SupabaseClient,
  clientId: number,
): Promise<GenerateResult> {
  // 1. Load client with billing fields
  const clientRes = await sb
    .from("clients")
    .select("id, business_name, client_email, whatsapp_number, mrr_zar, plan, billing_anchor_day, billing_anchor_set_at")
    .eq("id", clientId)
    .single();

  if (clientRes.error || !clientRes.data) {
    return { invoice_id: null, status: "skipped", reason: `client_load_error: ${clientRes.error?.message ?? "not found"}` };
  }
  const client = clientRes.data;

  if (!client.billing_anchor_day) {
    return { invoice_id: null, status: "skipped", reason: "no_anchor_day_set" };
  }

  // 2. Idempotency: check if an invoice was already created today (SAST)
  const today = todaySast();
  const dayStartIso = today.toISOString();
  const dayEndIso = new Date(today.getTime() + 86_400_000).toISOString();

  const dup = await sb
    .from("qwikly_billing_invoices")
    .select("id")
    .eq("client_id", clientId)
    .gte("created_at", dayStartIso)
    .lt("created_at", dayEndIso)
    .limit(1);

  if (dup.error) {
    return { invoice_id: null, status: "skipped", reason: `dup_check_error: ${dup.error.message}` };
  }
  if ((dup.data ?? []).length > 0) {
    return { invoice_id: dup.data![0].id, status: "skipped", reason: "already_invoiced_today" };
  }

  // 3. Compute billing window
  const window = billingWindowEndingAt(today);
  const windowStart = client.billing_anchor_set_at && new Date(client.billing_anchor_set_at) > window.start
    ? new Date(client.billing_anchor_set_at)
    : window.start;

  // 4. Aggregate stats
  const { stats, warnings } = await aggregateStats(sb, clientId, windowStart, window.end);

  // 5. Compute totals (in ZAR, not cents — qwikly_billing_invoices schema uses numeric(12,2))
  const subtotalZar = (client.mrr_zar ?? 0) / 100;
  const vatZar = Math.round(subtotalZar * VAT_RATE * 100) / 100;
  const totalZar = Math.round((subtotalZar + vatZar) * 100) / 100;

  // 6. Create billing period.
  // commission_zar = subtotalZar (pre-VAT subscription amount), so the Revenue
  // page can sum commissions across periods. The legacy 8% commission_rate column
  // does not apply to the Qwikly→client subscription model, only to the older
  // client→customer billing flow.
  const periodIns = await sb
    .from("qwikly_billing_periods")
    .insert({
      client_id: clientId,
      period_start: windowStart.toISOString().slice(0, 10),
      period_end: window.end.toISOString().slice(0, 10),
      total_invoiced_zar: totalZar,
      commission_zar: subtotalZar,
      vat_zar: vatZar,
      status: "locked",
      due_at: new Date(today.getTime() + 7 * 86_400_000).toISOString().slice(0, 10),
    })
    .select("id")
    .single();

  if (periodIns.error || !periodIns.data) {
    return { invoice_id: null, status: "skipped", reason: `period_insert_error: ${periodIns.error?.message}` };
  }
  const periodId = periodIns.data.id;

  // 7. Generate invoice number QWK-YYYYMMDD-CCCC where CCCC is the 4-digit client_id.
  // Idempotency check above guarantees one invoice per client per day, so this is unique.
  const yyyymmdd = today.toISOString().slice(0, 10).replace(/-/g, "");
  const invoiceNumber = `QWK-${yyyymmdd}-${String(clientId).padStart(4, "0")}`;

  // 8. Create the invoice (status='draft' — admin sends manually from /admin/invoicing)
  const invIns = await sb
    .from("qwikly_billing_invoices")
    .insert({
      client_id: clientId,
      period_id: periodId,
      invoice_number: invoiceNumber,
      total_zar: totalZar,
      vat_zar: vatZar,
      status: "draft",
      due_at: new Date(today.getTime() + 7 * 86_400_000).toISOString().slice(0, 10),
      line_items_jsonb: stats,
    })
    .select("id")
    .single();

  if (invIns.error || !invIns.data) {
    return { invoice_id: null, status: "skipped", reason: `invoice_insert_error: ${invIns.error?.message}` };
  }
  const invoiceId = invIns.data.id;

  // 8b. Back-reference: write the invoice id onto the period so disputes
  // and reporting can hop period -> invoice without joins. The dispute resolve
  // credit flow looks this up explicitly.
  await sb
    .from("qwikly_billing_periods")
    .update({ qwikly_billing_invoice_id: invoiceId })
    .eq("id", periodId);

  // 9. Log any aggregator warnings for admin visibility.
  // Note: chat_persist_dlq does not have a 'channel' column so we use console.warn
  // rather than inserting into the DLQ table directly.
  if (warnings.length) {
    console.warn(JSON.stringify({ invoice_id: invoiceId, warnings }));
  }

  return { invoice_id: invoiceId, status: "draft", warnings };
}
