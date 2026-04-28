-- ═══════════════════════════════════════════════════════════════════════════
-- Qwikly — Onboarding schema additions
-- Run in Supabase SQL editor after migration-invoicing.sql
-- Safe to re-run: IF NOT EXISTS / IF NOT EXISTS throughout
-- ═══════════════════════════════════════════════════════════════════════════

-- go_live: set to true when client completes onboarding and activates their assistant
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS go_live boolean NOT NULL DEFAULT false;
