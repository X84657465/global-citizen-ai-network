-- Enforce the one-active-submission-per-member/task invariant at the database boundary.
-- A rejected submission may be resubmitted, but an unresolved appeal blocks resubmission
-- until the appeal is dismissed or resolved.

create unique index if not exists task_submissions_one_active_per_task_contributor_idx
  on public.task_submissions (task_id, contributor_id)
  where status in ('submitted', 'under_review', 'accepted', 'appealed');

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
    -- Serialize submission and appeal creation for this member/task pair.
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
        'task-submission:' || new.task_id::text || ':' || new.contributor_id::text,
        0
      )
    );

    if exists (
      select 1
      from public.task_submissions s
      where s.task_id = new.task_id
        and s.contributor_id = new.contributor_id
        and s.status in ('submitted', 'under_review', 'accepted', 'appealed')
    ) then
      raise exception 'active submission already exists for this task';
    end if;

    if exists (
      select 1
      from public.task_appeals a
      join public.task_submissions s on s.id = a.submission_id
      where s.task_id = new.task_id
        and s.contributor_id = new.contributor_id
        and a.status in ('submitted', 'under_review')
    ) then
      raise exception 'task has an unresolved appeal';
    end if;

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

create or replace function private.prepare_task_appeal_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_contributor_id uuid;
  v_submission_status public.submission_status;
  v_task_id uuid;
begin
  select s.task_id, s.contributor_id, s.status
    into v_task_id, v_contributor_id, v_submission_status
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

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'task-submission:' || v_task_id::text || ':' || v_contributor_id::text,
      0
    )
  );

  if exists (
    select 1
    from public.task_submissions s
    where s.task_id = v_task_id
      and s.contributor_id = v_contributor_id
      and s.id <> new.submission_id
      and s.status in ('submitted', 'under_review', 'accepted', 'appealed')
  ) then
    raise exception 'another active submission exists for this task';
  end if;

  if exists (
    select 1
    from public.task_appeals a
    join public.task_submissions s on s.id = a.submission_id
    where s.task_id = v_task_id
      and s.contributor_id = v_contributor_id
      and a.status in ('submitted', 'under_review')
  ) then
    raise exception 'another appeal is already under review for this task';
  end if;

  new.status := 'submitted';
  new.resolution := null;
  new.resolved_at := null;
  new.created_at := now();
  return new;
end;
$function$;

revoke all on function private.capture_task_submission_reward_snapshot()
  from public, anon, authenticated;
revoke all on function private.prepare_task_appeal_insert()
  from public, anon, authenticated;

comment on index public.task_submissions_one_active_per_task_contributor_idx is
  'Allows at most one submitted, under-review, accepted, or appealed submission per member and task; rejected submissions may be resubmitted after any appeal is closed.';
