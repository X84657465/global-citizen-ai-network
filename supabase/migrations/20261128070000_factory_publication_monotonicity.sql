-- Enforce monotonic, immutable publication outcomes at the database boundary.
-- A lease fence alone does not prevent an in-order call from the current owner
-- from regressing a published result or replacing its branch/PR identity.
create or replace function public.factory_record_publication(
  p_scope_key text, p_owner_id text, p_request_id uuid, p_lease_token uuid,
  p_fencing_token bigint, p_idempotency_key text, p_status text,
  p_branch_name text default null, p_pull_request_number integer default null
)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_lease factory_control.leases%rowtype;
  v_intent factory_control.publication_intents%rowtype;
begin
  if p_status is null or p_status not in ('published','reconciled','failed')
     or (p_branch_name is not null and
         (char_length(p_branch_name) not between 1 and 255 or p_branch_name ~ '[[:cntrl:]]'))
     or (p_pull_request_number is not null and p_pull_request_number < 1) then
    raise exception 'invalid_factory_publication_status_or_identity' using errcode = '22023';
  end if;

  if p_status in ('published','reconciled') and
     (p_branch_name is null or p_pull_request_number is null) then
    raise exception 'published_factory_intent_requires_complete_identity' using errcode = '22023';
  end if;

  if p_status = 'failed' and
     (p_branch_name is not null or p_pull_request_number is not null) then
    raise exception 'failed_factory_intent_cannot_claim_publication_identity' using errcode = '22023';
  end if;

  select * into v_lease
  from factory_control.leases
  where scope_key = p_scope_key
  for update;

  if not found or v_lease.owner_id <> p_owner_id or v_lease.request_id <> p_request_id
     or v_lease.lease_token <> p_lease_token or v_lease.fencing_token <> p_fencing_token
     or v_lease.expires_at <= clock_timestamp() then
    raise exception 'stale_factory_lease' using errcode = '55000';
  end if;

  select * into v_intent
  from factory_control.publication_intents
  where scope_key = p_scope_key and idempotency_key = p_idempotency_key
  for update;

  if not found then
    return false;
  end if;

  if v_intent.fencing_token <> p_fencing_token or v_intent.lease_token <> p_lease_token then
    raise exception 'stale_factory_publication_fence' using errcode = '55000';
  end if;

  -- A repeated write is accepted only when status and immutable identity match.
  if v_intent.status = p_status then
    if v_intent.branch_name is distinct from p_branch_name
       or v_intent.pull_request_number is distinct from p_pull_request_number then
      raise exception 'factory_publication_identity_is_immutable' using errcode = '55000';
    end if;
    return true;
  end if;

  -- The only forward transitions are reserved -> published -> reconciled,
  -- or reserved -> failed. Failed and reconciled are terminal.
  if v_intent.status = 'reserved' and p_status = 'published' then
    if v_intent.branch_name is not null or v_intent.pull_request_number is not null then
      raise exception 'factory_publication_identity_already_set' using errcode = '55000';
    end if;
  elsif v_intent.status = 'reserved' and p_status = 'failed' then
    if v_intent.branch_name is not null or v_intent.pull_request_number is not null then
      raise exception 'factory_publication_identity_already_set' using errcode = '55000';
    end if;
  elsif v_intent.status = 'published' and p_status = 'reconciled' then
    if v_intent.branch_name is distinct from p_branch_name
       or v_intent.pull_request_number is distinct from p_pull_request_number then
      raise exception 'factory_publication_identity_is_immutable' using errcode = '55000';
    end if;
  else
    raise exception 'invalid_factory_publication_transition: % -> %', v_intent.status, p_status
      using errcode = '55000';
  end if;

  update factory_control.publication_intents
  set status = p_status,
      branch_name = case when v_intent.status = 'reserved' then p_branch_name else branch_name end,
      pull_request_number = case when v_intent.status = 'reserved' then p_pull_request_number else pull_request_number end,
      updated_at = clock_timestamp()
  where scope_key = p_scope_key and idempotency_key = p_idempotency_key;

  return true;
end;
$$;

revoke all on function public.factory_record_publication(text,text,uuid,uuid,bigint,text,text,text,integer)
  from public, anon, authenticated;
grant execute on function public.factory_record_publication(text,text,uuid,uuid,bigint,text,text,text,integer)
  to service_role;
