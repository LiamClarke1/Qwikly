-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Must be run BEFORE deploying knowledge base features

-- ── 1. Enable pgvector ────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS vector;

-- ── 2. New columns on clients table ──────────────────────────────────────────
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS logo_url          TEXT,
  ADD COLUMN IF NOT EXISTS brand_primary     TEXT DEFAULT '#D97706',
  ADD COLUMN IF NOT EXISTS brand_secondary   TEXT DEFAULT '#111827',
  ADD COLUMN IF NOT EXISTS website_url       TEXT,
  ADD COLUMN IF NOT EXISTS industry          TEXT,
  ADD COLUMN IF NOT EXISTS contact_email     TEXT,
  ADD COLUMN IF NOT EXISTS timezone          TEXT DEFAULT 'Africa/Johannesburg',
  ADD COLUMN IF NOT EXISTS currency          TEXT DEFAULT 'ZAR',
  ADD COLUMN IF NOT EXISTS assistant_digital  BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS assistant_platform BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS setup_step        INT DEFAULT 1;

-- ── 3. Knowledge sources ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS knowledge_sources (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type             TEXT        NOT NULL CHECK (type IN ('paste','file','url','qa')),
  original_filename TEXT,
  source_url       TEXT,
  storage_path     TEXT,
  status           TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending','processing','done','error')),
  error_message    TEXT,
  chunk_count      INT         NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 4. Knowledge chunks (with vector embedding) ───────────────────────────────
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_id    UUID        NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  content      TEXT        NOT NULL,
  content_hash TEXT        NOT NULL,
  embedding    VECTOR(1536),
  metadata     JSONB       NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, content_hash)
);

-- IVFFlat index for fast cosine similarity search
CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_idx
  ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 50);

-- FTS index as fallback when no embeddings
CREATE INDEX IF NOT EXISTS knowledge_chunks_fts_idx
  ON knowledge_chunks USING GIN (to_tsvector('english', content));

-- ── 5. Lead captures ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lead_captures (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  visitor_name    TEXT,
  visitor_email   TEXT,
  visitor_phone   TEXT,
  question        TEXT        NOT NULL,
  captured_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 6. Row-level security ─────────────────────────────────────────────────────
ALTER TABLE knowledge_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks  ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_captures     ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ks_owner"  ON knowledge_sources;
DROP POLICY IF EXISTS "kc_owner"  ON knowledge_chunks;
DROP POLICY IF EXISTS "lc_owner"  ON lead_captures;

CREATE POLICY "ks_owner" ON knowledge_sources FOR ALL USING (tenant_id = auth.uid());
CREATE POLICY "kc_owner" ON knowledge_chunks  FOR ALL USING (tenant_id = auth.uid());
CREATE POLICY "lc_owner" ON lead_captures     FOR ALL USING (tenant_id = auth.uid());

-- ── 7. Similarity search helper function ─────────────────────────────────────
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding VECTOR(1536),
  match_tenant_id UUID,
  match_count     INT DEFAULT 5,
  similarity_threshold FLOAT DEFAULT 0.3
)
RETURNS TABLE (
  id           UUID,
  content      TEXT,
  metadata     JSONB,
  similarity   FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    kc.id,
    kc.content,
    kc.metadata,
    1 - (kc.embedding <=> query_embedding) AS similarity
  FROM knowledge_chunks kc
  WHERE
    kc.tenant_id = match_tenant_id
    AND kc.embedding IS NOT NULL
    AND 1 - (kc.embedding <=> query_embedding) > similarity_threshold
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
$$;
