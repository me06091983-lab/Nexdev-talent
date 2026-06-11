-- ===================================================
-- Migrare F3 — NexDev Talent
-- Rulează în Supabase SQL Editor
-- SAFE: idempotent unde e posibil
-- ===================================================

-- 1. Mapează statusurile vechi → noile 6 statusuri
UPDATE submissions SET status = 'pipeline'
  WHERE status IN ('new','cv_received','in_analysis','match_identified','to_contact','contacted','waiting_for_job','closed');

UPDATE submissions SET status = 'submitted'
  WHERE status IN ('screening_scheduled','screening_done');

UPDATE submissions SET status = 'shortlisted'
  WHERE status = 'proposed_to_client';

UPDATE submissions SET status = 'rejected'
  WHERE status = 'not_suitable';

-- 2. Înlocuiește constraint-ul de status
ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_status_check;

ALTER TABLE submissions
  ADD CONSTRAINT submissions_status_check
  CHECK (status IN ('pipeline','submitted','shortlisted','interview','rejected','offer'));

-- 3. Schimbă valoarea default
ALTER TABLE submissions ALTER COLUMN status SET DEFAULT 'pipeline';

-- 4. Adaugă coloana interviews (jsonb) pentru cele 4 sloturi de interviu
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS interviews jsonb NOT NULL DEFAULT '[]'::jsonb;
