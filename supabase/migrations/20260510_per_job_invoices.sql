-- Migration: 20260510_per_job_invoices.sql
-- Adds the optional Pay-per-job R350 add-on data layer.
--
-- - businesses.per_job_addon_enabled: tenant opt-in flag for the add-on
-- - businesses.per_job_rate_zar: per-job rate in ZAR (default 350)
-- - per_job_invoice_lines: one row per booking that triggers a billing event
--
-- Status flow: pending -> approved or disputed -> invoiced -> paid.
-- The 'waived' status is for tenant-credit / goodwill cases.
-- UNIQUE(booking_id) prevents double-billing for the same job.

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS per_job_addon_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS per_job_rate_zar INTEGER NOT NULL DEFAULT 350;

CREATE TABLE IF NOT EXISTS per_job_invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  booking_id BIGINT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount_zar INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','approved','disputed','invoiced','waived','paid')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  UNIQUE (booking_id)
);

CREATE INDEX IF NOT EXISTS per_job_invoice_lines_business_id_idx
  ON per_job_invoice_lines(business_id);
CREATE INDEX IF NOT EXISTS per_job_invoice_lines_status_idx
  ON per_job_invoice_lines(status);
CREATE INDEX IF NOT EXISTS per_job_invoice_lines_created_at_idx
  ON per_job_invoice_lines(created_at);

COMMENT ON TABLE per_job_invoice_lines IS 'One row per booking that triggered a pay-per-job billing event. status flow: pending -> approved or disputed -> invoiced -> paid. Default rate per business is per_job_rate_zar (default R350).';

-- Row level security: tenants can read their own lines; only the service role
-- (admin endpoints, server actions running with the service key) can write.
ALTER TABLE per_job_invoice_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owners_read_per_job_lines" ON per_job_invoice_lines;
CREATE POLICY "owners_read_per_job_lines" ON per_job_invoice_lines
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = per_job_invoice_lines.business_id
        AND b.user_id = auth.uid()
    )
  );
