begin;
select plan(10);

select ok(
  to_regprocedure('public.manage_contribution_task(uuid,text,uuid,text,text,text,jsonb,numeric,timestamptz)') is not null,
  'atomic contribution task administration RPC exists'
);
select ok(
  not has_function_privilege('authenticated','public.manage_contribution_task(uuid,text,uuid,text,text,text,jsonb,numeric,timestamptz)','EXECUTE')
  and not has_function_privilege('anon','public.manage_contribution_task(uuid,text,uuid,text,text,text,jsonb,numeric,timestamptz)','EXECUTE'),
  'browser roles cannot execute privileged task administration RPC'
);
select ok(
  has_function_privilege('service_role','public.manage_contribution_task(uuid,text,uuid,text,text,text,jsonb,numeric,timestamptz)','EXECUTE'),
  'service_role can execute the server-only task administration RPC'
);

do $fixture$
declare
  v_created record;
  v_result record;
  v_rejected boolean;
  v_admin uuid := '51000000-0000-4000-8000-000000000001';
  v_reviewer uuid := '51000000-0000-4000-8000-000000000002';
  v_suspended_admin uuid := '51000000-0000-4000-8000-000000000003';
begin
  insert into auth.users (
    id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values
    (v_admin,'authenticated','authenticated','task-admin@example.test','',now(),'{}'::jsonb,'{}'::jsonb,now(),now()),
    (v_reviewer,'authenticated','authenticated','task-reviewer@example.test','',now(),'{}'::jsonb,'{}'::jsonb,now(),now()),
    (v_suspended_admin,'authenticated','authenticated','task-suspended-admin@example.test','',now(),'{}'::jsonb,'{}'::jsonb,now(),now());

  update public.profiles set role='admin' where id=v_admin;
  update public.profiles set role='reviewer' where id=v_reviewer;
  update public.profiles set role='admin', account_status='suspended' where id=v_suspended_admin;

  select * into v_created
  from public.manage_contribution_task(
    v_admin,'create',null,'Atomic task lifecycle',
    'A task whose audit record must commit with every state change.',
    'quality',
    '["Review the result","Verify the evidence"]'::jsonb,
    120,
    null
  );
  if v_created.status <> 'draft' or v_created.task_id is null then
    raise exception 'create action did not return a draft task';
  end if;

  select * into v_result from public.manage_contribution_task(v_admin,'publish',v_created.task_id);
  if v_result.status <> 'published' or v_result.published_at is null then
    raise exception 'publish action did not publish task';
  end if;

  select * into v_result from public.manage_contribution_task(v_admin,'pause',v_created.task_id);
  if v_result.status <> 'paused' then raise exception 'pause action did not pause task'; end if;

  select * into v_result from public.manage_contribution_task(v_admin,'close',v_created.task_id);
  if v_result.status <> 'closed' then raise exception 'close action did not close task'; end if;

  v_rejected := false;
  begin
    perform * from public.manage_contribution_task(
      v_reviewer,'create',null,'Reviewer cannot create task',
      'A reviewer must not be able to create or manage contribution tasks.',
      'quality','["Valid criterion"]'::jsonb,10,null
    );
  exception when insufficient_privilege then
    v_rejected := true;
  end;
  if not v_rejected then raise exception 'reviewer was allowed to create task'; end if;

  v_rejected := false;
  begin
    perform * from public.manage_contribution_task(
      v_suspended_admin,'create',null,'Suspended admin cannot create',
      'A suspended administrator must not be able to manage contribution tasks.',
      'quality','["Valid criterion"]'::jsonb,10,null
    );
  exception when insufficient_privilege then
    v_rejected := true;
  end;
  if not v_rejected then raise exception 'suspended admin was allowed to create task'; end if;

  v_rejected := false;
  begin
    perform * from public.manage_contribution_task(v_admin,'pause',v_created.task_id);
  exception when invalid_parameter_value then
    v_rejected := true;
  end;
  if not v_rejected then raise exception 'closed task was allowed to be paused'; end if;

  v_rejected := false;
  begin
    perform * from public.manage_contribution_task(
      v_admin,'create',null,'Invalid criteria task',
      'This payload must be rejected because its criterion is too short.',
      'quality','["x"]'::jsonb,10,null
    );
  exception when invalid_parameter_value then
    v_rejected := true;
  end;
  if not v_rejected then raise exception 'invalid acceptance criteria were accepted'; end if;

  select * into v_created
  from public.manage_contribution_task(
    v_admin,'create',null,'Audit rollback task',
    'The task must remain published if its audit insert fails.',
    'quality','["Check the audit transaction"]'::jsonb,100,null
  );
  perform * from public.manage_contribution_task(v_admin,'publish',v_created.task_id);

  create or replace function public.test_reject_contribution_task_pause_audit()
  returns trigger
  language plpgsql
  as $trigger$
  begin
    if new.action = 'contribution_task_pause' then
      raise exception 'forced_audit_failure' using errcode = 'P0001';
    end if;
    return new;
  end;
  $trigger$;

  create trigger test_reject_contribution_task_pause_audit
  before insert on public.audit_logs
  for each row execute function public.test_reject_contribution_task_pause_audit();

  v_rejected := false;
  begin
    perform * from public.manage_contribution_task(v_admin,'pause',v_created.task_id);
  exception when others then
    v_rejected := true;
  end;

  drop trigger test_reject_contribution_task_pause_audit on public.audit_logs;
  drop function public.test_reject_contribution_task_pause_audit();

  if not v_rejected then raise exception 'task mutation succeeded despite forced audit failure'; end if;
  if (select status from public.contribution_tasks where id=v_created.task_id) <> 'published' then
    raise exception 'task state was not rolled back after audit failure';
  end if;
end;
$fixture$;

select ok(
  exists (select 1 from public.contribution_tasks where title='Atomic task lifecycle' and status='closed'),
  'task lifecycle completed with the expected final state'
);
select ok(
  (select count(*)=4 from public.audit_logs
   where action in ('contribution_task_created','contribution_task_publish','contribution_task_pause','contribution_task_close')
     and resource_type='contribution_task'
     and resource_id=(select id from public.contribution_tasks where title='Atomic task lifecycle')),
  'create, publish, pause, and close each committed one audit event'
);

select ok(
  exists (select 1 from public.contribution_tasks
    where title='Atomic task lifecycle'
      and created_by='51000000-0000-4000-8000-000000000001'
      and reward_amount=120 and reward_currency='TWD'
      and pg_catalog.jsonb_array_length(acceptance_criteria)=2),
  'created task records the authenticated admin, validated reward, and criteria'
);
select ok(
  (select count(*)=4 from public.audit_logs
   where resource_id=(select id from public.contribution_tasks where title='Atomic task lifecycle')
     and actor_id='51000000-0000-4000-8000-000000000001'
     and outcome='allowed'),
  'all lifecycle audit records are attributed to the active admin'
);
select ok(
  not exists (select 1 from public.contribution_tasks
    where title in ('Reviewer cannot create task','Suspended admin cannot create','Invalid criteria task')),
  'unauthorized and invalid task creations leave no task rows'
);

select ok(
  (select status='published' from public.contribution_tasks where title='Audit rollback task'),
  'task status rolls back when the paired audit insert fails'
);
select ok(
  (select count(*)=2 from public.audit_logs
   where resource_id=(select id from public.contribution_tasks where title='Audit rollback task')
     and action in ('contribution_task_created','contribution_task_publish')),
  'failed audit insertion leaves no partial pause audit event'
);

select * from finish();
rollback;
