alter table clients
  add column if not exists ai_conversation_speed text default null;
