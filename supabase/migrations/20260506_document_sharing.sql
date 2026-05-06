-- Migration: 20260506_document_sharing.sql
-- Adds document/file sharing between visitors and businesses via the chat widget.
-- Covers:
--   - conversation_documents table (all uploaded files, both directions)
--   - messages_log: message_type + attachment_id columns
--   - clients: document feature settings columns
--   - RLS policies for owner access
--   - Indexes for dashboard and widget queries

-- ── 1. Document settings on clients ──────────────────────────────────────────

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS doc_visitor_upload      BOOLEAN  DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS doc_business_send       BOOLEAN  DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS doc_allowed_types       TEXT[]   DEFAULT ARRAY['application/pdf','image/jpeg','image/png'],
  ADD COLUMN IF NOT EXISTS doc_max_size_mb         INT      DEFAULT 10,
  ADD COLUMN IF NOT EXISTS doc_visitor_prompt      TEXT,
  ADD COLUMN IF NOT EXISTS doc_business_send_label TEXT;

-- ── 2. conversation_documents ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS conversation_documents (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       BIGINT      NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  conversation_id BIGINT      NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  uploaded_by     TEXT        NOT NULL CHECK (uploaded_by IN ('business', 'visitor')),
  file_name       TEXT        NOT NULL,
  storage_name    TEXT        NOT NULL,
  file_size       BIGINT      NOT NULL,
  file_type       TEXT        NOT NULL,
  storage_path    TEXT        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'active'
                              CHECK (status IN ('active', 'deleted')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conv_docs_client       ON conversation_documents(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_docs_conversation ON conversation_documents(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_docs_status       ON conversation_documents(status);

-- ── 3. Extend messages_log for document messages ──────────────────────────────

ALTER TABLE messages_log
  ADD COLUMN IF NOT EXISTS message_type  TEXT DEFAULT 'text'
    CHECK (message_type IN ('text', 'document')),
  ADD COLUMN IF NOT EXISTS attachment_id UUID REFERENCES conversation_documents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_messages_attachment ON messages_log(attachment_id) WHERE attachment_id IS NOT NULL;

-- ── 4. RLS on conversation_documents ─────────────────────────────────────────

ALTER TABLE conversation_documents ENABLE ROW LEVEL SECURITY;

-- Dashboard users (authenticated) can read/update/delete their own client's documents.
-- INSERT and visitor downloads are handled server-side via the service role key,
-- which bypasses RLS automatically.

DROP POLICY IF EXISTS "docs_owner_rw" ON conversation_documents;
CREATE POLICY "docs_owner_rw" ON conversation_documents
  FOR ALL USING (
    client_id IN (
      SELECT id FROM clients WHERE auth_user_id = auth.uid()::text
    )
  );

-- ── 5. Storage bucket ─────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'conversation-documents',
  'conversation-documents',
  FALSE,
  26214400,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ── 6. Storage RLS ────────────────────────────────────────────────────────────
-- Files are stored as: {client_id}/{conversation_id}/{document_id}/{storage_name}
-- Authenticated dashboard owners can access any file under their client_id folder.
-- Visitor uploads/downloads go through the service role key (bypasses RLS).

DROP POLICY IF EXISTS "storage_docs_owner_rw" ON storage.objects;
CREATE POLICY "storage_docs_owner_rw" ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'conversation-documents'
    AND split_part(name, '/', 1) IN (
      SELECT id::text FROM clients WHERE auth_user_id = auth.uid()::text
    )
  );
