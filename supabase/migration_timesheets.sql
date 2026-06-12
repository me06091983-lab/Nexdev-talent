create table if not exists timesheets (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  contract_id uuid not null references contracts(id) on delete cascade,
  year integer not null,
  month integer not null check (month between 1 and 12),
  hours numeric(6,2) not null default 0,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(contract_id, year, month)
);
