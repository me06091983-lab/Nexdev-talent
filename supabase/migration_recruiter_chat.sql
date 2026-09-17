-- Recruiter workspace persistence: chat history + discovered candidates per role.
-- Model de acces identic cu restul schemei: un singur user admin autentificat, acces complet.

create table if not exists recruiter_chat_messages (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references roles(id) on delete cascade,
  sender text not null check (sender in ('user', 'system')),
  text text not null,
  created_at timestamptz not null default now()
);

create index if not exists recruiter_chat_messages_role_id_idx
  on recruiter_chat_messages(role_id, created_at);

alter table public.recruiter_chat_messages enable row level security;
create policy "Authenticated users can read all" on public.recruiter_chat_messages for select to authenticated using (true);
create policy "Authenticated users can write" on public.recruiter_chat_messages for all to authenticated using (true) with check (true);

create table if not exists recruiter_discovered_candidates (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references roles(id) on delete cascade,
  candidate_id uuid not null references candidates(id) on delete cascade,
  score numeric not null default 0,
  matched_skills jsonb not null default '[]',
  missing_skills jsonb not null default '[]',
  summary text,
  rate_min numeric,
  rate_wish numeric,
  currency text default 'EUR',
  created_at timestamptz not null default now(),
  unique (role_id, candidate_id)
);

create index if not exists recruiter_discovered_candidates_role_id_idx
  on recruiter_discovered_candidates(role_id, score desc);

alter table public.recruiter_discovered_candidates enable row level security;
create policy "Authenticated users can read all" on public.recruiter_discovered_candidates for select to authenticated using (true);
create policy "Authenticated users can write" on public.recruiter_discovered_candidates for all to authenticated using (true) with check (true);
