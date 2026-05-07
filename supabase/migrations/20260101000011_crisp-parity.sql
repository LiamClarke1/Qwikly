-- Qwikly site, Crisp-parity feature tables
-- Adds: contacts (CRM), campaigns, kb_articles, automations
-- Run in Supabase SQL editor, safe to re-run

-- ────────────────────────────────────────────────────────────
-- 1. Contacts
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contacts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id bigint REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  name text,
  phone text,
  email text,
  tags text[] DEFAULT '{}',
  notes text,
  source text,
  lifecycle_stage text DEFAULT 'lead',
  lifetime_value numeric(12,2) DEFAULT 0,
  total_bookings integer DEFAULT 0,
  last_booking_at timestamptz,
  last_contact_at timestamptz,
  first_seen_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (client_id, phone)
);

CREATE INDEX IF NOT EXISTS idx_contacts_client ON contacts(client_id);

-- ────────────────────────────────────────────────────────────
-- 2. Campaigns
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaigns (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id bigint REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  goal text NOT NULL DEFAULT 'broadcast',
  channel text NOT NULL DEFAULT 'whatsapp',
  status text NOT NULL DEFAULT 'draft',
  message_body text NOT NULL,
  audience_filter jsonb DEFAULT '{}',
  audience_count integer DEFAULT 0,
  scheduled_at timestamptz,
  sent_at timestamptz,
  sent_count integer DEFAULT 0,
  delivered_count integer DEFAULT 0,
  reply_count integer DEFAULT 0,
  booked_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_client ON campaigns(client_id);

CREATE TABLE IF NOT EXISTS campaign_recipients (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
  phone text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  error text,
  sent_at timestamptz,
  delivered_at timestamptz,
  replied_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 3. Knowledge Base
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kb_articles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id bigint REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  is_active boolean DEFAULT true,
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kb_client ON kb_articles(client_id);

-- ────────────────────────────────────────────────────────────
-- 4. Automations
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS automations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id bigint REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  trigger_type text NOT NULL,
  trigger_config jsonb DEFAULT '{}',
  action_type text NOT NULL,
  action_config jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  last_fired_at timestamptz,
  fire_count integer DEFAULT 0,
  success_count integer DEFAULT 0,
  error_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automations_client ON automations(client_id);

-- ────────────────────────────────────────────────────────────
-- 5. RLS
-- ────────────────────────────────────────────────────────────
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contacts_rw_own" ON contacts;
CREATE POLICY "contacts_rw_own" ON contacts
  FOR ALL USING (client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid()::text));

DROP POLICY IF EXISTS "campaigns_rw_own" ON campaigns;
CREATE POLICY "campaigns_rw_own" ON campaigns
  FOR ALL USING (client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid()::text));

DROP POLICY IF EXISTS "campaign_recipients_rw_own" ON campaign_recipients;
CREATE POLICY "campaign_recipients_rw_own" ON campaign_recipients
  FOR ALL USING (campaign_id IN (SELECT id FROM campaigns WHERE client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid()::text)));

DROP POLICY IF EXISTS "kb_rw_own" ON kb_articles;
CREATE POLICY "kb_rw_own" ON kb_articles
  FOR ALL USING (client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid()::text));

DROP POLICY IF EXISTS "automations_rw_own" ON automations;
CREATE POLICY "automations_rw_own" ON automations
  FOR ALL USING (client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid()::text));

-- ────────────────────────────────────────────────────────────
-- 6. Auto-upsert contacts from conversations
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_upsert_contact_from_conversation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO contacts (client_id, phone, name, source, last_contact_at)
  VALUES (NEW.client_id, NEW.customer_phone, NEW.customer_name, 'whatsapp', NEW.updated_at)
  ON CONFLICT (client_id, phone) DO UPDATE
    SET name = COALESCE(EXCLUDED.name, contacts.name),
        last_contact_at = EXCLUDED.last_contact_at,
        updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_conversation_upsert_contact ON conversations;
CREATE TRIGGER trg_conversation_upsert_contact
  AFTER INSERT OR UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION fn_upsert_contact_from_conversation();

-- ────────────────────────────────────────────────────────────
-- 7. Update contact totals when bookings change
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_update_contact_bookings()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE contacts SET
    total_bookings = (SELECT count(*) FROM bookings WHERE client_id = NEW.client_id AND customer_phone = NEW.customer_phone),
    last_booking_at = NEW.booking_datetime,
    lifecycle_stage = CASE WHEN lifecycle_stage = 'lead' THEN 'customer' ELSE lifecycle_stage END,
    updated_at = now()
  WHERE client_id = NEW.client_id AND phone = NEW.customer_phone;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_booking_update_contact ON bookings;
CREATE TRIGGER trg_booking_update_contact
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION fn_update_contact_bookings();
