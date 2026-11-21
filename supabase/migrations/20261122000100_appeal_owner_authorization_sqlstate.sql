-- Report cross-member appeal attempts as authorization failures.
-- The BEFORE INSERT trigger remains the authoritative lifecycle guard; using
-- SQLSTATE 42501 makes the denial explicit and testable by application clients.

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
    raise insufficient_privilege
      using errcode = '42501',
            message = 'only the submission owner can appeal';
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

revoke all on function private.prepare_task_appeal_insert()
  from public, anon, authenticated;

comment on function private.prepare_task_appeal_insert() is
  'Locks the source submission and allows only its owner to create an appeal while it is rejected; rejects cross-member attempts with SQLSTATE 42501 and resets reviewer-controlled lifecycle fields.';
