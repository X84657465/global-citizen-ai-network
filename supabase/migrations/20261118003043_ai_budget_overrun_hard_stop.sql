-- Global hard-stop on actual-cost overruns.
-- Serialize settlement against new reservations by locking the same control row.
-- Actual provider charges are always recorded; if they push committed spend over
-- the monthly cap, new AI requests are disabled until an administrator reviews it.

create or replace function public.finalize_ai_budget(
  p_request_id uuid,
  p_actual_cost_twd numeric,
  p_provider_billed_cost numeric,
  p_provider_billed_currency char(3),
  p_input_tokens integer,
  p_output_tokens integer,
  p_cached_tokens integer,
  p_provider_request_id text,
  p_latency_ms integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_controls public.platform_ai_controls%rowtype;
  v_reservation public.ai_budget_reservations%rowtype;
  v_monthly_committed numeric(18,8);
begin
  if p_request_id is null or p_actual_cost_twd is null or p_actual_cost_twd < 0
     or p_actual_cost_twd::text in ('NaN', 'Infinity', '-Infinity')
     or p_actual_cost_twd > 9999999999.99999999
     or (p_provider_billed_cost is not null and (
       p_provider_billed_cost < 0
       or p_provider_billed_cost::text in ('NaN', 'Infinity', '-Infinity')
       or p_provider_billed_cost > 9999999999.99999999
     ))
     or (p_provider_billed_cost is not null and p_provider_billed_currency is null)
     or (p_provider_billed_currency is not null and length(trim(p_provider_billed_currency::text)) <> 3)
     or (p_input_tokens is not null and p_input_tokens < 0)
     or (p_output_tokens is not null and p_output_tokens < 0)
     or (p_cached_tokens is not null and p_cached_tokens < 0)
     or (p_latency_ms is not null and p_latency_ms < 0) then
    return false;
  end if;

  -- Use the same lock order as reserve_ai_budget to avoid races/deadlocks.
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

  if not found or v_reservation.status <> 'reserved' then
    return false;
  end if;

  update public.ai_budget_reservations
  set actual_cost = p_actual_cost_twd,
      status = 'settled',
      settled_at = now()
  where id = v_reservation.id;

  update public.ai_requests
  set status = 'succeeded',
      provider_billed_cost = p_provider_billed_cost,
      provider_billed_currency = p_provider_billed_currency,
      input_tokens = p_input_tokens,
      output_tokens = p_output_tokens,
      cached_tokens = p_cached_tokens,
      provider_request_id = p_provider_request_id,
      latency_ms = p_latency_ms,
      cost_method = 'provider_actual_cost_normalized_to_twd',
      completed_at = now()
  where id = p_request_id;

  select coalesce(sum(
    case when status = 'settled' then actual_cost else reserved_amount end
  ), 0)
  into v_monthly_committed
  from public.ai_budget_reservations
  where created_at >= date_trunc('month', now())
    and status in ('reserved', 'settled');

  -- Never discard or cap the real charge. Instead, stop further generation
  -- when the actual committed amount breaches the configured global ceiling.
  if v_controls.hard_stop_enabled
     and v_controls.monthly_spend_cap > 0
     and v_monthly_committed > v_controls.monthly_spend_cap then
    update public.platform_ai_controls
    set ai_enabled = false,
        updated_at = now()
    where id = true;
  end if;

  return true;
end;
$$;

revoke all on function public.finalize_ai_budget(uuid,numeric,numeric,char,integer,integer,integer,text,integer) from public, anon, authenticated;
grant execute on function public.finalize_ai_budget(uuid,numeric,numeric,char,integer,integer,integer,text,integer) to service_role;
