-- Enforce one unresolved billable AI request per member across all conversations.
-- Persist the originating conversation and exact user prompt in the same
-- transaction as the claim. The database verifies the conversation-bound hash
-- and applies preflight before creating a reservation or storing the prompt.

drop function if exists public.claim_ai_request(uuid,text,char,uuid,text,text,text,numeric);
drop function if exists public.claim_ai_request(uuid,uuid,text,char,uuid,text,text,text,numeric);
drop function if exists public.claim_ai_request(uuid,uuid,text,text,char,uuid,text,text,text,numeric);
-- This prevents a member from switching conversations and creating a second
-- billable request while a prior provider outcome is still unknown.

create or replace function public.claim_ai_request(
  p_owner_id uuid,
  p_conversation_id uuid,
  p_prompt text,
  p_idempotency_key text,
  p_request_hash char(64),
  p_request_id uuid,
  p_provider text,
  p_model text,
  p_feature text,
  p_max_cost_twd numeric,
  p_preflight_cost_twd numeric
)
returns table (disposition text, reason text, claimed_request_id uuid, cached_response jsonb)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing public.ai_request_idempotency%rowtype;
  v_reservation record;
  v_pending_request_id uuid;
  v_expected_hash text;
begin
  if p_owner_id is null or p_conversation_id is null or p_request_id is null
     or p_prompt is null or length(p_prompt) < 1 or length(p_prompt) > 8000
     or p_idempotency_key is null
     or length(p_idempotency_key) < 8
     or length(p_idempotency_key) > 128
     or p_idempotency_key !~ '^[A-Za-z0-9._:-]+$'
     or p_request_hash is null
     or p_request_hash !~ '^[0-9a-f]{64}$' then
    return query select 'rejected'::text, 'invalid_idempotency_input'::text, null::uuid, null::jsonb;
    return;
  end if;

  v_expected_hash := pg_catalog.encode(
    pg_catalog.sha256(pg_catalog.convert_to(p_conversation_id::text || E'\n' || p_prompt, 'UTF8')),
    'hex'
  );
  if pg_catalog.rtrim(p_request_hash::text) <> v_expected_hash then
    return query select 'rejected'::text, 'invalid_idempotency_input'::text, null::uuid, null::jsonb;
    return;
  end if;

  if not exists (
    select 1 from public.conversations c
    where c.id = p_conversation_id and c.owner_id = p_owner_id
  ) then
    return query select 'rejected'::text, 'invalid_conversation'::text, null::uuid, null::jsonb;
    return;
  end if;

  -- Serialize all new claims for this member, not merely claims sharing a key.
  -- This closes the cross-conversation race while allowing safe same-key replay.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_owner_id::text, 0)
  );

  -- Completion/failure RPCs lock platform controls before reservation,
  -- request, and idempotency rows. Claim follows the same global-first order:
  -- it locks controls before inspecting an existing idempotency row, and only
  -- creates a new reservation/request after replay resolution.
  perform 1
  from public.platform_ai_controls
  where id = true
  for update;

  if not found then
    return query select 'rejected'::text, 'platform_ai_controls_missing'::text, null::uuid, null::jsonb;
    return;
  end if;

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

  if found then
    delete from public.ai_request_idempotency where id = v_existing.id;
  end if;

  -- A new request requires a complete, bounded provider and pricing configuration.
  -- Existing completed/processing keys have already returned above, so replay
  -- remains available when provider configuration is absent or rotated.
  if p_provider is null or length(trim(p_provider)) < 1 or length(p_provider) > 120
     or p_model is null or length(trim(p_model)) < 1 or length(p_model) > 160
     or p_feature is null or length(trim(p_feature)) < 1 or length(p_feature) > 120
     or p_max_cost_twd is null
     or p_max_cost_twd <= 0
     or p_max_cost_twd::text in ('NaN', 'Infinity', '-Infinity')
     or p_max_cost_twd > 9999999999.99999999
     or p_preflight_cost_twd is null
     or p_preflight_cost_twd < 0
     or p_preflight_cost_twd::text in ('NaN', 'Infinity', '-Infinity')
     or p_preflight_cost_twd > 9999999999.99999999 then
    return query select 'rejected'::text, 'provider_config_unavailable'::text, null::uuid, null::jsonb;
    return;
  end if;

  -- Existing completed/processing keys are replayed above before this check.
  -- A new logical request is rejected before rate-limit consumption, reservation,
  -- or prompt persistence when its conservative preflight exceeds the ceiling.
  if p_preflight_cost_twd > p_max_cost_twd then
    return query select 'rejected'::text, 'preflight_cost_exceeds_reservation'::text,
      null::uuid, null::jsonb;
    return;
  end if;

  -- A reservation in queued/running state is unresolved regardless of which
  -- conversation created it. Never start another billable provider call until
  -- the earlier outcome is completed, failed safely, or manually reconciled.
  select r.id into v_pending_request_id
  from public.ai_requests r
  join public.ai_budget_reservations b
    on b.request_id = r.id and b.owner_id = r.owner_id
  join public.ai_request_idempotency i
    on i.request_id = r.id and i.owner_id = r.owner_id
  where r.owner_id = p_owner_id
    and r.status in ('queued','running')
    and b.status = 'reserved'
    and i.state = 'processing'
  order by r.created_at asc
  limit 1;

  if v_pending_request_id is not null then
    return query select 'processing'::text, 'member_has_unresolved_request'::text,
      v_pending_request_id, null::jsonb;
    return;
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

  update public.ai_requests
  set conversation_id = p_conversation_id
  where id = p_request_id and owner_id = p_owner_id and status = 'queued';
  if not found then
    raise exception 'claimed AI request could not be linked to its conversation';
  end if;

  -- Persist the exact prompt in the same transaction as the request claim and
  -- budget reservation. A process crash can no longer strand a reservation
  -- without the original content required for safe idempotent recovery.
  insert into public.messages (
    conversation_id, owner_id, role, content
  ) values (
    p_conversation_id, p_owner_id, 'user', p_prompt
  );

  insert into public.ai_request_idempotency (
    owner_id, idempotency_key, request_hash, request_id
  ) values (
    p_owner_id, p_idempotency_key, p_request_hash, p_request_id
  );

  return query select 'claimed'::text, 'reserved'::text, p_request_id, null::jsonb;
end;
$$;

revoke all on function public.claim_ai_request(uuid,uuid,text,text,char,uuid,text,text,text,numeric,numeric) from public, anon, authenticated;
grant execute on function public.claim_ai_request(uuid,uuid,text,text,char,uuid,text,text,text,numeric,numeric) to service_role;
