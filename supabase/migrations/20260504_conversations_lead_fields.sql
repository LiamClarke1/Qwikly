-- Migration: 20260504_conversations_lead_fields.sql
-- Adds lead qualification fields to conversations so the Leads page
-- can display job type, service area, and preferred contact time.

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS job_type       TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS area           TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS preferred_time TEXT;
