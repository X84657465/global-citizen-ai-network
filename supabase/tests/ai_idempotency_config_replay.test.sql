begin;

select plan(12);

select ok(
  to_regprocedure('public.claim_ai_request(uuid,uuid,text,text,char,uuid,text,text,text,numeric,numeric)') is not null,
  'AI claim RPC retains its stable signature'
);

select ok(
  position('cached_response' in pg_get_functiondef('public.claim_ai_request(uuid,uuid,text,text,char,uuid,text,text,text,numeric,numeric)'::regprocedure)) > 0
  and position('provider_config_unavailable' in pg_get_functiondef('public.claim_ai_request(uuid,uuid,text,text,char,uuid,text,text,text,numeric,numeric)'::regprocedure)) > 0,
  'claim RPC resolves idempotency replay before requiring provider configuration'
);

select ok(
  position('for update' in lower(pg_get_functiondef('public.claim_ai_request(uuid,uuid,text,text,char,uuid,text,text,text,numeric,numeric)'::regprocedure))) > 0,
  'claim RPC retains row locking for concurrent replay and claim serialization'
);

select ok(
  not has_function_privilege('authenticated', 'public.claim_ai_request(uuid,uuid,text,text,char,uuid,text,text,text,numeric,numeric)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.claim_ai_request(uuid,uuid,text,text,char,uuid,text,text,text,numeric,numeric)', 'EXECUTE'),
  'claim RPC remains service-role only'
);

select ok(
  position('p_provider is null' in pg_get_functiondef('public.claim_ai_request(uuid,uuid,text,text,char,uuid,text,text,text,numeric,numeric)'::regprocedure))
    < position('p_max_cost_twd is null' in pg_get_functiondef('public.claim_ai_request(uuid,uuid,text,text,char,uuid,text,text,text,numeric,numeric)'::regprocedure)),
  'missing provider identity is classified before null pricing values'
);

select ok(
  position('p_preflight_cost_twd > p_max_cost_twd' in pg_get_functiondef('public.claim_ai_request(uuid,uuid,text,text,char,uuid,text,text,text,numeric,numeric)'::regprocedure)) > 0
  and position('consume_ai_request_rate_limit' in pg_get_functiondef('public.claim_ai_request(uuid,uuid,text,text,char,uuid,text,text,text,numeric,numeric)'::regprocedure)) > 0,
  'new claims still enforce preflight cost and rate limits'
);

-- Structural guards for cross-conversation claim serialization. These assertions
-- verify the intended lock and predicate ordering; they are not substitutes for
-- a true two-session concurrency integration test.
select ok(
  position('pg_advisory_xact_lock' in lower(pg_get_functiondef('public.claim_ai_request(uuid,uuid,text,text,char,uuid,text,text,text,numeric,numeric)'::regprocedure)))
    < position('from public.platform_ai_controls' in lower(pg_get_functiondef('public.claim_ai_request(uuid,uuid,text,text,char,uuid,text,text,text,numeric,numeric)'::regprocedure)))
  and position('pg_advisory_xact_lock' in lower(pg_get_functiondef('public.claim_ai_request(uuid,uuid,text,text,char,uuid,text,text,text,numeric,numeric)'::regprocedure)))
    < position('from public.ai_request_idempotency' in lower(pg_get_functiondef('public.claim_ai_request(uuid,uuid,text,text,char,uuid,text,text,text,numeric,numeric)'::regprocedure))),
  'per-member advisory lock serializes claims before global controls and idempotency rows'
);

select ok(
  position('r.owner_id = p_owner_id' in lower(pg_get_functiondef('public.claim_ai_request(uuid,uuid,text,text,char,uuid,text,text,text,numeric,numeric)'::regprocedure))) > 0
  and position('r.status in (''queued'',''running'')' in lower(pg_get_functiondef('public.claim_ai_request(uuid,uuid,text,text,char,uuid,text,text,text,numeric,numeric)'::regprocedure))) > 0
  and position('b.status = ''reserved''' in lower(pg_get_functiondef('public.claim_ai_request(uuid,uuid,text,text,char,uuid,text,text,text,numeric,numeric)'::regprocedure))) > 0
  and position('i.state = ''processing''' in lower(pg_get_functiondef('public.claim_ai_request(uuid,uuid,text,text,char,uuid,text,text,text,numeric,numeric)'::regprocedure))) > 0,
  'unresolved-request guard spans all conversations owned by the member'
);

select ok(
  position('p_conversation_id::text || e''\n'' || p_prompt' in lower(pg_get_functiondef('public.claim_ai_request(uuid,uuid,text,text,char,uuid,text,text,text,numeric,numeric)'::regprocedure))) > 0
  and position('where c.id = p_conversation_id and c.owner_id = p_owner_id' in lower(pg_get_functiondef('public.claim_ai_request(uuid,uuid,text,text,char,uuid,text,text,text,numeric,numeric)'::regprocedure))) > 0,
  'request hash is bound to the member-owned conversation and exact prompt'
);

select ok(
  position('insert into public.messages' in lower(pg_get_functiondef('public.claim_ai_request(uuid,uuid,text,text,char,uuid,text,text,text,numeric,numeric)'::regprocedure)))
    < position('insert into public.ai_request_idempotency' in lower(pg_get_functiondef('public.claim_ai_request(uuid,uuid,text,text,char,uuid,text,text,text,numeric,numeric)'::regprocedure))),
  'original user prompt and idempotency mapping are persisted atomically in the claim transaction'
);


select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.ai_request_idempotency'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) ilike 'UNIQUE (owner_id, idempotency_key)'
  ),
  'the database enforces one idempotency key per member'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.ai_request_idempotency'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) ilike 'UNIQUE (request_id)'
  )
  and exists (
    select 1 from pg_constraint
    where conrelid = 'public.ai_budget_reservations'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) ilike 'UNIQUE (request_id)'
  ),
  'each request can have only one idempotency mapping and one budget reservation'
);

select * from finish();
rollback;
