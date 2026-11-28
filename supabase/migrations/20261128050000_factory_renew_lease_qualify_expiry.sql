-- Fix PL/pgSQL OUT-parameter ambiguity in lease renewal.
-- The table column is explicitly qualified so the returned expires_at column
-- cannot collide with the RETURNS TABLE output variable.
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

  update factory_control.leases as lease_row
  set expires_at = clock_timestamp() + make_interval(secs => p_lease_ms::double precision / 1000),
      updated_at = clock_timestamp()
  where lease_row.scope_key = p_scope_key
    and lease_row.owner_id = p_owner_id
    and lease_row.request_id = p_request_id
    and lease_row.lease_token = p_lease_token
    and lease_row.fencing_token = p_fencing_token
    and lease_row.expires_at > clock_timestamp()
  returning lease_row.expires_at into v_expiry;

  return query select (v_expiry is not null), v_expiry;
end;
$$;
