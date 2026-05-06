-- Migration: 20260506_contacts.sql
-- Creates the contacts table for the customer CRM and auto-syncs from conversations.

CREATE TABLE IF NOT EXISTS contacts (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         BIGINT      NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  phone             TEXT,
  name              TEXT,
  email             TEXT,
  tags              TEXT[]      NOT NULL DEFAULT '{}',
  notes             TEXT,
  lifecycle_stage   TEXT        NOT NULL DEFAULT 'lead'
                    CHECK (lifecycle_stage IN ('lead','prospect','customer','champion','dormant')),
  total_bookings    INTEGER     NOT NULL DEFAULT 0,
  last_booking_at   TIMESTAMPTZ,
  last_contact_at   TIMESTAMPTZ,
  source            TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, phone)
);

CREATE INDEX IF NOT EXISTS idx_contacts_client_phone ON contacts(client_id, phone);
CREATE INDEX IF NOT EXISTS idx_contacts_last_contact ON contacts(client_id, last_contact_at DESC NULLS LAST);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY contacts_owner_rw ON contacts
  FOR ALL USING (
    client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid()::text)
  );

-- Function: upsert a contact row whenever a conversation is created or updated.
CREATE OR REPLACE FUNCTION sync_contact_from_conversation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.customer_phone IS NULL THEN
    RETURN NEW;
  END IF;
  INSERT INTO contacts (client_id, phone, name, last_contact_at, source)
  VALUES (
    NEW.client_id,
    NEW.customer_phone,
    NEW.customer_name,
    COALESCE(NEW.updated_at, NEW.created_at),
    'whatsapp'
  )
  ON CONFLICT (client_id, phone) DO UPDATE SET
    name            = COALESCE(EXCLUDED.name, contacts.name),
    last_contact_at = GREATEST(contacts.last_contact_at, EXCLUDED.last_contact_at);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_contact_from_conversation
AFTER INSERT OR UPDATE OF customer_name, customer_phone, updated_at
ON conversations
FOR EACH ROW EXECUTE FUNCTION sync_contact_from_conversation();

-- Function: keep total_bookings + last_booking_at current.
CREATE OR REPLACE FUNCTION sync_contact_from_booking()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.customer_phone IS NULL THEN
    RETURN NEW;
  END IF;
  UPDATE contacts SET
    total_bookings  = (SELECT COUNT(*) FROM bookings WHERE client_id = NEW.client_id AND customer_phone = NEW.customer_phone),
    last_booking_at = (SELECT MAX(booking_datetime) FROM bookings WHERE client_id = NEW.client_id AND customer_phone = NEW.customer_phone)
  WHERE client_id = NEW.client_id AND phone = NEW.customer_phone;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_contact_from_booking
AFTER INSERT OR UPDATE ON bookings
FOR EACH ROW EXECUTE FUNCTION sync_contact_from_booking();

-- Back-fill contacts from existing conversations so the page isn't empty on first load.
INSERT INTO contacts (client_id, phone, name, last_contact_at, source)
SELECT DISTINCT ON (client_id, customer_phone)
  client_id,
  customer_phone,
  customer_name,
  GREATEST(updated_at, created_at),
  'whatsapp'
FROM conversations
WHERE customer_phone IS NOT NULL
ON CONFLICT (client_id, phone) DO UPDATE SET
  name            = COALESCE(EXCLUDED.name, contacts.name),
  last_contact_at = GREATEST(contacts.last_contact_at, EXCLUDED.last_contact_at);

-- Back-fill booking counts.
UPDATE contacts c SET
  total_bookings  = sub.cnt,
  last_booking_at = sub.last_at
FROM (
  SELECT client_id, customer_phone, COUNT(*) AS cnt, MAX(booking_datetime) AS last_at
  FROM bookings
  WHERE customer_phone IS NOT NULL
  GROUP BY client_id, customer_phone
) sub
WHERE c.client_id = sub.client_id AND c.phone = sub.customer_phone;
