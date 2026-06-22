-- Coloana rubix_fit pe submissions (overall fit % calculat din Rubix Matrix)
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS rubix_fit NUMERIC(5,1);
