-- Billing anchor tracker: per-client monthly invoice cycle
-- Adds anchor day to clients, awaiting_verification status to qwikly_billing_invoices,
-- and client-side self-confirmation fields.

BEGIN;

-- 1. Anchor day per client (manually set by admin after first paid invoice)
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS billing_anchor_day smallint
    CHECK (billing_anchor_day BETWEEN 1 AND 31);

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS billing_anchor_set_at timestamptz;

-- 2. New invoice status: client clicked "I've paid", admin not yet verified
ALTER TABLE qwikly_billing_invoices
  DROP CONSTRAINT IF EXISTS qwikly_billing_invoices_status_check;

ALTER TABLE qwikly_billing_invoices
  ADD CONSTRAINT qwikly_billing_invoices_status_check
  CHECK (status IN (
    'draft', 'sent', 'awaiting_verification',
    'paid', 'overdue', 'written_off', 'disputed'
  ));

-- 3. Track when client self-confirmed payment + their note
ALTER TABLE qwikly_billing_invoices
  ADD COLUMN IF NOT EXISTS client_marked_paid_at timestamptz;

ALTER TABLE qwikly_billing_invoices
  ADD COLUMN IF NOT EXISTS client_payment_note text;

-- 4. Index for cron lookups (fast filtering by anchor day)
CREATE INDEX IF NOT EXISTS idx_clients_billing_anchor_day
  ON clients(billing_anchor_day)
  WHERE billing_anchor_day IS NOT NULL;

COMMIT;
