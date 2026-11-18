begin;

select plan(26);

-- Exercise atomic AI completion, known-failure release, and uncertain outcomes.
select ok(to_regprocedure('public.complete_ai_chat_request(uuid,uuid,uuid,text,text,integer,integer,integer,numeric,text,integer,text,jsonb)') is not null,
  'atomic AI chat completion RPC exists');
select ok(to_regprocedure('public.fail_ai_chat_request(uuid,uuid,text)') is not null,
  'atomic known-failure RPC exists');
select ok(to_regprocedure('public.mark_ai_request_reconciliation_required(uuid,uuid,text,text)') is not null,
  'uncertain provider outcome reconciliation RPC exists');

-- Structural regression guards: claims must serialize per member before
-- touching the shared platform controls row. These assertions do not replace
-- the coordinated two-session integration test documented separately.
select ok(
  pg_catalog.position(
    'pg_advisory_xact_lock' in pg_catalog.pg_get_functiondef(
      pg_catalog.to_regprocedure('public.claim_ai_request(uuid,uuid,text,text,char,uuid,text,text,text,numeric,numeric)')
    )
  ) > 0,
  'AI claim uses a transaction-scoped advisory lock'
);
select ok(
  pg_catalog.position(
    'hashtextextended(p_owner_id::text, 0)' in pg_catalog.pg_get_functiondef(
      pg_catalog.to_regprocedure('public.claim_ai_request(uuid,uuid,text,text,char,uuid,text,text,text,numeric,numeric)')
    )
  ) > 0,
  'AI claim advisory lock is scoped to the member owner id'
);

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
  v_other_conversation uuid := '51000000-0000-4000-8000-000000000003';
  v_success_request uuid := '52000000-0000-4000-8000-000000000001';
  v_failed_request uuid := '52000000-0000-4000-8000-000000000002';
  v_unknown_request uuid := '52000000-0000-4000-8000-000000000003';
  v_blocked_request uuid := '52000000-0000-4000-8000-000000000005';
  v_overrun_owner uuid := '50000000-0000-4000-8000-000000000002';
  v_overrun_conversation uuid := '51000000-0000-4000-8000-000000000002';
  v_overrun_request uuid := '52000000-0000-4000-8000-000000000004';
  v_claim record;
  v_reservation record;
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

  insert into public.conversations (id, owner_id, title)
  values (v_other_conversation, v_owner, 'AI gateway second conversation test');

  update public.platform_ai_controls
  set ai_enabled = true, monthly_spend_cap = 100, per_request_spend_cap = 10,
      currency = 'TWD', hard_stop_enabled = true
  where id = true;

  insert into public.ai_user_limits (
    owner_id, ai_enabled, daily_request_limit, monthly_request_limit, monthly_spend_limit, currency
  ) values (v_owner, true, 10, 100, 100, 'TWD');

  -- A new request whose preflight exceeds the ceiling must be rejected before
  -- creating an AI request, reservation, idempotency row, or user message.
  select * into v_claim
  from public.claim_ai_request(
    v_owner, v_conversation, 'Too expensive preflight prompt', 'test-ai-preflight-001',
    pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(v_conversation::text || E'\n' || 'Too expensive preflight prompt', 'UTF8')), 'hex')::char(64), '52000000-0000-4000-8000-000000000006',
    'openai-compatible', 'test-model', 'chat', 1, 2
  );
  if v_claim.disposition <> 'rejected' or v_claim.reason <> 'preflight_cost_exceeds_reservation' then
    raise exception 'over-budget preflight was not rejected inside the claim transaction';
  end if;
  if exists (select 1 from public.ai_requests where id = '52000000-0000-4000-8000-000000000006')
     or exists (select 1 from public.ai_budget_reservations where request_id = '52000000-0000-4000-8000-000000000006')
     or exists (select 1 from public.messages where conversation_id = v_conversation and content = 'Too expensive preflight prompt')
     or exists (select 1 from public.ai_request_idempotency where owner_id = v_owner and idempotency_key = 'test-ai-preflight-001') then
    raise exception 'over-budget preflight created request side effects';
  end if;

  -- Non-finite reservation ceilings must be rejected before any request side effects.
  select * into v_claim
  from public.claim_ai_request(
    v_owner, v_conversation, 'Non-finite reservation ceiling', 'test-ai-infinity-ceiling-001',
    pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(v_conversation::text || E'\n' || 'Non-finite reservation ceiling', 'UTF8')), 'hex')::char(64),
    '52000000-0000-4000-8000-000000000008',
    'openai-compatible', 'test-model', 'chat', 'Infinity'::numeric, 0.1
  );
  if v_claim.disposition <> 'rejected' or v_claim.reason <> 'invalid_idempotency_input' then
    raise exception 'claim RPC accepted an infinite reservation ceiling';
  end if;
  if exists (select 1 from public.ai_requests where id = '52000000-0000-4000-8000-000000000008')
     or exists (select 1 from public.ai_budget_reservations where request_id = '52000000-0000-4000-8000-000000000008') then
    raise exception 'non-finite reservation ceiling created request side effects';
  end if;

  -- The lower-level reservation RPC must independently reject non-finite amounts.
  select * into v_reservation
  from public.reserve_ai_budget(
    '52000000-0000-4000-8000-000000000009',
    v_owner, 'openai-compatible', 'test-model', 'chat', 'Infinity'::numeric
  );
  if coalesce(v_reservation.allowed, false) then
    raise exception 'reserve_ai_budget accepted an infinite reservation ceiling';
  end if;
  if exists (select 1 from public.ai_requests where id = '52000000-0000-4000-8000-000000000009')
     or exists (select 1 from public.ai_budget_reservations where request_id = '52000000-0000-4000-8000-000000000009') then
    raise exception 'non-finite direct reservation created request side effects';
  end if;

  -- Numeric(18,8) ledger columns must not receive finite values outside their range.
  select * into v_reservation
  from public.reserve_ai_budget(
    '52000000-0000-4000-8000-000000000011',
    v_owner, 'openai-compatible', 'test-model', 'chat', 10000000000
  );
  if coalesce(v_reservation.allowed, false) then
    raise exception 'reserve_ai_budget accepted an out-of-range finite reservation ceiling';
  end if;
  if exists (select 1 from public.ai_requests where id = '52000000-0000-4000-8000-000000000011')
     or exists (select 1 from public.ai_budget_reservations where request_id = '52000000-0000-4000-8000-000000000011') then
    raise exception 'out-of-range reservation created request side effects';
  end if;

  -- The database must reject a prompt that does not match the supplied hash.
  select * into v_claim
  from public.claim_ai_request(
    v_owner, v_conversation, 'Prompt does not match its digest', 'test-ai-hash-mismatch-001',
    pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(v_conversation::text || E'\n' || 'different prompt', 'UTF8')), 'hex')::char(64),
    '52000000-0000-4000-8000-000000000007',
    'openai-compatible', 'test-model', 'chat', 1, 0.1
  );
  if v_claim.disposition <> 'rejected' or v_claim.reason <> 'invalid_idempotency_input' then
    raise exception 'claim RPC accepted a prompt that did not match its payload hash';
  end if;
  if exists (select 1 from public.ai_requests where id = '52000000-0000-4000-8000-000000000007')
     or exists (select 1 from public.ai_budget_reservations where request_id = '52000000-0000-4000-8000-000000000007')
     or exists (select 1 from public.messages where conversation_id = v_conversation and content = 'Prompt does not match its digest') then
    raise exception 'hash-mismatched prompt created request side effects';
  end if;

  select * into v_claim
  from public.claim_ai_request(
    v_owner, v_conversation, 'Atomic original user prompt', 'test-ai-success-001', pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(v_conversation::text || E'\n' || 'Atomic original user prompt', 'UTF8')), 'hex')::char(64), v_success_request,
    'openai-compatible', 'test-model', 'chat', 1, 0.1
  );
  if v_claim.disposition <> 'claimed' then
    raise exception 'AI success fixture claim failed: %', v_claim.disposition;
  end if;

  if not exists (
    select 1 from public.ai_requests
    where id = v_success_request and conversation_id = v_conversation
  ) then
    raise exception 'AI claim did not persist its originating conversation';
  end if;
  if not exists (
    select 1 from public.messages
    where conversation_id = v_conversation and owner_id = v_owner
      and role = 'user' and content = 'Atomic original user prompt'
  ) then
    raise exception 'AI claim did not atomically persist the original user prompt';
  end if;

  update public.ai_requests
  set status = 'running', started_at = now()
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

  -- The legacy low-level settlement RPC must also reject non-finite costs.
  if public.finalize_ai_budget(
    v_success_request, 'Infinity'::numeric, null, null, 5, 4, 1, null, 120
  ) then
    raise exception 'finalize_ai_budget accepted an infinite settlement cost';
  end if;
  if not exists (
    select 1 from public.ai_budget_reservations
    where request_id = v_success_request and status = 'reserved'
  ) then
    raise exception 'non-finite legacy settlement mutated the reservation';
  end if;

  if public.finalize_ai_budget(
    v_success_request, 0.0123, 10000000000, 'TWD', 5, 4, 1, null, 120
  ) then
    raise exception 'finalize_ai_budget accepted an out-of-range provider billed cost';
  end if;
  if not exists (
    select 1 from public.ai_budget_reservations
    where request_id = v_success_request and status = 'reserved'
  ) then
    raise exception 'out-of-range provider billed cost mutated the reservation';
  end if;

  -- Completion must not move a claimed request into another conversation
  -- owned by the same member.
  if public.complete_ai_chat_request(
    v_owner, v_success_request, v_other_conversation, 'Wrong conversation response', 'test-model',
    5, 4, 1, 0.0123, 'provider-test-atomic-001', 120,
    'configured_token_rates_provider_usage_internal_estimate',
    pg_catalog.jsonb_build_object(
      'requestId', v_success_request::text,
      'answer', 'Wrong conversation response',
      'usage', pg_catalog.jsonb_build_object(
        'inputTokens', 5, 'outputTokens', 4, 'cachedTokens', 1, 'estimatedCostTwd', 0.0123
      )
    )
  ) then
    raise exception 'AI completion accepted a different conversation than the one bound at claim time';
  end if;
  if exists (
    select 1 from public.messages
    where conversation_id = v_other_conversation and owner_id = v_owner
      and role = 'assistant' and content = 'Wrong conversation response'
  ) then
    raise exception 'cross-conversation completion persisted an assistant message';
  end if;

  -- A non-finite provider cost must not settle or mutate the claimed request.
  if public.complete_ai_chat_request(
    v_owner, v_success_request, v_conversation, 'Invalid infinite cost response', 'test-model',
    5, 4, 1, 'Infinity'::numeric, 'provider-test-infinity-001', 120,
    'configured_token_rates_provider_usage_internal_estimate',
    pg_catalog.jsonb_build_object(
      'requestId', v_success_request::text,
      'answer', 'Invalid infinite cost response',
      'usage', pg_catalog.jsonb_build_object(
        'inputTokens', 5, 'outputTokens', 4, 'cachedTokens', 1, 'estimatedCostTwd', 0.0123
      )
    )
  ) then
    raise exception 'AI completion accepted an infinite internal cost';
  end if;
  if not exists (select 1 from public.ai_budget_reservations where request_id = v_success_request and status = 'reserved')
     or not exists (select 1 from public.ai_requests where id = v_success_request and status = 'running')
     or exists (select 1 from public.messages where conversation_id = v_conversation and role = 'assistant' and content = 'Invalid infinite cost response') then
    raise exception 'infinite AI cost validation changed request state or wrote an assistant message';
  end if;

  if public.complete_ai_chat_request(
    v_owner, v_success_request, v_conversation, 'Out-of-range cost response', 'test-model',
    5, 4, 1, 10000000000, 'provider-test-overflow-001', 120,
    'configured_token_rates_provider_usage_internal_estimate',
    pg_catalog.jsonb_build_object(
      'requestId', v_success_request::text,
      'answer', 'Out-of-range cost response',
      'usage', pg_catalog.jsonb_build_object(
        'inputTokens', 5, 'outputTokens', 4, 'cachedTokens', 1, 'estimatedCostTwd', 10000000000
      )
    )
  ) then
    raise exception 'AI completion accepted an out-of-range finite settlement cost';
  end if;
  if not exists (
    select 1 from public.ai_budget_reservations
    where request_id = v_success_request and status = 'reserved'
  ) then
    raise exception 'out-of-range completion cost mutated the reservation';
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

  -- A completed same-key replay must be returned before current preflight
  -- settings are evaluated; the estimate may differ after a pricing change.
  select * into v_claim
  from public.claim_ai_request(
    v_owner, v_conversation, 'Atomic original user prompt', 'test-ai-success-001',
    pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(v_conversation::text || E'\n' || 'Atomic original user prompt', 'UTF8')), 'hex')::char(64), v_blocked_request,
    'openai-compatible', 'test-model', 'chat', 1, 99
  );
  if v_claim.disposition <> 'completed' or v_claim.cached_response->>'answer' <> 'Atomic assistant response' then
    raise exception 'completed idempotency replay was blocked by changed preflight estimate';
  end if;
  if (select count(*) from public.messages
      where conversation_id = v_conversation and owner_id = v_owner
        and role = 'user' and content = 'Atomic original user prompt') <> 1 then
    raise exception 'completed idempotency replay duplicated the original user prompt';
  end if;

  -- A completed request must replay even after provider credentials and pricing
  -- have been removed. No provider call or new reservation is needed.
  select * into v_claim
  from public.claim_ai_request(
    v_owner, v_conversation, 'Atomic original user prompt', 'test-ai-success-001',
    pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(v_conversation::text || E'\n' || 'Atomic original user prompt', 'UTF8')), 'hex')::char(64),
    '52000000-0000-4000-8000-000000000012',
    null, null, null, null, null
  );
  if v_claim.disposition <> 'completed'
     or v_claim.cached_response->>'answer' <> 'Atomic assistant response' then
    raise exception 'completed idempotency replay required provider configuration';
  end if;

  -- Reusing a completed key with a different payload is a conflict,
  -- even when the current provider configuration is absent.
  select * into v_claim
  from public.claim_ai_request(
    v_owner, v_conversation, 'Different payload under completed key', 'test-ai-success-001',
    pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(v_conversation::text || E'\n' || 'Different payload under completed key', 'UTF8')), 'hex')::char(64),
    v_blocked_request, null, null, null, null, null
  );
  if v_claim.disposition <> 'conflict'
     or v_claim.reason <> 'idempotency_key_reused_with_different_payload'
     or v_claim.claimed_request_id <> v_success_request then
    raise exception 'completed idempotency key accepted a different payload';
  end if;
  if exists (select 1 from public.ai_requests where id = v_blocked_request)
     or exists (select 1 from public.ai_budget_reservations where request_id = v_blocked_request)
     or exists (select 1 from public.messages where conversation_id = v_conversation and owner_id = v_owner and content = 'Different payload under completed key') then
    raise exception 'conflicting idempotency payload created request side effects';
  end if;

  -- A new request with no provider configuration must be rejected before
  -- request, budget, idempotency, or user-message side effects.
  select * into v_claim
  from public.claim_ai_request(
    v_owner, v_conversation, 'Provider config missing prompt', 'test-ai-no-config-001',
    pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(v_conversation::text || E'\n' || 'Provider config missing prompt', 'UTF8')), 'hex')::char(64),
    '52000000-0000-4000-8000-000000000013',
    null, null, null, null, null
  );
  if v_claim.disposition <> 'rejected' or v_claim.reason <> 'provider_config_unavailable' then
    raise exception 'new AI request was not rejected when provider configuration was missing';
  end if;
  if exists (select 1 from public.ai_requests where id = '52000000-0000-4000-8000-000000000013')
     or exists (select 1 from public.ai_budget_reservations where request_id = '52000000-0000-4000-8000-000000000013')
     or exists (select 1 from public.ai_request_idempotency where owner_id = v_owner and idempotency_key = 'test-ai-no-config-001')
     or exists (select 1 from public.messages where conversation_id = v_conversation and owner_id = v_owner and content = 'Provider config missing prompt') then
    raise exception 'missing provider configuration created AI request side effects';
  end if;

  select * into v_claim
  from public.claim_ai_request(
    v_owner, v_conversation, 'Known failure original prompt', 'test-ai-failure-001', pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(v_conversation::text || E'\n' || 'Known failure original prompt', 'UTF8')), 'hex')::char(64), v_failed_request,
    'openai-compatible', 'test-model', 'chat', 1, 0.1
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
    v_owner, v_conversation, 'Uncertain request original prompt', 'test-ai-unknown-001', pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(v_conversation::text || E'\n' || 'Uncertain request original prompt', 'UTF8')), 'hex')::char(64), v_unknown_request,
    'openai-compatible', 'test-model', 'chat', 1, 0.1
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

  -- A same-key retry remains attached to the original unresolved request.
  select * into v_claim
  from public.claim_ai_request(
    v_owner, v_conversation, 'Uncertain request original prompt', 'test-ai-unknown-001', pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(v_conversation::text || E'\n' || 'Uncertain request original prompt', 'UTF8')), 'hex')::char(64), v_blocked_request,
    'openai-compatible', 'test-model', 'chat', 1, 99
  );
  if v_claim.disposition <> 'processing'
     or v_claim.reason <> 'request_in_progress'
     or v_claim.claimed_request_id <> v_unknown_request then
    raise exception 'same-key retry did not preserve the original unresolved request';
  end if;
  if (select count(*) from public.messages
      where conversation_id = v_conversation and owner_id = v_owner
        and role = 'user' and content = 'Uncertain request original prompt') <> 1 then
    raise exception 'same-key retry duplicated the original user prompt';
  end if;

  -- A different key and conversation for the same member must not start a
  -- second billable request while the first provider outcome is unresolved.
  select * into v_claim
  from public.claim_ai_request(
    v_owner, v_other_conversation, 'Blocked cross conversation prompt', 'test-ai-cross-conversation-001', pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(v_other_conversation::text || E'\n' || 'Blocked cross conversation prompt', 'UTF8')), 'hex')::char(64), v_blocked_request,
    'openai-compatible', 'test-model', 'chat', 1, 0.1
  );
  if v_claim.disposition <> 'processing'
     or v_claim.reason <> 'member_has_unresolved_request'
     or v_claim.claimed_request_id <> v_unknown_request then
    raise exception 'cross-conversation AI request was not blocked by unresolved request';
  end if;
  if exists (select 1 from public.ai_requests where id = v_blocked_request)
     or exists (select 1 from public.ai_budget_reservations where request_id = v_blocked_request) then
    raise exception 'blocked cross-conversation request created a request or budget reservation';
  end if;
  if exists (select 1 from public.messages
      where conversation_id = v_other_conversation and owner_id = v_owner
        and role = 'user' and content = 'Blocked cross conversation prompt') then
    raise exception 'blocked cross-conversation claim persisted a user prompt';
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
    v_overrun_owner, v_overrun_conversation, 'Budget overrun original prompt', 'test-ai-overrun-001', pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(v_overrun_conversation::text || E'\n' || 'Budget overrun original prompt', 'UTF8')), 'hex')::char(64), v_overrun_request,
    'openai-compatible', 'test-model', 'chat', 0.001, 0.0005
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
