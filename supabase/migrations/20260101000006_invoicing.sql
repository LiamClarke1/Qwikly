-- ═══════════════════════════════════════════════════════════════════════════
-- Qwikly — Invoicing, Commission & Audit Schema
-- Run in Supabase SQL editor (safe to re-run: IF NOT EXISTS throughout)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. Clients table extensions needed for billing
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS billing_email       text,
  ADD COLUMN IF NOT EXISTS billing_active      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_ends_at       timestamptz,
  ADD COLUMN IF NOT EXISTS plan                text NOT NULL DEFAULT 'pay_per_booking',
  ADD COLUMN IF NOT EXISTS status              text NOT NULL DEFAULT 'trial'
    CHECK (status IN ('trial','active','paused','churned','archived')),
  ADD COLUMN IF NOT EXISTS payment_method_token text,
  ADD COLUMN IF NOT EXISTS payment_provider    text;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Extend bookings with pricing and commission fields
--    The existing bookings table has: id, client_id, customer_phone, job_type,
--    area, booking_datetime, status, created_at, updated_at
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS quoted_price_zar   numeric(10,2),
  ADD COLUMN IF NOT EXISTS final_price_zar    numeric(10,2),
  ADD COLUMN IF NOT EXISTS service_name       text,
  ADD COLUMN IF NOT EXISTS cancelled_at       timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at       timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS payment_received_zar numeric(10,2),
  ADD COLUMN IF NOT EXISTS payment_method     text
    CHECK (payment_method IN ('eft','card','cash','yoco_terminal','snapscan','other',NULL)),
  ADD COLUMN IF NOT EXISTS payment_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS fraud_check_sent   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fraud_check_response text;

-- Status constraint on existing column (add without breaking existing rows)
-- Existing values: 'booked' | 'completed' | 'cancelled' | 'no-show' — all valid
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('booked','completed','no_show','cancelled','disputed'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. commissions
--    One row per booking. amount_zar is computed from the effective price.
--    Generated column handles the 8% / R150 min / R5,000 max rule.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS commissions (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id  bigint REFERENCES bookings(id) ON DELETE CASCADE NOT NULL UNIQUE,
  client_id   bigint REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  -- effective_price: final_price_zar if set, otherwise quoted_price_zar
  -- We store it separately so the generated column can reference a single column.
  effective_price_zar numeric(10,2) NOT NULL,
  amount_zar  numeric(10,2) GENERATED ALWAYS AS (
    LEAST(5000, GREATEST(150, ROUND(effective_price_zar * 0.080, 2)))
  ) STORED,
  status      text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','invoiced','paid','written_off','disputed')),
  invoice_id  uuid,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commissions_client    ON commissions(client_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status    ON commissions(status);
CREATE INDEX IF NOT EXISTS idx_commissions_invoice   ON commissions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_commissions_booking   ON commissions(booking_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. invoices
--    Weekly batches. Cron generates draft Sunday 23:59, emails Monday 08:00.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id        bigint REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  invoice_number   text UNIQUE,   -- e.g. QWK-2026-0042
  period_start     date NOT NULL,
  period_end       date NOT NULL,
  subtotal_zar     numeric(10,2) NOT NULL DEFAULT 0,
  vat_zar          numeric(10,2) NOT NULL DEFAULT 0,   -- 0 until VAT registered
  total_zar        numeric(10,2) NOT NULL DEFAULT 0,
  status           text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','sent','paid','overdue','written_off')),
  sent_at          timestamptz,
  due_at           timestamptz,
  paid_at          timestamptz,
  payment_method   text,
  external_charge_ref text,       -- Yoco / Stripe charge ID
  payment_provider text,          -- 'yoco' | 'stripe' | 'manual'
  notes            text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_client   ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status   ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_period   ON invoices(period_end DESC);

-- Sequence for human-readable invoice numbers
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;

-- Function to generate invoice number on insert
CREATE OR REPLACE FUNCTION set_invoice_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.invoice_number IS NULL THEN
    NEW.invoice_number := 'QWK-' || to_char(now(), 'YYYY') || '-'
      || lpad(nextval('invoice_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_invoice_number ON invoices;
CREATE TRIGGER trg_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW EXECUTE FUNCTION set_invoice_number();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. invoice_lines
--    One row per commission included in an invoice.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_lines (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id   uuid REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  commission_id uuid REFERENCES commissions(id) ON DELETE CASCADE,
  booking_id   bigint REFERENCES bookings(id) ON DELETE SET NULL,
  amount_zar   numeric(10,2) NOT NULL,
  description  text NOT NULL,
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice ON invoice_lines(invoice_id);

-- Forward reference: commissions.invoice_id → invoices.id
ALTER TABLE commissions
  ADD CONSTRAINT fk_commissions_invoice
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL
  NOT VALID;   -- NOT VALID so it doesn't scan existing rows

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. support_messages
--    Contact form submissions (public endpoint, no auth required)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS support_messages (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name       text NOT NULL,
  email      text NOT NULL,
  phone      text,
  subject    text NOT NULL,
  message    text NOT NULL,
  resolved   boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_messages_created ON support_messages(created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. audit_events
--    Append-only. POPIA s.19 evidence. App role cannot UPDATE or DELETE.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_events (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id    text,               -- auth.uid() or 'system' or 'cron'
  actor_type  text NOT NULL DEFAULT 'user'
    CHECK (actor_type IN ('user','staff','system','cron')),
  event_type  text NOT NULL,      -- 'login', 'booking.status_changed', etc.
  entity_type text,               -- 'booking', 'invoice', 'client', etc.
  entity_id   text,
  payload     jsonb,
  ip          inet,
  user_agent  text,
  created_at  timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_actor      ON audit_events(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity     ON audit_events(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_event_type ON audit_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_created    ON audit_events(created_at DESC);

-- Revoke mutating permissions from the anon + authenticated roles.
-- The app inserts via service_role for audit logging.
REVOKE UPDATE, DELETE ON audit_events FROM anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. updated_at triggers (reuse pattern already in codebase)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_commissions_updated ON commissions;
CREATE TRIGGER trg_commissions_updated
  BEFORE UPDATE ON commissions FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_invoices_updated ON invoices;
CREATE TRIGGER trg_invoices_updated
  BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Row Level Security
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE commissions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices          ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_lines     ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages  ENABLE ROW LEVEL SECURITY;

-- Helper: map auth.uid() → client id
CREATE OR REPLACE FUNCTION own_client_id()
RETURNS bigint LANGUAGE sql STABLE AS $$
  SELECT id FROM clients WHERE auth_user_id = auth.uid()::text LIMIT 1;
$$;

-- Commissions: clients see only their own
DROP POLICY IF EXISTS "commissions_rw_own" ON commissions;
CREATE POLICY "commissions_rw_own" ON commissions
  FOR ALL USING (client_id = own_client_id());

-- Invoices: clients see only their own
DROP POLICY IF EXISTS "invoices_rw_own" ON invoices;
CREATE POLICY "invoices_rw_own" ON invoices
  FOR ALL USING (client_id = own_client_id());

-- Invoice lines: access via parent invoice
DROP POLICY IF EXISTS "invoice_lines_rw_own" ON invoice_lines;
CREATE POLICY "invoice_lines_rw_own" ON invoice_lines
  FOR ALL USING (
    invoice_id IN (SELECT id FROM invoices WHERE client_id = own_client_id())
  );

-- Audit events: no direct client access (staff + service_role only)
-- authenticated users get no rows; staff impersonation goes via service_role
DROP POLICY IF EXISTS "audit_events_none" ON audit_events;
CREATE POLICY "audit_events_none" ON audit_events
  FOR ALL USING (false);

-- Support messages: insert-only from anon (contact form), no read from public
DROP POLICY IF EXISTS "support_messages_insert" ON support_messages;
CREATE POLICY "support_messages_insert" ON support_messages
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "support_messages_no_read" ON support_messages;
CREATE POLICY "support_messages_no_read" ON support_messages
  FOR SELECT USING (false);
