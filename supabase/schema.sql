-- NexDev Talent — Schema completă
-- Rulează în Supabase SQL Editor

-- =====================
-- NOMENCLATOARE
-- =====================

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);

create table if not exists skills (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text not null default 'General',
  created_at timestamptz default now()
);

create table if not exists partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  contact_email text,
  commission_terms text,
  created_at timestamptz default now()
);

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  fieldglass_enabled boolean default false,
  created_at timestamptz default now()
);

-- =====================
-- CANDIDAȚI
-- =====================

create table if not exists candidates (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  linkedin_url text,
  location text,
  years_experience integer,
  seniority text check (seniority in ('junior','mid','senior','lead','principal')),
  profile_id uuid references profiles(id) on delete set null,
  rate numeric(10,2),
  currency text not null default 'EUR' check (currency in ('EUR','USD','GBP','RON')),
  source_type text not null default 'own' check (source_type in ('own','external_recruiter','partner')),
  partner_id uuid references partners(id) on delete set null,
  successful boolean not null default false,
  successful_client text,
  cv_file_path text,
  notes text,
  cv_upload_token uuid unique default gen_random_uuid(),
  gdpr_consent boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists candidate_skills (
  candidate_id uuid not null references candidates(id) on delete cascade,
  skill_id uuid not null references skills(id) on delete cascade,
  primary key (candidate_id, skill_id)
);

-- =====================
-- ROLURI
-- =====================

create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  client_id uuid not null references clients(id) on delete restrict,
  description text,
  required_skills text,
  preferred_skills text,
  location text,
  seniority text check (seniority in ('junior','mid','senior','lead','principal')),
  collaboration_type text check (collaboration_type in ('full_time','part_time','contract','freelance')),
  status text not null default 'active' check (status in ('draft','active','on_hold','closed','filled')),
  fieldglass_id text,
  deadline date,
  deleted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists role_stages (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references roles(id) on delete cascade,
  name text not null,
  order_index integer not null default 0,
  created_at timestamptz default now()
);

-- =====================
-- SUBMISII (PIPELINE)
-- =====================

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete restrict,
  role_id uuid not null references roles(id) on delete restrict,
  current_stage_id uuid references role_stages(id) on delete set null,
  status text not null default 'new' check (status in (
    'new','cv_received','in_analysis','match_identified',
    'to_contact','contacted','screening_scheduled','screening_done',
    'proposed_to_client','not_suitable','waiting_for_job','closed'
  )),
  ai_score numeric(5,2),
  ai_summary text,
  deleted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(candidate_id, role_id)
);

create table if not exists stage_history (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id) on delete cascade,
  stage_id uuid references role_stages(id) on delete set null,
  stage_name text not null,
  result text,
  feedback text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- =====================
-- CONTRACTE
-- =====================

create table if not exists contracts (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references submissions(id) on delete restrict,
  start_date date not null,
  end_date date,
  pay_rate numeric(10,2) not null,
  bill_rate numeric(10,2) not null,
  currency text not null default 'EUR' check (currency in ('EUR','USD','GBP','RON')),
  partner_commission numeric(10,2),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =====================
-- TRIGGERS updated_at
-- =====================

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger candidates_updated_at before update on candidates
  for each row execute function update_updated_at();

create trigger roles_updated_at before update on roles
  for each row execute function update_updated_at();

create trigger submissions_updated_at before update on submissions
  for each row execute function update_updated_at();

create trigger contracts_updated_at before update on contracts
  for each row execute function update_updated_at();

-- =====================
-- ROW LEVEL SECURITY
-- =====================

alter table profiles enable row level security;
alter table skills enable row level security;
alter table partners enable row level security;
alter table clients enable row level security;
alter table candidates enable row level security;
alter table candidate_skills enable row level security;
alter table roles enable row level security;
alter table role_stages enable row level security;
alter table submissions enable row level security;
alter table stage_history enable row level security;
alter table contracts enable row level security;

-- Politici: doar utilizatorii autentificați văd datele
create policy "Authenticated users can read all" on profiles for select to authenticated using (true);
create policy "Authenticated users can write" on profiles for all to authenticated using (true) with check (true);

create policy "Authenticated users can read all" on skills for select to authenticated using (true);
create policy "Authenticated users can write" on skills for all to authenticated using (true) with check (true);

create policy "Authenticated users can read all" on partners for select to authenticated using (true);
create policy "Authenticated users can write" on partners for all to authenticated using (true) with check (true);

create policy "Authenticated users can read all" on clients for select to authenticated using (true);
create policy "Authenticated users can write" on clients for all to authenticated using (true) with check (true);

create policy "Authenticated users can read all" on candidates for select to authenticated using (true);
create policy "Authenticated users can write" on candidates for all to authenticated using (true) with check (true);

create policy "Authenticated users can read all" on candidate_skills for select to authenticated using (true);
create policy "Authenticated users can write" on candidate_skills for all to authenticated using (true) with check (true);

create policy "Authenticated users can read all" on roles for select to authenticated using (true);
create policy "Authenticated users can write" on roles for all to authenticated using (true) with check (true);

create policy "Authenticated users can read all" on role_stages for select to authenticated using (true);
create policy "Authenticated users can write" on role_stages for all to authenticated using (true) with check (true);

create policy "Authenticated users can read all" on submissions for select to authenticated using (true);
create policy "Authenticated users can write" on submissions for all to authenticated using (true) with check (true);

create policy "Authenticated users can read all" on stage_history for select to authenticated using (true);
create policy "Authenticated users can write" on stage_history for all to authenticated using (true) with check (true);

create policy "Authenticated users can read all" on contracts for select to authenticated using (true);
create policy "Authenticated users can write" on contracts for all to authenticated using (true) with check (true);
