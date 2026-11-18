begin;

select plan(5);

with required(function_name) as (
  select unnest(array[
    'claim_ai_request',
    'cleanup_expired_ai_operational_records',
    'complete_ai_chat_request',
    'complete_ai_request_idempotency',
    'consume_ai_request_rate_limit',
    'fail_ai_chat_request',
    'fail_ai_request_idempotency',
    'finalize_ai_budget',
    'list_stale_ai_requests',
    'mark_ai_request_reconciliation_required',
    'release_ai_budget',
    'reserve_ai_budget',
  ]::text[])
),
actual as (
  select required.function_name, p.oid
  from required
  left join pg_proc p
    on p.proname = required.function_name
   and p.pronamespace = 'public'::regnamespace
)
select ok(
  not exists (select 1 from actual where oid is null),
  'all 12 service-role AI lifecycle RPCs exist in the public schema'
);

with required(function_name) as (
  select unnest(array[
    'claim_ai_request',
    'cleanup_expired_ai_operational_records',
    'complete_ai_chat_request',
    'complete_ai_request_idempotency',
    'consume_ai_request_rate_limit',
    'fail_ai_chat_request',
    'fail_ai_request_idempotency',
    'finalize_ai_budget',
    'list_stale_ai_requests',
    'mark_ai_request_reconciliation_required',
    'release_ai_budget',
    'reserve_ai_budget',
    'resolve_ai_reconciliation'
  ]::text[])
)
select ok(
  not exists (
    select 1
    from required
    left join pg_proc p
      on p.proname = required.function_name
     and p.pronamespace = 'public'::regnamespace
    where p.oid is null
       or not p.prosecdef
       or not coalesce(p.proconfig @> array['search_path=""'], false)
  ),
  'all AI lifecycle RPCs are SECURITY DEFINER with an empty search_path'
);

with required(function_name) as (
  select unnest(array[
    'claim_ai_request',
    'cleanup_expired_ai_operational_records',
    'complete_ai_chat_request',
    'complete_ai_request_idempotency',
    'consume_ai_request_rate_limit',
    'fail_ai_chat_request',
    'fail_ai_request_idempotency',
    'finalize_ai_budget',
    'list_stale_ai_requests',
    'mark_ai_request_reconciliation_required',
    'release_ai_budget',
    'reserve_ai_budget',
    'resolve_ai_reconciliation'
  ]::text[])
)
select ok(
  not exists (
    select 1
    from required
    join pg_proc p
      on p.proname = required.function_name
     and p.pronamespace = 'public'::regnamespace
    where has_function_privilege('anon', p.oid, 'EXECUTE')
       or has_function_privilege('authenticated', p.oid, 'EXECUTE')
  ),
  'anon and authenticated cannot execute any AI lifecycle RPC'
);

with required(function_name) as (
  select unnest(array[
    'claim_ai_request',
    'cleanup_expired_ai_operational_records',
    'complete_ai_chat_request',
    'complete_ai_request_idempotency',
    'consume_ai_request_rate_limit',
    'fail_ai_chat_request',
    'fail_ai_request_idempotency',
    'finalize_ai_budget',
    'list_stale_ai_requests',
    'mark_ai_request_reconciliation_required',
    'release_ai_budget',
    'reserve_ai_budget',
    'resolve_ai_reconciliation'
  ]::text[])
)
select ok(
  not exists (
    select 1
    from required
    left join pg_proc p
      on p.proname = required.function_name
     and p.pronamespace = 'public'::regnamespace
    where p.oid is null
       or not has_function_privilege('service_role', p.oid, 'EXECUTE')
  ),
  'service_role can execute every AI lifecycle RPC'
);

with required(function_name) as (
  select unnest(array[
    'claim_ai_request',
    'cleanup_expired_ai_operational_records',
    'complete_ai_chat_request',
    'complete_ai_request_idempotency',
    'consume_ai_request_rate_limit',
    'fail_ai_chat_request',
    'fail_ai_request_idempotency',
    'finalize_ai_budget',
    'list_stale_ai_requests',
    'mark_ai_request_reconciliation_required',
    'release_ai_budget',
    'reserve_ai_budget',
    'resolve_ai_reconciliation'
  ]::text[])
)
select ok(
  not exists (
    select 1
    from required
    join pg_proc p
      on p.proname = required.function_name
     and p.pronamespace = 'public'::regnamespace
    cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
    where acl.grantee = 0 and acl.privilege_type = 'EXECUTE'
  ),
  'PUBLIC has no direct EXECUTE grant on any AI lifecycle RPC'
);

select * from finish();
rollback;
