-- Enforce server-owned submission and appeal lifecycle fields.
-- BEFORE INSERT triggers run before RLS WITH CHECK evaluation and serialize
-- state-sensitive inserts against task/submission updates.

create or replace function private.capture_task_submission_reward_snapshot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_reward_amount numeric(18,2);
  v_reward_currency char(3);
begin
  if tg_op = 'INSERT' then
    select t.reward_amount, t.reward_currency
      into v_reward_amount, v_reward_currency
    from public.contribution_tasks t
    where t.id = new.task_id
      and t.status = 'published'
      and (t.closes_at is null or t.closes_at > now())
    for share;

    if not found then
      raise exception 'task is not accepting submissions';
    end if;

    new.reward_amount_snapshot := v_reward_amount;
    new.reward_currency_snapshot := v_reward_currency;
    new.reward_snapshot_source := 'submission_time';
    new.status := 'submitted';
    new.submitted_at := now();
    return new;
  end if;

  if new.task_id is distinct from old.task_id then
    raise exception 'submission task cannot be changed';
  end if;
  if new.reward_amount_snapshot is distinct from old.reward_amount_snapshot
     or new.reward_currency_snapshot is distinct from old.reward_currency_snapshot
     or new.reward_snapshot_source is distinct from old.reward_snapshot_source then
    raise exception 'submission reward snapshot is immutable';
  end if;

  return new;
end;
$function$;

drop policy if exists "submissions_owner_insert" on public.task_submissions;
create policy "submissions_owner_insert" on public.task_submissions
  for insert to authenticated
  with check (
    contributor_id = (select auth.uid())
    and (select private.member_can_write())
    and status = 'submitted'
    and exists (
      select 1 from public.contribution_tasks t
      where t.id = task_id
        and t.status = 'published'
        and (t.closes_at is null or t.closes_at > now())
    )
  );

create or replace function private.prepare_task_appeal_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_contributor_id uuid;
  v_submission_status public.submission_status;
begin
  select s.contributor_id, s.status
    into v_contributor_id, v_submission_status
  from public.task_submissions s
  where s.id = new.submission_id
  for update;

  if not found then
    raise exception 'appeal submission not found';
  end if;
  if v_submission_status <> 'rejected' then
    raise exception 'only rejected submissions can be appealed';
  end if;
  if v_contributor_id is distinct from new.appellant_id then
    raise exception 'only the submission owner can appeal';
  end if;

  new.status := 'submitted';
  new.resolution := null;
  new.resolved_at := null;
  new.created_at := now();
  return new;
end;
$function$;

revoke all on function private.prepare_task_appeal_insert()
  from public, anon, authenticated;

create trigger task_appeals_prepare_insert
  before insert on public.task_appeals
  for each row execute function private.prepare_task_appeal_insert();

drop policy if exists "appeals_owner_insert" on public.task_appeals;
create policy "appeals_owner_insert" on public.task_appeals
  for insert to authenticated
  with check (
    appellant_id = (select auth.uid())
    and (select private.member_can_write())
    and status = 'submitted'
    and resolution is null
    and resolved_at is null
    and exists (
      select 1 from public.task_submissions s
      where s.id = submission_id
        and s.contributor_id = (select auth.uid())
        and s.status = 'rejected'
    )
  );

comment on function private.prepare_task_appeal_insert() is
  'Locks the source submission and allows only its owner to create an appeal while it is rejected; resets all reviewer-controlled appeal lifecycle fields.';
