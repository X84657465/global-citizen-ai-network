begin;

select plan(24);

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
  v_blocked_request uuid := '52000000-0000-4000-8000-000000000005';
  v_overrun_owner uuid := '50000000-0000-4000-8000-000000000002';
  v_overrun_conversation uuid := '51000000-0000-4000-8000-000000000002';
  v_overrun_request uuid := '52000000-0000-4000-8000-000000000004';
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

  if public.complete_ai_chat_request(
    v_owner, v_success_request, v_conversation, 'Atomic assistant response', 'test-model',
    5, 4, 1, 0.0123, 'provider-test-atomic-001', 120,
    'configured_token_rates_provider_usage_internal_estimate',
    pg_catalog.jsonb_build_object(
      'requestId', v_success_request::text,
      'answer', 'Atomic assistant response',
      'usage', pg_catalog.jsonb_build_object(
        'inputTokens', 999, 'outputTokens', 4, 'cachedTokens', 1, 'estimatedCostTwd', 0.0123
      )
    )
  ) then
    raise exception 'AI completion accepted response usage inconsistent with settlement arguments';
  end if;

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

  -- A different key and conversation for the same member must not start a
  -- second billable request while the first provider outcome is unresolved.
  select * into v_claim
  from public.claim_ai_request(
    v_owner, 'test-ai-cross-conversation-001', repeat('e', 64)::char(64), v_blocked_request,
    'openai-compatible', 'test-model', 'chat', 1
  );
  if v_claim.disposition <> 'processing'
     or v_claim.reason <> 'member_has_unresolved_request'
     or v_claim.claimed_request_id <> v_unknown_request then
    raise exception 'cross-conversation AI request was not blocked by unresolved request';
  end if;

  update public.ai_requests
  set created_at = now() - interval '20 minutes'
  where id = v_unknown_request;

  -- An actual estimate above the reservation must trigger the hard stop and
  -- disable the member if their monthly ceiling is exceeded.
  insert into auth.users (
    id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values (
    v_overrun_owner, 'authenticated', 'authenticated',
    'ai-gateway-overrun@example.test', '', now(), '{}'::jsonb,
    '{"name":"AI Gateway Overrun"}'::jsonb, now(), now()
  );

  insert into public.conversations (id, owner_id, title)
  values (v_overrun_conversation, v_overrun_owner, 'AI budget overrun test');

  insert into public.ai_user_limits (
    owner_id, ai_enabled, daily_request_limit, monthly_request_limit, monthly_spend_limit, currency
  ) values (v_overrun_owner, true, 10, 100, 0.02, 'TWD');

  select * into v_claim
  from public.claim_ai_request(
    v_overrun_owner, 'test-ai-overrun-001', repeat('d', 64)::char(64), v_overrun_request,
    'openai-compatible', 'test-model', 'chat', 0.001
  );
  if v_claim.disposition <> 'claimed' then
    raise exception 'AI overrun fixture claim failed: %', v_claim.disposition;
  end if;

  update public.ai_requests set status = 'running', started_at = now()
  where id = v_overrun_request and owner_id = v_overrun_owner;

  v_response := pg_catalog.jsonb_build_object(
    'requestId', v_overrun_request::text,
    'answer', 'Overrun assistant response',
    'usage', pg_catalog.jsonb_build_object(
      'inputTokens', 5, 'outputTokens', 4, 'cachedTokens', 0, 'estimatedCostTwd', 0.03
    )
  );

  v_completed := public.complete_ai_chat_request(
    v_overrun_owner, v_overrun_request, v_overrun_conversation, 'Overrun assistant response', 'test-model',
    5, 4, 0, 0.03, 'provider-test-overrun-001', 80,
    'configured_token_rates_provider_usage_internal_estimate', v_response
  );
  if not v_completed then
    raise exception 'AI budget overrun completion failed';
  end if;
end;
$ai_fixture$;

select ok(
  exists (select 1 from public.list_stale_ai_requests(900)
    where request_id = '52000000-0000-4000-8000-000000000003'),
  'uncertain provider outcome appears in the administrator stale-request report'
);

-- Create more stale reservations than the operator report is allowed to return.
insert into public.ai_requests (id, owner_id, provider, model, feature, status, created_at)
select
  ('53000000-0000-4000-8000-' || lpad(g::text, 12, '0'))::uuid,
  '50000000-0000-4000-8000-000000000001',
  'openai-compatible', 'test-model', 'chat', 'running',
  now() - interval '30 minutes' - (g::text || ' seconds')::interval
from generate_series(1, 101) as g;

insert into public.ai_budget_reservations (request_id, owner_id, reserved_amount, status, created_at)
select
  ('53000000-0000-4000-8000-' || lpad(g::text, 12, '0'))::uuid,
  '50000000-0000-4000-8000-000000000001',
  0.001, 'reserved',
  now() - interval '30 minutes' - (g::text || ' seconds')::interval
from generate_series(1, 101) as g;

select is(
  (select count(*)::integer from public.list_stale_ai_requests(900)),
  100,
  'administrator stale-request report is capped at the 100 oldest records'
);

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
-- A different member must not be able to settle, fail, or reconcile another
-- member's request, even when the request UUID is known.
select ok(
  not public.fail_ai_chat_request(
    '50000000-0000-4000-8000-000000000002',
    '52000000-0000-4000-8000-000000000002',
    'cross_owner_attempt'
  ),
  'cross-owner failure attempts are rejected'
);
select ok(
  not public.mark_ai_request_reconciliation_required(
    '50000000-0000-4000-8000-000000000002',
    '52000000-0000-4000-8000-000000000003',
    'cross_owner_attempt',
    null
  ),
  'cross-owner reconciliation attempts are rejected'
);
select ok(
  not public.complete_ai_chat_request(
    '50000000-0000-4000-8000-000000000002',
    '52000000-0000-4000-8000-000000000001',
    '51000000-0000-4000-8000-000000000001',
    'Unauthorized response',
    'test-model',
    1, 1, 0, 0.001, null, 1,
    'cross_owner_test',
    pg_catalog.jsonb_build_object(
      'requestId', '52000000-0000-4000-8000-000000000001',
      'answer', 'Unauthorized response',
      'usage', pg_catalog.jsonb_build_object(
        'inputTokens', 1,
        'outputTokens', 1,
        'cachedTokens', 0,
        'estimatedCostTwd', 0.001
      )
    )
  ),
  'cross-owner completion attempts are rejected'
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
  (select ai_enabled = false from public.platform_ai_controls where id = true),
  'an actual estimate above its reservation triggers the global AI hard stop'
);
select ok(
  (select ai_enabled = false from public.ai_user_limits
   where owner_id = '50000000-0000-4000-8000-000000000002'),
  'a member monthly spend overrun disables further AI requests for that member'
);

select ok(
  exists (select 1 from public.audit_logs
    where action = 'ai_platform_budget_hard_stop_triggered'
      and resource_id = '52000000-0000-4000-8000-000000000004'
      and outcome = 'allowed'),
  'global AI budget hard stop writes an audit event'
);
select ok(
  exists (select 1 from public.audit_logs
    where action = 'ai_member_budget_hard_stop_triggered'
      and resource_id = '50000000-0000-4000-8000-000000000002'
      and outcome = 'allowed'),
  'member AI budget hard stop writes an audit event'
);

select * from finish();
rollback;
