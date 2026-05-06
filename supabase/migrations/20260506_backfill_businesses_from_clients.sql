-- Migration: 20260506_backfill_businesses_from_clients.sql
-- Backfill businesses rows for legacy users who have a clients row
-- but no businesses row. v2 endpoints (v2Auth) require a businesses
-- row, so legacy accounts were getting 401 Unauthorized everywhere.
--
-- Also copies any pre-existing clients.notification_email into the new
-- businesses.notification_email so the lead alert path picks up the
-- address the user already configured.

-- 1. Create businesses rows for any legacy user that's missing one.
INSERT INTO businesses (user_id, name, contact_email, notification_email)
SELECT
  c.auth_user_id,
  COALESCE(NULLIF(c.business_name, ''), '')                                AS name,
  COALESCE(NULLIF(c.client_email, ''), NULLIF(c.contact_email, ''), '')    AS contact_email,
  NULLIF(c.notification_email, '')                                          AS notification_email
FROM clients c
WHERE c.auth_user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM businesses b WHERE b.user_id = c.auth_user_id
  );

-- 2. For users that already had a businesses row but no notification_email,
--    pull it across from clients now (the earlier backfill copied
--    contact_email; this also pulls the explicit notification_email field).
UPDATE businesses b
SET    notification_email = NULLIF(c.notification_email, '')
FROM   clients c
WHERE  c.auth_user_id = b.user_id
  AND  b.notification_email IS NULL
  AND  c.notification_email IS NOT NULL
  AND  c.notification_email <> '';

-- 3. Make sure every legacy user also has a subscriptions row, otherwise
--    v2Auth still works (sub is nullable) but downstream plan checks default
--    to trial. Insert a trial sub for anyone missing one so behaviour is
--    consistent with the signup flow.
INSERT INTO subscriptions (user_id, plan, billing_cycle, status)
SELECT b.user_id, 'trial', 'monthly', 'active'
FROM   businesses b
WHERE  NOT EXISTS (
  SELECT 1 FROM subscriptions s WHERE s.user_id = b.user_id
);
