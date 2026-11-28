-- Durable cross-executor Factory lease and fencing control plane.
-- Isolated schema: this migration does not alter GCAN Product tables or policies.
create schema if not exists factory_control;
revoke all on schema factory_control from public, anon, authenticated;
grant usage on schema factory_control to service_role;

create table factory_control.leases (
  scope_key text primary key check (scope_key ~ '^[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,199}$'),
  owner_id text not null check (char_length(owner_id) between 1 and 160),
  request_id uuid not null,
  lease_token uuid not null,
  fencing_token bigint not null check (fencing_token > 0),
  expires_at timestamptz not null,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);
create index factory_leases_expiry_idx on factory_control.leases (expires_at);

create table factory_control.task_state (
  scope_key text primary key,
  version bigint not null check (version > 0),
  fencing_token bigint not null check (fencing_token > 0),
  state jsonb not null check (pg_column_size(state) <= 1048576),
  last_event_id uuid not null,
  updated_at timestamptz not null default clock_timestamp()
);

create table factory_control.task_state_events (
  scope_key text not null,
  event_id uuid not null,
  version bigint not null,
  fencing_token bigint not null,
  state_hash text not null check (state_hash ~ '^[a-f0-9]{64}$'),
  state jsonb not null check (pg_column_size(state) <= 1048576),
  created_at timestamptz not null default clock_timestamp(),
  primary key (scope_key, event_id),
  unique (scope_key, version)
);

create table factory_control.publication_intents (
  scope_key text not null,
  idempotency_key text not null check (idempotency_key ~ '^[a-f0-9]{64}$'),
  payload_hash text not null check (payload_hash ~ '^[a-f0-9]{64}$'),
  fencing_token bigint not null check (fencing_token > 0),
  lease_token uuid not null,
  status text not null default 'reserved'
    check (status in ('reserved','published','reconciled','failed')),
  payload jsonb not null check (pg_column_size(payload) <= 1048576),
  branch_name text,
  pull_request_number integer check (pull_request_number is null or pull_request_number > 0),
  updated_at timestamptz not null default clock_timestamp(),
  primary key (scope_key, idempotency_key)
);

alter table factory_control.leases enable row level security;
alter table factory_control.task_state enable row level security;
alter table factory_control.task_state_events enable row level security;
alter table factory_control.publication_intents enable row level security;
revoke all on all tables in schema factory_control from public, anon, authenticated;
grant all on all tables in schema factory_control to service_role;

create or replace function public.factory_acquire_lease(
  p_scope_key text, p_owner_id text, p_request_id uuid, p_lease_ms integer
)
returns table(acquired boolean, lease_token uuid, fencing_token bigint, expires_at timestamptz, reason text)
language plpgsql security definer set search_path = ''
as $$
declare v_lease factory_control.leases%rowtype; v_now timestamptz;
begin
  if p_scope_key is null or p_scope_key !~ '^[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,199}$'
     or p_owner_id is null or char_length(p_owner_id) not between 1 and 160
     or p_request_id is null or p_lease_ms is null or p_lease_ms not between 1000 and 3600000 then
    raise exception 'invalid_factory_lease_request' using errcode = '22023';
  end if;

  insert into factory_control.leases(scope_key, owner_id, request_id, lease_token, fencing_token, expires_at)
  values (p_scope_key, p_owner_id, p_request_id, gen_random_uuid(), 1,
          clock_timestamp() + make_interval(secs => p_lease_ms::double precision / 1000))
  on conflict (scope_key) do nothing;

  select * into v_lease from factory_control.leases where scope_key = p_scope_key for update;
  v_now := clock_timestamp();

  if v_lease.owner_id = p_owner_id and v_lease.request_id = p_request_id and v_lease.expires_at > v_now then
    return query select true, v_lease.lease_token, v_lease.fencing_token, v_lease.expires_at, 'idempotent_replay'::text;
    return;
  end if;

  if v_lease.expires_at > v_now then
    return query select false, null::uuid, v_lease.fencing_token, v_lease.expires_at, 'lease_held'::text;
    return;
  end if;

  update factory_control.leases
  set owner_id = p_owner_id,
      request_id = p_request_id,
      lease_token = gen_random_uuid(),
      fencing_token = v_lease.fencing_token + 1,
      expires_at = v_now + make_interval(secs => p_lease_ms::double precision / 1000),
      updated_at = v_now
  where scope_key = p_scope_key
  returning * into v_lease;

  return query select true, v_lease.lease_token, v_lease.fencing_token, v_lease.expires_at, 'acquired'::text;
end;
$$;

create or replace function public.factory_renew_lease(
  p_scope_key text, p_owner_id text, p_request_id uuid, p_lease_token uuid,
  p_fencing_token bigint, p_lease_ms integer
)
returns table(renewed boolean, expires_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare v_expiry timestamptz;
begin
  if p_lease_ms is null or p_lease_ms not between 1000 and 3600000 then
    raise exception 'invalid_factory_lease_duration' using errcode = '22023';
  end if;
  update factory_control.leases
  set expires_at = clock_timestamp() + make_interval(secs => p_lease_ms::double precision / 1000),
      updated_at = clock_timestamp()
  where scope_key = p_scope_key and owner_id = p_owner_id and request_id = p_request_id
    and lease_token = p_lease_token and fencing_token = p_fencing_token
    and expires_at > clock_timestamp()
  returning expires_at into v_expiry;
  return query select v_expiry is not null, v_expiry;
end;
$$;

create or replace function public.factory_release_lease(
  p_scope_key text, p_owner_id text, p_request_id uuid, p_lease_token uuid, p_fencing_token bigint
)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare v_count integer;
begin
  update factory_control.leases
  set expires_at = clock_timestamp(), updated_at = clock_timestamp()
  where scope_key = p_scope_key and owner_id = p_owner_id and request_id = p_request_id
    and lease_token = p_lease_token and fencing_token = p_fencing_token
    and expires_at > clock_timestamp();
  get diagnostics v_count = row_count;
  return v_count = 1;
end;
$$;

create or replace function public.factory_assert_lease(
  p_scope_key text, p_owner_id text, p_request_id uuid, p_lease_token uuid, p_fencing_token bigint
)
returns boolean
language sql security definer set search_path = ''
as $$
  select exists (
    select 1 from factory_control.leases
    where scope_key = p_scope_key and owner_id = p_owner_id and request_id = p_request_id
      and lease_token = p_lease_token and fencing_token = p_fencing_token
      and expires_at > clock_timestamp()
  );
$$;

create or replace function public.factory_persist_task_state(
  p_scope_key text, p_owner_id text, p_request_id uuid, p_lease_token uuid,
  p_fencing_token bigint, p_event_id uuid, p_state jsonb
)
returns table(persisted boolean, version bigint, replayed boolean)
language plpgsql security definer set search_path = ''
as $$
declare v_lease factory_control.leases%rowtype; v_existing factory_control.task_state_events%rowtype;
  v_version bigint; v_hash text;
begin
  if p_event_id is null or p_state is null or pg_column_size(p_state) > 1048576 then
    raise exception 'invalid_factory_state_payload' using errcode = '22023';
  end if;
  select * into v_lease from factory_control.leases where scope_key = p_scope_key for update;
  if not found or v_lease.owner_id <> p_owner_id or v_lease.request_id <> p_request_id
     or v_lease.lease_token <> p_lease_token or v_lease.fencing_token <> p_fencing_token
     or v_lease.expires_at <= clock_timestamp() then
    raise exception 'stale_factory_lease' using errcode = '55000';
  end if;
  v_hash := pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p_state::text, 'UTF8')), 'hex');
  select * into v_existing from factory_control.task_state_events
    where scope_key = p_scope_key and event_id = p_event_id;
  if found then
    if v_existing.state_hash <> v_hash or v_existing.fencing_token <> p_fencing_token then
      raise exception 'factory_state_idempotency_conflict' using errcode = '23505';
    end if;
    return query select true, v_existing.version, true;
    return;
  end if;
  select coalesce(max(s.version), 0) + 1 into v_version
    from factory_control.task_state s where s.scope_key = p_scope_key;
  insert into factory_control.task_state_events(scope_key,event_id,version,fencing_token,state_hash,state)
    values(p_scope_key,p_event_id,v_version,p_fencing_token,v_hash,p_state);
  insert into factory_control.task_state(scope_key,version,fencing_token,state,last_event_id,updated_at)
    values(p_scope_key,v_version,p_fencing_token,p_state,p_event_id,clock_timestamp())
  on conflict(scope_key) do update set
    version = excluded.version, fencing_token = excluded.fencing_token,
    state = excluded.state, last_event_id = excluded.last_event_id, updated_at = excluded.updated_at
  where factory_control.task_state.fencing_token <= excluded.fencing_token;
  return query select true, v_version, false;
end;
$$;

create or replace function public.factory_reserve_publication(
  p_scope_key text, p_owner_id text, p_request_id uuid, p_lease_token uuid,
  p_fencing_token bigint, p_idempotency_key text, p_payload_hash text, p_payload jsonb
)
returns table(reserved boolean, status text, replayed boolean)
language plpgsql security definer set search_path = ''
as $$
declare v_lease factory_control.leases%rowtype; v_intent factory_control.publication_intents%rowtype;
begin
  if p_scope_key is null or p_owner_id is null or p_request_id is null
     or p_lease_token is null or p_fencing_token is null or p_fencing_token < 1
     or p_idempotency_key is null or p_idempotency_key !~ '^[a-f0-9]{64}$'
     or p_payload_hash is null or p_payload_hash !~ '^[a-f0-9]{64}$'
     or p_payload is null or pg_column_size(p_payload) > 1048576 then
    raise exception 'invalid_factory_publication_intent' using errcode = '22023';
  end if;
  select * into v_lease from factory_control.leases where scope_key = p_scope_key for update;
  if not found or v_lease.owner_id <> p_owner_id or v_lease.request_id <> p_request_id
     or v_lease.lease_token <> p_lease_token or v_lease.fencing_token <> p_fencing_token
     or v_lease.expires_at <= clock_timestamp() then
    raise exception 'stale_factory_lease' using errcode = '55000';
  end if;
  select * into v_intent from factory_control.publication_intents
    where scope_key = p_scope_key and idempotency_key = p_idempotency_key for update;
  if found then
    if v_intent.payload_hash <> p_payload_hash then
      raise exception 'factory_publication_idempotency_conflict' using errcode = '23505';
    end if;
    update factory_control.publication_intents
      set fencing_token = p_fencing_token, lease_token = p_lease_token, updated_at = clock_timestamp()
      where scope_key = p_scope_key and idempotency_key = p_idempotency_key;
    return query select true, v_intent.status, true;
    return;
  end if;
  insert into factory_control.publication_intents(
    scope_key,idempotency_key,payload_hash,fencing_token,lease_token,payload
  ) values (
    p_scope_key,p_idempotency_key,p_payload_hash,p_fencing_token,p_lease_token,p_payload
  );
  return query select true, 'reserved'::text, false;
end;
$$;

create or replace function public.factory_record_publication(
  p_scope_key text, p_owner_id text, p_request_id uuid, p_lease_token uuid,
  p_fencing_token bigint, p_idempotency_key text, p_status text,
  p_branch_name text default null, p_pull_request_number integer default null
)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare v_lease factory_control.leases%rowtype; v_count integer;
begin
  if p_status is null or p_status not in ('published','reconciled','failed') then
    raise exception 'invalid_factory_publication_status' using errcode = '22023';
  end if;
  select * into v_lease from factory_control.leases where scope_key = p_scope_key for update;
  if not found or v_lease.owner_id <> p_owner_id or v_lease.request_id <> p_request_id
     or v_lease.lease_token <> p_lease_token or v_lease.fencing_token <> p_fencing_token
     or v_lease.expires_at <= clock_timestamp() then
    raise exception 'stale_factory_lease' using errcode = '55000';
  end if;
  update factory_control.publication_intents
    set status = p_status, branch_name = coalesce(p_branch_name, branch_name),
        pull_request_number = coalesce(p_pull_request_number, pull_request_number),
        updated_at = clock_timestamp()
  where scope_key = p_scope_key and idempotency_key = p_idempotency_key
    and fencing_token = p_fencing_token and lease_token = p_lease_token;
  get diagnostics v_count = row_count;
  return v_count = 1;
end;
$$;

revoke all on function public.factory_acquire_lease(text,text,uuid,integer) from public, anon, authenticated;
revoke all on function public.factory_renew_lease(text,text,uuid,uuid,bigint,integer) from public, anon, authenticated;
revoke all on function public.factory_release_lease(text,text,uuid,uuid,bigint) from public, anon, authenticated;
revoke all on function public.factory_assert_lease(text,text,uuid,uuid,bigint) from public, anon, authenticated;
revoke all on function public.factory_persist_task_state(text,text,uuid,uuid,bigint,uuid,jsonb) from public, anon, authenticated;
revoke all on function public.factory_reserve_publication(text,text,uuid,uuid,bigint,text,text,jsonb) from public, anon, authenticated;
revoke all on function public.factory_record_publication(text,text,uuid,uuid,bigint,text,text,text,integer) from public, anon, authenticated;
grant execute on function public.factory_acquire_lease(text,text,uuid,integer) to service_role;
grant execute on function public.factory_renew_lease(text,text,uuid,uuid,bigint,integer) to service_role;
grant execute on function public.factory_release_lease(text,text,uuid,uuid,bigint) to service_role;
grant execute on function public.factory_assert_lease(text,text,uuid,uuid,bigint) to service_role;
grant execute on function public.factory_persist_task_state(text,text,uuid,uuid,bigint,uuid,jsonb) to service_role;
grant execute on function public.factory_reserve_publication(text,text,uuid,uuid,bigint,text,text,jsonb) to service_role;
grant execute on function public.factory_record_publication(text,text,uuid,uuid,bigint,text,text,text,integer) to service_role;
