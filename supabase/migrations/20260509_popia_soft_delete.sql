-- POPIA: soft-delete columns for visitor data
-- Adds deleted_at to conversations, messages_log, and conversation_documents
-- so the dashboard "Delete this lead" action and the public
-- /privacy/delete-my-data form can soft-delete without losing audit history.

alter table public.conversations
  add column if not exists deleted_at timestamptz;

alter table public.messages_log
  add column if not exists deleted_at timestamptz;

alter table public.conversation_documents
  add column if not exists deleted_at timestamptz;

create index if not exists idx_conversations_deleted_at
  on public.conversations (deleted_at)
  where deleted_at is not null;

create index if not exists idx_messages_log_deleted_at
  on public.messages_log (deleted_at)
  where deleted_at is not null;

create index if not exists idx_conversation_documents_deleted_at
  on public.conversation_documents (deleted_at)
  where deleted_at is not null;

-- Audit trail of public deletion requests submitted via /privacy/delete-my-data.
-- Keeps a record that the request was made and confirmed, even after the data
-- is soft-deleted, so we can demonstrate compliance if asked.
create table if not exists public.privacy_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  requested_at timestamptz not null default now(),
  confirmed_at timestamptz,
  conversations_affected int default 0,
  messages_affected int default 0,
  documents_affected int default 0,
  ip_hash text,
  user_agent text
);

create index if not exists idx_privacy_deletion_requests_email
  on public.privacy_deletion_requests (lower(email));

alter table public.privacy_deletion_requests enable row level security;

-- Only the service role can read or write this table. No public RLS policies.
