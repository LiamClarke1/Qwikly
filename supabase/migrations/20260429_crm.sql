-- Migration: 20260429_crm.sql
-- CRM module — adds CRM metadata to clients + support tables

-- ─── CRM columns on clients ───────────────────────────────────────────────────
ALTER TABLE clients ADD COLUMN IF NOT EXISTS crm_status TEXT DEFAULT 'active'
  CHECK (crm_status IN ('onboarding','active','at_risk','paused','churned'));
ALTER TABLE clients ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'starter'
  CHECK (plan IN ('starter','growth','pro','enterprise'));
ALTER TABLE clients ADD COLUMN IF NOT EXISTS mrr_zar INTEGER DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS health_score INTEGER DEFAULT 100
  CHECK (health_score BETWEEN 0 AND 100);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS account_manager_id UUID;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS ltv_zar INTEGER DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS next_renewal_at TIMESTAMPTZ;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS website TEXT;

CREATE INDEX IF NOT EXISTS idx_clients_crm_status ON clients(crm_status);
CREATE INDEX IF NOT EXISTS idx_clients_plan ON clients(plan);
CREATE INDEX IF NOT EXISTS idx_clients_mrr ON clients(mrr_zar DESC);

-- ─── Tags ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_tags (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  color      TEXT NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm_client_tags (
  client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  tag_id    UUID REFERENCES crm_tags(id)   ON DELETE CASCADE,
  PRIMARY KEY (client_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_crm_client_tags_client ON crm_client_tags(client_id);

-- ─── Notes ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_notes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  author_id  UUID,
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_notes_client ON crm_notes(client_id, created_at DESC);

-- ─── Tasks ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  assignee_id UUID,
  title       TEXT NOT NULL,
  description TEXT,
  status      TEXT DEFAULT 'open'   CHECK (status   IN ('open','in_progress','done','cancelled')),
  priority    TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  due_at      TIMESTAMPTZ,
  done_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_client ON crm_tasks(client_id, status, due_at);

-- ─── Secondary contacts ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_contacts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  role       TEXT,
  email      TEXT,
  phone      TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_client ON crm_contacts(client_id);

-- ─── Files ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_files (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  uploaded_by  UUID,
  name         TEXT NOT NULL,
  mime_type    TEXT,
  size_bytes   INTEGER,
  storage_path TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_files_client ON crm_files(client_id, created_at DESC);

-- ─── Pre-aggregated daily stats ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_stats_daily (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id              INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  date                   DATE NOT NULL,
  conversations_total    INTEGER DEFAULT 0,
  conversations_whatsapp INTEGER DEFAULT 0,
  conversations_email    INTEGER DEFAULT 0,
  conversations_web      INTEGER DEFAULT 0,
  leads_captured         INTEGER DEFAULT 0,
  leads_converted        INTEGER DEFAULT 0,
  messages_handled_by_ai INTEGER DEFAULT 0,
  avg_response_time_s    INTEGER DEFAULT 0,
  bookings_created       INTEGER DEFAULT 0,
  UNIQUE (client_id, date)
);
CREATE INDEX IF NOT EXISTS idx_crm_stats_daily ON crm_stats_daily(client_id, date DESC);

-- ─── Activity timeline ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  actor_id   UUID,
  event_type TEXT NOT NULL,
  payload    JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_events_client ON crm_events(client_id, created_at DESC);

-- ─── Reports ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_reports (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        INTEGER REFERENCES clients(id) ON DELETE CASCADE,
  period_start     DATE NOT NULL,
  period_end       DATE NOT NULL,
  status           TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','generating','ready','failed')),
  storage_path     TEXT,
  email_sent_at    TIMESTAMPTZ,
  email_opened_at  TIMESTAMPTZ,
  downloaded_at    TIMESTAMPTZ,
  generated_at     TIMESTAMPTZ,
  metrics_snapshot JSONB,
  created_at       TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_reports_client ON crm_reports(client_id, period_start DESC);

-- ─── Saved filter views ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_saved_views (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   UUID,
  name       TEXT NOT NULL,
  filters    JSONB NOT NULL DEFAULT '{}',
  sort_by    TEXT,
  sort_dir   TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
