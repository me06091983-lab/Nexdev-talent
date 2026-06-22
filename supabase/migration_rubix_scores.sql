-- Scoruri Rubix per candidat per criteriu
CREATE TABLE IF NOT EXISTS submission_rubix_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  rubix_criterion_id UUID NOT NULL REFERENCES role_rubix_criteria(id) ON DELETE CASCADE,
  score NUMERIC(3,1) NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 5),
  evidence TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(submission_id, rubix_criterion_id)
);

CREATE INDEX IF NOT EXISTS idx_sub_rubix_sub_id ON submission_rubix_scores(submission_id);
CREATE INDEX IF NOT EXISTS idx_sub_rubix_crit_id ON submission_rubix_scores(rubix_criterion_id);

ALTER TABLE submission_rubix_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated all" ON submission_rubix_scores FOR ALL TO authenticated USING (true) WITH CHECK (true);
