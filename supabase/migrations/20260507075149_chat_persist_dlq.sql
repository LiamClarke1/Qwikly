-- T3.6 — dead-letter queue for chat persistence
-- When /api/chat exhausts its 3-attempt retry against messages_log /
-- conversations, we capture the failed payload here so it can be
-- replayed manually or by a follow-up cron later. This means a
-- transient DB blip never silently drops a customer message.

create table if not exists chat_persist_dlq (
  id            uuid primary key default gen_random_uuid(),
  client_id     bigint,
  conversation_id uuid,
  payload       jsonb not null,
  error_message text,
  attempts      int not null default 3,
  created_at    timestamptz not null default now(),
  resolved_at   timestamptz
);

create index if not exists idx_chat_persist_dlq_unresolved
  on chat_persist_dlq (created_at)
  where resolved_at is null;

-- Service role only: this is operator-only data, not a client surface.
revoke all on chat_persist_dlq from anon, authenticated;
grant insert, select, update on chat_persist_dlq to service_role;
