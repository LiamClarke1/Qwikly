-- Bank statement reconciliation: audit trail of imports + per-row matches.
-- Lets admins upload a CSV from their bank, the system extracts QWK-* invoice
-- references and matches deposits to qwikly_billing_invoices by reference +
-- amount. Auto-flips matched invoices to paid. Audit-keeping so we can show
-- the admin what auto-paid and what needs manual handling.

BEGIN;

CREATE TABLE IF NOT EXISTS bank_reconcile_runs (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  uploaded_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  filename        text NOT NULL,
  total_rows      integer NOT NULL DEFAULT 0,
  matched_rows    integer NOT NULL DEFAULT 0,
  unmatched_rows  integer NOT NULL DEFAULT 0,
  total_amount_zar numeric(12,2) NOT NULL DEFAULT 0,
  matched_amount_zar numeric(12,2) NOT NULL DEFAULT 0,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bank_reconcile_matches (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id          uuid REFERENCES bank_reconcile_runs(id) ON DELETE CASCADE NOT NULL,
  invoice_id      uuid REFERENCES qwikly_billing_invoices(id) ON DELETE SET NULL,
  bank_date       date,
  bank_amount_zar numeric(12,2) NOT NULL,
  bank_reference  text,
  bank_description text,
  match_status    text NOT NULL CHECK (match_status IN ('matched','amount_mismatch','no_invoice','duplicate')),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bank_reconcile_matches_run ON bank_reconcile_matches(run_id);
CREATE INDEX IF NOT EXISTS idx_bank_reconcile_matches_invoice ON bank_reconcile_matches(invoice_id);

ALTER TABLE bank_reconcile_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_reconcile_matches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bank_reconcile_runs_no_public" ON bank_reconcile_runs;
CREATE POLICY "bank_reconcile_runs_no_public" ON bank_reconcile_runs FOR ALL USING (false);
DROP POLICY IF EXISTS "bank_reconcile_matches_no_public" ON bank_reconcile_matches;
CREATE POLICY "bank_reconcile_matches_no_public" ON bank_reconcile_matches FOR ALL USING (false);

COMMIT;
