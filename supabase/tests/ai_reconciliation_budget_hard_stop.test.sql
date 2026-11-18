begin;

select plan(5);

select ok(
  to_regprocedure('public.enforce_ai_budget_hard_stop_after_reconciliation()') is not null
  and exists (
    select 1 from pg_trigger
    where tgrelid = 'public.ai_reconciliation_events'::regclass
      and tgname = 'ai_reconciliation_budget_hard_stop'
      and not tgisinternal
  ),
  'confirmed-billed reconciliation hard-stop trigger exists'
);

do $budget_fixture$
declare
  v_owner uuid := '54000000-0000-4000-8000-000000000001';
  v_request uuid := '55000000-0000-4000-8000-000000000001';
begin
  insert into auth.users (
    id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values (
    v_owner, 'authenticated', 'authenticated',
    'reconciliation-budget-owner@example.test', '', now(), '{}'::jsonb,
    '{"name":"Reconciliation Budget Owner"}'::jsonb, now(), now()
  );

  update public.platform_ai_controls
  set ai_enabled = true, monthly_spend_cap = 1, per_request_spend_cap = 10,
      currency = 'TWD', hard_stop_enabled = true
  where id = true;

  insert into public.ai_user_limits (
    owner_id, ai_enabled, daily_request_limit, monthly_request_limit, monthly_spend_limit, currency
  ) values (v_owner, true, 10, 100, 1, 'TWD');

  insert into public.ai_requests (id, owner_id, provider, model, feature, status)
  values (v_request, v_owner, 'openai-compatible', 'fixture-model', 'chat', 'failed');

  insert into public.ai_budget_reservations (
    request_id, owner_id, reserved_amount, actual_cost, status, settled_at
  ) values (v_request, v_owner, 2, 1.01, 'settled', now());

  insert into public.ai_reconciliation_events (
    request_id, actor_id, idempotency_key, decision, provider,
    evidence_reference, rationale, provider_billed_cost,
    provider_billed_currency, normalized_cost_twd, payload_hash
  ) values (
    v_request, v_owner, '56000000-0000-4000-8000-000000000001',
    'confirmed_billed', 'openai-compatible', 'provider-invoice-row-001',
    'Provider invoice evidence confirms this request was billed and delivered no result.',
    0.031, 'USD', 1.01, repeat('a', 64)
  );
end;
$budget_fixture$;

select ok(
  (select ai_enabled = false from public.platform_ai_controls where id = true),
  'confirmed billed reconciliation disables platform AI after the global cap is exceeded'
);

select ok(
  (select ai_enabled = false
   from public.ai_user_limits
   where owner_id = '54000000-0000-4000-8000-000000000001'),
  'confirmed billed reconciliation disables member AI after the member cap is exceeded'
);

select is(
  (select count(*) from public.audit_logs
   where action in ('ai_platform_budget_hard_stop_triggered', 'ai_member_budget_hard_stop_triggered')
     and resource_id in (
       '55000000-0000-4000-8000-000000000001',
       '54000000-0000-4000-8000-000000000001'
     )),
  2::bigint,
  'both hard-stop transitions produce audit records'
);

do $negative_fixture$
declare
  v_owner uuid := '54000000-0000-4000-8000-000000000002';
  v_request uuid := '55000000-0000-4000-8000-000000000002';
begin
  update public.platform_ai_controls
  set ai_enabled = true, monthly_spend_cap = 100, hard_stop_enabled = true
  where id = true;

  insert into auth.users (
    id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values (
    v_owner, 'authenticated', 'authenticated',
    'reconciliation-budget-negative@example.test', '', now(), '{}'::jsonb,
    '{"name":"Reconciliation Budget Negative"}'::jsonb, now(), now()
  );

  insert into public.ai_user_limits (
    owner_id, ai_enabled, daily_request_limit, monthly_request_limit, monthly_spend_limit, currency
  ) values (v_owner, true, 10, 100, 100, 'TWD');

  insert into public.ai_requests (id, owner_id, provider, model, feature, status)
  values (v_request, v_owner, 'openai-compatible', 'fixture-model', 'chat', 'failed');

  insert into public.ai_budget_reservations (
    request_id, owner_id, reserved_amount, status, settled_at
  ) values (v_request, v_owner, 2, 'released', now());

  insert into public.ai_reconciliation_events (
    request_id, actor_id, idempotency_key, decision, provider,
    evidence_reference, rationale, payload_hash
  ) values (
    v_request, v_owner, '56000000-0000-4000-8000-000000000002',
    'confirmed_not_billed', 'openai-compatible', 'provider-invoice-row-002',
    'Provider evidence confirms no charge was made for this request.',
    repeat('b', 64)
  );
end;
$negative_fixture$;

select ok(
  (select ai_enabled from public.platform_ai_controls where id = true)
  and (select ai_enabled from public.ai_user_limits
       where owner_id = '54000000-0000-4000-8000-000000000002'),
  'confirmed-not-billed reconciliation does not trigger a budget hard-stop'
);

select * from finish();
rollback;
