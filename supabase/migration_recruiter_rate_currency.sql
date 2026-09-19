ALTER TABLE roles ADD COLUMN IF NOT EXISTS recruiter_rate_currency text NOT NULL DEFAULT 'EUR';
ALTER TABLE roles ADD COLUMN IF NOT EXISTS recruiter_rate_type text NOT NULL DEFAULT 'daily';
