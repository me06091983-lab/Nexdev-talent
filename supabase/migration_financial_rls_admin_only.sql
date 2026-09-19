-- Financial tables (contract amounts, rate history, timesheets, invoices) are readable/writable by admins only.
-- Recruiters keep seeing that a contract exists via /api/candidates/[id]/history (server-side, amounts stripped).
-- Server routes that must work for everyone use the service-role client, which bypasses RLS.

do $$
declare t text;
begin
  foreach t in array array['contracts', 'contract_history', 'timesheets', 'manual_invoices'] loop
    execute format('drop policy if exists "Authenticated users can read all" on public.%I', t);
    execute format('drop policy if exists "Authenticated users can write" on public.%I', t);
    execute format('drop policy if exists "Admins only" on public.%I', t);
    execute format($p$create policy "Admins only" on public.%I for all to authenticated
      using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
      with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')$p$, t);
  end loop;
end $$;
