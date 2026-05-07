-- clients.ai_paused — manual on/off switch for the owner.
--
-- The dashboard topbar already writes this column ("Qwikly is on/off"
-- pill in src/components/shell/topbar.tsx) but no migration creates it,
-- so updates were failing silently and the toggle was cosmetic only.
--
-- This is separate from the trial-expiry pause (driven by
-- subscriptions.trial_ends_at). Both gates fire independently in the
-- chat, branding, and intake API routes, either one will pause the
-- assistant.

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS ai_paused boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN clients.ai_paused IS
  'Manual pause toggle controlled by the business owner from the dashboard topbar. When true, the chat, branding, and intake APIs respond with 403 paused. Independent of trial expiry, which is enforced separately via subscriptions.trial_ends_at.';
