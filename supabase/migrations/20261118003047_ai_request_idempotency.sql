-- Durable per-member AI request idempotency.
-- A transaction-scoped advisory lock serializes claims for the same owner/key.
-- The idempotency record and budget reservation are created in one transaction.

create table public.ai_request_idempotency (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  idempotency_key varchar(128) not null,
  request_hash char(64) not null,
  request_id uuid not null unique references public.ai_requests(id) on delete restrict,
  state text not null default 'processing'
    check (state in ('processing', 'completed', 'failed')),
  response_json jsonb,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  unique (owner_id, idempotency_key),
  check ((state = 'completed' and response_json is not null)
      or (state <> 'completed' and response_json is null))
);

alter table public.ai_request_idempotency enable row level security;
revoke all on public.ai_request_idempotency from public, anon, authenticated;
grant all privileges on public.ai_request_idempotency to service_role;

create index ai_request_idempotency_expiry_idx
  on public.ai_request_idempotency (expires_at);

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

  -- Hash collisions only cause harmless extra serialization; owner/key uniqueness
  -- remains the actual correctness constraint.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_owner_id::text || ':' || p_idempotency_key, 0)
  );

  select * into v_existing
  from public.ai_request_idempotency i
  where i.owner_id = p_owner_id
    and i.idempotency_key = p_idempotency_key
  for update;

  if found and (v_existing.state = 'processing' or v_existing.expires_at > now()) then
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

  -- Expired keys may be reused; remove only the expired idempotency mapping.
  if found then
    delete from public.ai_request_idempotency
    where id = v_existing.id;
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

create or replace function public.complete_ai_request_idempotency(
  p_owner_id uuid,
  p_request_id uuid,
  p_response jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_owner_id is null or p_request_id is null or p_response is null then
    return false;
  end if;

  update public.ai_request_idempotency
  set state = 'completed',
      response_json = p_response,
      error_code = null,
      updated_at = now(),
      expires_at = now() + interval '24 hours'
  where owner_id = p_owner_id
    and request_id = p_request_id
    and state = 'processing';

  return found;
end;
$$;

create or replace function public.fail_ai_request_idempotency(
  p_owner_id uuid,
  p_request_id uuid,
  p_error_code text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_owner_id is null or p_request_id is null then
    return false;
  end if;

  update public.ai_request_idempotency
  set state = 'failed',
      response_json = null,
      error_code = left(coalesce(p_error_code, 'request_failed'), 120),
      updated_at = now(),
      expires_at = now() + interval '24 hours'
  where owner_id = p_owner_id
    and request_id = p_request_id
    and state = 'processing';

  return found;
end;
$$;

revoke all on function public.claim_ai_request(uuid,text,char,uuid,text,text,text,numeric) from public, anon, authenticated;
revoke all on function public.complete_ai_request_idempotency(uuid,uuid,jsonb) from public, anon, authenticated;
revoke all on function public.fail_ai_request_idempotency(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.claim_ai_request(uuid,text,char,uuid,text,text,text,numeric) to service_role;
grant execute on function public.complete_ai_request_idempotency(uuid,uuid,jsonb) to service_role;
grant execute on function public.fail_ai_request_idempotency(uuid,uuid,text) to service_role;
