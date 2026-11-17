-- Atomic AI chat completion, failure, and uncertain-outcome handling.
-- A provider response is committed with its assistant message, cost ledger entry,
-- budget settlement, and idempotency response in one PostgreSQL transaction.

create or replace function public.complete_ai_chat_request(
  p_owner_id uuid,
  p_request_id uuid,
  p_conversation_id uuid,
  p_answer text,
  p_model text,
  p_input_tokens integer,
  p_output_tokens integer,
  p_cached_tokens integer,
  p_estimated_cost_twd numeric,
  p_provider_request_id text,
  p_latency_ms integer,
  p_cost_method text,
  p_response jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_controls public.platform_ai_controls%rowtype;
  v_reservation public.ai_budget_reservations%rowtype;
  v_request public.ai_requests%rowtype;
  v_idempotency public.ai_request_idempotency%rowtype;
  v_monthly_committed numeric(18,8);
  v_user_limits public.ai_user_limits%rowtype;
  v_user_monthly_committed numeric(18,8);
begin
  if p_owner_id is null or p_request_id is null or p_conversation_id is null
     or p_answer is null or char_length(p_answer) < 1 or char_length(p_answer) > 40000
     or p_model is null or length(trim(p_model)) < 1 or length(p_model) > 160
     or p_input_tokens is null or p_input_tokens < 0 or p_input_tokens > 1000000
     or p_output_tokens is null or p_output_tokens < 0 or p_output_tokens > 1000000
     or p_cached_tokens is null or p_cached_tokens < 0 or p_cached_tokens > p_input_tokens
     or p_estimated_cost_twd is null or p_estimated_cost_twd < 0
     or p_estimated_cost_twd::text = 'NaN'
     or (p_provider_request_id is not null and length(p_provider_request_id) > 256)
     or p_latency_ms is null or p_latency_ms < 0 or p_latency_ms > 600000
     or p_cost_method is null or length(trim(p_cost_method)) < 1 or length(p_cost_method) > 120
     or p_response is null or pg_catalog.jsonb_typeof(p_response) <> 'object'
     or p_response->>'requestId' is distinct from p_request_id::text
     or p_response->>'answer' is distinct from p_answer then
    return false;
  end if;

  -- Match the reservation function's global lock order.
  select * into v_controls
  from public.platform_ai_controls
  where id = true
  for update;

  if not found then
    return false;
  end if;

  select * into v_reservation
  from public.ai_budget_reservations
  where request_id = p_request_id
  for update;

  if not found or v_reservation.owner_id is distinct from p_owner_id then
    return false;
  end if;

  select * into v_request
  from public.ai_requests
  where id = p_request_id and owner_id = p_owner_id
  for update;

  if not found or v_request.model is distinct from p_model then
    return false;
  end if;

  select * into v_idempotency
  from public.ai_request_idempotency
  where owner_id = p_owner_id and request_id = p_request_id
  for update;

  if not found then
    return false;
  end if;

  -- A retry after a committed transaction but lost HTTP response is safe.
  if v_request.status = 'succeeded'
     and v_reservation.status = 'settled'
     and v_idempotency.state = 'completed' then
    return v_idempotency.response_json = p_response;
  end if;

  if v_request.status not in ('queued','running')
     or v_reservation.status <> 'reserved'
     or v_idempotency.state <> 'processing' then
    return false;
  end if;

  if not exists (
    select 1 from public.conversations c
    where c.id = p_conversation_id and c.owner_id = p_owner_id
  ) then
    return false;
  end if;

  update public.ai_budget_reservations
  set actual_cost = p_estimated_cost_twd,
      status = 'settled',
      settled_at = now()
  where request_id = p_request_id;

  update public.ai_requests
  set conversation_id = p_conversation_id,
      status = 'succeeded',
      estimated_internal_cost = p_estimated_cost_twd,
      cost_method = p_cost_method,
      input_tokens = p_input_tokens,
      output_tokens = p_output_tokens,
      cached_tokens = p_cached_tokens,
      provider_request_id = p_provider_request_id,
      latency_ms = p_latency_ms,
      error_code = null,
      completed_at = now()
  where id = p_request_id;

  insert into public.messages (
    conversation_id, owner_id, role, content, model, token_input, token_output
  ) values (
    p_conversation_id, p_owner_id, 'assistant', p_answer, p_model, p_input_tokens, p_output_tokens
  );

  insert into public.ai_cost_ledger (
    request_id, owner_id, cost_category, amount, currency, amount_kind, calculation_method
  ) values (
    p_request_id, p_owner_id, 'model_provider', p_estimated_cost_twd, 'TWD',
    'internal_estimate', p_cost_method
  );

  update public.ai_request_idempotency
  set state = 'completed',
      response_json = p_response,
      error_code = null,
      updated_at = now(),
      expires_at = now() + interval '24 hours'
  where owner_id = p_owner_id and request_id = p_request_id and state = 'processing';

  if not found then
    raise exception 'AI idempotency completion state changed unexpectedly';
  end if;

  select coalesce(sum(
    case when status = 'settled' then actual_cost else reserved_amount end
  ), 0)
  into v_monthly_committed
  from public.ai_budget_reservations
  where created_at >= date_trunc('month', now())
    and status in ('reserved','settled');

  if v_controls.hard_stop_enabled
     and v_controls.monthly_spend_cap > 0
     and (v_monthly_committed > v_controls.monthly_spend_cap
          or p_estimated_cost_twd > v_reservation.reserved_amount) then
    update public.platform_ai_controls
    set ai_enabled = false,
        updated_by = null,
        updated_at = now()
    where id = true;

    insert into public.audit_logs (
      actor_id, action, resource_type, resource_id, outcome, metadata
    ) values (
      null, 'ai_platform_budget_hard_stop_triggered', 'platform_ai_controls', p_request_id, 'allowed',
      pg_catalog.jsonb_build_object(
        'estimated_internal_cost_twd', p_estimated_cost_twd,
        'reserved_amount_twd', v_reservation.reserved_amount,
        'monthly_committed_twd', v_monthly_committed,
        'monthly_cap_twd', v_controls.monthly_spend_cap
      )
    );
  end if;

  select * into v_user_limits
  from public.ai_user_limits
  where owner_id = p_owner_id
  for update;

  if found and v_user_limits.monthly_spend_limit > 0 then
    select coalesce(sum(
      case when status = 'settled' then actual_cost else reserved_amount end
    ), 0)
    into v_user_monthly_committed
    from public.ai_budget_reservations
    where owner_id = p_owner_id
      and created_at >= date_trunc('month', now())
      and status in ('reserved','settled');

    if v_user_monthly_committed > v_user_limits.monthly_spend_limit then
      update public.ai_user_limits
      set ai_enabled = false,
          updated_at = now()
      where owner_id = p_owner_id;

      insert into public.audit_logs (
        actor_id, action, resource_type, resource_id, outcome, metadata
      ) values (
        null, 'ai_member_budget_hard_stop_triggered', 'ai_user_limits', p_owner_id, 'allowed',
        pg_catalog.jsonb_build_object(
          'request_id', p_request_id,
          'estimated_internal_cost_twd', p_estimated_cost_twd,
          'monthly_committed_twd', v_user_monthly_committed,
          'monthly_cap_twd', v_user_limits.monthly_spend_limit
        )
      );
    end if;
  end if;

  return true;
end;
$$;

create or replace function public.fail_ai_chat_request(
  p_owner_id uuid,
  p_request_id uuid,
  p_error_code text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_controls public.platform_ai_controls%rowtype;
  v_reservation public.ai_budget_reservations%rowtype;
  v_request public.ai_requests%rowtype;
  v_idempotency public.ai_request_idempotency%rowtype;
  v_error_code text := left(coalesce(nullif(trim(p_error_code), ''), 'request_failed'), 120);
begin
  if p_owner_id is null or p_request_id is null then
    return false;
  end if;

  select * into v_controls
  from public.platform_ai_controls
  where id = true
  for update;

  if not found then
    return false;
  end if;

  select * into v_reservation
  from public.ai_budget_reservations
  where request_id = p_request_id
  for update;

  if not found or v_reservation.owner_id is distinct from p_owner_id then
    return false;
  end if;

  select * into v_request
  from public.ai_requests
  where id = p_request_id and owner_id = p_owner_id
  for update;

  if not found then
    return false;
  end if;

  select * into v_idempotency
  from public.ai_request_idempotency
  where owner_id = p_owner_id and request_id = p_request_id
  for update;

  if not found then
    return false;
  end if;

  if v_request.status = 'failed'
     and v_reservation.status = 'released'
     and v_idempotency.state = 'failed' then
    return true;
  end if;

  if v_request.status not in ('queued','running')
     or v_reservation.status <> 'reserved'
     or v_idempotency.state <> 'processing' then
    return false;
  end if;

  update public.ai_budget_reservations
  set status = 'released', settled_at = now()
  where request_id = p_request_id;

  update public.ai_requests
  set status = 'failed',
      error_code = v_error_code,
      completed_at = now()
  where id = p_request_id;

  update public.ai_request_idempotency
  set state = 'failed',
      response_json = null,
      error_code = v_error_code,
      updated_at = now(),
      expires_at = now() + interval '24 hours'
  where owner_id = p_owner_id and request_id = p_request_id;

  return true;
end;
$$;

create or replace function public.mark_ai_request_reconciliation_required(
  p_owner_id uuid,
  p_request_id uuid,
  p_error_code text,
  p_provider_request_id text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_controls public.platform_ai_controls%rowtype;
  v_reservation public.ai_budget_reservations%rowtype;
  v_request public.ai_requests%rowtype;
  v_error_code text := left(coalesce(nullif(trim(p_error_code), ''), 'provider_outcome_unknown'), 120);
begin
  if p_owner_id is null or p_request_id is null
     or (p_provider_request_id is not null and length(p_provider_request_id) > 256) then
    return false;
  end if;

  select * into v_controls
  from public.platform_ai_controls
  where id = true
  for update;

  if not found then
    return false;
  end if;

  select * into v_reservation
  from public.ai_budget_reservations
  where request_id = p_request_id
  for update;

  if not found or v_reservation.owner_id is distinct from p_owner_id
     or v_reservation.status <> 'reserved' then
    return false;
  end if;

  select * into v_request
  from public.ai_requests
  where id = p_request_id and owner_id = p_owner_id
  for update;

  if not found or v_request.status not in ('queued','running') then
    return false;
  end if;

  update public.ai_requests
  set status = 'running',
      error_code = v_error_code,
      provider_request_id = coalesce(p_provider_request_id, provider_request_id)
  where id = p_request_id;

  return found;
end;
$$;

revoke all on function public.complete_ai_chat_request(uuid,uuid,uuid,text,text,integer,integer,integer,numeric,text,integer,text,jsonb)
  from public, anon, authenticated;
revoke all on function public.fail_ai_chat_request(uuid,uuid,text)
  from public, anon, authenticated;
revoke all on function public.mark_ai_request_reconciliation_required(uuid,uuid,text,text)
  from public, anon, authenticated;

grant execute on function public.complete_ai_chat_request(uuid,uuid,uuid,text,text,integer,integer,integer,numeric,text,integer,text,jsonb)
  to service_role;
grant execute on function public.fail_ai_chat_request(uuid,uuid,text)
  to service_role;
grant execute on function public.mark_ai_request_reconciliation_required(uuid,uuid,text,text)
  to service_role;

comment on function public.complete_ai_chat_request(uuid,uuid,uuid,text,text,integer,integer,integer,numeric,text,integer,text,jsonb) is
  'Atomically settles an AI chat reservation, records the assistant message and internal cost estimate, and completes idempotency. Safe to replay with the identical response.';
comment on function public.fail_ai_chat_request(uuid,uuid,text) is
  'Atomically releases a known-failed AI request reservation and marks its idempotency record failed.';
comment on function public.mark_ai_request_reconciliation_required(uuid,uuid,text,text) is
  'Keeps an uncertain provider outcome reserved and visible to operators; it never releases budget or retries the provider call.';
