-- ===================================================
-- Migrare Contracte v3 — comisioane duble + tip
-- Rulează în Supabase SQL Editor
-- ===================================================

-- Tip pentru comisionul existent (implicit lunar)
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS partner_commission_type text NOT NULL DEFAULT 'monthly'
  CHECK (partner_commission_type IN ('monthly', 'onetime'));

-- Al doilea comision + tipul lui
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS partner_commission_2 numeric;

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS partner_commission_2_type text NOT NULL DEFAULT 'monthly'
  CHECK (partner_commission_2_type IN ('monthly', 'onetime'));

-- Reîncarcă schema cache
NOTIFY pgrst, 'reload schema';
