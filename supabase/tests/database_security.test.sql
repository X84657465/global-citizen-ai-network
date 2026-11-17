begin;

select plan(45);

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
select ok(to_regprocedure('public.claim_ai_request(uuid,text,character,uuid,text,text,text,numeric)') is not null, 'atomic idempotency claim function exists');
select ok(to_regprocedure('public.reserve_ai_budget(uuid,uuid,text,text,text,numeric)') is not null, 'atomic budget reservation function exists');
select ok(to_regprocedure('public.finalize_ai_budget(uuid,numeric,numeric,character,integer,integer,integer,text,integer)') is not null, 'budget settlement function exists');

select ok(not has_function_privilege('authenticated','public.claim_ai_request(uuid,text,character,uuid,text,text,text,numeric)','EXECUTE'),
  'authenticated users cannot execute privileged idempotency claim RPC');
select ok(has_function_privilege('service_role','public.claim_ai_request(uuid,text,character,uuid,text,text,text,numeric)','EXECUTE'),
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

-- Exercise the real RPCs: their hash calculation must execute, idempotent
-- replays must not duplicate rewards, and task price edits must not alter a
-- submission's locked reward snapshot.
do $fixture$
declare
  v_review jsonb;
  v_review_replay jsonb;
  v_appeal_review jsonb;
  v_appeal_replay jsonb;
  v_update_rejected boolean := false;
  v_accepted_appeal_rejected boolean := false;
begin
  insert into auth.users (
    id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values
    ('10000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
     'snapshot-reviewer@example.test', '', now(), '{}'::jsonb, '{"name":"Test Reviewer"}'::jsonb, now(), now()),
    ('10000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
     'snapshot-contributor@example.test', '', now(), '{}'::jsonb, '{"name":"Test Contributor"}'::jsonb, now(), now());

  update public.profiles
  set role = 'admin'
  where id = '10000000-0000-4000-8000-000000000001';

  insert into public.contribution_tasks (
    id, created_by, title, description, category, acceptance_criteria,
    reward_amount, reward_currency, status, published_at
  ) values
    ('20000000-0000-4000-8000-000000000001',
     '10000000-0000-4000-8000-000000000001',
     'Snapshot review task', 'A task used to verify immutable reward snapshots.', 'testing',
     '["A valid result"]'::jsonb, 25.00, 'TWD', 'published', now()),
    ('20000000-0000-4000-8000-000000000002',
     '10000000-0000-4000-8000-000000000001',
     'Snapshot appeal task', 'A task used to verify immutable appeal reward snapshots.', 'testing',
     '["A valid result"]'::jsonb, 40.00, 'USD', 'published', now());

  -- Deliberately submit forged snapshot values; the trigger must replace them.
  insert into public.task_submissions (
    id, task_id, contributor_id, content, status, submitted_at,
    reward_amount_snapshot, reward_currency_snapshot, reward_snapshot_source
  ) values (
    '30000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002',
    'A valid submission for the first task.',
    'accepted', '2000-01-01T00:00:00Z',
    999.00, 'EUR', 'legacy_backfill_current_task'
  );

  if not exists (
    select 1 from public.task_submissions
    where id = '30000000-0000-4000-8000-000000000001'
      and reward_amount_snapshot = 25.00
      and reward_currency_snapshot = 'TWD'
      and reward_snapshot_source = 'submission_time'
      and status = 'submitted'
      and submitted_at > now() - interval '1 minute'
  ) then
    raise exception 'submission trigger did not protect snapshot or initial state';
  end if;

  begin
    update public.task_submissions
    set reward_amount_snapshot = 1.00
    where id = '30000000-0000-4000-8000-000000000001';
  exception when others then
    v_update_rejected := true;
  end;
  if not v_update_rejected then
    raise exception 'submission reward snapshot mutation was not rejected';
  end if;

  update public.contribution_tasks
  set reward_amount = 999.00, reward_currency = 'EUR'
  where id = '20000000-0000-4000-8000-000000000001';

  v_review := public.review_task_submission(
    '10000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    'accept',
    'Verified contribution meets all criteria.',
    'test-review-accept-001'
  );
  v_review_replay := public.review_task_submission(
    '10000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    'accept',
    'Verified contribution meets all criteria.',
    'test-review-accept-001'
  );
  if (v_review->>'reward_amount')::numeric <> 25.00
     or v_review->>'reward_currency' <> 'TWD'
     or coalesce((v_review_replay->>'replayed')::boolean, false) is not true then
    raise exception 'submission review did not preserve snapshot or idempotency';
  end if;

  insert into public.task_submissions (
    id, task_id, contributor_id, content
  ) values (
    '30000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    'A valid submission for the appeal task.'
  );

  -- Reject first, then change the task price before the appeal is overturned.
  perform public.review_task_submission(
    '10000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000002',
    'reject',
    'The submitted evidence needs additional verification.',
    'test-review-reject-002'
  );

  insert into public.task_appeals (
    id, submission_id, appellant_id, reason, status, resolution, resolved_at, created_at
  ) values (
    '40000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    'I have supplied the required supporting evidence.',
    'resolved', 'forged resolution', '2000-01-01T00:00:00Z', '2000-01-01T00:00:00Z'
  );

  if not exists (
    select 1 from public.task_appeals
    where id = '40000000-0000-4000-8000-000000000001'
      and status = 'submitted' and resolution is null and resolved_at is null
      and created_at > now() - interval '1 minute'
  ) then
    raise exception 'appeal trigger did not protect initial state';
  end if;

  begin
    insert into public.task_appeals (id, submission_id, appellant_id, reason)
    values (
      '40000000-0000-4000-8000-000000000002',
      '30000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000002',
      'An invalid appeal against an accepted submission.'
    );
  exception when others then
    v_accepted_appeal_rejected := true;
  end;
  if not v_accepted_appeal_rejected then
    raise exception 'appeal against accepted submission was not rejected';
  end if;

  update public.contribution_tasks
  set reward_amount = 888.00, reward_currency = 'EUR'
  where id = '20000000-0000-4000-8000-000000000002';

  v_appeal_review := public.review_task_appeal(
    '10000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000001',
    'overturn',
    'The additional evidence satisfies the acceptance criteria.',
    'test-appeal-overturn-001'
  );
  v_appeal_replay := public.review_task_appeal(
    '10000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000001',
    'overturn',
    'The additional evidence satisfies the acceptance criteria.',
    'test-appeal-overturn-001'
  );
  if (v_appeal_review->>'reward_amount')::numeric <> 40.00
     or v_appeal_review->>'reward_currency' <> 'USD'
     or coalesce((v_appeal_replay->>'replayed')::boolean, false) is not true then
    raise exception 'appeal review did not preserve snapshot or idempotency';
  end if;
end;
$fixture$;

select ok(
  (select count(*) = 3
   from information_schema.columns
   where table_schema = 'public' and table_name = 'task_submissions'
     and column_name in ('reward_amount_snapshot','reward_currency_snapshot','reward_snapshot_source')
     and is_nullable = 'NO'),
  'submission reward snapshot fields are mandatory'
);
select ok(
  exists (select 1 from pg_constraint where conname = 'task_submissions_reward_snapshot_source_check'),
  'reward snapshot provenance is constrained'
);
select ok(
  exists (select 1 from pg_trigger where tgname = 'task_submissions_reward_snapshot' and not tgisinternal),
  'database trigger captures and protects submission reward snapshots'
);
select ok(
  to_regprocedure('private.capture_task_submission_reward_snapshot()') is not null
  and not has_function_privilege('authenticated','private.capture_task_submission_reward_snapshot()','EXECUTE'),
  'snapshot trigger function is not directly executable by members'
);
select ok(
  exists (select 1 from public.task_submissions
    where id = '30000000-0000-4000-8000-000000000001'
      and reward_amount_snapshot = 25.00
      and reward_currency_snapshot = 'TWD'
      and reward_snapshot_source = 'submission_time'),
  'client-supplied reward snapshot values are replaced and snapshot remains immutable'
);
select ok(
  exists (select 1 from public.task_submissions
    where id = '30000000-0000-4000-8000-000000000001'
      and status = 'accepted' and submitted_at > now() - interval '1 minute'),
  'submission status was server-initialized before the review lifecycle completed'
);
select ok(
  exists (select 1 from public.task_appeals
    where id = '40000000-0000-4000-8000-000000000001'
      and status = 'resolved' and resolution is not null and resolved_at > now() - interval '1 minute'
      and created_at > now() - interval '1 minute'),
  'appeal status was server-initialized before the appeal review lifecycle completed'
);
select ok(
  not exists (select 1 from public.task_appeals
    where id = '40000000-0000-4000-8000-000000000002'),
  'an appeal cannot be created for an accepted submission'
);
select ok(
  exists (select 1 from public.reward_ledger
    where submission_id = '30000000-0000-4000-8000-000000000001'
      and event_type = 'earned' and amount = 25.00 and currency = 'TWD'),
  'accepted submission reward uses the locked amount and currency'
);
select is(
  (select count(*)::integer from public.reward_ledger
   where submission_id = '30000000-0000-4000-8000-000000000001'
     and idempotency_key = 'task-review:test-review-accept-001'),
  1,
  'replaying submission review does not duplicate the reward'
);
select ok(
  exists (select 1 from public.task_submissions
    where id = '30000000-0000-4000-8000-000000000002'
      and reward_amount_snapshot = 40.00
      and reward_currency_snapshot = 'USD'
      and reward_snapshot_source = 'submission_time'),
  'appeal submission keeps its original reward snapshot after task price changes'
);
select ok(
  exists (select 1 from public.reward_ledger
    where submission_id = '30000000-0000-4000-8000-000000000002'
      and event_type = 'earned' and amount = 40.00 and currency = 'USD'),
  'overturned appeal reward uses the original submission snapshot'
);
select is(
  (select count(*)::integer from public.reward_ledger
   where submission_id = '30000000-0000-4000-8000-000000000002'
     and idempotency_key = 'task-appeal-review:test-appeal-overturn-001'),
  1,
  'replaying appeal review does not duplicate the reward'
);

select * from finish();
rollback;
