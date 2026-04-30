-- supabase/migrations/20260430_runtime_assistant.sql

-- pgvector extension
create extension if not exists vector;

-- KB article embeddings
alter table kb_articles add column if not exists embedding vector(1536);
create index if not exists idx_kb_articles_embedding
  on kb_articles using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Per-message retrieved sources + training feedback
alter table messages_log add column if not exists retrieved_sources jsonb;
alter table messages_log add column if not exists training_status text
  check (training_status in ('correct', 'needs_fix'));

-- Per-conversation sentiment + lead flag
alter table conversations add column if not exists sentiment text
  check (sentiment in ('positive', 'neutral', 'negative'));
alter table conversations add column if not exists lead_captured boolean default false;

-- Public tenant key (never exposes internal integer ID)
alter table clients add column if not exists public_key text unique;

-- Backfill existing clients
update clients
set public_key = 'qw_pk_' || substr(md5(id::text || random()::text), 0, 13)
where public_key is null;

-- Auto-generate for new clients
create or replace function clients_generate_public_key()
returns trigger language plpgsql as $$
begin
  if new.public_key is null then
    new.public_key := 'qw_pk_' || substr(md5(gen_random_uuid()::text), 0, 13);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_clients_public_key on clients;
create trigger trg_clients_public_key
  before insert on clients
  for each row execute function clients_generate_public_key();

-- Vector similarity search function
create or replace function match_kb_articles(
  query_embedding vector(1536),
  match_client_id bigint,
  match_count int default 5
)
returns table (id bigint, title text, body text, similarity float)
language plpgsql as $$
begin
  return query
  select
    ka.id,
    ka.title,
    ka.body,
    1 - (ka.embedding <=> query_embedding) as similarity
  from kb_articles ka
  where
    ka.client_id = match_client_id
    and ka.is_active = true
    and ka.embedding is not null
  order by ka.embedding <=> query_embedding
  limit match_count;
end;
$$;
