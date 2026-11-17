begin;

select plan(61);

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


-- Exercise atomic AI completion, known-failure release, and uncertain outcomes.
select ok(to_regprocedure('public.complete_ai_chat_request(uuid,uuid,uuid,text,text,integer,integer,integer,numeric,text,integer,text,jsonb)') is not null,
  'atomic AI chat completion RPC exists');
select ok(to_regprocedure('public.fail_ai_chat_request(uuid,uuid,text)') is not null,
  'atomic known-failure RPC exists');
select ok(to_regprocedure('public.mark_ai_request_reconciliation_required(uuid,uuid,text,text)') is not null,
  'uncertain provider outcome reconciliation RPC exists');

select ok(
  not has_function_privilege('authenticated','public.complete_ai_chat_request(uuid,uuid,uuid,text,text,integer,integer,integer,numeric,text,integer,text,jsonb)','EXECUTE')
  and has_function_privilege('service_role','public.complete_ai_chat_request(uuid,uuid,uuid,text,text,integer,integer,integer,numeric,text,integer,text,jsonb)','EXECUTE'),
  'atomic AI completion is service-role only'
);
select ok(
  not has_function_privilege('authenticated','public.fail_ai_chat_request(uuid,uuid,text)','EXECUTE')
  and has_function_privilege('service_role','public.fail_ai_chat_request(uuid,uuid,text)','EXECUTE'),
  'atomic AI failure handling is service-role only'
);
select ok(
  not has_function_privilege('authenticated','public.mark_ai_request_reconciliation_required(uuid,uuid,text,text)','EXECUTE')
  and has_function_privilege('service_role','public.mark_ai_request_reconciliation_required(uuid,uuid,text,text)','EXECUTE'),
  'AI reconciliation marking is service-role only'
);

do $ai_fixture$
declare
  v_owner uuid := '50000000-0000-4000-8000-000000000001';
  v_conversation uuid := '51000000-0000-4000-8000-000000000001';
  v_success_request uuid := '52000000-0000-4000-8000-000000000001';
  v_failed_request uuid := '52000000-0000-4000-8000-000000000002';
  v_unknown_request uuid := '52000000-0000-4000-8000-000000000003';
  v_claim record;
  v_response jsonb;
  v_completed boolean;
  v_replayed boolean;
  v_failed boolean;
  v_marked boolean;
begin
  insert into auth.users (
    id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values (
    v_owner, 'authenticated', 'authenticated',
    'ai-gateway-fixture@example.test', '', now(), '{}'::jsonb,
    '{"name":"AI Gateway Fixture"}'::jsonb, now(), now()
  );

  insert into public.conversations (id, owner_id, title)
  values (v_conversation, v_owner, 'AI gateway atomic completion test');

  update public.platform_ai_controls
  set ai_enabled = true, monthly_spend_cap = 100, per_request_spend_cap = 10,
      currency = 'TWD', hard_stop_enabled = true
  where id = true;

  insert into public.ai_user_limits (
    owner_id, ai_enabled, daily_request_limit, monthly_request_limit, monthly_spend_limit, currency
  ) values (v_owner, true, 10, 100, 100, 'TWD');

  select * into v_claim
  from public.claim_ai_request(
    v_owner, 'test-ai-success-001', repeat('a', 64)::char(64), v_success_request,
    'openai-compatible', 'test-model', 'chat', 1
  );
  if v_claim.disposition <> 'claimed' then
    raise exception 'AI success fixture claim failed: %', v_claim.disposition;
  end if;

  update public.ai_requests
  set status = 'running', conversation_id = v_conversation, started_at = now()
  where id = v_success_request and owner_id = v_owner;

  v_response := pg_catalog.jsonb_build_object(
    'requestId', v_success_request::text,
    'answer', 'Atomic assistant response',
    'usage', pg_catalog.jsonb_build_object(
      'inputTokens', 5, 'outputTokens', 4, 'cachedTokens', 1, 'estimatedCostTwd', 0.0123
    )
  );

  v_completed := public.complete_ai_chat_request(
    v_owner, v_success_request, v_conversation, 'Atomic assistant response', 'test-model',
    5, 4, 1, 0.0123, 'provider-test-atomic-001', 120,
    'configured_token_rates_provider_usage_internal_estimate', v_response
  );
  if not v_completed then
    raise exception 'atomic AI completion failed';
  end if;

  v_replayed := public.complete_ai_chat_request(
    v_owner, v_success_request, v_conversation, 'Atomic assistant response', 'test-model',
    5, 4, 1, 0.0123, 'provider-test-atomic-001', 120,
    'configured_token_rates_provider_usage_internal_estimate', v_response
  );
  if not v_replayed then
    raise exception 'atomic AI completion replay was not idempotent';
  end if;

  select * into v_claim
  from public.claim_ai_request(
    v_owner, 'test-ai-failure-001', repeat('b', 64)::char(64), v_failed_request,
    'openai-compatible', 'test-model', 'chat', 1
  );
  if v_claim.disposition <> 'claimed' then
    raise exception 'AI failure fixture claim failed: %', v_claim.disposition;
  end if;

  update public.ai_requests set status = 'running', started_at = now()
  where id = v_failed_request and owner_id = v_owner;

  v_failed := public.fail_ai_chat_request(v_owner, v_failed_request, 'provider_http_400');
  if not v_failed then
    raise exception 'atomic AI failure handling failed';
  end if;

  select * into v_claim
  from public.claim_ai_request(
    v_owner, 'test-ai-unknown-001', repeat('c', 64)::char(64), v_unknown_request,
    'openai-compatible', 'test-model', 'chat', 1
  );
  if v_claim.disposition <> 'claimed' then
    raise exception 'AI uncertain-outcome fixture claim failed: %', v_claim.disposition;
  end if;

  update public.ai_requests set status = 'running', started_at = now()
  where id = v_unknown_request and owner_id = v_owner;

  v_marked := public.mark_ai_request_reconciliation_required(
    v_owner, v_unknown_request, 'provider_timeout_outcome_unknown', 'provider-test-unknown-001'
  );
  if not v_marked then
    raise exception 'AI uncertain outcome was not marked for reconciliation';
  end if;

  update public.ai_requests
  set created_at = now() - interval '20 minutes'
  where id = v_unknown_request;
end;
$ai_fixture$;

select ok(
  exists (select 1 from public.ai_budget_reservations
    where request_id = '52000000-0000-4000-8000-000000000001'
      and status = 'settled' and actual_cost = 0.0123),
  'successful AI completion settles the reservation at the computed estimate'
);
select ok(
  exists (select 1 from public.ai_requests
    where id = '52000000-0000-4000-8000-000000000001'
      and status = 'succeeded' and estimated_internal_cost = 0.0123
      and cost_method = 'configured_token_rates_provider_usage_internal_estimate'),
  'AI request stores the actual internal estimate and an accurate cost method'
);
select is(
  (select count(*)::integer from public.messages
   where conversation_id = '51000000-0000-4000-8000-000000000001'
     and owner_id = '50000000-0000-4000-8000-000000000001'
     and role = 'assistant' and content = 'Atomic assistant response'),
  1,
  'atomic AI completion stores exactly one assistant message'
);
select ok(
  exists (select 1 from public.ai_cost_ledger
    where request_id = '52000000-0000-4000-8000-000000000001'
      and amount = 0.0123 and currency = 'TWD'
      and amount_kind = 'internal_estimate'
      and calculation_method = 'configured_token_rates_provider_usage_internal_estimate'),
  'atomic AI completion writes a clearly labelled internal estimate ledger row'
);
select ok(
  exists (select 1 from public.ai_request_idempotency
    where request_id = '52000000-0000-4000-8000-000000000001'
      and state = 'completed'
      and response_json->>'answer' = 'Atomic assistant response'),
  'atomic AI completion persists the replay response'
);
select is(
  (select count(*)::integer from public.messages
   where conversation_id = '51000000-0000-4000-8000-000000000001' and role = 'assistant'),
  1,
  'replaying successful AI completion does not duplicate the assistant message'
);
select is(
  (select count(*)::integer from public.ai_cost_ledger
   where request_id = '52000000-0000-4000-8000-000000000001'),
  1,
  'replaying successful AI completion does not duplicate the cost ledger entry'
);
select ok(
  exists (select 1 from public.ai_budget_reservations b
    join public.ai_requests r on r.id = b.request_id
    join public.ai_request_idempotency i on i.request_id = r.id
    where b.request_id = '52000000-0000-4000-8000-000000000002'
      and b.status = 'released' and r.status = 'failed'
      and i.state = 'failed' and r.error_code = 'provider_http_400'),
  'known provider failure releases budget and fails request/idempotency atomically'
);
select ok(
  exists (select 1 from public.ai_budget_reservations b
    join public.ai_requests r on r.id = b.request_id
    join public.ai_request_idempotency i on i.request_id = r.id
    where b.request_id = '52000000-0000-4000-8000-000000000003'
      and b.status = 'reserved' and r.status = 'running'
      and r.error_code = 'provider_timeout_outcome_unknown'
      and r.provider_request_id = 'provider-test-unknown-001'
      and i.state = 'processing'),
  'uncertain provider outcome keeps budget reserved and idempotency locked for reconciliation'
);
select ok(
  exists (select 1 from public.list_stale_ai_requests(900)
    where request_id = '52000000-0000-4000-8000-000000000003'),
  'uncertain provider outcome appears in the administrator stale-request report'
);

select * from finish();
rollback;
