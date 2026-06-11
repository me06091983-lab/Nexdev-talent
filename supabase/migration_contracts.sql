-- ===================================================
-- Migrare Contracte — NexDev Talent
-- Rulează în Supabase SQL Editor
-- ===================================================

-- 1. Adaugă rate_type la contracts
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS rate_type text NOT NULL DEFAULT 'daily'
  CHECK (rate_type IN ('hourly', 'daily'));

-- 2. RLS policies pentru contracts (dacă nu există)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'contracts' AND policyname = 'Authenticated users can read contracts'
  ) THEN
    CREATE POLICY "Authenticated users can read contracts"
      ON contracts FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'contracts' AND policyname = 'Authenticated users can write contracts'
  ) THEN
    CREATE POLICY "Authenticated users can write contracts"
      ON contracts FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
