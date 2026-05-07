-- T3.4 — index for messages_log lookups by conversation
-- Speeds up the per-conversation last-message subquery used by
-- get_conversations_with_last_message and the live message pane.
create index if not exists idx_messages_conversation_id
  on messages_log (conversation_id);
