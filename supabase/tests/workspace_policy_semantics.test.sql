begin;

select plan(8);

-- These checks target the current split-policy design. The older integration
-- branch expected FOR ALL write policies; those were intentionally replaced
-- by separate INSERT / UPDATE / DELETE policies to keep SELECT predicates
-- independent from the stricter member_can_write() predicate.

select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'projects'
      and policyname = 'projects_owner_select' and cmd = 'SELECT'
      and roles = array['authenticated']::name[]
      and qual ilike '%owner_id%' and qual ilike '%member_can_access%'
  )
  and exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'conversations'
      and policyname = 'conversations_owner_select' and cmd = 'SELECT'
      and roles = array['authenticated']::name[]
      and qual ilike '%owner_id%' and qual ilike '%member_can_access%'
  ),
  'project and conversation reads remain scoped to the owner and member access state'
);

select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'projects'
      and policyname = 'projects_owner_insert' and cmd = 'INSERT'
      and roles = array['authenticated']::name[]
      and with_check ilike '%owner_id%' and with_check ilike '%member_can_write%'
  ),
  'project inserts require ownership and an active writable member'
);

select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'projects'
      and policyname = 'projects_owner_update' and cmd = 'UPDATE'
      and roles = array['authenticated']::name[]
      and qual ilike '%owner_id%' and qual ilike '%member_can_write%'
      and with_check ilike '%owner_id%' and with_check ilike '%member_can_write%'
  ),
  'project updates enforce ownership and write eligibility before and after mutation'
);

select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'projects'
      and policyname = 'projects_owner_delete' and cmd = 'DELETE'
      and roles = array['authenticated']::name[]
      and qual ilike '%owner_id%' and qual ilike '%member_can_write%'
  ),
  'project deletion requires ownership and an active writable member'
);

select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'conversations'
      and policyname = 'conversations_owner_insert' and cmd = 'INSERT'
      and roles = array['authenticated']::name[]
      and with_check ilike '%owner_id%'
      and with_check ilike '%member_can_write%'
      and with_check ilike '%projects%'
  ),
  'conversation inserts require owner write access and reject cross-owner project links'
);

select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'conversations'
      and policyname = 'conversations_owner_update' and cmd = 'UPDATE'
      and roles = array['authenticated']::name[]
      and qual ilike '%owner_id%' and qual ilike '%member_can_write%'
      and with_check ilike '%owner_id%'
      and with_check ilike '%member_can_write%'
      and with_check ilike '%projects%'
  ),
  'conversation updates enforce owner write access and project ownership on the new row'
);

select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'conversations'
      and policyname = 'conversations_owner_delete' and cmd = 'DELETE'
      and roles = array['authenticated']::name[]
      and qual ilike '%owner_id%' and qual ilike '%member_can_write%'
  ),
  'conversation deletion requires ownership and an active writable member'
);

select ok(
  not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename in ('projects', 'conversations')
      and (
        coalesce(qual, '') ~* '(^|[^a-z_])true([^a-z_]|$)'
        or coalesce(with_check, '') ~* '(^|[^a-z_])true([^a-z_]|$)'
      )
  ),
  'project and conversation policies contain no unconditional true predicates'
);

select * from finish();
rollback;
