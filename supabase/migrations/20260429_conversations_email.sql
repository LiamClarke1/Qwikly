-- Migration: 20260429_conversations_email.sql
-- Adds customer_email to conversations so email/web_chat contacts can be identified

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS customer_email TEXT;

CREATE INDEX IF NOT EXISTS idx_conversations_email ON conversations(customer_email)
  WHERE customer_email IS NOT NULL;
