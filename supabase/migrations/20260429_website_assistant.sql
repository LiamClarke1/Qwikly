-- Migration: 20260429_website_assistant.sql
-- Adds web_chat channel support and website widget configuration

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'whatsapp'
    CHECK (channel IN ('whatsapp', 'email', 'web_chat'));
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS visitor_id TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS page_url TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS referrer TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS utm_source TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS utm_medium TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_conversations_channel ON conversations(channel);

ALTER TABLE clients ADD COLUMN IF NOT EXISTS web_widget_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS web_widget_domain TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS web_widget_color TEXT DEFAULT '#E85A2C';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS web_widget_greeting TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS web_widget_position TEXT DEFAULT 'bottom-right'
    CHECK (web_widget_position IN ('bottom-right', 'bottom-left'));
ALTER TABLE clients ADD COLUMN IF NOT EXISTS web_widget_launcher_label TEXT DEFAULT 'Message us';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS web_widget_status TEXT DEFAULT 'pending'
    CHECK (web_widget_status IN ('pending', 'verified', 'disconnected'));
ALTER TABLE clients ADD COLUMN IF NOT EXISTS web_widget_verified_at TIMESTAMPTZ;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS web_widget_last_seen_at TIMESTAMPTZ;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS web_widget_domain_whitelist TEXT;

ALTER TABLE clients ADD COLUMN IF NOT EXISTS onboarding_step INT DEFAULT 1;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

ALTER TABLE clients ADD COLUMN IF NOT EXISTS working_hours JSONB;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS after_hours_mode TEXT DEFAULT 'book_next_available'
    CHECK (after_hours_mode IN ('book_next_available', 'closed_message', 'always_open'));

CREATE TABLE IF NOT EXISTS web_widget_events (
  id BIGSERIAL PRIMARY KEY,
  client_id BIGINT REFERENCES clients(id),
  visitor_id TEXT,
  conversation_id BIGINT REFERENCES conversations(id),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'widget_loaded', 'launcher_opened', 'intake_started',
    'intake_submitted', 'first_message', 'slot_proposed',
    'slot_picked', 'booking_confirmed', 'conversation_ended', 'dropped'
  )),
  page_url TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_web_widget_events_client ON web_widget_events(client_id, created_at DESC);
