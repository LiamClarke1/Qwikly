-- Settings V2 migration: team_members, api_keys, webhooks, export_requests
-- Run in Supabase SQL editor

-- ─── Clients: new settings columns ──────────────────────────────────────────
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS profile_photo_url   TEXT,
  ADD COLUMN IF NOT EXISTS timezone            TEXT DEFAULT 'Africa/Johannesburg',
  ADD COLUMN IF NOT EXISTS website             TEXT,
  ADD COLUMN IF NOT EXISTS industry            TEXT,
  ADD COLUMN IF NOT EXISTS support_email       TEXT,
  ADD COLUMN IF NOT EXISTS brand_color         TEXT DEFAULT '#E85A2C',
  ADD COLUMN IF NOT EXISTS deleted_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delete_requested_at TIMESTAMPTZ;

-- ─── Team members ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS team_members (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   INTEGER     NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  email       TEXT        NOT NULL,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  role        TEXT        NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  status      TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked')),
  invited_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(client_id, email)
);

CREATE INDEX IF NOT EXISTS idx_team_members_client ON team_members(client_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user   ON team_members(user_id);

-- ─── API keys ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_keys (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   INTEGER     NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  key_hash    TEXT        NOT NULL UNIQUE,   -- SHA-256 of the full key
  key_prefix  TEXT        NOT NULL,          -- first 16 chars for display
  scopes      TEXT[]      NOT NULL DEFAULT '{"conversations:read"}',
  last_used_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_api_keys_client ON api_keys(client_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash   ON api_keys(key_hash);

-- ─── Webhooks ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS webhooks (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     INTEGER     NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  url           TEXT        NOT NULL,
  events        TEXT[]      NOT NULL DEFAULT '{"conversation.created"}',
  secret        TEXT        NOT NULL,
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_fired_at TIMESTAMPTZ,
  last_status   INTEGER
);

CREATE INDEX IF NOT EXISTS idx_webhooks_client ON webhooks(client_id);

-- ─── Export requests ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS export_requests (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    INTEGER     NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  status       TEXT        NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'done', 'failed')),
  download_url TEXT,
  expires_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_export_requests_client ON export_requests(client_id);
