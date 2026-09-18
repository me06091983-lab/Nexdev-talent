-- Tracks which logged-in account actually added a candidate to a role's
-- pipeline, so the Recruiter role window can show only "my" submissions
-- instead of everyone's.
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Backfill: every submission created so far was added through the
-- office@nexdev.vip account (the only one actively used in the app so far).
UPDATE submissions
SET submitted_by = (SELECT id FROM auth.users WHERE email = 'office@nexdev.vip')
WHERE submitted_by IS NULL;
