-- Tighten AI reconciliation to a server-only RPC boundary.
-- The API validates the signed-in admin session; the SECURITY DEFINER function
-- independently re-checks the actor's current active-admin profile.
-- Audited, operator-driven resolution for uncertain AI provider outcomes.
-- This migration never retries a provider request. It records evidence review
-- and resolves the held reservation atomically only for conclusive outcomes.

create table public.ai_reconciliation_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.ai_requests(id) on delete restrict,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  idempotency_key uuid not null,
  decision text not null check (decision in ('confirmed_billed', 'confirmed_not_billed', 'inconclusive')),
  provider text not null check (char_length(provider) between 1 and 120),
  evidence_reference text not null check (char_length(evidence_reference) between 8 and 500),
  rationale text not null check (char_length(rationale) between 20 and 2000),
  provider_billed_cost numeric(18,8),
  provider_billed_currency char(3),
  normalized_cost_twd numeric(18,8),
  payload_hash char(64) not null check (payload_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  unique (request_id, idempotency_key),
  check (
    (decision = 'confirmed_billed'
      and provider_billed_cost is not null and provider_billed_cost >= 0
      and provider_billed_currency is not null
      and provider_billed_currency::text ~ '^[A-Z]{3}$'
      and normalized_cost_twd is not null and normalized_cost_twd >= 0)
    or
    (decision in ('confirmed_not_billed', 'inconclusive')
      and provider_billed_cost is null
      and provider_billed_currency is null
      and normalized_cost_twd is null)
  )
);

alter table public.ai_reconciliation_events enable row level security;
revoke all on public.ai_reconciliation_events from public, anon, authenticated;
grant select, insert on public.ai_reconciliation_events to service_role;
revoke update, delete, truncate on public.ai_reconciliation_events from service_role;

create or replace function public.prevent_ai_reconciliation_event_mutation()
returns trigger
language plpgsql
set search_path = ''
as $trigger$
begin
  raise exception 'AI reconciliation evidence events are immutable';
end;
$trigger$;

revoke all on function public.prevent_ai_reconciliation_event_mutation() from public, anon, authenticated, service_role;

create trigger ai_reconciliation_events_immutable
before update or delete on public.ai_reconciliation_events
for each row execute function public.prevent_ai_reconciliation_event_mutation();

create index ai_reconciliation_events_request_created_idx
  on public.ai_reconciliation_events (request_id, created_at desc);

create or replace function public.resolve_ai_reconciliation(
  p_actor_id uuid,
  p_request_id uuid,
  p_idempotency_key uuid,
  p_decision text,
  p_provider text,
  p_evidence_reference text,
  p_rationale text,
  p_provider_billed_cost numeric default null,
  p_provider_billed_currency char(3) default null,
  p_normalized_cost_twd numeric default null
)
returns table (disposition text, reason text, event_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_controls public.platform_ai_controls%rowtype;
  v_reservation public.ai_budget_reservations%rowtype;
  v_request public.ai_requests%rowtype;
  v_idempotency public.ai_request_idempotency%rowtype;
  v_profile public.profiles%rowtype;
  v_existing public.ai_reconciliation_events%rowtype;
  v_hash text;
  v_event_id uuid;
begin
  if p_actor_id is null or p_request_id is null or p_idempotency_key is null
     or p_decision is null
     or p_decision not in ('confirmed_billed', 'confirmed_not_billed', 'inconclusive')
     or p_provider is null or char_length(trim(p_provider)) not between 1 and 120
     or p_evidence_reference is null or char_length(trim(p_evidence_reference)) not between 8 and 500
     or p_rationale is null or char_length(trim(p_rationale)) not between 20 and 2000
     or (p_decision = 'confirmed_billed' and (
       p_provider_billed_cost is null or p_provider_billed_cost < 0
       or p_provider_billed_cost::text in ('NaN', 'Infinity', '-Infinity')
       or p_provider_billed_cost > 9999999999.99999999
       or p_provider_billed_currency is null
       or p_provider_billed_currency::text !~ '^[A-Z]{3}$'
       or p_normalized_cost_twd is null or p_normalized_cost_twd < 0
       or p_normalized_cost_twd::text in ('NaN', 'Infinity', '-Infinity')
       or p_normalized_cost_twd > 9999999999.99999999
     ))
     or (p_decision <> 'confirmed_billed' and (
       p_provider_billed_cost is not null
       or p_provider_billed_currency is not null
       or p_normalized_cost_twd is not null
     )) then
    return query select 'rejected'::text, 'invalid_reconciliation_input'::text, null::uuid;
    return;
  end if;

  -- This RPC is service-role-only. The API authenticates the member session
  -- before using its server-only service client. Independently re-check the
  -- supplied actor against the authoritative profile row here; never accept
  -- an actor identifier without verifying current admin status in the DB.
  select * into v_profile
  from public.profiles
  where id = p_actor_id
  for update;
  if not found or v_profile.role <> 'admin' or v_profile.account_status <> 'active' then
    return query select 'rejected'::text, 'active_admin_required'::text, null::uuid;
    return;
  end if;

  v_hash := pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
    p_request_id::text || E'\n' || p_decision || E'\n' || trim(p_provider) || E'\n' ||
    trim(p_evidence_reference) || E'\n' || trim(p_rationale) || E'\n' ||
    coalesce(p_provider_billed_cost::text, '') || E'\n' ||
    coalesce(p_provider_billed_currency::text, '') || E'\n' ||
    coalesce(p_normalized_cost_twd::text, ''),
    'UTF8'
  )), 'hex');

  -- Serialize reconciliation decisions globally before idempotency lookup.
  -- This makes a concurrent same-key retry observe the committed event rather
  -- than racing into a closed-reservation rejection.
  select * into v_controls from public.platform_ai_controls where id = true for update;
  if not found then
    return query select 'rejected'::text, 'platform_controls_missing'::text, null::uuid;
    return;
  end if;

  select * into v_existing
  from public.ai_reconciliation_events
  where request_id = p_request_id and idempotency_key = p_idempotency_key
  for update;
  if found then
    if v_existing.payload_hash <> v_hash then
      return query select 'conflict'::text, 'idempotency_key_payload_mismatch'::text, v_existing.id;
    else
      return query select 'replayed'::text, 'identical_resolution_already_recorded'::text, v_existing.id;
    end if;
    return;
  end if;

  select * into v_reservation
  from public.ai_budget_reservations
  where request_id = p_request_id
  for update;
  if not found or v_reservation.status <> 'reserved' then
    return query select 'rejected'::text, 'reservation_not_open'::text, null::uuid;
    return;
  end if;

  select * into v_request
  from public.ai_requests
  where id = p_request_id
  for update;
  if not found or v_request.owner_id is distinct from v_reservation.owner_id
     or v_request.status not in ('queued', 'running')
     or v_request.provider is distinct from trim(p_provider) then
    return query select 'rejected'::text, 'request_state_or_provider_mismatch'::text, null::uuid;
    return;
  end if;

  select * into v_idempotency
  from public.ai_request_idempotency
  where request_id = p_request_id and owner_id = v_request.owner_id
  for update;
  if not found or v_idempotency.state <> 'processing' then
    return query select 'rejected'::text, 'idempotency_record_not_processing'::text, null::uuid;
    return;
  end if;

  if p_decision = 'confirmed_billed' then
    update public.ai_budget_reservations
    set actual_cost = p_normalized_cost_twd, status = 'settled', settled_at = now()
    where request_id = p_request_id;

    update public.ai_requests
    set status = 'failed',
        error_code = 'provider_billed_delivery_unavailable',
        provider_billed_cost = p_provider_billed_cost,
        provider_billed_currency = p_provider_billed_currency,
        cost_method = 'admin_verified_provider_billed_reconciliation',
        completed_at = now()
    where id = p_request_id;

    update public.ai_request_idempotency
    set state = 'failed', response_json = null,
        error_code = 'provider_billed_delivery_unavailable',
        updated_at = now(), expires_at = now() + interval '24 hours'
    where request_id = p_request_id and owner_id = v_request.owner_id;
  elsif p_decision = 'confirmed_not_billed' then
    update public.ai_budget_reservations
    set status = 'released', settled_at = now()
    where request_id = p_request_id;

    update public.ai_requests
    set status = 'failed', error_code = 'provider_confirmed_not_billed', completed_at = now()
    where id = p_request_id;

    update public.ai_request_idempotency
    set state = 'failed', response_json = null,
        error_code = 'provider_confirmed_not_billed',
        updated_at = now(), expires_at = now() + interval '24 hours'
    where request_id = p_request_id and owner_id = v_request.owner_id;
  end if;
  -- inconclusive deliberately leaves request, reservation, and idempotency untouched.

  insert into public.ai_reconciliation_events (
    request_id, actor_id, idempotency_key, decision, provider,
    evidence_reference, rationale, provider_billed_cost,
    provider_billed_currency, normalized_cost_twd, payload_hash
  ) values (
    p_request_id, p_actor_id, p_idempotency_key, p_decision, trim(p_provider),
    trim(p_evidence_reference), trim(p_rationale), p_provider_billed_cost,
    p_provider_billed_currency, p_normalized_cost_twd, v_hash
  ) returning id into v_event_id;

  insert into public.audit_logs (
    actor_id, action, resource_type, resource_id, outcome, metadata
  ) values (
    p_actor_id, 'ai_reconciliation_' || p_decision, 'ai_requests', p_request_id, 'allowed',
    pg_catalog.jsonb_build_object(
      'event_id', v_event_id,
      'provider', trim(p_provider),
      'evidence_reference', trim(p_evidence_reference),
      'rationale', trim(p_rationale),
      'provider_billed_currency', p_provider_billed_currency,
      'provider_billed_cost', p_provider_billed_cost,
      'normalized_cost_twd', p_normalized_cost_twd
    )
  );

  return query select 'resolved'::text, p_decision, v_event_id;
end;
$$;

revoke all on function public.resolve_ai_reconciliation(uuid,uuid,uuid,text,text,text,text,numeric,char,numeric)
  from public, anon, authenticated;
grant execute on function public.resolve_ai_reconciliation(uuid,uuid,uuid,text,text,text,text,numeric,char,numeric)
  to service_role;

comment on table public.ai_reconciliation_events is
  'Append-only evidence review history for uncertain AI provider outcomes; stores references and rationale, never secrets or idempotency keys.';
comment on function public.resolve_ai_reconciliation(uuid,uuid,uuid,text,text,text,text,numeric,char,numeric) is
  'Service-role-only, active-admin-verified, idempotent resolution of uncertain provider outcomes. Inconclusive decisions preserve all request and reservation state; no provider retry is performed.';
