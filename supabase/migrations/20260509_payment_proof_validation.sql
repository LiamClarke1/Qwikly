-- Add columns for AI-validated proof of payment results.
-- proof_validation_status: pending (not yet checked), verified (looks legit and
--   amount matches), mismatch (looks like a payment but amount/reference is off),
--   invalid (doesn't look like a payment proof at all), error (validator failed
--   to run, admin should fall back to manual review).
-- proof_validation_extracted: structured JSON the validator pulled out of the
--   image/PDF (amount, date, reference, recipient, bank_name).
-- proof_validation_notes: free-text notes from the validator explaining its
--   verdict, surfaced to the admin in the Pipeline UI.
-- proof_validated_at: when validation last ran (separate from proof_uploaded_at
--   so the admin can re-run validation later if Claude is updated).

BEGIN;

ALTER TABLE qwikly_billing_invoices
  ADD COLUMN IF NOT EXISTS proof_validation_status text
    CHECK (proof_validation_status IN ('pending','verified','mismatch','invalid','error'));

ALTER TABLE qwikly_billing_invoices
  ADD COLUMN IF NOT EXISTS proof_validation_extracted jsonb;

ALTER TABLE qwikly_billing_invoices
  ADD COLUMN IF NOT EXISTS proof_validation_notes text;

ALTER TABLE qwikly_billing_invoices
  ADD COLUMN IF NOT EXISTS proof_validated_at timestamptz;

COMMIT;
