alter table contracts
  add column if not exists contract_status text not null default 'activ'
    check (contract_status in ('activ', 'terminat')),
  add column if not exists termination_reason text;

-- Marchează imediat contractele cu end_date în trecut ca terminate
update contracts
set contract_status = 'terminat',
    termination_reason = 'Expirare contract'
where contract_status = 'activ'
  and end_date is not null
  and end_date < current_date;
