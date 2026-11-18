-- Make contribution-task administration and its audit record one transaction.
-- The trusted API route still authenticates the session; this RPC independently
-- rechecks the actor's current active-admin status before every mutation.
create or replace function public.manage_contribution_task(
  p_actor_id uuid,
  p_action text,
  p_task_id uuid default null,
  p_title text default null,
  p_description text default null,
  p_category text default null,
  p_acceptance_criteria jsonb default null,
  p_reward_amount numeric default null,
  p_closes_at timestamptz default null
)
returns table (
  task_id uuid,
  title text,
  status public.task_status,
  published_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles%rowtype;
  v_task public.contribution_tasks%rowtype;
  v_next_status public.task_status;
  v_old_status public.task_status;
  v_action text := lower(trim(coalesce(p_action, '')));
begin
  if p_actor_id is null then
    raise exception 'active_admin_required' using errcode = '42501';
  end if;

  select * into v_profile
  from public.profiles
  where id = p_actor_id
  for update;

  if not found or v_profile.role <> 'admin' or v_profile.account_status <> 'active' then
    raise exception 'active_admin_required' using errcode = '42501';
  end if;

  if v_action = 'create' then
    if p_task_id is not null
       or p_title is null or char_length(trim(p_title)) not between 3 and 180
       or p_description is null or char_length(trim(p_description)) not between 20 and 5000
       or p_category is null or char_length(trim(p_category)) not between 2 and 40
       or p_reward_amount is null or p_reward_amount < 0
       or p_reward_amount::text in ('NaN','Infinity','-Infinity')
       or p_reward_amount > 100000
       or p_acceptance_criteria is null
       or pg_catalog.jsonb_typeof(p_acceptance_criteria) <> 'array'
       or pg_catalog.jsonb_array_length(p_acceptance_criteria) not between 1 and 20
       or exists (
         select 1
         from pg_catalog.jsonb_array_elements(p_acceptance_criteria) item(value)
         where pg_catalog.jsonb_typeof(item.value) <> 'string'
            or char_length(trim(item.value #>> '{}')) not between 3 and 500
       )
       or (p_closes_at is not null and p_closes_at <= now()) then
      raise exception 'invalid_task_payload' using errcode = '22023';
    end if;

    insert into public.contribution_tasks (
      created_by, title, description, category, acceptance_criteria,
      reward_amount, reward_currency, status, closes_at
    ) values (
      p_actor_id, trim(p_title), trim(p_description), trim(p_category),
      p_acceptance_criteria, p_reward_amount, 'TWD', 'draft', p_closes_at
    )
    returning * into v_task;

    insert into public.audit_logs (
      actor_id, action, resource_type, resource_id, outcome, metadata
    ) values (
      p_actor_id, 'contribution_task_created', 'contribution_task', v_task.id, 'allowed',
      pg_catalog.jsonb_build_object('initial_status','draft','reward_currency','TWD')
    );

    return query select v_task.id, v_task.title, v_task.status, v_task.published_at, v_task.created_at;
    return;
  end if;

  if v_action not in ('publish','pause','close') or p_task_id is null then
    raise exception 'invalid_task_action' using errcode = '22023';
  end if;

  select * into v_task
  from public.contribution_tasks
  where id = p_task_id
  for update;

  if not found then
    raise exception 'task_not_found' using errcode = 'P0002';
  end if;

  v_old_status := v_task.status;

  if v_action = 'publish' then
    if v_task.status not in ('draft','paused')
       or char_length(trim(v_task.title)) < 3
       or char_length(trim(v_task.description)) < 20
       or char_length(trim(v_task.category)) < 2
       or pg_catalog.jsonb_typeof(v_task.acceptance_criteria) <> 'array'
       or pg_catalog.jsonb_array_length(v_task.acceptance_criteria) = 0
       or (v_task.closes_at is not null and v_task.closes_at <= now()) then
      raise exception 'task_not_publishable' using errcode = '22023';
    end if;
    v_next_status := 'published';
  elsif v_action = 'pause' then
    if v_task.status <> 'published' then
      raise exception 'task_not_pausable' using errcode = '22023';
    end if;
    v_next_status := 'paused';
  else
    if v_task.status not in ('published','paused','draft') then
      raise exception 'task_not_closable' using errcode = '22023';
    end if;
    v_next_status := 'closed';
  end if;

  update public.contribution_tasks as task_row
  set status = v_next_status,
      published_at = case when v_action = 'publish' then now() else task_row.published_at end
  where task_row.id = p_task_id
  returning task_row.* into v_task;

  insert into public.audit_logs (
    actor_id, action, resource_type, resource_id, outcome, metadata
  ) values (
    p_actor_id, 'contribution_task_' || v_action, 'contribution_task', v_task.id, 'allowed',
    pg_catalog.jsonb_build_object('from_status', v_old_status, 'to_status', v_next_status)
  );

  return query select v_task.id, v_task.title, v_task.status, v_task.published_at, v_task.created_at;
end;
$$;

revoke all on function public.manage_contribution_task(uuid,text,uuid,text,text,text,jsonb,numeric,timestamptz)
  from public, anon, authenticated;
grant execute on function public.manage_contribution_task(uuid,text,uuid,text,text,text,jsonb,numeric,timestamptz)
  to service_role;

comment on function public.manage_contribution_task(uuid,text,uuid,text,text,text,jsonb,numeric,timestamptz) is
  'Atomically creates or changes a contribution task and appends its audit event. Requires a currently active admin actor; service-role execution only.';
