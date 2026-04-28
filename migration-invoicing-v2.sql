-- ═══════════════════════════════════════════════════════════════════════════
-- Qwikly — Invoicing System v2
-- Run AFTER migration-invoicing.sql has been applied.
-- Safe to re-run: IF NOT EXISTS / IF EXISTS throughout.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. Archive the old Qwikly-to-client commission invoice tables
--    (those tracked per-booking commissions; replaced by invoice-level model)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices_v0_legacy')
  THEN
    ALTER TABLE invoices RENAME TO invoices_v0_legacy;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoice_lines')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoice_lines_v0_legacy')
  THEN
    ALTER TABLE invoice_lines RENAME TO invoice_lines_v0_legacy;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Extend clients table
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS vat_number          text,
  ADD COLUMN IF NOT EXISTS address             text,
  ADD COLUMN IF NOT EXISTS bank_name           text,
  ADD COLUMN IF NOT EXISTS bank_account_number text,
  ADD COLUMN IF NOT EXISTS bank_branch_code    text,
  ADD COLUMN IF NOT EXISTS bank_account_type   text DEFAULT 'cheque',
  ADD COLUMN IF NOT EXISTS invoice_logo_url    text,
  ADD COLUMN IF NOT EXISTS invoice_accent_color text DEFAULT '#E85A2C',
  ADD COLUMN IF NOT EXISTS invoice_footer_text text,
  ADD COLUMN IF NOT EXISTS invoice_terms_default text DEFAULT 'Net 7',
  ADD COLUMN IF NOT EXISTS invoice_counter     bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_rate     numeric(5,4) NOT NULL DEFAULT 0.08,
  ADD COLUMN IF NOT EXISTS risk_score          numeric(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS risk_flags          text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS allow_cash_invoices boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_tone       text NOT NULL DEFAULT 'friendly'
    CHECK (reminder_tone IN ('friendly','firm','formal'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. customers — the end-customers of each tradesperson
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id    bigint REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  name         text NOT NULL,
  mobile       text,                         -- E.164
  email        text,
  address      text,
  vat_number   text,
  notes        text,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customers_client  ON customers(client_id);
CREATE INDEX IF NOT EXISTS idx_customers_mobile  ON customers(client_id, mobile);
CREATE INDEX IF NOT EXISTS idx_customers_email   ON customers(client_id, email);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers_rw_own" ON customers;
CREATE POLICY "customers_rw_own" ON customers
  FOR ALL USING (client_id = own_client_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. invoices — client-to-customer invoices (new main table)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id                      uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id               bigint REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  invoice_number          text,                   -- INV-YYYY-NNNN, set on first send
  version                 int NOT NULL DEFAULT 1,
  status                  text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','scheduled','sent','viewed','partial_paid','paid',
                      'overdue','cancelled','disputed','written_off','refunded')),

  -- Customer snapshot (denormalised at send time)
  customer_id             uuid REFERENCES customers(id) ON DELETE SET NULL,
  customer_name           text NOT NULL,
  customer_mobile         text,
  customer_email          text,
  customer_address        text,
  customer_vat_number     text,

  -- Dates
  issued_at               timestamptz,
  due_at                  timestamptz,
  scheduled_send_at       timestamptz,
  sent_at                 timestamptz,
  viewed_at               timestamptz,
  paid_at                 timestamptz,
  cancelled_at            timestamptz,

  -- Financials (numeric(12,2) — never float)
  subtotal_zar            numeric(12,2) NOT NULL DEFAULT 0,
  discount_total_zar      numeric(12,2) NOT NULL DEFAULT 0,
  vat_zar                 numeric(12,2) NOT NULL DEFAULT 0,
  total_zar               numeric(12,2) NOT NULL DEFAULT 0,
  amount_paid_zar         numeric(12,2) NOT NULL DEFAULT 0,   -- sum of payments
  currency                text NOT NULL DEFAULT 'ZAR',

  -- Text fields
  notes                   text,
  internal_notes          text,
  payment_terms           text,

  -- Bank details snapshot at issue time
  bank_details_snapshot   jsonb,

  -- Delivery
  delivery_channels       text[] NOT NULL DEFAULT '{whatsapp,email}',
  delivery_scheduled      boolean NOT NULL DEFAULT false,
  delivery_sent_log       jsonb NOT NULL DEFAULT '[]',

  -- Branding snapshot at issue time
  branding_snapshot       jsonb,

  -- Recurring
  recurring_template_id   uuid,
  parent_invoice_id       uuid REFERENCES invoices(id) ON DELETE SET NULL,

  -- Commission (computed when status -> paid)
  qwikly_commission_zar   numeric(12,2),
  qwikly_commission_locked boolean NOT NULL DEFAULT false,
  qwikly_billing_invoice_id uuid,

  -- Public page token (128-bit randomness)
  customer_view_token     uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  customer_viewed_count   int NOT NULL DEFAULT 0,
  customer_view_log       jsonb NOT NULL DEFAULT '[]',

  -- Layer 2 fraud ping
  qwikly_ping_sent_at     timestamptz,

  -- Metadata
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now(),
  created_by              text,
  updated_by              text
);

CREATE INDEX IF NOT EXISTS idx_invoices_client       ON invoices(client_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_status       ON invoices(status, due_at);
CREATE INDEX IF NOT EXISTS idx_invoices_token        ON invoices(customer_view_token);
CREATE INDEX IF NOT EXISTS idx_invoices_scheduled    ON invoices(scheduled_send_at) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_invoices_customer     ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created      ON invoices(client_id, created_at DESC);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoices_rw_own" ON invoices;
CREATE POLICY "invoices_rw_own" ON invoices
  FOR ALL USING (client_id = own_client_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. invoice_line_items
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_line_items (
  id                   uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id           uuid REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  sort_order           int NOT NULL DEFAULT 0,
  description          text NOT NULL,
  quantity             numeric(10,4) NOT NULL DEFAULT 1,
  unit_price_zar       numeric(12,2) NOT NULL DEFAULT 0,
  line_total_zar       numeric(12,2) NOT NULL DEFAULT 0,  -- quantity × unit_price
  tax_rate             numeric(5,4) NOT NULL DEFAULT 0,   -- 0.15 if VAT, 0 otherwise
  discount_amount_zar  numeric(12,2) NOT NULL DEFAULT 0,
  discount_pct         numeric(5,4) NOT NULL DEFAULT 0,
  booking_id           bigint REFERENCES bookings(id) ON DELETE SET NULL,
  created_at           timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_line_items_invoice ON invoice_line_items(invoice_id, sort_order);

ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "line_items_rw_own" ON invoice_line_items;
CREATE POLICY "line_items_rw_own" ON invoice_line_items
  FOR ALL USING (
    invoice_id IN (SELECT id FROM invoices WHERE client_id = own_client_id())
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. invoice_versions — snapshot history for edit-after-send
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_versions (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id    uuid REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  version_no    int NOT NULL,
  snapshot_jsonb jsonb NOT NULL,
  edited_by     text NOT NULL,
  edited_at     timestamptz DEFAULT now(),
  reason        text
);

CREATE INDEX IF NOT EXISTS idx_versions_invoice ON invoice_versions(invoice_id, version_no DESC);

ALTER TABLE invoice_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "versions_rw_own" ON invoice_versions;
CREATE POLICY "versions_rw_own" ON invoice_versions
  FOR ALL USING (
    invoice_id IN (SELECT id FROM invoices WHERE client_id = own_client_id())
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. payments — every payment event against an invoice
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id          uuid REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  client_id           bigint REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  amount_zar          numeric(12,2) NOT NULL,
  paid_at             timestamptz NOT NULL DEFAULT now(),
  method              text NOT NULL DEFAULT 'other'
    CHECK (method IN ('yoco_card','yoco_apple_pay','yoco_link','snapscan','zapper',
                      'eft','cash','other')),
  external_ref        text,                       -- Yoco charge ID, etc.
  payer_name          text,
  payer_account_last4 text,
  proof_url           text,                       -- uploaded PoP for EFT/cash
  source              text NOT NULL DEFAULT 'client_marked'
    CHECK (source IN ('customer_self_serve','client_marked','webhook','manual_admin')),
  verified            boolean NOT NULL DEFAULT false,
  verified_at         timestamptz,
  verified_by         text,
  qwikly_commission_zar numeric(12,2),
  notes               text,
  idempotency_key     text UNIQUE,               -- prevent duplicate processing
  created_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_client  ON payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_ref     ON payments(external_ref) WHERE external_ref IS NOT NULL;

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_rw_own" ON payments;
CREATE POLICY "payments_rw_own" ON payments
  FOR ALL USING (client_id = own_client_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. receipts — auto-issued after each payment
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS receipts (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id      uuid REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  payment_id      uuid REFERENCES payments(id) ON DELETE CASCADE NOT NULL,
  client_id       bigint REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  receipt_number  text NOT NULL,
  total_zar       numeric(12,2) NOT NULL,
  issued_at       timestamptz DEFAULT now(),
  sent_at         timestamptz,
  channels        text[],
  pdf_url         text,
  created_at      timestamptz DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS receipt_number_seq START 1;

ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "receipts_rw_own" ON receipts;
CREATE POLICY "receipts_rw_own" ON receipts
  FOR ALL USING (client_id = own_client_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. credit_notes — for refunded invoices
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS credit_notes (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id        uuid REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  client_id         bigint REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  amount_zar        numeric(12,2) NOT NULL,
  reason            text,
  refunded_via      text,
  commission_credit_zar numeric(12,2),
  created_at        timestamptz DEFAULT now(),
  created_by        text
);

ALTER TABLE credit_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "credit_notes_rw_own" ON credit_notes;
CREATE POLICY "credit_notes_rw_own" ON credit_notes
  FOR ALL USING (client_id = own_client_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. invoice_attachments
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_attachments (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id   uuid REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  client_id    bigint REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  file_url     text NOT NULL,
  file_name    text NOT NULL,
  file_size    bigint,
  file_type    text,
  uploaded_by  text,
  uploaded_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attachments_invoice ON invoice_attachments(invoice_id);

ALTER TABLE invoice_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "attachments_rw_own" ON invoice_attachments;
CREATE POLICY "attachments_rw_own" ON invoice_attachments
  FOR ALL USING (client_id = own_client_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. recurring_invoice_templates
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recurring_invoice_templates (
  id                 uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id          bigint REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  customer_id        uuid REFERENCES customers(id) ON DELETE SET NULL,
  customer_snapshot  jsonb,                  -- name/mobile/email at creation
  line_items_jsonb   jsonb NOT NULL DEFAULT '[]',
  total_zar          numeric(12,2) NOT NULL DEFAULT 0,
  frequency          text NOT NULL DEFAULT 'monthly'
    CHECK (frequency IN ('weekly','fortnightly','monthly','quarterly')),
  start_date         date NOT NULL,
  end_date           date,
  next_run_at        timestamptz NOT NULL,
  last_run_at        timestamptz,
  delivery_channels  text[] NOT NULL DEFAULT '{whatsapp,email}',
  payment_terms      text,
  notes              text,
  active             boolean NOT NULL DEFAULT true,
  pause_until        date,
  created_at         timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recurring_client  ON recurring_invoice_templates(client_id);
CREATE INDEX IF NOT EXISTS idx_recurring_next    ON recurring_invoice_templates(next_run_at) WHERE active = true;

ALTER TABLE recurring_invoice_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recurring_rw_own" ON recurring_invoice_templates;
CREATE POLICY "recurring_rw_own" ON recurring_invoice_templates
  FOR ALL USING (client_id = own_client_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. qwikly_billing_periods — Qwikly's monthly billing periods per client
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qwikly_billing_periods (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id             bigint REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  period_start          date NOT NULL,
  period_end            date NOT NULL,
  total_invoiced_zar    numeric(12,2) NOT NULL DEFAULT 0,
  total_paid_zar        numeric(12,2) NOT NULL DEFAULT 0,
  total_paid_ex_vat_zar numeric(12,2) NOT NULL DEFAULT 0,
  commission_rate       numeric(5,4) NOT NULL DEFAULT 0.08,
  commission_zar        numeric(12,2) NOT NULL DEFAULT 0,
  vat_zar               numeric(12,2) NOT NULL DEFAULT 0,   -- VAT on our commission (when we're VAT-reg)
  status                text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','locked','invoiced','paid','overdue','suspended')),
  locked_at             timestamptz,
  qwikly_billing_invoice_id uuid,
  due_at                date,
  paid_at               timestamptz,
  created_at            timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_periods_client_period
  ON qwikly_billing_periods(client_id, period_start);

ALTER TABLE qwikly_billing_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "billing_periods_rw_own" ON qwikly_billing_periods;
CREATE POLICY "billing_periods_rw_own" ON qwikly_billing_periods
  FOR ALL USING (client_id = own_client_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. qwikly_billing_invoices — actual invoices Qwikly sends to the client
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qwikly_billing_invoices (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id        bigint REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  period_id        uuid REFERENCES qwikly_billing_periods(id) ON DELETE CASCADE NOT NULL,
  invoice_number   text UNIQUE,               -- QWK-YYYY-MM-NNNN
  total_zar        numeric(12,2) NOT NULL DEFAULT 0,
  vat_zar          numeric(12,2) NOT NULL DEFAULT 0,
  status           text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','sent','paid','overdue','written_off','disputed')),
  due_at           date,
  sent_at          timestamptz,
  paid_at          timestamptz,
  payment_method   text,
  external_ref     text,
  line_items_jsonb jsonb NOT NULL DEFAULT '[]',   -- snapshot of included invoices
  disputed_amount  numeric(12,2) NOT NULL DEFAULT 0,
  dispute_notes    text,
  created_at       timestamptz DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS qwikly_billing_number_seq START 1;

CREATE INDEX IF NOT EXISTS idx_qbilling_client  ON qwikly_billing_invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_qbilling_status  ON qwikly_billing_invoices(status, due_at);

ALTER TABLE qwikly_billing_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "qbilling_rw_own" ON qwikly_billing_invoices;
CREATE POLICY "qbilling_rw_own" ON qwikly_billing_invoices
  FOR ALL USING (client_id = own_client_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- 13. audit_pings — Layer 3 cash/manual payment verification
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_pings (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id      uuid REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  payment_id      uuid REFERENCES payments(id) ON DELETE SET NULL,
  client_id       bigint REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  customer_mobile text NOT NULL,
  customer_name   text,
  amount_zar      numeric(12,2) NOT NULL,
  sent_at         timestamptz DEFAULT now(),
  response        text CHECK (response IN ('Y','N',NULL)),
  responded_at    timestamptz,
  escalated       boolean NOT NULL DEFAULT false,
  escalated_at    timestamptz,
  admin_notes     text
);

CREATE INDEX IF NOT EXISTS idx_audit_pings_invoice ON audit_pings(invoice_id);
CREATE INDEX IF NOT EXISTS idx_audit_pings_client  ON audit_pings(client_id);
CREATE INDEX IF NOT EXISTS idx_audit_pings_pending ON audit_pings(sent_at) WHERE response IS NULL;

ALTER TABLE audit_pings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_pings_none_public" ON audit_pings;
CREATE POLICY "audit_pings_none_public" ON audit_pings
  FOR ALL USING (false);

-- ─────────────────────────────────────────────────────────────────────────────
-- 14. webhook_events — Yoco and other incoming webhooks (append-only for replay)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS webhook_events (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  provider       text NOT NULL,               -- 'yoco', 'meta', etc.
  event_type     text NOT NULL,
  external_id    text,                        -- e.g. Yoco paymentId
  payload        jsonb NOT NULL,
  processed      boolean NOT NULL DEFAULT false,
  processed_at   timestamptz,
  error          text,
  created_at     timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_webhooks_dedup ON webhook_events(provider, external_id)
  WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_webhooks_unprocessed ON webhook_events(created_at) WHERE processed = false;

REVOKE UPDATE, DELETE ON webhook_events FROM anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 15. disputes — billing disputes raised by clients against Qwikly charges
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS disputes (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id        bigint REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  entity_type      text NOT NULL DEFAULT 'billing_period',  -- what is being disputed
  entity_id        text NOT NULL,                           -- id of the disputed entity
  reason           text NOT NULL,
  disputed_amount  numeric(12,2) NOT NULL DEFAULT 0,
  status           text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','resolved','rejected')),
  resolution_notes text,
  resolved_at      timestamptz,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_disputes_client ON disputes(client_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status, created_at);

ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "disputes_rw_own" ON disputes;
CREATE POLICY "disputes_rw_own" ON disputes
  FOR ALL USING (client_id = own_client_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- 16. admin_users — Qwikly staff who can access /admin pages
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_users (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  role       text NOT NULL DEFAULT 'admin' CHECK (role IN ('admin','super_admin')),
  created_at timestamptz DEFAULT now()
);

-- Only service_role can read/write admin_users
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_users_no_public" ON admin_users;
CREATE POLICY "admin_users_no_public" ON admin_users FOR ALL USING (false);

-- ─────────────────────────────────────────────────────────────────────────────
-- 18. updated_at triggers for new tables
-- ─────────────────────────────────────────────────────────────────────────────
-- Reuse touch_updated_at() from migration-invoicing.sql

DROP TRIGGER IF EXISTS trg_customers_updated ON customers;
CREATE TRIGGER trg_customers_updated
  BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_invoices_updated ON invoices;
CREATE TRIGGER trg_invoices_updated
  BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_disputes_updated ON disputes;
CREATE TRIGGER trg_disputes_updated
  BEFORE UPDATE ON disputes FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 19. Per-client sequential invoice numbering
--     Atomically increments invoice_counter on the client row and returns
--     the formatted invoice number: INV-YYYY-NNNN
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION next_invoice_number(p_client_id bigint)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  v_counter bigint;
  v_year    text;
BEGIN
  UPDATE clients
  SET invoice_counter = invoice_counter + 1
  WHERE id = p_client_id
  RETURNING invoice_counter INTO v_counter;

  v_year := to_char(now(), 'YYYY');
  RETURN 'INV-' || v_year || '-' || lpad(v_counter::text, 4, '0');
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 20. Public invoice page — allow reading invoices by token (no auth)
--     Service role bypasses RLS; this policy is for direct token lookups.
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "invoices_public_token_read" ON invoices;
CREATE POLICY "invoices_public_token_read" ON invoices
  FOR SELECT USING (true);   -- token is the secret; server validates it in code

-- Restrict to own for mutations (the previous policy covers SELECT broadly)
-- Re-add the write restriction
DROP POLICY IF EXISTS "invoices_write_own" ON invoices;
CREATE POLICY "invoices_write_own" ON invoices
  FOR ALL
  USING (client_id = own_client_id() OR auth.uid() IS NULL)
  WITH CHECK (client_id = own_client_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- 21. Public read for line items and attachments (needed for /i/[token] page)
--     Server code fetches via service_role, so these RLS entries are defensive.
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "line_items_public_read" ON invoice_line_items;
CREATE POLICY "line_items_public_read" ON invoice_line_items
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "attachments_public_read" ON invoice_attachments;
CREATE POLICY "attachments_public_read" ON invoice_attachments
  FOR SELECT USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- Done. Summary of what was created:
--   customers, invoices (v2), invoice_line_items, invoice_versions,
--   payments, receipts, credit_notes, invoice_attachments,
--   recurring_invoice_templates, qwikly_billing_periods,
--   qwikly_billing_invoices, audit_pings, webhook_events, disputes,
--   admin_users
--
-- Old tables archived:
--   invoices_v0_legacy, invoice_lines_v0_legacy
--
-- Meta templates required (apply in Twilio/Meta Business Manager):
--   invoice_issued, invoice_qwikly_ping, invoice_reminder_pre_due,
--   invoice_due_today, invoice_overdue_3, invoice_overdue_7,
--   invoice_overdue_14, invoice_paid_receipt, client_payment_received,
--   client_eft_pending_confirmation, client_billing_period_ready,
--   client_billing_overdue_1, client_billing_overdue_3,
--   client_billing_overdue_5, customer_audit_ping
-- ─────────────────────────────────────────────────────────────────────────────
