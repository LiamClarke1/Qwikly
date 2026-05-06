-- Migration: 20260506_profile_feedback.sql
-- Captures owner feedback from the onboarding test simulator and from
-- live conversations (Phase 3). Allows the system to learn what Qwikly
-- missed or asked unnecessarily.

CREATE TABLE IF NOT EXISTS profile_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  conversation_id BIGINT REFERENCES conversations(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('missed', 'overasked', 'wrong_tone', 'other')),
  note TEXT,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS profile_feedback_client_id_idx ON profile_feedback (client_id);

ALTER TABLE profile_feedback ENABLE ROW LEVEL SECURITY;

-- Owners can read their own feedback rows
DROP POLICY IF EXISTS profile_feedback_select_own ON profile_feedback;
CREATE POLICY profile_feedback_select_own ON profile_feedback
  FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM clients WHERE auth_user_id = auth.uid()::text
    )
  );

-- Owners can insert feedback for their own client
DROP POLICY IF EXISTS profile_feedback_insert_own ON profile_feedback;
CREATE POLICY profile_feedback_insert_own ON profile_feedback
  FOR INSERT
  WITH CHECK (
    client_id IN (
      SELECT id FROM clients WHERE auth_user_id = auth.uid()::text
    )
  );

-- Service role bypasses RLS implicitly (no policy needed)
