-- ===================================================
-- Migrare — adaugă recruiter_rate pe tabelul roles
-- ===================================================

ALTER TABLE roles
  ADD COLUMN IF NOT EXISTS recruiter_rate numeric(10,2);
