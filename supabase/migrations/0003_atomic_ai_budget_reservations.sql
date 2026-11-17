-- Atomic AI budget reservations.
-- All AI calls must reserve budget through this function before contacting a provider.
-- Missing/disabled/zero-budget controls fail closed. Amounts are denominated in TWD.

create table public.ai_budget_reservations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.ai_requests(id) on delete restrict,
  owner_id uuid not null references public.profiles(id) on delete restrict,
  reserved_amount numeric(18,8) not null check (reserved_amount > 0),
  actual_cost numeric(18,8) check (actual_cost is null or actual_cost >= 0),
  currency char(3) not null default 'TWD' check (currency = 'TWD'),
  status text not null default 'reserved' check (status in ('reserved','settled','released')),
  created_at timestamptz not null default now(),
  settled_at timestamptz
);

alter table public.ai_budget_reservations enable row level security;
revoke all on public.ai_budget_reservations from anon, authenticated;
grant all privileges on public.ai_budget_reservations to service_role;

create index ai_budget_reservations_monthly_global_idx
  on public.ai_budget_reservations (created_at, status);
create index ai_budget_reservations_owner_monthly_idx
  on public.ai_budget_reservations (owner_id, created_at, status);

create or replace function public.reserve_ai_budget(
  p_request_id uuid,
  p_owner_id uuid,
  p_provider text,
  p_model text,
  p_feature text,
  p_max_cost_twd numeric
)
returns table (allowed boolean, reason text, reservation_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_controls public.platform_ai_controls%rowtype;
  v_limits public.ai_user_limits%rowtype;
  v_global_committed numeric(18,8);
  v_user_committed numeric(18,8);
  v_daily_count bigint;
  v_monthly_count bigint;
  v_reservation_id uuid;
  v_month_start timestamptz := date_trunc('month', now());
  v_day_start timestamptz := date_trunc('day', now());
begin
  if p_request_id is null or p_owner_id is null
     or coalesce(length(trim(p_provider)), 0) = 0
     or coalesce(length(trim(p_model)), 0) = 0
     or coalesce(length(trim(p_feature)), 0) = 0
     or p_max_cost_twd is null or p_max_cost_twd <= 0 then
    return query select false, 'invalid_request'::text, null::uuid;
    return;
  end if;

  -- Serialize reservations globally so concurrent requests cannot oversubscribe
  -- the global monthly ceiling.
  select * into v_controls
  from public.platform_ai_controls
  where id = true
  for update;

  if not found or not v_controls.ai_enabled or not v_controls.hard_stop_enabled then
    return query select false, 'platform_ai_disabled'::text, null::uuid;
    return;
  end if;
  if v_controls.currency <> 'TWD'
     or v_controls.monthly_spend_cap <= 0
     or v_controls.per_request_spend_cap <= 0
     or p_max_cost_twd > v_controls.per_request_spend_cap then
    return query select false, 'platform_budget_unavailable_or_exceeded'::text, null::uuid;
    return;
  end if;

  select * into v_limits
  from public.ai_user_limits
  where owner_id = p_owner_id
  for update;

  if not found or not v_limits.ai_enabled or v_limits.currency <> 'TWD'
     or v_limits.daily_request_limit <= 0
     or v_limits.monthly_request_limit <= 0
     or v_limits.monthly_spend_limit <= 0 then
    return query select false, 'member_ai_disabled_or_unlimited_policy_missing'::text, null::uuid;
    return;
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = p_owner_id and p.account_status = 'active'
  ) then
    return query select false, 'member_not_active'::text, null::uuid;
    return;
  end if;

  select coalesce(sum(
    case when status = 'settled' then actual_cost else reserved_amount end
  ), 0)
  into v_global_committed
  from public.ai_budget_reservations
  where created_at >= v_month_start and status in ('reserved','settled');

  if v_global_committed + p_max_cost_twd > v_controls.monthly_spend_cap then
    return query select false, 'platform_monthly_budget_exceeded'::text, null::uuid;
    return;
  end if;

  select
    coalesce(sum(case when status = 'settled' then actual_cost else reserved_amount end), 0),
    count(*) filter (where created_at >= v_day_start),
    count(*)
  into v_user_committed, v_daily_count, v_monthly_count
  from public.ai_budget_reservations
  where owner_id = p_owner_id
    and created_at >= v_month_start
    and status in ('reserved','settled');

  if v_user_committed + p_max_cost_twd > v_limits.monthly_spend_limit then
    return query select false, 'member_monthly_budget_exceeded'::text, null::uuid;
    return;
  end if;
  if v_daily_count >= v_limits.daily_request_limit then
    return query select false, 'member_daily_request_limit'::text, null::uuid;
    return;
  end if;
  if v_monthly_count >= v_limits.monthly_request_limit then
    return query select false, 'member_monthly_request_limit'::text, null::uuid;
    return;
  end if;

  if exists (select 1 from public.ai_requests r where r.id = p_request_id) then
    return query select false, 'duplicate_request_id'::text, null::uuid;
    return;
  end if;

  insert into public.ai_requests (
    id, owner_id, provider, model, feature, status, estimated_internal_cost, cost_method
  ) values (
    p_request_id, p_owner_id, trim(p_provider), trim(p_model), trim(p_feature),
    'queued', p_max_cost_twd, 'preflight_max_cost_reservation_twd'
  );

  insert into public.ai_budget_reservations (
    request_id, owner_id, reserved_amount, currency, status
  ) values (
    p_request_id, p_owner_id, p_max_cost_twd, 'TWD', 'reserved'
  )
  returning id into v_reservation_id;

  return query select true, 'reserved'::text, v_reservation_id;
end;
$$;

create or replace function public.finalize_ai_budget(
  p_request_id uuid,
  p_actual_cost_twd numeric,
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
  v_reservation public.ai_budget_reservations%rowtype;
begin
  if p_request_id is null or p_actual_cost_twd is null or p_actual_cost_twd < 0
     or (p_input_tokens is not null and p_input_tokens < 0)
     or (p_output_tokens is not null and p_output_tokens < 0)
     or (p_cached_tokens is not null and p_cached_tokens < 0)
     or (p_latency_ms is not null and p_latency_ms < 0) then
    return false;
  end if;

  select * into v_reservation
  from public.ai_budget_reservations
  where request_id = p_request_id
  for update;

  if not found or v_reservation.status <> 'reserved'
     or p_actual_cost_twd > v_reservation.reserved_amount then
    return false;
  end if;

  update public.ai_budget_reservations
  set actual_cost = p_actual_cost_twd, status = 'settled', settled_at = now()
  where id = v_reservation.id;

  update public.ai_requests
  set status = 'succeeded',
      provider_billed_cost = p_actual_cost_twd,
      provider_billed_currency = 'TWD',
      input_tokens = p_input_tokens,
      output_tokens = p_output_tokens,
      cached_tokens = p_cached_tokens,
      provider_request_id = p_provider_request_id,
      latency_ms = p_latency_ms,
      completed_at = now()
  where id = p_request_id;

  return found;
end;
$$;

create or replace function public.release_ai_budget(
  p_request_id uuid,
  p_error_code text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reservation public.ai_budget_reservations%rowtype;
begin
  select * into v_reservation
  from public.ai_budget_reservations
  where request_id = p_request_id
  for update;

  if not found or v_reservation.status <> 'reserved' then
    return false;
  end if;

  update public.ai_budget_reservations
  set status = 'released', settled_at = now()
  where id = v_reservation.id;

  update public.ai_requests
  set status = 'failed', error_code = left(coalesce(p_error_code, 'provider_failed'), 120),
      completed_at = now()
  where id = p_request_id;

  return found;
end;
$$;

revoke all on function public.reserve_ai_budget(uuid,uuid,text,text,text,numeric) from public, anon, authenticated;
revoke all on function public.finalize_ai_budget(uuid,numeric,integer,integer,integer,text,integer) from public, anon, authenticated;
revoke all on function public.release_ai_budget(uuid,text) from public, anon, authenticated;
grant execute on function public.reserve_ai_budget(uuid,uuid,text,text,text,numeric) to service_role;
grant execute on function public.finalize_ai_budget(uuid,numeric,integer,integer,integer,text,integer) to service_role;
grant execute on function public.release_ai_budget(uuid,text) to service_role;
