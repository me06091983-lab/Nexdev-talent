-- Partners.name should be optional — the app (Partners form, and now the
-- Recruiter add-candidate flow) already treats it as optional ("Company
-- name" field can be left blank), but the DB still enforced NOT NULL.
ALTER TABLE partners ALTER COLUMN name DROP NOT NULL;
