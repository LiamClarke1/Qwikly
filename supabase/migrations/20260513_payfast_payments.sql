-- 20260513_payfast_payments.sql
--
-- Audit log + pending-payment tracker for every PayFast transaction.
-- Every checkout creates a 'pending' row; the ITN handler transitions to
-- 'captured', 'failed', 'cancelled', or 'refunded'.
--
-- pf_payment_id is UNIQUE to guarantee idempotency across PayFast's up-to-5
-- retries per ITN.
--
-- Idempotent. Safe to re-run.

CREATE TABLE IF NOT EXISTS payfast_payments (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           BIGINT       NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  subscription_id     BIGINT       REFERENCES subscriptions(id) ON DELETE SET NULL,
  m_payment_id        TEXT         NOT NULL,
  pf_payment_id       TEXT         UNIQUE,
  purpose             TEXT         NOT NULL CHECK (purpose IN (
                                     'subscription_setup',
                                     'subscription_renewal',
                                     'upgrade_proration',
                                     'topup_leads',
                                     'topup_ai_credit',
                                     'card_update'
                                   )),
  status              TEXT         NOT NULL DEFAULT 'pending'
                                   CHECK (status IN ('pending','captured','failed','cancelled','refunded')),
  amount_zar_cents    INT          NOT NULL,
  expected_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
  captured_at         TIMESTAMPTZ,
  refunded_at         TIMESTAMPTZ,
  raw_itn_payload     JSONB,
  invoice_pdf_url     TEXT,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payfast_payments_m_payment_id ON payfast_payments (m_payment_id);
CREATE INDEX IF NOT EXISTS idx_payfast_payments_client_created
  ON payfast_payments (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payfast_payments_pending_old
  ON payfast_payments (expected_at)
  WHERE status = 'pending';

ALTER TABLE payfast_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payfast_payments_owner_read ON payfast_payments;
CREATE POLICY payfast_payments_owner_read ON payfast_payments
  FOR SELECT
  USING (client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid()::text));

COMMENT ON TABLE  payfast_payments IS 'Every PayFast transaction Qwikly initiates: audit log + pending-payment tracker.';
COMMENT ON COLUMN payfast_payments.pf_payment_id IS 'PayFast reference, UNIQUE for idempotency across ITN retries.';
