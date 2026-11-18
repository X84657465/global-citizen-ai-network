begin;

select plan(15);

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
  has_function_privilege('authenticated', 'public.resolve_ai_reconciliation(uuid,uuid,uuid,text,text,text,text,numeric,char,numeric)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.resolve_ai_reconciliation(uuid,uuid,uuid,text,text,text,text,numeric,char,numeric)', 'EXECUTE'),
  'authenticated callers can invoke the JWT-bound reconciliation RPC while anon cannot'
);

select ok(
  not has_function_privilege('service_role', 'public.resolve_ai_reconciliation(uuid,uuid,uuid,text,text,text,text,numeric,char,numeric)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.resolve_ai_reconciliation(uuid,uuid,uuid,text,text,text,text,numeric,char,numeric)', 'EXECUTE'),
  'only authenticated JWT callers can invoke reconciliation; service_role and anon cannot'
);

select ok(
  position('auth.uid() is null or auth.uid() is distinct from p_actor_id' in lower(pg_get_functiondef(
    'public.resolve_ai_reconciliation(uuid,uuid,uuid,text,text,text,text,numeric,char,numeric)'::regprocedure
  ))) > 0
  and position('where id = auth.uid()' in lower(pg_get_functiondef(
    'public.resolve_ai_reconciliation(uuid,uuid,uuid,text,text,text,text,numeric,char,numeric)'::regprocedure
  ))) > 0,
  'RPC binds the supplied actor to auth.uid() and loads the admin profile from the JWT identity'
);


-- A signed-in non-admin cannot spoof an administrator's actor UUID.
select set_config('request.jwt.claim.sub', '50000000-0000-4000-8000-000000000001', true);
select is(
  (select reason from public.resolve_ai_reconciliation(
    '50000000-0000-4000-8000-000000000002'::uuid,
    '52000000-0000-4000-8000-000000000001'::uuid,
    '53000000-0000-4000-8000-000000000001'::uuid,
    'inconclusive', 'openai-compatible', 'evidence-ref-0001',
    'A sufficiently detailed rationale for identity spoofing regression.',
    null, null, null
  )),
  'actor_identity_mismatch',
  'authenticated caller cannot impersonate a different admin actor ID'
);

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

-- The global controls row serializes concurrent reconciliation attempts before
-- checking an existing key or touching any reservation/request rows.
select ok(
  position('select * into v_controls' in lower(pg_get_functiondef(
    'public.resolve_ai_reconciliation(uuid,uuid,uuid,text,text,text,text,numeric,char,numeric)'::regprocedure
  ))) < position('select * into v_existing' in lower(pg_get_functiondef(
    'public.resolve_ai_reconciliation(uuid,uuid,uuid,text,text,text,text,numeric,char,numeric)'::regprocedure
  )))
  and position('select * into v_existing' in lower(pg_get_functiondef(
    'public.resolve_ai_reconciliation(uuid,uuid,uuid,text,text,text,text,numeric,char,numeric)'::regprocedure
  ))) < position('select * into v_reservation' in lower(pg_get_functiondef(
    'public.resolve_ai_reconciliation(uuid,uuid,uuid,text,text,text,text,numeric,char,numeric)'::regprocedure
  ))),
  'reconciliation serializes globally before idempotency lookup and reservation locking'
);

select ok(
  position('v_existing.payload_hash <> v_hash' in lower(pg_get_functiondef(
    'public.resolve_ai_reconciliation(uuid,uuid,uuid,text,text,text,text,numeric,char,numeric)'::regprocedure
  ))) > 0
  and position('identical_resolution_already_recorded' in lower(pg_get_functiondef(
    'public.resolve_ai_reconciliation(uuid,uuid,uuid,text,text,text,text,numeric,char,numeric)'::regprocedure
  ))) > 0,
  'same-key same-payload retries replay while changed payloads conflict'
);

select ok(
  position('if p_decision = ''confirmed_billed'' then' in lower(pg_get_functiondef(
    'public.resolve_ai_reconciliation(uuid,uuid,uuid,text,text,text,text,numeric,char,numeric)'::regprocedure
  ))) > 0
  and position('status = ''settled''' in lower(pg_get_functiondef(
    'public.resolve_ai_reconciliation(uuid,uuid,uuid,text,text,text,text,numeric,char,numeric)'::regprocedure
  ))) > 0
  and position('status = ''released''' in lower(pg_get_functiondef(
    'public.resolve_ai_reconciliation(uuid,uuid,uuid,text,text,text,text,numeric,char,numeric)'::regprocedure
  ))) > 0,
  'conclusive billed and not-billed decisions settle or release the held reservation'
);

select ok(
  position('inconclusive deliberately leaves request, reservation, and idempotency untouched' in lower(pg_get_functiondef(
    'public.resolve_ai_reconciliation(uuid,uuid,uuid,text,text,text,text,numeric,char,numeric)'::regprocedure
  ))) > 0,
  'inconclusive decisions preserve request, reservation, and idempotency state'
);

select ok(
  position('for update' in lower(pg_get_functiondef(
    'public.resolve_ai_reconciliation(uuid,uuid,uuid,text,text,text,text,numeric,char,numeric)'::regprocedure
  ))) > 0
  and position('where request_id = p_request_id and owner_id = v_request.owner_id' in lower(pg_get_functiondef(
    'public.resolve_ai_reconciliation(uuid,uuid,uuid,text,text,text,text,numeric,char,numeric)'::regprocedure
  ))) > 0,
  'reconciliation locks and verifies the matching request idempotency record'
);

select ok(
  position('insert into public.audit_logs' in lower(pg_get_functiondef(
    'public.resolve_ai_reconciliation(uuid,uuid,uuid,text,text,text,text,numeric,char,numeric)'::regprocedure
  ))) > 0
  and exists (
    select 1 from pg_trigger
    where tgrelid = 'public.ai_reconciliation_events'::regclass
      and tgname = 'ai_reconciliation_events_immutable'
      and not tgisinternal
  ),
  'every resolution is audited and evidence events remain immutable'
);

select * from finish();
rollback;
