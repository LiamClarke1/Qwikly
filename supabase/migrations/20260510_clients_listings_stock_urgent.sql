-- Three owner-supplied configuration fields that close gaps surfaced by
-- the owner-POV setup walkthroughs:
--
--   active_listings    — Free text. Owners paste their current inventory
--                        (real estate listings, available items, current
--                        offers). The assistant references this so a visitor
--                        asking "is the Bantry Bay 2-bed still available?"
--                        gets a real answer instead of "let me check".
--                        Owner refreshes this themselves; no real-time feed.
--
--   stock_notes        — Free text. Pharmacies and any inventory-driven
--                        business pastes "out of stock: X, Y, Z. Low: A, B"
--                        weekly. The assistant references it instead of
--                        defering every "do you have X?" question.
--
--   urgent_keywords    — Free text, comma-separated. Owner-supplied phrases
--                        that should elevate is_urgent on a visitor message.
--                        E.g. an electrician adds "for transfer, conveyancer
--                        needs, bond inspection, transfer date" to catch
--                        deadline-driven property-sale COC requests.
--                        Layered on top of the per-trade urgencySignals.
--
-- All three are additive and nullable. Existing rows keep working unchanged.
-- The chat route SELECT in src/app/api/web/chat/route.ts MUST be extended
-- to include these columns for them to reach the prompt builder.

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS active_listings TEXT,
  ADD COLUMN IF NOT EXISTS stock_notes TEXT,
  ADD COLUMN IF NOT EXISTS urgent_keywords TEXT;

COMMENT ON COLUMN clients.active_listings IS
  'Owner-supplied free text describing current inventory the assistant should be able to reference (real estate listings, available items, etc.). Owner refreshes manually, no live feed.';

COMMENT ON COLUMN clients.stock_notes IS
  'Owner-supplied free text on current stock status (out-of-stock items, low-stock alerts). Used by the assistant when a visitor asks about availability of specific items.';

COMMENT ON COLUMN clients.urgent_keywords IS
  'Owner-supplied comma-separated phrases that should elevate is_urgent when seen in a visitor message. Layered on top of the per-trade urgencySignals built into the prompt.';
