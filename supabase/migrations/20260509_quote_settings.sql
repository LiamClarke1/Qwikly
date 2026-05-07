-- Per-client quoting controls.
--
-- Adds two fields to the clients table so each customer can decide how their
-- assistant handles pricing on the chat:
--
--   quote_mode      — 'never' | 'range' | 'exact'
--                     'never'  : assistant never gives prices in chat, always
--                                defers to a callback / on-site quote.
--                     'range'  : assistant gives a low-to-high range when it
--                                has enough info (default for new sign-ups).
--                     'exact'  : assistant gives flat prices for jobs the
--                                customer has fixed rates for.
--                     Defaults to 'never' so out-of-the-box behavior is safe
--                     until the customer fills in their playbook.
--
--   quote_playbook  — free-form text where the customer types their pricing
--                     logic in plain English. Read by the assistant prompt.
--                     Example for an electrician:
--                       "DB tripping callout, R450 to R750.
--                        Kitchen rewire, R8k to R15k depending on size.
--                        Solar install, always quote on site."

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS quote_mode      text DEFAULT 'never',
  ADD COLUMN IF NOT EXISTS quote_playbook  text;

-- Constrain quote_mode to known values. Use a CHECK constraint rather than an
-- enum so we can add new modes later without a destructive migration.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE constraint_name = 'clients_quote_mode_chk'
  ) THEN
    ALTER TABLE public.clients
      ADD CONSTRAINT clients_quote_mode_chk
      CHECK (quote_mode IN ('never', 'range', 'exact'));
  END IF;
END $$;
