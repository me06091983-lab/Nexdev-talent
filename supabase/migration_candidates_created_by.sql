ALTER TABLE candidates ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid();
CREATE INDEX IF NOT EXISTS candidates_created_by_idx ON candidates(created_by);
