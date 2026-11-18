-- Apply budget hard-stops when an administrator confirms that an uncertain
-- provider request was billed. The reconciliation RPC settles the reservation
-- before inserting its immutable evidence event; this trigger makes that path
-- enforce the same global and member ceilings as normal completion.
create or replace function public.enforce_ai_budget_hard_stop_after_reconciliation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_controls public.platform_ai_controls%rowtype;
  v_owner_id uuid;
  v_user_limits public.ai_user_limits%rowtype;
  v_global_committed numeric(18,8);
  v_user_committed numeric(18,8);
begin
  if new.decision <> 'confirmed_billed' then
    return new;
  end if;

  -- resolve_ai_reconciliation already holds this global lock. Re-acquiring it
  -- here is transaction-local and keeps this trigger safe if called elsewhere.
  select * into v_controls
  from public.platform_ai_controls
  where id = true
  for update;

  if not found then
    return new;
  end if;

  select r.owner_id into v_owner_id
  from public.ai_requests r
  where r.id = new.request_id;

  if v_owner_id is null then
    return new;
  end if;

  select coalesce(sum(
    case when status = 'settled' then actual_cost else reserved_amount end
  ), 0)
  into v_global_committed
  from public.ai_budget_reservations
  where created_at >= date_trunc('month', now())
    and status in ('reserved', 'settled');

  if v_controls.hard_stop_enabled
     and v_controls.monthly_spend_cap > 0
     and v_global_committed > v_controls.monthly_spend_cap then
    update public.platform_ai_controls
    set ai_enabled = false,
        updated_by = null,
        updated_at = now()
    where id = true;

    insert into public.audit_logs (
      actor_id, action, resource_type, resource_id, outcome, metadata
    ) values (
      null, 'ai_platform_budget_hard_stop_triggered', 'platform_ai_controls',
      new.request_id, 'allowed',
      pg_catalog.jsonb_build_object(
        'source', 'admin_verified_provider_billed_reconciliation',
        'monthly_committed_twd', v_global_committed,
        'monthly_cap_twd', v_controls.monthly_spend_cap,
        'reconciliation_event_id', new.id
      )
    );
  end if;

  select * into v_user_limits
  from public.ai_user_limits
  where owner_id = v_owner_id
  for update;

  if found and v_user_limits.monthly_spend_limit > 0 then
    select coalesce(sum(
      case when status = 'settled' then actual_cost else reserved_amount end
    ), 0)
    into v_user_committed
    from public.ai_budget_reservations
    where owner_id = v_owner_id
      and created_at >= date_trunc('month', now())
      and status in ('reserved', 'settled');

    if v_user_committed > v_user_limits.monthly_spend_limit then
      update public.ai_user_limits
      set ai_enabled = false,
          updated_at = now()
      where owner_id = v_owner_id;

      insert into public.audit_logs (
        actor_id, action, resource_type, resource_id, outcome, metadata
      ) values (
        null, 'ai_member_budget_hard_stop_triggered', 'ai_user_limits',
        v_owner_id, 'allowed',
        pg_catalog.jsonb_build_object(
          'request_id', new.request_id,
          'source', 'admin_verified_provider_billed_reconciliation',
          'monthly_committed_twd', v_user_committed,
          'monthly_cap_twd', v_user_limits.monthly_spend_limit,
          'reconciliation_event_id', new.id
        )
      );
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_ai_budget_hard_stop_after_reconciliation()
  from public, anon, authenticated, service_role;

drop trigger if exists ai_reconciliation_budget_hard_stop on public.ai_reconciliation_events;
create trigger ai_reconciliation_budget_hard_stop
after insert on public.ai_reconciliation_events
for each row
when (new.decision = 'confirmed_billed')
execute function public.enforce_ai_budget_hard_stop_after_reconciliation();

comment on function public.enforce_ai_budget_hard_stop_after_reconciliation() is
  'Enforces global and member AI budget hard-stops when reconciliation confirms a provider charge.';
