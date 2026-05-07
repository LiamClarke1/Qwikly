-- T3.4 — webhook idempotency unique constraint
-- The existing idx_webhooks_dedup on webhook_events(provider, external_id)
-- (created in migration-invoicing-v2.sql / its renamed counterpart) covers
-- the same shape with a partial WHERE external_id IS NOT NULL clause.
-- This migration adds a named alias (uq_webhook_provider_external) so callers
-- and runbooks can reference the constraint by the conventional name.
-- It is created idempotently and ON CONFLICT it simply does nothing.
create unique index if not exists uq_webhook_provider_external
  on webhook_events (provider, external_id)
  where external_id is not null;
