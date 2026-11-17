begin;

select plan(34);

select is(
  (select count(*)::integer
   from pg_class c
   join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relkind = 'r'
     and c.relname = any(array['profiles','projects','conversations','messages','platform_ai_controls','ai_user_limits','ai_requests','provider_invoice_imports','ai_cost_ledger','contribution_tasks','task_submissions','task_appeals','task_reviews','contribution_ledger','reward_ledger','audit_logs'])
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
     and c.relname = any(array['profiles','projects','conversations','messages','platform_ai_controls','ai_user_limits','ai_requests','provider_invoice_imports','ai_cost_ledger','contribution_tasks','task_submissions','task_appeals','task_reviews','contribution_ledger','reward_ledger','audit_logs'])
     and not c.relrowsecurity),
  0,
  'no public table is missing row-level security'
);

select ok(
  exists (select 1 from public.platform_ai_controls where id = true and ai_enabled = false
    and monthly_spend_cap = 0 and per_request_spend_cap = 0 and hard_stop_enabled = true),
  'AI starts disabled with zero budget and hard-stop enabled'
);

select ok(to_regclass('public.ai_budget_reservations') is not null, 'AI budget reservations table exists');
select ok(to_regclass('public.ai_request_idempotency') is not null, 'AI idempotency table exists');
select ok(to_regclass('public.ai_request_rate_limits') is not null, 'AI request rate-limit table exists');
select ok(to_regprocedure('public.claim_ai_request(uuid,uuid,text,text,character,uuid,text,text,text,numeric)') is not null, 'atomic idempotency claim function exists');
select ok(to_regprocedure('public.claim_ai_request(uuid,text,character,uuid,text,text,text,numeric)') is null,
  'legacy claim RPC signature is removed so callers cannot bypass conversation binding');
select ok(to_regprocedure('public.claim_ai_request(uuid,uuid,text,text,character,uuid,text,text,text,numeric)') is null,
  'previous conversation-bound claim RPC signature is removed so prompt persistence cannot be bypassed');
select ok(to_regprocedure('public.reserve_ai_budget(uuid,uuid,text,text,text,numeric)') is not null, 'atomic budget reservation function exists');
select ok(to_regprocedure('public.finalize_ai_budget(uuid,numeric,numeric,character,integer,integer,integer,text,integer)') is not null, 'budget settlement function exists');

select ok(not has_function_privilege('authenticated','public.claim_ai_request(uuid,uuid,text,text,character,uuid,text,text,text,numeric)','EXECUTE'),
  'authenticated users cannot execute privileged idempotency claim RPC');
select ok(has_function_privilege('service_role','public.claim_ai_request(uuid,uuid,text,text,character,uuid,text,text,text,numeric)','EXECUTE'),
  'service_role can execute privileged idempotency claim RPC');

select ok(
  exists (select 1 from pg_constraint where conname = 'task_submissions_content_length_check'),
  'submission content length is enforced by the database'
);
select ok(
  position('closes_at' in (select with_check from pg_policies where schemaname = 'public' and tablename = 'task_submissions' and policyname = 'submissions_owner_insert')) > 0,
  'submission RLS policy rejects expired tasks'
);

select ok(to_regclass('public.task_review_idempotency') is not null, 'task review idempotency table exists');
select ok((select relrowsecurity from pg_class where oid = 'public.task_review_idempotency'::regclass),
  'task review idempotency table has RLS enabled');
select ok(not has_table_privilege('authenticated','public.task_review_idempotency','SELECT'),
  'authenticated users cannot read review idempotency records');
select ok(not has_function_privilege('authenticated','public.review_task_submission(uuid,uuid,text,text,text)','EXECUTE'),
  'authenticated users cannot execute privileged review function');
select ok(has_function_privilege('service_role','public.review_task_submission(uuid,uuid,text,text,text)','EXECUTE'),
  'service_role can execute contribution review function');

select ok(to_regprocedure('public.cleanup_expired_ai_operational_records()') is not null, 'safe operational retention function exists');
select ok(to_regprocedure('public.list_stale_ai_requests(integer)') is not null, 'read-only stale AI request report exists');
select ok(not has_function_privilege('authenticated','public.cleanup_expired_ai_operational_records()','EXECUTE'),
  'authenticated users cannot execute operational cleanup');
select ok(has_function_privilege('service_role','public.cleanup_expired_ai_operational_records()','EXECUTE'),
  'service_role can execute operational cleanup');
select ok(not has_function_privilege('authenticated','public.list_stale_ai_requests(integer)','EXECUTE'),
  'authenticated users cannot inspect stale AI operations');
select ok(has_function_privilege('service_role','public.list_stale_ai_requests(integer)','EXECUTE'),
  'service_role can inspect stale AI operations');

select ok(
  position('rejected' in (select with_check from pg_policies where schemaname = 'public' and tablename = 'task_appeals' and policyname = 'appeals_owner_insert')) > 0,
  'appeal RLS policy only allows appeals on rejected submissions'
);
select ok(
  exists (select 1 from pg_class where oid = 'public.task_appeals'::regclass and relrowsecurity),
  'task appeals table has RLS enabled'
);

select ok(to_regclass('public.task_appeal_review_idempotency') is not null,
  'appeal review idempotency table exists');
select ok(has_function_privilege('service_role','public.review_task_appeal(uuid,uuid,text,text,text)','EXECUTE')
  and not has_function_privilege('authenticated','public.review_task_appeal(uuid,uuid,text,text,text)','EXECUTE'),
  'appeal review RPC is restricted to service role');
select ok((select relrowsecurity from pg_class where oid = 'public.task_appeal_review_idempotency'::regclass),
  'appeal review idempotency table has RLS enabled');
select ok(not has_table_privilege('authenticated','public.task_appeal_review_idempotency','SELECT'),
  'authenticated users cannot inspect appeal review idempotency records');

select ok(
  exists (select 1 from pg_trigger where tgname = 'reward_ledger_immutable' and not tgisinternal),
  'reward ledger has append-only mutation protection'
);
select ok(
  exists (select 1 from pg_trigger where tgname = 'contribution_ledger_immutable' and not tgisinternal),
  'contribution ledger has append-only mutation protection'
);

select * from finish();
rollback;
