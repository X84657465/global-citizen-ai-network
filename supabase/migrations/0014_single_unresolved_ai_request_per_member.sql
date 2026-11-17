-- Enforce one unresolved billable AI request per member across all conversations.
-- Persist the originating conversation in the same transaction as the claim so
-- recovery remains possible even if the API process stops immediately afterward.

drop function if exists public.claim_ai_request(uuid,text,char,uuid,text,text,text,numeric);
-- This prevents a member from switching conversations and creating a second
-- billable request while a prior provider outcome is still unknown.

create or replace function public.claim_ai_request(
  p_owner_id uuid,
  p_conversation_id uuid,
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
  v_pending_request_id uuid;
begin
  if p_owner_id is null or p_conversation_id is null or p_request_id is null
     or p_idempotency_key is null
     or length(p_idempotency_key) < 8
     or length(p_idempotency_key) > 128
     or p_idempotency_key !~ '^[A-Za-z0-9._:-]+$'
     or p_request_hash is null
     or p_request_hash !~ '^[0-9a-f]{64}$' then
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

  -- Follow the same global lock order as completion/failure RPCs:
  -- platform controls -> reservation/request -> idempotency. Locking the
  -- idempotency row before the global controls row can deadlock a same-key
  -- retry against a completion transaction that already holds global controls.
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

  insert into public.ai_request_idempotency (
    owner_id, idempotency_key, request_hash, request_id
  ) values (
    p_owner_id, p_idempotency_key, p_request_hash, p_request_id
  );

  return query select 'claimed'::text, 'reserved'::text, p_request_id, null::jsonb;
end;
$$;

revoke all on function public.claim_ai_request(uuid,uuid,text,char,uuid,text,text,text,numeric) from public, anon, authenticated;
grant execute on function public.claim_ai_request(uuid,uuid,text,char,uuid,text,text,text,numeric) to service_role;
