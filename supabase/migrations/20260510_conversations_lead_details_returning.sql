-- Adds two columns the digital assistant captures via the update_visitor tool:
--   details                — JSONB map of trade-specific lead detail
--                            (e.g. real estate: budget, beds, property_type, timeline;
--                             dental: medical_aid, procedure_type;
--                             legal:  matter_type, deadline).
--                            Stored as flexible key-value strings so we can
--                            evolve per-trade fields without schema changes.
--   is_returning_customer  — boolean, set when the visitor confirms they have
--                            used the practice/agency before. Lets owners see
--                            "this is a repeat client, prioritise" in the lead
--                            inbox.
--
-- Both are additive and nullable. Existing rows keep working unchanged.
-- The chat route at src/app/api/web/chat/route.ts persists these from the
-- update_visitor tool call. The lead notification email at
-- src/lib/email/templates/lead-v2.ts surfaces them in the per-lead summary.

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS details JSONB,
  ADD COLUMN IF NOT EXISTS is_returning_customer BOOLEAN;

COMMENT ON COLUMN conversations.details IS
  'Trade-specific lead detail captured by the digital assistant. JSON map of string key-value pairs. Schema is intentionally flexible per trade.';

COMMENT ON COLUMN conversations.is_returning_customer IS
  'TRUE when the visitor explicitly confirmed they have engaged with this business before. Set by the digital assistant via update_visitor.';
