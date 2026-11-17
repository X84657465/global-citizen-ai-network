-- Database-enforced per-member AI request rate limits.
-- Fixed windows are intentionally conservative for the first release.
-- Only new idempotency claims consume rate quota; safe retries do not.

create table public.ai_request_rate_limits (
  owner_id uuid not null references public.profiles(id) on delete restrict,
  window_seconds integer not null check (window_seconds in (60, 3600)),
  window_start timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (owner_id, window_seconds, window_start)
);

alter table public.ai_request_rate_limits enable row level security;
revoke all on public.ai_request_rate_limits from public, anon, authenticated;
grant all privileges on public.ai_request_rate_limits to service_role;

create or replace function public.consume_ai_request_rate_limit(
  p_owner_id uuid,
  p_window_seconds integer,
  p_limit integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window_start timestamptz;
  v_count integer;
begin
  if p_owner_id is null or p_window_seconds not in (60, 3600)
     or p_limit is null or p_limit <= 0 then
    return false;
  end if;

  v_window_start := pg_catalog.to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.ai_request_rate_limits (
    owner_id, window_seconds, window_start, request_count, updated_at
  ) values (
    p_owner_id, p_window_seconds, v_window_start, 1, now()
  )
  on conflict (owner_id, window_seconds, window_start)
  do update set
    request_count = public.ai_request_rate_limits.request_count + 1,
    updated_at = now()
  returning request_count into v_count;

  return v_count <= p_limit;
end;
$$;

-- Redefine the claim function so duplicate retries are detected before rate
-- counters are incremented. The idempotency lock makes the decision atomic.
create or replace function public.claim_ai_request(
  p_owner_id uuid,
  p_idempotency_key text,
  p_request_hash char(64),
  p_request_id uuid,
  p_provider text,
  p_model text,
  p_feature text,
  p_max_cost_twd numeric
)
returns table (disposition text, reason text, claimed_request_id uuid, cached_response jsonb)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing public.ai_request_idempotency%rowtype;
  v_reservation record;
begin
  if p_owner_id is null or p_request_id is null
     or p_idempotency_key is null
     or length(p_idempotency_key) < 8
     or length(p_idempotency_key) > 128
     or p_idempotency_key !~ '^[A-Za-z0-9._:-]+$'
     or p_request_hash is null
     or p_request_hash !~ '^[0-9a-f]{64}$' then
    return query select 'rejected'::text, 'invalid_idempotency_input'::text, null::uuid, null::jsonb;
    return;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_owner_id::text || ':' || p_idempotency_key, 0)
  );

  select * into v_existing
  from public.ai_request_idempotency i
  where i.owner_id = p_owner_id
    and i.idempotency_key = p_idempotency_key
  for update;

  if found and v_existing.expires_at > now() then
    if v_existing.request_hash <> p_request_hash then
      return query select 'conflict'::text, 'idempotency_key_reused_with_different_payload'::text,
        v_existing.request_id, null::jsonb;
    elsif v_existing.state = 'completed' then
      return query select 'completed'::text, 'cached_response'::text,
        v_existing.request_id, v_existing.response_json;
    elsif v_existing.state = 'processing' then
      return query select 'processing'::text, 'request_in_progress'::text,
        v_existing.request_id, null::jsonb;
    else
      return query select 'failed'::text, coalesce(v_existing.error_code, 'previous_attempt_failed'),
        v_existing.request_id, null::jsonb;
    end if;
    return;
  end if;

  if found then
    delete from public.ai_request_idempotency where id = v_existing.id;
  end if;

  if not public.consume_ai_request_rate_limit(p_owner_id, 60, 10)
     or not public.consume_ai_request_rate_limit(p_owner_id, 3600, 60) then
    return query select 'rejected'::text, 'rate_limited'::text, null::uuid, null::jsonb;
    return;
  end if;

  select * into v_reservation
  from public.reserve_ai_budget(
    p_request_id, p_owner_id, p_provider, p_model, p_feature, p_max_cost_twd
  );

  if not coalesce(v_reservation.allowed, false) then
    return query select 'rejected'::text, coalesce(v_reservation.reason, 'budget_rejected'),
      null::uuid, null::jsonb;
    return;
  end if;

  insert into public.ai_request_idempotency (
    owner_id, idempotency_key, request_hash, request_id
  ) values (
    p_owner_id, p_idempotency_key, p_request_hash, p_request_id
  );

  return query select 'claimed'::text, 'reserved'::text, p_request_id, null::jsonb;
end;
$$;

revoke all on function public.consume_ai_request_rate_limit(uuid,integer,integer) from public, anon, authenticated;
revoke all on function public.claim_ai_request(uuid,text,char,uuid,text,text,text,numeric) from public, anon, authenticated;
grant execute on function public.consume_ai_request_rate_limit(uuid,integer,integer) to service_role;
grant execute on function public.claim_ai_request(uuid,text,char,uuid,text,text,text,numeric) to service_role;

create index ai_request_rate_limits_cleanup_idx
  on public.ai_request_rate_limits (updated_at);
