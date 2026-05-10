-- Add the new pricing tiers (2026-05-10) to the plan_prices fallback table.
-- This is the table the billing pipeline reads when clients.mrr_zar is null
-- or 0 (e.g. trial conversion not yet recorded). Without this, new customers
-- on the 'business' or 'enterprise' plan keys would fall back to R0 and the
-- pipeline forecast / draft invoice would be wrong.
--
-- Existing seeded rows ('starter', 'pro', 'premium', 'billions') are
-- updated to match the new website pricing. 'premium' stays as the legacy
-- tier for grandfathered customers.

INSERT INTO plan_prices (plan_key, display_name, amount_zar_cents, billing_cadence, is_active)
VALUES
  ('starter',    'Starter',    69900,   'monthly', true),
  ('pro',        'Pro',        179900,  'monthly', true),
  ('business',   'Business',   399900,  'monthly', true),
  ('enterprise', 'Enterprise', 799900,  'monthly', true),
  ('premium',    'Premium (legacy)',  199900, 'monthly', true)
ON CONFLICT (plan_key) DO UPDATE SET
  display_name     = EXCLUDED.display_name,
  amount_zar_cents = EXCLUDED.amount_zar_cents,
  is_active        = EXCLUDED.is_active,
  updated_at       = now();

-- Mark the deprecated 'billions' tier inactive so it stops appearing in
-- admin pickers. The row is left in place to avoid breaking any existing
-- references, just hidden from new flows.
UPDATE plan_prices
  SET is_active  = false,
      updated_at = now()
  WHERE plan_key = 'billions';
