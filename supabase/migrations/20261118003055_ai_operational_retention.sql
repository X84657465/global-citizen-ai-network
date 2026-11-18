-- Safe retention and operator visibility for uncertain AI requests.
-- Deliberately does not enable pg_cron or schedule destructive jobs.

create or replace function public.cleanup_expired_ai_operational_records()
returns table (deleted_idempotency_records bigint, deleted_rate_limit_windows bigint)
language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.ai_request_idempotency
  where state in ('completed', 'failed') and expires_at < now();
  get diagnostics deleted_idempotency_records = row_count;

  delete from public.ai_request_rate_limits
  where updated_at < now() - interval '48 hours';
  get diagnostics deleted_rate_limit_windows = row_count;
  return next;
end;
$$;

create or replace function public.list_stale_ai_requests(
  p_older_than_seconds integer default 900
)
returns table (
  request_id uuid,
  owner_id uuid,
  provider text,
  model text,
  request_status public.ai_request_status,
  request_created_at timestamptz,
  reservation_status text,
  reserved_amount numeric,
  actual_cost numeric,
  idempotency_state text,
  provider_request_id text
)
language plpgsql security definer set search_path = ''
as $$
begin
  if p_older_than_seconds is null
     or p_older_than_seconds < 300
     or p_older_than_seconds > 86400 then
    raise exception 'p_older_than_seconds must be between 300 and 86400';
  end if;

  return query
  select r.id, r.owner_id, r.provider, r.model, r.status, r.created_at,
         b.status, b.reserved_amount, b.actual_cost, i.state, r.provider_request_id
  from public.ai_requests r
  join public.ai_budget_reservations b on b.request_id = r.id
  left join public.ai_request_idempotency i on i.request_id = r.id
  where r.status in ('queued', 'running')
    and b.status = 'reserved'
    and r.created_at < now() - pg_catalog.make_interval(secs => p_older_than_seconds)
  order by r.created_at asc;
end;
$$;

revoke all on function public.cleanup_expired_ai_operational_records() from public, anon, authenticated;
revoke all on function public.list_stale_ai_requests(integer) from public, anon, authenticated;
grant execute on function public.cleanup_expired_ai_operational_records() to service_role;
grant execute on function public.list_stale_ai_requests(integer) to service_role;

comment on function public.cleanup_expired_ai_operational_records() is
  'Deletes only expired completed/failed idempotency mappings and rate-limit windows older than 48h. Never deletes processing requests or financial ledgers.';
comment on function public.list_stale_ai_requests(integer) is
  'Read-only operator report for queued/running requests with still-reserved budget. Never retries, settles, releases, or deletes requests.';
