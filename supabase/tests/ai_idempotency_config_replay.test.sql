begin;

select plan(6);

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

select * from finish();
rollback;
