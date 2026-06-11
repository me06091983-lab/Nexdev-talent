-- ===================================================
-- Migrare clients_v2 — NexDev Talent
-- Adaugă câmpuri detalii companie pe tabelul clients
-- Rulează în Supabase SQL Editor
-- ===================================================

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS cui          text,
  ADD COLUMN IF NOT EXISTS vat_registered boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS bank_account text,
  ADD COLUMN IF NOT EXISTS website      text,
  ADD COLUMN IF NOT EXISTS notes        text;
