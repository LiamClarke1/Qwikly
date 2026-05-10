-- Two owner-supplied configuration fields the digital assistant uses
-- to handle out-of-scope and regulated-work scenarios.
--
--   regulated_topics    — Free text. Owner lists topics that need careful
--                         handling (e.g. asbestos roof removal, schedule 5/6
--                         medication, criminal defence) and the rules the
--                         assistant should follow. The assistant treats this
--                         as authoritative and never quotes or commits beyond
--                         what the owner has authorised.
--
--   referral_partners   — Free text. Owner lists the partner businesses that
--                         handle work outside this firm's scope or area.
--                         When a visitor asks for an excluded service, the
--                         assistant offers a referral instead of letting the
--                         lead die. Closes the "out-of-scope salvage" gap.
--
-- Both are additive and nullable. Existing rows keep working unchanged.
-- The chat route SELECT in src/app/api/web/chat/route.ts (line ~605) MUST be
-- extended to include these columns or they will not reach the prompt builder.

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS regulated_topics TEXT,
  ADD COLUMN IF NOT EXISTS referral_partners TEXT;

COMMENT ON COLUMN clients.regulated_topics IS
  'Owner-supplied note on regulated topics relevant to this trade and how the digital assistant should handle them. Read into the system prompt as authoritative guidance.';

COMMENT ON COLUMN clients.referral_partners IS
  'Owner-supplied list of partner businesses for out-of-scope referrals. Used by the digital assistant when a visitor asks for a service this business does not offer or for an area outside service zones.';
