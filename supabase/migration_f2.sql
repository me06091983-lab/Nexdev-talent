-- ===================================================
-- Migrare F2 — NexDev Talent
-- Rulează în Supabase SQL Editor (Dashboard → SQL Editor)
-- SAFE: folosește IF NOT EXISTS / IF EXISTS
-- ===================================================

-- 1. Coloane noi pentru tabelul candidates
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS rate_min       numeric(10,2),
  ADD COLUMN IF NOT EXISTS rate_wish      numeric(10,2),
  ADD COLUMN IF NOT EXISTS experiences    jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS certifications jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS projects       jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS achievements   jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 2. Elimină constraint check pe source_type (acum acceptăm text liber)
ALTER TABLE candidates
  DROP CONSTRAINT IF EXISTS candidates_source_type_check;

ALTER TABLE candidates
  ALTER COLUMN source_type DROP NOT NULL,
  ALTER COLUMN source_type SET DEFAULT '';

-- 3. Tabel role_skills (M2M roluri ↔ skilluri din nomenclator)
CREATE TABLE IF NOT EXISTS role_skills (
  role_id    uuid NOT NULL REFERENCES roles(id)  ON DELETE CASCADE,
  skill_id   uuid NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  skill_type text NOT NULL DEFAULT 'required'
             CHECK (skill_type IN ('required', 'preferred')),
  PRIMARY KEY (role_id, skill_id, skill_type)
);

ALTER TABLE role_skills ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'role_skills'
      AND policyname = 'Authenticated users can read all'
  ) THEN
    CREATE POLICY "Authenticated users can read all"
      ON role_skills FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'role_skills'
      AND policyname = 'Authenticated users can write'
  ) THEN
    CREATE POLICY "Authenticated users can write"
      ON role_skills FOR ALL TO authenticated
      USING (true) WITH CHECK (true);
  END IF;
END $$;
