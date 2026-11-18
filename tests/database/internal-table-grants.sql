-- Run after applying 0019_revoke_client_access_to_internal_tables.sql.
-- This assertion is intentionally read-only and fails if client grants reappear.
do $$
declare
  unexpected_grants integer;
  rls_disabled integer;
begin
  select count(*) into unexpected_grants
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name in ('audit_logs', 'platform_ai_controls', 'provider_invoice_imports')
    and grantee in ('anon', 'authenticated');

  if unexpected_grants <> 0 then
    raise exception 'Expected zero anon/authenticated table grants on internal tables; found %', unexpected_grants;
  end if;

  select count(*) into rls_disabled
  from pg_tables
  where schemaname = 'public'
    and tablename in ('audit_logs', 'platform_ai_controls', 'provider_invoice_imports')
    and rowsecurity = false;

  if rls_disabled <> 0 then
    raise exception 'RLS must remain enabled on all internal operational tables';
  end if;
end
$$;
