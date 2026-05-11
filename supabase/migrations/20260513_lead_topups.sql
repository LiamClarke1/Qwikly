-- 20260513_lead_topups.sql
--
-- Per-tenant lead-pack purchases. Each row decrements as leads are captured
-- (FIFO oldest non-expired pack first). Expired packs are ignored by the
-- capture logic but kept for the audit trail.
--
-- Idempotent. Safe to re-run.

CREATE TABLE IF NOT EXISTS lead_topups (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           BIGINT       NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  subscription_id     BIGINT       REFERENCES subscriptions(id) ON DELETE SET NULL,
  leads_purchased     INT          NOT NULL CHECK (leads_purchased > 0),
  zar_cents_paid      INT          NOT NULL,
  leads_remaining     INT          NOT NULL CHECK (leads_remaining >= 0),
  expires_at          TIMESTAMPTZ  NOT NULL,
  payfast_payment_id  UUID         REFERENCES payfast_payments(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_topups_client_active
  ON lead_topups (client_id, created_at)
  WHERE leads_remaining > 0;

ALTER TABLE lead_topups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lead_topups_owner_read ON lead_topups;
CREATE POLICY lead_topups_owner_read ON lead_topups
  FOR SELECT
  USING (client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid()::text));

COMMENT ON TABLE lead_topups IS 'Lead-pack purchases. FIFO drain. Expires at subscription period end.';
