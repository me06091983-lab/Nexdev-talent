CREATE TABLE IF NOT EXISTS candidate_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  role_id uuid REFERENCES roles(id) ON DELETE SET NULL,
  call_date date NOT NULL,
  notes text NOT NULL,
  created_by uuid,
  created_by_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS candidate_calls_candidate_idx ON candidate_calls(candidate_id, call_date DESC);

ALTER TABLE candidate_calls ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can read all" ON candidate_calls;
DROP POLICY IF EXISTS "Authenticated users can write" ON candidate_calls;
CREATE POLICY "Authenticated users can read all" ON candidate_calls FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can write" ON candidate_calls FOR ALL TO authenticated USING (true) WITH CHECK (true);
