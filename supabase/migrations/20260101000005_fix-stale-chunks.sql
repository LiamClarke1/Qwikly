-- One-time cleanup: delete the stale knowledge_chunk that contains Qwikly's own
-- "30-day money-back guarantee" marketing copy (was accidentally ingested from the
-- Qwikly website into a client's knowledge base).
--
-- Run in Supabase SQL Editor → SQL Editor → New query.

DELETE FROM knowledge_chunks
WHERE content ILIKE '%30-day money-back guarantee%';
