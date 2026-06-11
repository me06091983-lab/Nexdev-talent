-- ===================================================
-- Migrare Contracte v2 — creare manuală
-- Rulează în Supabase SQL Editor
-- ===================================================

-- 1. submission_id devine opțional (pentru contracte create manual)
ALTER TABLE contracts ALTER COLUMN submission_id DROP NOT NULL;

-- 2. Adaugă referințe directe candidate + rol (pentru contracte manuale)
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS candidate_id uuid REFERENCES candidates(id) ON DELETE SET NULL;

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS role_id uuid REFERENCES roles(id) ON DELETE SET NULL;

-- 3. Reîncarcă schema cache
NOTIFY pgrst, 'reload schema';
