ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_candidate_status_check;
ALTER TABLE candidates ADD CONSTRAINT candidates_candidate_status_check
  CHECK (candidate_status IN ('activ', 'pasiv', 'angajat', 'blacklist'));
