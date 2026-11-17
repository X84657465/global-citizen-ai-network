begin;

select plan(12);

-- The initial schema must protect every user-facing table with RLS.
select is(
  (select count(*)::integer
   from pg_class c
   join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relkind = 'r'
     and c.relrowsecurity),
  16,
  'all 16 initial public tables have row-level security enabled'
);

select is(
  (select count(*)::integer
   from pg_class c
   join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relkind = 'r'
     and not c.relrowsecurity),
  0,
  'no public table is missing row-level security'
);

select ok(
  exists (
    select 1 from public.platform_ai_controls
    where id = true
      and ai_enabled = false
      and monthly_spend_cap = 0
      and per_request_spend_cap = 0
      and hard_stop_enabled = true
  ),
  'AI starts disabled with zero budget and hard-stop enabled'
);

select ok(
  to_regclass('public.ai_budget_reservations') is not null,
  'AI budget reservations table exists'
);

select ok(
  to_regclass('public.ai_request_idempotency') is not null,
  'AI idempotency table exists'
);

select ok(
  to_regclass('public.ai_request_rate_limits') is not null,
  'AI request rate-limit table exists'
);

select ok(
  to_regprocedure('public.claim_ai_request(uuid,text,character,numeric)' ) is null,
  'no unexpected abbreviated claim function signature exists'
);

select ok(
  to_regprocedure('public.claim_ai_request(uuid,text,character,uuid,text,text,text,numeric)') is not null,
  'atomic idempotency claim function exists'
);

select ok(
  to_regprocedure('public.reserve_ai_budget(uuid,uuid,text,text,text,numeric)') is not null,
  'atomic budget reservation function exists'
);

select ok(
  to_regprocedure('public.finalize_ai_budget(uuid,numeric,numeric,character,integer,integer,integer,text,integer)') is not null,
  'budget settlement function exists'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.claim_ai_request(uuid,text,character,uuid,text,text,text,numeric)',
    'EXECUTE'
  ),
  'authenticated users cannot execute the privileged idempotency claim RPC'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.claim_ai_request(uuid,text,character,uuid,text,text,text,numeric)',
    'EXECUTE'
  ),
  'service_role can execute the privileged idempotency claim RPC'
);

select * from finish();

rollback;
