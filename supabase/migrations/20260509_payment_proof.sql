-- Add proof-of-payment fields to qwikly_billing_invoices.
-- proof_storage_path is the path inside Supabase Storage bucket "payment-proofs"
-- (we store under {invoice_id}/{filename} so deletion is trivial when invoice
-- is removed). proof_uploaded_at lets the admin sort awaiting-verification by
-- recency.
--
-- ACTION REQUIRED: Create the "payment-proofs" bucket in Supabase Storage
-- (Dashboard → Storage → New bucket). Set it to private (no public read).
-- This migration does NOT create the bucket — that must be done manually.

BEGIN;

ALTER TABLE qwikly_billing_invoices
  ADD COLUMN IF NOT EXISTS proof_storage_path text;

ALTER TABLE qwikly_billing_invoices
  ADD COLUMN IF NOT EXISTS proof_uploaded_at timestamptz;

ALTER TABLE qwikly_billing_invoices
  ADD COLUMN IF NOT EXISTS proof_mime_type text;

CREATE INDEX IF NOT EXISTS idx_qbi_proof_uploaded
  ON qwikly_billing_invoices(proof_uploaded_at)
  WHERE proof_uploaded_at IS NOT NULL;

COMMIT;
