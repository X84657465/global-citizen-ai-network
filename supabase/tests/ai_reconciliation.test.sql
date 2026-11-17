begin;

select plan(9);

select ok(
  to_regprocedure('public.resolve_ai_reconciliation(uuid,uuid,uuid,text,text,text,text,numeric,char,numeric)') is not null,
  'audited reconciliation RPC exists'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.ai_reconciliation_events'::regclass),
  'reconciliation event history has row-level security enabled'
);

select ok(
  not has_table_privilege('anon', 'public.ai_reconciliation_events', 'SELECT')
  and not has_table_privilege('authenticated', 'public.ai_reconciliation_events', 'SELECT'),
  'members and anonymous users cannot read reconciliation evidence history directly'
);

select ok(
  not has_table_privilege('authenticated', 'public.ai_reconciliation_events', 'INSERT')
  and not has_table_privilege('authenticated', 'public.ai_reconciliation_events', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.ai_reconciliation_events', 'DELETE'),
  'members cannot directly mutate reconciliation evidence history'
);

select ok(
  has_function_privilege('authenticated', 'public.resolve_ai_reconciliation(uuid,uuid,uuid,text,text,text,text,numeric,char,numeric)', 'EXECUTE'),
  'authenticated callers can invoke the RPC subject to its in-function admin check'
);

select ok(
  not has_function_privilege('anon', 'public.resolve_ai_reconciliation(uuid,uuid,uuid,text,text,text,text,numeric,char,numeric)', 'EXECUTE'),
  'anonymous and public callers cannot invoke reconciliation'
);

select ok(
  not has_function_privilege('service_role', 'public.resolve_ai_reconciliation(uuid,uuid,uuid,text,text,text,text,numeric,char,numeric)', 'EXECUTE'),
  'service-role RPC calls are not used as a substitute for an authenticated admin identity'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '', true);

select is(
  (select disposition
   from public.resolve_ai_reconciliation(
     '50000000-0000-4000-8000-000000000001',
     '52000000-0000-4000-8000-000000000001',
     '53000000-0000-4000-8000-000000000001',
     'inconclusive',
     'openai-compatible',
     'provider-console-case-001',
     'Provider dashboard does not yet show a final billing outcome.',
     null, null, null
   )),
  'rejected',
  'RPC rejects a caller that supplies an actor ID without an authenticated identity'
);

reset role;

select ok(
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'resolve_ai_reconciliation'
      and p.prosecdef
      and p.proconfig @> array['search_path=""']
  ),
  'resolution RPC is SECURITY DEFINER with an empty search path'
);

select * from finish();
rollback;
