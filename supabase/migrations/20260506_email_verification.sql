-- Migration: 20260506_email_verification.sql
-- Adds in-app email verification (separate from Supabase's auth-level
-- email_confirmed_at, which is auto-set at signup so users can sign in).
-- Banner in dashboard prompts users to verify ownership of their email.

ALTER TABLE clients ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS email_verifications_client_id_idx ON email_verifications (client_id);
CREATE INDEX IF NOT EXISTS email_verifications_token_hash_idx ON email_verifications (token_hash);

-- Service-role-only table; no RLS policies needed (the API routes use the
-- admin client to insert/update). Enable RLS to be safe so anon role can't
-- touch it.
ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;
