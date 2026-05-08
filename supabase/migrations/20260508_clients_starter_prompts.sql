-- clients.starter_prompts_json + starter_prompts_generated_at
--
-- Cache for the per-tenant starter prompts shown in the widget when a
-- visitor taps the new search icon ("Not sure what to ask?"). The
-- prompts are generated once per tenant via Claude Haiku 4.5 from the
-- tenant's KB and refreshed on demand when older than 24h.
--
-- Both columns are nullable with no default. The /api/web/starter-prompts
-- route treats null as a cache miss and regenerates. Any tenant whose KB
-- is empty or whose generation fails simply gets ok:false from the API
-- and the widget hides the search icon entirely — no broken UX.

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS starter_prompts_json jsonb,
  ADD COLUMN IF NOT EXISTS starter_prompts_generated_at timestamptz;

COMMENT ON COLUMN clients.starter_prompts_json IS
  'Cached array of 4 short starter prompts for this tenant, generated from their KB and shown in the widget search panel. JSON shape: ["What do you charge?", "How does it work?", ...]. Null means "regenerate on next request".';

COMMENT ON COLUMN clients.starter_prompts_generated_at IS
  'When starter_prompts_json was last generated. Cache TTL is 24h. Set to null to force regeneration on the next call to /api/web/starter-prompts.';
