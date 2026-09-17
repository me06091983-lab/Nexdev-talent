-- Tracks how each discovered/proposed candidate entered the Recruiter workspace.
alter table recruiter_discovered_candidates
  add column if not exists source text not null default 'database'
  check (source in ('database', 'linkedin', 'cv_upload', 'manual'));
