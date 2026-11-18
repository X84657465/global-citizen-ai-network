begin;

select plan(9);

select ok(
  exists (
    select 1
    from pg_index i
    join pg_class c on c.oid = i.indexrelid
    where c.oid = 'public.task_submissions_one_active_per_task_contributor_idx'::regclass
      and i.indisunique
      and pg_get_expr(i.indpred, i.indrelid) like '%submitted%'
      and pg_get_expr(i.indpred, i.indrelid) like '%under_review%'
      and pg_get_expr(i.indpred, i.indrelid) like '%accepted%'
      and pg_get_expr(i.indpred, i.indrelid) like '%appealed%'
  ),
  'database has a partial unique index for active task submissions'
);

select ok(
  position('pg_advisory_xact_lock' in pg_get_functiondef('private.capture_task_submission_reward_snapshot()'::regprocedure)) > 0
  and position('task_appeals' in pg_get_functiondef('private.capture_task_submission_reward_snapshot()'::regprocedure)) > 0,
  'submission insert trigger serializes member/task submissions and checks open appeals'
);

select ok(
  position('pg_advisory_xact_lock' in pg_get_functiondef('private.prepare_task_appeal_insert()'::regprocedure)) > 0
  and position('another active submission exists' in pg_get_functiondef('private.prepare_task_appeal_insert()'::regprocedure)) > 0,
  'appeal insert trigger shares the member/task lock and rejects conflicting active submissions'
);

do $fixture$
declare
  v_member uuid := '82000000-0000-4000-8000-000000000001';
  v_task_one uuid := '83000000-0000-4000-8000-000000000001';
  v_task_two uuid := '83000000-0000-4000-8000-000000000002';
  v_first_submission uuid := '84000000-0000-4000-8000-000000000001';
  v_second_submission uuid := '84000000-0000-4000-8000-000000000002';
  v_third_submission uuid := '84000000-0000-4000-8000-000000000003';
  v_appeal_submission uuid := '84000000-0000-4000-8000-000000000004';
  v_after_appeal_submission uuid := '84000000-0000-4000-8000-000000000005';
  v_duplicate_rejected boolean := false;
  v_resubmit_allowed boolean := false;
  v_third_rejected boolean := false;
  v_appeal_blocked_by_sibling boolean := false;
  v_pending_appeal_blocks boolean := false;
  v_after_dismissal_allowed boolean := false;
  v_error text;
begin
  insert into auth.users (
    id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values (
    v_member, 'authenticated', 'authenticated',
    'task-uniqueness-member@example.test', '', now(), '{}'::jsonb,
    '{"name":"Task Uniqueness Member"}'::jsonb, now(), now()
  );

  insert into public.contribution_tasks (
    id, title, description, category, acceptance_criteria,
    reward_amount, reward_currency, status, published_at
  ) values
    (v_task_one, 'Single active submission task', 'Task used to test active submission uniqueness.', 'testing',
     '["Provide a valid result"]'::jsonb, 10, 'TWD', 'published', now()),
    (v_task_two, 'Appeal lock task', 'Task used to test the appeal submission lock.', 'testing',
     '["Provide a valid result"]'::jsonb, 10, 'TWD', 'published', now());

  insert into public.task_submissions (id, task_id, contributor_id, content)
  values (v_first_submission, v_task_one, v_member, 'First valid submission content.');

  begin
    insert into public.task_submissions (id, task_id, contributor_id, content)
    values (v_second_submission, v_task_one, v_member, 'Duplicate active submission content.');
  exception when others then
    get stacked diagnostics v_error = message_text;
    v_duplicate_rejected := v_error = 'active submission already exists for this task';
  end;

  update public.task_submissions set status = 'rejected' where id = v_first_submission;
  insert into public.task_submissions (id, task_id, contributor_id, content)
  values (v_second_submission, v_task_one, v_member, 'Resubmission after rejection is allowed.');
  v_resubmit_allowed := true;

  update public.task_submissions set status = 'under_review' where id = v_second_submission;
  begin
    insert into public.task_submissions (id, task_id, contributor_id, content)
    values (v_third_submission, v_task_one, v_member, 'Third submission while under review.');
  exception when others then
    get stacked diagnostics v_error = message_text;
    v_third_rejected := v_error = 'active submission already exists for this task';
  end;

  begin
    insert into public.task_appeals (submission_id, appellant_id, reason)
    values (v_first_submission, v_member, 'Appeal after rejection while a new submission exists.');
  exception when others then
    get stacked diagnostics v_error = message_text;
    v_appeal_blocked_by_sibling := v_error = 'another active submission exists for this task';
  end;

  insert into public.task_submissions (id, task_id, contributor_id, content)
  values (v_appeal_submission, v_task_two, v_member, 'Submission that will be rejected and appealed.');
  update public.task_submissions set status = 'rejected' where id = v_appeal_submission;
  insert into public.task_appeals (submission_id, appellant_id, reason)
  values (v_appeal_submission, v_member, 'A valid appeal while no sibling submission exists.');

  begin
    insert into public.task_submissions (id, task_id, contributor_id, content)
    values (v_after_appeal_submission, v_task_two, v_member, 'Submission during open appeal.');
  exception when others then
    get stacked diagnostics v_error = message_text;
    v_pending_appeal_blocks := v_error = 'task has an unresolved appeal';
  end;

  update public.task_appeals set status = 'dismissed', resolution = 'Appeal reviewed and dismissed.', resolved_at = now()
  where submission_id = v_appeal_submission;

  insert into public.task_submissions (id, task_id, contributor_id, content)
  values (v_after_appeal_submission, v_task_two, v_member, 'Resubmission after appeal dismissal.');
  v_after_dismissal_allowed := true;

  if not v_duplicate_rejected then raise exception 'duplicate active submission was not rejected'; end if;
  if not v_resubmit_allowed then raise exception 'resubmission after rejection was not allowed'; end if;
  if not v_third_rejected then raise exception 'another active submission was accepted'; end if;
  if not v_appeal_blocked_by_sibling then raise exception 'appeal was allowed while another active submission existed'; end if;
  if not v_pending_appeal_blocks then raise exception 'new submission was allowed while appeal was open'; end if;
  if not v_after_dismissal_allowed then raise exception 'resubmission after appeal dismissal was not allowed'; end if;
end;
$fixture$;

select ok(
  exists (
    select 1 from public.task_submissions
    where task_id = '83000000-0000-4000-8000-000000000001'
      and contributor_id = '82000000-0000-4000-8000-000000000001'
      and status = 'under_review'
  ),
  'the latest active submission remains under review after rejected duplicates'
);
select ok(
  exists (
    select 1 from public.task_submissions s
    join public.task_appeals a on a.submission_id = s.id
    where s.id = '84000000-0000-4000-8000-000000000004'
      and a.status = 'dismissed'
  ),
  'a dismissed appeal releases the task/member pair for resubmission'
);

select * from finish();
rollback;
