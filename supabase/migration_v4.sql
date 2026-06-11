-- ===================================================
-- Migrare v4 — Parteneri, date companie candidați, FK parteneri pe contracte
-- Rulează în Supabase SQL Editor
-- ===================================================

-- 1. Partners: adaugă câmpuri personale și firmă
ALTER TABLE partners ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS last_name text;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS company_cui text;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS bank_account text;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS company_country text;

-- 2. Candidates: adaugă date companie (freelanceri SRL, PFA, etc.)
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS company_name text;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS company_cui text;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS company_tva boolean NOT NULL DEFAULT false;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS company_bank_account text;

-- 3. Contracts: leagă comisioanele de parteneri
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS partner_id uuid REFERENCES partners(id) ON DELETE SET NULL;

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS partner_id_2 uuid REFERENCES partners(id) ON DELETE SET NULL;

-- 4. Reîncarcă schema cache
NOTIFY pgrst, 'reload schema';
