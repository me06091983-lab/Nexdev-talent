-- Adaugă câmpurile de rate per submisie
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS submission_rate numeric(10,2);
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS submission_currency text DEFAULT 'EUR';
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS submission_rate_type text DEFAULT 'daily';
