-- ===================================================
-- Migrare F2b — NexDev Talent
-- Rulează în Supabase SQL Editor
-- ===================================================

-- 1. Câmpuri noi pentru tabelul clients
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS collaboration_start date,
  ADD COLUMN IF NOT EXISTS location           text,
  ADD COLUMN IF NOT EXISTS contact_name       text,
  ADD COLUMN IF NOT EXISTS contact_email      text,
  ADD COLUMN IF NOT EXISTS contact_phone      text;

-- 2. Câmpuri rate pentru tabelul roles
ALTER TABLE roles
  ADD COLUMN IF NOT EXISTS rate          numeric(10,2),
  ADD COLUMN IF NOT EXISTS rate_currency text DEFAULT 'EUR'
    CHECK (rate_currency IN ('EUR', 'USD', 'GBP', 'RON')),
  ADD COLUMN IF NOT EXISTS rate_type     text DEFAULT 'daily'
    CHECK (rate_type IN ('hourly', 'daily'));
