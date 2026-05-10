-- Migration: 20260510_pipeline_platform.sql
-- Data layer for the Qwikly Pipeline tenant platform.
--
-- Pipeline is the outbound side of Qwikly. It runs a five-step setup wizard,
-- generates seed prospects, warms sending domains, sends a cadence, watches
-- replies, and books meetings. Every table here is tenant scoped via the
-- businesses.id chain (businesses.user_id = auth.uid()), matching the v2
-- widget backend pattern in 20260501_v2_widget_backend.sql.
--
-- Tables:
--   pipeline_setup_state     one row per business, the wizard payload
--   pipeline_campaigns       per-tenant outbound campaigns
--   pipeline_prospects       enriched contact rows, optionally in a campaign
--   pipeline_replies         classified inbound replies
--   pipeline_sending_domains warmup state for tenant-owned sending domains
--   pipeline_meetings        booked calls coming out of the pipeline
--
-- All timestamps are TIMESTAMPTZ. All money is ZAR. The migration is
-- idempotent, safe to run repeatedly.

-- ── pipeline_setup_state ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pipeline_setup_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','ready','launched','paused','completed')),
  current_step INTEGER NOT NULL DEFAULT 1
    CHECK (current_step BETWEEN 1 AND 5),
  icp JSONB NOT NULL DEFAULT '{}'::jsonb,
  seed_list JSONB NOT NULL DEFAULT '[]'::jsonb,
  sending_domains JSONB NOT NULL DEFAULT '[]'::jsonb,
  copy_approvals JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id)
);

CREATE INDEX IF NOT EXISTS pipeline_setup_state_business_id_idx
  ON pipeline_setup_state(business_id);
CREATE INDEX IF NOT EXISTS pipeline_setup_state_status_idx
  ON pipeline_setup_state(status);

COMMENT ON TABLE pipeline_setup_state IS 'One row per tenant. Stores the five-step Pipeline setup wizard payload (ICP, seed list, sending domains, copy approvals) and the live status of the rollout.';

ALTER TABLE pipeline_setup_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owners_read_pipeline_setup_state" ON pipeline_setup_state;
CREATE POLICY "owners_read_pipeline_setup_state" ON pipeline_setup_state
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = pipeline_setup_state.business_id
        AND b.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "owners_insert_pipeline_setup_state" ON pipeline_setup_state;
CREATE POLICY "owners_insert_pipeline_setup_state" ON pipeline_setup_state
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = pipeline_setup_state.business_id
        AND b.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "owners_update_pipeline_setup_state" ON pipeline_setup_state;
CREATE POLICY "owners_update_pipeline_setup_state" ON pipeline_setup_state
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = pipeline_setup_state.business_id
        AND b.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "owners_delete_pipeline_setup_state" ON pipeline_setup_state;
CREATE POLICY "owners_delete_pipeline_setup_state" ON pipeline_setup_state
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = pipeline_setup_state.business_id
        AND b.user_id = auth.uid()
    )
  );

-- ── pipeline_campaigns ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pipeline_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  icp_slug TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','warming','sending','paused','completed')),
  prospects_count INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  replies_count INTEGER NOT NULL DEFAULT 0,
  meetings_count INTEGER NOT NULL DEFAULT 0,
  last_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pipeline_campaigns_business_id_idx
  ON pipeline_campaigns(business_id);
CREATE INDEX IF NOT EXISTS pipeline_campaigns_status_idx
  ON pipeline_campaigns(status);
CREATE INDEX IF NOT EXISTS pipeline_campaigns_last_activity_at_idx
  ON pipeline_campaigns(last_activity_at);

COMMENT ON TABLE pipeline_campaigns IS 'Per-tenant outbound campaigns. Each campaign targets one ICP slug, owns a set of pipeline_prospects, and runs through a draft, warming, sending, paused, completed lifecycle. Counters are denormalised for dashboard speed.';

ALTER TABLE pipeline_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owners_read_pipeline_campaigns" ON pipeline_campaigns;
CREATE POLICY "owners_read_pipeline_campaigns" ON pipeline_campaigns
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = pipeline_campaigns.business_id
        AND b.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "owners_insert_pipeline_campaigns" ON pipeline_campaigns;
CREATE POLICY "owners_insert_pipeline_campaigns" ON pipeline_campaigns
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = pipeline_campaigns.business_id
        AND b.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "owners_update_pipeline_campaigns" ON pipeline_campaigns;
CREATE POLICY "owners_update_pipeline_campaigns" ON pipeline_campaigns
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = pipeline_campaigns.business_id
        AND b.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "owners_delete_pipeline_campaigns" ON pipeline_campaigns;
CREATE POLICY "owners_delete_pipeline_campaigns" ON pipeline_campaigns
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = pipeline_campaigns.business_id
        AND b.user_id = auth.uid()
    )
  );

-- ── pipeline_prospects ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pipeline_prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES pipeline_campaigns(id) ON DELETE SET NULL,
  first_name TEXT,
  last_name TEXT,
  title TEXT,
  company TEXT,
  industry TEXT,
  employees INTEGER,
  city TEXT,
  country TEXT NOT NULL DEFAULT 'ZA',
  email TEXT,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  linkedin_url TEXT,
  intent_signals TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  enrichment_score INTEGER CHECK (enrichment_score BETWEEN 0 AND 100),
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','contacted','replied','qualified','booked','dead')),
  source TEXT,
  icp_match JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pipeline_prospects_business_status_idx
  ON pipeline_prospects(business_id, status);
CREATE INDEX IF NOT EXISTS pipeline_prospects_campaign_id_idx
  ON pipeline_prospects(campaign_id);
CREATE INDEX IF NOT EXISTS pipeline_prospects_email_idx
  ON pipeline_prospects(email);

COMMENT ON TABLE pipeline_prospects IS 'Enriched contact rows for the Pipeline service. Each row is owned by a tenant and may be attached to a campaign. status moves new -> contacted -> replied -> qualified -> booked, with dead as the terminal cold state. icp_match holds the scoring rationale.';

ALTER TABLE pipeline_prospects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owners_read_pipeline_prospects" ON pipeline_prospects;
CREATE POLICY "owners_read_pipeline_prospects" ON pipeline_prospects
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = pipeline_prospects.business_id
        AND b.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "owners_insert_pipeline_prospects" ON pipeline_prospects;
CREATE POLICY "owners_insert_pipeline_prospects" ON pipeline_prospects
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = pipeline_prospects.business_id
        AND b.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "owners_update_pipeline_prospects" ON pipeline_prospects;
CREATE POLICY "owners_update_pipeline_prospects" ON pipeline_prospects
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = pipeline_prospects.business_id
        AND b.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "owners_delete_pipeline_prospects" ON pipeline_prospects;
CREATE POLICY "owners_delete_pipeline_prospects" ON pipeline_prospects
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = pipeline_prospects.business_id
        AND b.user_id = auth.uid()
    )
  );

-- ── pipeline_replies ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pipeline_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  prospect_id UUID NOT NULL REFERENCES pipeline_prospects(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES pipeline_campaigns(id) ON DELETE CASCADE,
  subject TEXT,
  body TEXT,
  classification TEXT NOT NULL DEFAULT 'unclassified'
    CHECK (classification IN ('interested','not_interested','ooo','wrong_person','ask_later','unclassified')),
  received_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  actions_taken JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS pipeline_replies_business_id_idx
  ON pipeline_replies(business_id);
CREATE INDEX IF NOT EXISTS pipeline_replies_prospect_id_idx
  ON pipeline_replies(prospect_id);
CREATE INDEX IF NOT EXISTS pipeline_replies_campaign_id_idx
  ON pipeline_replies(campaign_id);
CREATE INDEX IF NOT EXISTS pipeline_replies_classification_idx
  ON pipeline_replies(classification);

COMMENT ON TABLE pipeline_replies IS 'Inbound replies pulled from the cold email infrastructure provider. The classifier writes into classification, downstream booking and follow-up logic reads from it. actions_taken is an append-only log of what the system did in response (e.g. sent booking link, paused cadence).';

ALTER TABLE pipeline_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owners_read_pipeline_replies" ON pipeline_replies;
CREATE POLICY "owners_read_pipeline_replies" ON pipeline_replies
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = pipeline_replies.business_id
        AND b.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "owners_insert_pipeline_replies" ON pipeline_replies;
CREATE POLICY "owners_insert_pipeline_replies" ON pipeline_replies
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = pipeline_replies.business_id
        AND b.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "owners_update_pipeline_replies" ON pipeline_replies;
CREATE POLICY "owners_update_pipeline_replies" ON pipeline_replies
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = pipeline_replies.business_id
        AND b.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "owners_delete_pipeline_replies" ON pipeline_replies;
CREATE POLICY "owners_delete_pipeline_replies" ON pipeline_replies
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = pipeline_replies.business_id
        AND b.user_id = auth.uid()
    )
  );

-- ── pipeline_sending_domains ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pipeline_sending_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  root_domain TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'provisioning'
    CHECK (status IN ('provisioning','warming','live','paused','retired')),
  warmup_started_at TIMESTAMPTZ,
  warmup_complete_at TIMESTAMPTZ,
  daily_send_cap INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pipeline_sending_domains_business_id_idx
  ON pipeline_sending_domains(business_id);
CREATE INDEX IF NOT EXISTS pipeline_sending_domains_status_idx
  ON pipeline_sending_domains(status);
CREATE INDEX IF NOT EXISTS pipeline_sending_domains_root_domain_idx
  ON pipeline_sending_domains(root_domain);

COMMENT ON TABLE pipeline_sending_domains IS 'Per-tenant cold email sending domains, plus their warmup lifecycle. Pipeline never sends from the brand domain. status moves provisioning -> warming -> live, with paused and retired as off-ramps. daily_send_cap is the soft ceiling enforced by the cadence sender.';

ALTER TABLE pipeline_sending_domains ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owners_read_pipeline_sending_domains" ON pipeline_sending_domains;
CREATE POLICY "owners_read_pipeline_sending_domains" ON pipeline_sending_domains
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = pipeline_sending_domains.business_id
        AND b.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "owners_insert_pipeline_sending_domains" ON pipeline_sending_domains;
CREATE POLICY "owners_insert_pipeline_sending_domains" ON pipeline_sending_domains
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = pipeline_sending_domains.business_id
        AND b.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "owners_update_pipeline_sending_domains" ON pipeline_sending_domains;
CREATE POLICY "owners_update_pipeline_sending_domains" ON pipeline_sending_domains
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = pipeline_sending_domains.business_id
        AND b.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "owners_delete_pipeline_sending_domains" ON pipeline_sending_domains;
CREATE POLICY "owners_delete_pipeline_sending_domains" ON pipeline_sending_domains
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = pipeline_sending_domains.business_id
        AND b.user_id = auth.uid()
    )
  );

-- ── pipeline_meetings ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pipeline_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  prospect_id UUID NOT NULL REFERENCES pipeline_prospects(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES pipeline_campaigns(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'booked'
    CHECK (status IN ('booked','held','no_show','rescheduled','closed_won','closed_lost')),
  meeting_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pipeline_meetings_business_id_idx
  ON pipeline_meetings(business_id);
CREATE INDEX IF NOT EXISTS pipeline_meetings_prospect_id_idx
  ON pipeline_meetings(prospect_id);
CREATE INDEX IF NOT EXISTS pipeline_meetings_campaign_id_idx
  ON pipeline_meetings(campaign_id);
CREATE INDEX IF NOT EXISTS pipeline_meetings_scheduled_at_idx
  ON pipeline_meetings(scheduled_at);
CREATE INDEX IF NOT EXISTS pipeline_meetings_status_idx
  ON pipeline_meetings(status);

COMMENT ON TABLE pipeline_meetings IS 'Calls booked off the back of the Pipeline service. status moves booked -> held -> closed_won or closed_lost, with no_show and rescheduled as side states. meeting_url is the calendar link delivered to the prospect.';

ALTER TABLE pipeline_meetings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owners_read_pipeline_meetings" ON pipeline_meetings;
CREATE POLICY "owners_read_pipeline_meetings" ON pipeline_meetings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = pipeline_meetings.business_id
        AND b.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "owners_insert_pipeline_meetings" ON pipeline_meetings;
CREATE POLICY "owners_insert_pipeline_meetings" ON pipeline_meetings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = pipeline_meetings.business_id
        AND b.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "owners_update_pipeline_meetings" ON pipeline_meetings;
CREATE POLICY "owners_update_pipeline_meetings" ON pipeline_meetings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = pipeline_meetings.business_id
        AND b.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "owners_delete_pipeline_meetings" ON pipeline_meetings;
CREATE POLICY "owners_delete_pipeline_meetings" ON pipeline_meetings
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = pipeline_meetings.business_id
        AND b.user_id = auth.uid()
    )
  );
