/**
 * Parses a bank statement CSV into rows we can match against invoices.
 *
 * Different banks use different column names. We pattern-match on common
 * variants for date / description / reference / amount. The amount column
 * is the one we treat as the deposit value (positive = inbound).
 *
 * Then for each row, we extract a QWK-YYYYMMDD-NNNN invoice number from
 * the description or reference, look up that invoice, and decide:
 *   - matched: invoice exists, status flips to paid, amount matches within R0.50
 *   - amount_mismatch: invoice exists but bank deposit != invoice total
 *   - no_invoice: row has no QWK reference or no matching invoice
 *   - duplicate: invoice was already paid by an earlier row in this run
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export interface ParsedRow {
  date: string | null;          // ISO date string yyyy-mm-dd or null if unparseable
  description: string;
  reference: string;            // either explicit ref column or extracted from description
  amount_zar: number;           // ZAR (rands), positive deposits only
  raw: Record<string, string>;  // original row for debugging
}

export interface ReconcileMatch {
  bank: ParsedRow;
  invoice_id: string | null;
  invoice_number: string | null;
  invoice_total_zar: number | null;
  match_status: "matched" | "amount_mismatch" | "no_invoice" | "duplicate";
  notes: string | null;
}

export interface ReconcileResult {
  matches: ReconcileMatch[];
  total_rows: number;
  matched_rows: number;
  unmatched_rows: number;
  total_amount_zar: number;
  matched_amount_zar: number;
}

const QWK_REF_PATTERN = /QWK-\d{8}-\d{4}/i;
const AMOUNT_TOLERANCE_ZAR = 0.5;

/**
 * Parse a CSV string into rows. Auto-detects which columns are
 * date / description / reference / amount based on header keywords.
 */
export function parseBankCsv(csv: string): ParsedRow[] {
  const lines = csv.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) return [];

  const splitCsv = (line: string): string[] => {
    // Minimal CSV split that handles quoted fields with commas inside.
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        out.push(cur); cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out.map(s => s.trim());
  };

  const headers = splitCsv(lines[0]).map(h => h.toLowerCase());
  const findCol = (keys: string[]): number => {
    for (let i = 0; i < headers.length; i++) {
      const h = headers[i];
      if (keys.some(k => h.includes(k))) return i;
    }
    return -1;
  };

  const dateIdx        = findCol(["date", "posting", "transaction date"]);
  const descIdx        = findCol(["description", "narration", "details", "memo"]);
  const refIdx         = findCol(["reference", "ref"]);
  const amountIdx      = findCol(["amount", "credit", "deposit"]);
  const debitIdx       = findCol(["debit"]);

  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsv(lines[i]);
    if (cols.length < 2) continue;

    const desc = descIdx >= 0 ? cols[descIdx] ?? "" : "";
    const refRaw = refIdx >= 0 ? cols[refIdx] ?? "" : "";
    const dateStr = dateIdx >= 0 ? cols[dateIdx] ?? "" : "";

    // Resolve amount: prefer amount column, fall back to credit minus debit.
    const parseNum = (s: string): number | null => {
      if (!s) return null;
      // Strip currency symbols, thousands separators, parens for negatives.
      const cleaned = s.replace(/[R$£€,\s]/g, "").replace(/[()]/g, "");
      const n = parseFloat(cleaned);
      return Number.isFinite(n) ? n : null;
    };
    let amount: number | null = null;
    if (amountIdx >= 0) amount = parseNum(cols[amountIdx] ?? "");
    if (amount === null && debitIdx >= 0) {
      const debit = parseNum(cols[debitIdx] ?? "");
      // If debit exists and amount is missing, skip (we only match deposits).
      if (debit !== null && debit > 0) continue;
    }
    if (amount === null) continue;
    if (amount <= 0) continue; // skip outflows; we only match deposits

    // Try ISO parse, fall back to dd/mm/yyyy or yyyy-mm-dd.
    let isoDate: string | null = null;
    if (dateStr) {
      const tryDate = new Date(dateStr);
      if (!Number.isNaN(tryDate.getTime())) {
        isoDate = tryDate.toISOString().slice(0, 10);
      } else {
        const m = dateStr.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
        if (m) {
          const d = m[1].padStart(2, "0");
          const mo = m[2].padStart(2, "0");
          let y = m[3];
          if (y.length === 2) y = "20" + y;
          isoDate = `${y}-${mo}-${d}`;
        }
      }
    }

    const haystack = `${desc} ${refRaw}`;
    const refMatch = haystack.match(QWK_REF_PATTERN);
    const reference = refMatch ? refMatch[0].toUpperCase() : refRaw.toUpperCase();

    const raw: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) raw[headers[j]] = cols[j] ?? "";

    rows.push({
      date: isoDate,
      description: desc,
      reference,
      amount_zar: Math.round(amount * 100) / 100,
      raw,
    });
  }

  return rows;
}

/**
 * Given parsed rows, look up matching invoices in the DB and decide
 * match status per row. Does NOT write to the DB; caller owns persistence.
 */
export async function buildMatches(
  sb: SupabaseClient,
  rows: ParsedRow[],
): Promise<ReconcileResult> {
  // Collect all candidate invoice numbers.
  const candidateNumbers = Array.from(
    new Set(
      rows
        .map(r => r.reference)
        .filter(r => QWK_REF_PATTERN.test(r))
        .map(r => r.toUpperCase()),
    ),
  );

  const invoicesByNumber = new Map<string, { id: string; total_zar: number; status: string }>();
  if (candidateNumbers.length > 0) {
    const invRes = await sb
      .from("qwikly_billing_invoices")
      .select("id, invoice_number, total_zar, status")
      .in("invoice_number", candidateNumbers);
    for (const inv of (invRes.data ?? []) as Array<{ id: string; invoice_number: string; total_zar: number; status: string }>) {
      invoicesByNumber.set(inv.invoice_number.toUpperCase(), {
        id: inv.id,
        total_zar: Number(inv.total_zar),
        status: inv.status,
      });
    }
  }

  const matches: ReconcileMatch[] = [];
  const seenInvoiceIds = new Set<string>();
  let total_rows = 0;
  let matched_rows = 0;
  let total_amount_zar = 0;
  let matched_amount_zar = 0;

  for (const row of rows) {
    total_rows++;
    total_amount_zar += row.amount_zar;

    const ref = row.reference.toUpperCase();
    const inv = QWK_REF_PATTERN.test(ref) ? invoicesByNumber.get(ref) : undefined;

    if (!inv) {
      matches.push({
        bank: row,
        invoice_id: null,
        invoice_number: null,
        invoice_total_zar: null,
        match_status: "no_invoice",
        notes: ref ? `Reference ${ref} not found in qwikly_billing_invoices.` : "No QWK reference detected on this row.",
      });
      continue;
    }

    if (seenInvoiceIds.has(inv.id)) {
      matches.push({
        bank: row,
        invoice_id: inv.id,
        invoice_number: ref,
        invoice_total_zar: inv.total_zar,
        match_status: "duplicate",
        notes: "Another row in this same upload already matched this invoice.",
      });
      continue;
    }

    if (Math.abs(inv.total_zar - row.amount_zar) > AMOUNT_TOLERANCE_ZAR) {
      matches.push({
        bank: row,
        invoice_id: inv.id,
        invoice_number: ref,
        invoice_total_zar: inv.total_zar,
        match_status: "amount_mismatch",
        notes: `Invoice total R${inv.total_zar.toFixed(2)} does not match deposit R${row.amount_zar.toFixed(2)}.`,
      });
      continue;
    }

    seenInvoiceIds.add(inv.id);
    matches.push({
      bank: row,
      invoice_id: inv.id,
      invoice_number: ref,
      invoice_total_zar: inv.total_zar,
      match_status: "matched",
      notes: null,
    });
    matched_rows++;
    matched_amount_zar += row.amount_zar;
  }

  return {
    matches,
    total_rows,
    matched_rows,
    unmatched_rows: total_rows - matched_rows,
    total_amount_zar: Math.round(total_amount_zar * 100) / 100,
    matched_amount_zar: Math.round(matched_amount_zar * 100) / 100,
  };
}

/**
 * Apply matches: mark every 'matched' invoice as paid + update its
 * billing period, and persist the run + per-row match audit rows.
 */
export async function applyReconcileResult(
  sb: SupabaseClient,
  result: ReconcileResult,
  args: { uploadedBy: string | null; filename: string; notes?: string | null },
): Promise<{ run_id: string }> {
  const runIns = await sb
    .from("bank_reconcile_runs")
    .insert({
      uploaded_by: args.uploadedBy,
      filename: args.filename,
      total_rows: result.total_rows,
      matched_rows: result.matched_rows,
      unmatched_rows: result.unmatched_rows,
      total_amount_zar: result.total_amount_zar,
      matched_amount_zar: result.matched_amount_zar,
      notes: args.notes ?? null,
    })
    .select("id")
    .single();
  if (runIns.error || !runIns.data) {
    throw new Error(`bank_reconcile_runs insert failed: ${runIns.error?.message}`);
  }
  const runId = runIns.data.id as string;

  const matchInserts = result.matches.map(m => ({
    run_id: runId,
    invoice_id: m.invoice_id,
    bank_date: m.bank.date,
    bank_amount_zar: m.bank.amount_zar,
    bank_reference: m.bank.reference || null,
    bank_description: m.bank.description || null,
    match_status: m.match_status,
    notes: m.notes,
  }));
  if (matchInserts.length > 0) {
    const mIns = await sb.from("bank_reconcile_matches").insert(matchInserts);
    if (mIns.error) {
      console.error("[bank-reconcile] match rows insert failed:", mIns.error.message);
    }
  }

  // Flip matched invoices to paid + sync their period rows.
  const nowIso = new Date().toISOString();
  for (const m of result.matches) {
    if (m.match_status !== "matched" || !m.invoice_id) continue;

    const upd = await sb
      .from("qwikly_billing_invoices")
      .update({
        status: "paid",
        paid_at: nowIso,
        payment_method: "eft",
        external_ref: m.bank.reference,
      })
      .eq("id", m.invoice_id)
      .select("period_id, total_zar")
      .single();
    if (upd.error || !upd.data) {
      console.error("[bank-reconcile] invoice paid update failed:", upd.error?.message);
      continue;
    }

    if (upd.data.period_id) {
      const pUpd = await sb
        .from("qwikly_billing_periods")
        .update({
          status: "paid",
          paid_at: nowIso,
          total_paid_zar: upd.data.total_zar,
        })
        .eq("id", upd.data.period_id);
      if (pUpd.error) {
        console.error("[bank-reconcile] period paid update failed:", pUpd.error.message);
      }
    }
  }

  return { run_id: runId };
}
