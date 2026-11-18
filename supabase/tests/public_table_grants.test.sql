begin;

select plan(14);

select ok(
  not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p', 'v', 'm')
      and (
        has_table_privilege('anon', c.oid, 'SELECT')
        or has_table_privilege('anon', c.oid, 'INSERT')
        or has_table_privilege('anon', c.oid, 'UPDATE')
        or has_table_privilege('anon', c.oid, 'DELETE')
      )
  ),
  'anonymous API role has no direct access to public-schema relations'
);

select ok(
  not exists (
    select 1
    from unnest(array[
      'ai_budget_reservations',
      'ai_reconciliation_events',
      'ai_request_idempotency',
      'ai_request_rate_limits',
      'audit_logs',
      'platform_ai_controls',
      'provider_invoice_imports',
      'task_review_idempotency',
      'task_appeal_review_idempotency'
    ]) as t(table_name)
    where has_table_privilege('authenticated', format('public.%I', table_name), 'SELECT')
       or has_table_privilege('authenticated', format('public.%I', table_name), 'INSERT')
       or has_table_privilege('authenticated', format('public.%I', table_name), 'UPDATE')
       or has_table_privilege('authenticated', format('public.%I', table_name), 'DELETE')
  ),
  'internal controls, reconciliation, audit, and idempotency tables are service-only'
);

select ok(
  has_table_privilege('authenticated', 'public.profiles', 'SELECT')
  and has_table_privilege('authenticated', 'public.profiles', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.profiles', 'INSERT')
  and not has_table_privilege('authenticated', 'public.profiles', 'DELETE'),
  'members can read and update profiles but cannot insert or delete them directly'
);

select ok(
  has_table_privilege('authenticated', 'public.projects', 'SELECT')
  and has_table_privilege('authenticated', 'public.projects', 'INSERT')
  and has_table_privilege('authenticated', 'public.projects', 'UPDATE')
  and has_table_privilege('authenticated', 'public.projects', 'DELETE')
  and has_table_privilege('authenticated', 'public.conversations', 'SELECT')
  and has_table_privilege('authenticated', 'public.conversations', 'INSERT')
  and has_table_privilege('authenticated', 'public.conversations', 'UPDATE')
  and has_table_privilege('authenticated', 'public.conversations', 'DELETE'),
  'members retain the CRUD privileges required for their owned workspace resources'
);

select ok(
  has_table_privilege('authenticated', 'public.messages', 'SELECT')
  and has_table_privilege('authenticated', 'public.messages', 'INSERT')
  and not has_table_privilege('authenticated', 'public.messages', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.messages', 'DELETE'),
  'members can read and append messages but cannot mutate or delete history'
);

select ok(
  has_table_privilege('authenticated', 'public.contribution_tasks', 'SELECT')
  and has_table_privilege('authenticated', 'public.task_submissions', 'SELECT')
  and has_table_privilege('authenticated', 'public.task_submissions', 'INSERT')
  and has_table_privilege('authenticated', 'public.task_reviews', 'SELECT')
  and has_table_privilege('authenticated', 'public.task_appeals', 'SELECT')
  and has_table_privilege('authenticated', 'public.task_appeals', 'INSERT'),
  'member contribution discovery, submissions, review visibility, and appeals remain available'
);

select ok(
  has_table_privilege('authenticated', 'public.ai_requests', 'SELECT')
  and has_table_privilege('authenticated', 'public.ai_cost_ledger', 'SELECT')
  and has_table_privilege('authenticated', 'public.ai_user_limits', 'SELECT')
  and has_table_privilege('authenticated', 'public.contribution_ledger', 'SELECT')
  and has_table_privilege('authenticated', 'public.reward_ledger', 'SELECT')
  and not has_table_privilege('authenticated', 'public.ai_cost_ledger', 'INSERT')
  and not has_table_privilege('authenticated', 'public.contribution_ledger', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.reward_ledger', 'DELETE'),
  'member-facing usage and ledgers remain read-only'
);

select ok(
  has_table_privilege('service_role', 'public.platform_ai_controls', 'SELECT')
  and has_table_privilege('service_role', 'public.ai_budget_reservations', 'UPDATE')
  and has_table_privilege('service_role', 'public.audit_logs', 'INSERT'),
  'trusted server role retains required internal table access'
);

select ok(
  not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and (has_function_privilege('anon', p.oid, 'EXECUTE') or has_function_privilege('authenticated', p.oid, 'EXECUTE'))
  ),
  'public-schema functions are not directly callable by anon or authenticated roles'
);

select ok(
  has_function_privilege('authenticated', 'private.member_can_access()', 'EXECUTE')
  and has_function_privilege('authenticated', 'private.member_can_write()', 'EXECUTE'),
  'authenticated members retain execute access to private RLS helper functions'
);

select ok(
  not exists (
    select 1
    from pg_default_acl d
    cross join lateral aclexplode(d.defaclacl) acl
    join pg_roles grantee on grantee.oid = acl.grantee
    where d.defaclrole = (select oid from pg_roles where rolname = 'postgres')
      and d.defaclnamespace = 'public'::regnamespace
      and d.defaclobjtype = 'r'
      and grantee.rolname in ('anon', 'authenticated')
      and acl.privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER')
  ),
  'future tables created by the application migration role do not inherit anon/authenticated grants'
);

select ok(
  not exists (
    select 1
    from pg_default_acl d
    cross join lateral aclexplode(d.defaclacl) acl
    join pg_roles grantee on grantee.oid = acl.grantee
    where d.defaclrole = (select oid from pg_roles where rolname = 'postgres')
      and d.defaclnamespace = 'public'::regnamespace
      and d.defaclobjtype = 'S'
      and grantee.rolname in ('anon', 'authenticated')
      and acl.privilege_type in ('USAGE', 'SELECT', 'UPDATE')
  ),
  'future sequences created by the application migration role do not inherit anon/authenticated grants'
);

select ok(
  not exists (
    select 1
    from pg_default_acl d
    cross join lateral aclexplode(d.defaclacl) acl
    join pg_roles grantee on grantee.oid = acl.grantee
    where d.defaclrole = (select oid from pg_roles where rolname = 'postgres')
      and d.defaclnamespace = 'public'::regnamespace
      and d.defaclobjtype = 'f'
      and (grantee.rolname in ('anon', 'authenticated') or acl.grantee = 0)
      and acl.privilege_type = 'EXECUTE'
  ),
  'future public functions created by the application migration role are not executable by API roles by default'
);

select * from finish();
rollback;
