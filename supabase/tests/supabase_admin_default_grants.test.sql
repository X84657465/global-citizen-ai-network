begin;

select plan(6);

-- Exercise the managed owner role's defaults, not merely the postgres defaults.
set local role supabase_admin;
create table public.__supabase_admin_default_privilege_probe (id integer);
create sequence public.__supabase_admin_default_sequence_probe;
create function public.__supabase_admin_default_function_probe()
returns integer language sql as 'select 1';
reset role;

select ok(
  not has_table_privilege('anon', 'public.__supabase_admin_default_privilege_probe', 'SELECT')
  and not has_table_privilege('anon', 'public.__supabase_admin_default_privilege_probe', 'INSERT')
  and not has_table_privilege('anon', 'public.__supabase_admin_default_privilege_probe', 'UPDATE')
  and not has_table_privilege('anon', 'public.__supabase_admin_default_privilege_probe', 'DELETE')
  and not has_table_privilege('anon', 'public.__supabase_admin_default_privilege_probe', 'TRUNCATE')
  and not has_table_privilege('anon', 'public.__supabase_admin_default_privilege_probe', 'REFERENCES')
  and not has_table_privilege('anon', 'public.__supabase_admin_default_privilege_probe', 'TRIGGER')
  and not has_table_privilege('authenticated', 'public.__supabase_admin_default_privilege_probe', 'SELECT')
  and not has_table_privilege('authenticated', 'public.__supabase_admin_default_privilege_probe', 'INSERT')
  and not has_table_privilege('authenticated', 'public.__supabase_admin_default_privilege_probe', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.__supabase_admin_default_privilege_probe', 'DELETE')
  and not has_table_privilege('authenticated', 'public.__supabase_admin_default_privilege_probe', 'TRUNCATE')
  and not has_table_privilege('authenticated', 'public.__supabase_admin_default_privilege_probe', 'REFERENCES')
  and not has_table_privilege('authenticated', 'public.__supabase_admin_default_privilege_probe', 'TRIGGER'),
  'supabase_admin-created public tables grant no direct privileges to browser roles'
);

select ok(
  not has_sequence_privilege('anon', 'public.__supabase_admin_default_sequence_probe', 'USAGE')
  and not has_sequence_privilege('anon', 'public.__supabase_admin_default_sequence_probe', 'SELECT')
  and not has_sequence_privilege('anon', 'public.__supabase_admin_default_sequence_probe', 'UPDATE')
  and not has_sequence_privilege('authenticated', 'public.__supabase_admin_default_sequence_probe', 'USAGE')
  and not has_sequence_privilege('authenticated', 'public.__supabase_admin_default_sequence_probe', 'SELECT')
  and not has_sequence_privilege('authenticated', 'public.__supabase_admin_default_sequence_probe', 'UPDATE'),
  'supabase_admin-created public sequences grant no direct privileges to browser roles'
);

select ok(
  not has_function_privilege('anon', 'public.__supabase_admin_default_function_probe()', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.__supabase_admin_default_function_probe()', 'EXECUTE'),
  'supabase_admin-created public functions are not executable by browser roles'
);

select ok(
  not exists (
    select 1
    from pg_proc p
    cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
    where p.oid = 'public.__supabase_admin_default_function_probe()'::regprocedure
      and acl.grantee = 0
      and acl.privilege_type = 'EXECUTE'
  ),
  'supabase_admin-created public functions do not inherit PUBLIC execute'
);

select ok(
  has_table_privilege('service_role', 'public.__supabase_admin_default_privilege_probe', 'SELECT')
  and has_table_privilege('service_role', 'public.__supabase_admin_default_privilege_probe', 'INSERT'),
  'service_role retains its managed default table access'
);

select ok(
  has_sequence_privilege('service_role', 'public.__supabase_admin_default_sequence_probe', 'USAGE')
  and has_function_privilege('service_role', 'public.__supabase_admin_default_function_probe()', 'EXECUTE'),
  'service_role retains its managed default sequence and function access'
);

select * from finish();
rollback;
