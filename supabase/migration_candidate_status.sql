ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS candidate_status text NOT NULL DEFAULT 'pasiv'
  CHECK (candidate_status IN ('activ', 'pasiv', 'angajat'));
