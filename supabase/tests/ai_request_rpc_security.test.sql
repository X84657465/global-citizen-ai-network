begin;

select plan(12);

-- AI request lifecycle RPCs are privileged server-side entry points.
-- They must be SECURITY DEFINER with an empty search_path, executable by
-- service_role only, and unavailable to anon/authenticated callers.
select ok(
  exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'claim_ai_request'
      and p.prosecdef and p.proconfig @> array['search_path=""']
  ),
  'claim_ai_request is SECURITY DEFINER with an empty search_path'
);
select ok(
  exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'claim_ai_request'
      and not has_function_privilege('anon', p.oid, 'EXECUTE')
      and not has_function_privilege('authenticated', p.oid, 'EXECUTE')
  ),
  'claim_ai_request cannot be executed by client roles'
);
select ok(
  exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'claim_ai_request'
      and has_function_privilege('service_role', p.oid, 'EXECUTE')
  ),
  'claim_ai_request is executable by service_role'
);

select ok(
  exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'complete_ai_chat_request'
      and p.prosecdef and p.proconfig @> array['search_path=""']
  ),
  'complete_ai_chat_request is SECURITY DEFINER with an empty search_path'
);
select ok(
  exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'complete_ai_chat_request'
      and not has_function_privilege('anon', p.oid, 'EXECUTE')
      and not has_function_privilege('authenticated', p.oid, 'EXECUTE')
  ),
  'complete_ai_chat_request cannot be executed by client roles'
);
select ok(
  exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'complete_ai_chat_request'
      and has_function_privilege('service_role', p.oid, 'EXECUTE')
  ),
  'complete_ai_chat_request is executable by service_role'
);

select ok(
  exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'fail_ai_chat_request'
      and p.prosecdef and p.proconfig @> array['search_path=""']
  ),
  'fail_ai_chat_request is SECURITY DEFINER with an empty search_path'
);
select ok(
  exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'fail_ai_chat_request'
      and not has_function_privilege('anon', p.oid, 'EXECUTE')
      and not has_function_privilege('authenticated', p.oid, 'EXECUTE')
  ),
  'fail_ai_chat_request cannot be executed by client roles'
);
select ok(
  exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'fail_ai_chat_request'
      and has_function_privilege('service_role', p.oid, 'EXECUTE')
  ),
  'fail_ai_chat_request is executable by service_role'
);

select ok(
  exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'mark_ai_request_reconciliation_required'
      and p.prosecdef and p.proconfig @> array['search_path=""']
  ),
  'mark_ai_request_reconciliation_required is SECURITY DEFINER with an empty search_path'
);
select ok(
  exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'mark_ai_request_reconciliation_required'
      and not has_function_privilege('anon', p.oid, 'EXECUTE')
      and not has_function_privilege('authenticated', p.oid, 'EXECUTE')
  ),
  'mark_ai_request_reconciliation_required cannot be executed by client roles'
);
select ok(
  exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'mark_ai_request_reconciliation_required'
      and has_function_privilege('service_role', p.oid, 'EXECUTE')
  ),
  'mark_ai_request_reconciliation_required is executable by service_role'
);

select * from finish();
rollback;
