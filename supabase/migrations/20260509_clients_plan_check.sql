-- Migration: 20260509_clients_plan_check.sql
-- Lock clients.plan to the three live tiers so the DB matches the narrowed
-- TypeScript types. Pre-checks for any stragglers and fails loudly rather
-- than rejecting the whole ALTER mid-flight.

DO $$
DECLARE
  n int;
BEGIN
  SELECT count(*) INTO n FROM clients WHERE plan NOT IN ('trial','pro','premium');
  IF n > 0 THEN
    RAISE EXCEPTION 'Cannot add CHECK constraint: % client(s) still have a plan other than trial/pro/premium. Investigate first.', n;
  END IF;
END $$;

ALTER TABLE clients
  DROP CONSTRAINT IF EXISTS clients_plan_check;

ALTER TABLE clients
  ADD CONSTRAINT clients_plan_check CHECK (plan IN ('trial','pro','premium'));
