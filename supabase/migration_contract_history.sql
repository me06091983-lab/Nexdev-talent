create table if not exists contract_history (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts(id) on delete cascade,
  changed_at timestamptz not null default now(),
  -- snapshot after the change
  end_date date,
  pay_rate numeric(10,2) not null,
  bill_rate numeric(10,2) not null,
  -- what changed: { end_date: {from, to}, pay_rate: {from, to, pct}, bill_rate: {from, to, pct} }
  changes jsonb not null default '{}'
);

create index if not exists contract_history_contract_id_idx on contract_history(contract_id, changed_at desc);
