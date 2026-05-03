-- Migration: 20260504_scrape_fields.sql
-- Adds fields populated by the premium website scraper (auto-fill).

ALTER TABLE clients ADD COLUMN IF NOT EXISTS phone             TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS facebook_url      TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS instagram_url     TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS testimonials      TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS star_rating       TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS review_count      TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS scraped_at        TIMESTAMPTZ;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS scrape_confidence JSONB;
