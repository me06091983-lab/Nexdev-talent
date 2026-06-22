-- Rubix Matrix: rubrică de evaluare per rol (criterii compuse din JD, nu skilluri individuale)
-- Dacă tabelul vechi există deja (cu coloane skill_name/type), îl ștergem și recreăm corect.
DROP TABLE IF EXISTS role_rubix_criteria;

CREATE TABLE role_rubix_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  criterion TEXT NOT NULL,
  weight INTEGER NOT NULL DEFAULT 10 CHECK (weight >= 0 AND weight <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_role_rubix_role_id ON role_rubix_criteria(role_id);

ALTER TABLE role_rubix_criteria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read" ON role_rubix_criteria
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert" ON role_rubix_criteria
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update" ON role_rubix_criteria
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated delete" ON role_rubix_criteria
  FOR DELETE TO authenticated USING (true);
