-- T3.3 / T3.4 — RPC for the conversations dashboard
-- Replaces the per-row N+1 last-message lookup on
-- src/app/(app)/dashboard/conversations/page.tsx.
-- Joins conversations with the most recent messages_log row using a
-- LATERAL subquery so we keep the conversations row even when no
-- messages exist yet.
--
-- Note: clients.id is bigint in this schema, so p_account_id is bigint.
-- The function name is the canonical one referenced in T3.3.

create or replace function get_conversations_with_last_message(
  p_account_id bigint,
  p_limit int default 100,
  p_offset int default 0
)
returns table (
  id uuid,
  client_id bigint,
  customer_name text,
  customer_phone text,
  customer_email text,
  channel text,
  status text,
  ai_paused boolean,
  notes text,
  created_at timestamptz,
  updated_at timestamptz,
  last_message text,
  last_message_time timestamptz
)
language sql
stable
security invoker
as $$
  select
    c.id,
    c.client_id,
    c.customer_name,
    c.customer_phone,
    c.customer_email,
    c.channel,
    c.status,
    c.ai_paused,
    c.notes,
    c.created_at,
    c.updated_at,
    m.content as last_message,
    coalesce(m.created_at, c.updated_at) as last_message_time
  from conversations c
  left join lateral (
    select content, created_at
    from messages_log
    where conversation_id = c.id
    order by created_at desc
    limit 1
  ) m on true
  where c.client_id = p_account_id
  order by c.updated_at desc
  limit p_limit
  offset p_offset;
$$;

grant execute on function get_conversations_with_last_message(bigint, int, int)
  to anon, authenticated, service_role;
