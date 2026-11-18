begin;

select plan(8);

select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'conversations'
      and policyname = 'conversations_owner_select' and cmd = 'SELECT'
      and roles = array['authenticated']::name[]
      and qual ilike '%owner_id%' and qual ilike '%member_can_access%'
  ),
  'conversation SELECT remains owner-scoped and permits active/restricted members'
);
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'conversations'
      and policyname = 'conversations_owner_write' and cmd = 'ALL'
      and roles = array['authenticated']::name[]
      and qual ilike '%owner_id%' and qual ilike '%member_can_write%'
  ),
  'conversation writes remain owner-scoped and require active members'
);
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'conversations'
      and policyname = 'conversations_owner_write'
      and with_check ilike '%member_can_write%'
      and with_check ilike '%projects%'
      and with_check ilike '%owner_id%'
  ),
  'conversation writes cannot attach another member project'
);
select ok(
  not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'conversations'
      and (coalesce(qual, '') ilike '%true%' or coalesce(with_check, '') ilike '%true%')
  ),
  'conversation policies do not contain unconditional true predicates'
);

select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'projects'
      and policyname = 'projects_owner_select' and cmd = 'SELECT'
      and roles = array['authenticated']::name[]
      and qual ilike '%owner_id%' and qual ilike '%member_can_access%'
  ),
  'project SELECT remains owner-scoped and permits active/restricted members'
);
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'projects'
      and policyname = 'projects_owner_write' and cmd = 'ALL'
      and roles = array['authenticated']::name[]
      and qual ilike '%owner_id%' and qual ilike '%member_can_write%'
  ),
  'project writes remain owner-scoped and require active members'
);
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'projects'
      and policyname = 'projects_owner_write'
      and with_check ilike '%owner_id%' and with_check ilike '%member_can_write%'
  ),
  'project write checks enforce owner and active-member conditions'
);
select ok(
  not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'projects'
      and (coalesce(qual, '') ilike '%true%' or coalesce(with_check, '') ilike '%true%')
  ),
  'project policies do not contain unconditional true predicates'
);

select * from finish();
rollback;
