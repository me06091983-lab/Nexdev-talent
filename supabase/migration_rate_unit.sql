-- Add rate_unit column to candidates (zi / ora)
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS rate_unit VARCHAR(10) NOT NULL DEFAULT 'zi';
