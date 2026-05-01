-- Migration: 20260430_email_comms.sql
-- Adds email sequences, email link tracking tables

-- ── Email Sequences ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS email_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL DEFAULT 'manual'
    CHECK (trigger_type IN ('lead_captured', 'conversation_closed', 'inactivity_7d', 'inactivity_14d', 'manual')),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_sequences_client ON email_sequences(client_id);
CREATE INDEX IF NOT EXISTS idx_email_sequences_status ON email_sequences(client_id, status);

-- ── Sequence Steps ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS email_sequence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES email_sequences(id) ON DELETE CASCADE,
  position INT NOT NULL DEFAULT 0,
  delay_hours INT NOT NULL DEFAULT 24,
  subject TEXT NOT NULL,
  heading TEXT,
  body TEXT NOT NULL DEFAULT '',
  cta_text TEXT,
  cta_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_sequence_steps_seq ON email_sequence_steps(sequence_id, position);

-- ── Enrollments ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS email_sequence_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES email_sequences(id) ON DELETE CASCADE,
  contact_email TEXT NOT NULL,
  contact_name TEXT,
  conversation_id BIGINT REFERENCES conversations(id) ON DELETE SET NULL,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'unsubscribed', 'bounced')),
  metadata JSONB DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_email_enrollments_sequence ON email_sequence_enrollments(sequence_id);
CREATE INDEX IF NOT EXISTS idx_email_enrollments_email ON email_sequence_enrollments(contact_email);
CREATE INDEX IF NOT EXISTS idx_email_enrollments_active ON email_sequence_enrollments(status, enrolled_at) WHERE status = 'active';

-- ── Per-Step Send Records ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS email_sequence_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES email_sequence_enrollments(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES email_sequence_steps(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ,
  resend_id TEXT,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error TEXT,
  UNIQUE (enrollment_id, step_id)
);
CREATE INDEX IF NOT EXISTS idx_email_sequence_sends_enrollment ON email_sequence_sends(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_email_sequence_sends_step ON email_sequence_sends(step_id);

-- ── Email Links ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS email_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  destination_url TEXT NOT NULL,
  campaign TEXT,
  utm_source TEXT DEFAULT 'qwikly',
  utm_medium TEXT DEFAULT 'email',
  utm_content TEXT,
  click_count INT NOT NULL DEFAULT 0,
  unique_clicks INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_links_client ON email_links(client_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_links_slug ON email_links(slug);

-- ── Link Click Events ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS email_link_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID NOT NULL REFERENCES email_links(id) ON DELETE CASCADE,
  ip_hash TEXT,
  user_agent TEXT,
  is_unique BOOLEAN NOT NULL DEFAULT FALSE,
  conversation_id BIGINT REFERENCES conversations(id) ON DELETE SET NULL,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_link_clicks_link ON email_link_clicks(link_id, clicked_at DESC);

-- ── Atomic click counter function ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION increment_link_clicks(p_link_id UUID, p_is_unique BOOLEAN)
RETURNS VOID AS $$
BEGIN
  UPDATE email_links
  SET
    click_count   = click_count + 1,
    unique_clicks = unique_clicks + CASE WHEN p_is_unique THEN 1 ELSE 0 END
  WHERE id = p_link_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
