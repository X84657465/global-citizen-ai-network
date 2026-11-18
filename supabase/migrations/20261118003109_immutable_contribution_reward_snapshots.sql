-- Immutable reward snapshots for contribution submissions.
-- Existing rows are explicitly marked as estimates because historical task prices
-- cannot be reconstructed reliably from the current task record.

alter table public.task_submissions
  add column reward_amount_snapshot numeric(18,2),
  add column reward_currency_snapshot char(3),
  add column reward_snapshot_source text;

update public.task_submissions s
set reward_amount_snapshot = t.reward_amount,
    reward_currency_snapshot = t.reward_currency,
    reward_snapshot_source = 'legacy_backfill_current_task'
from public.contribution_tasks t
where t.id = s.task_id;

alter table public.task_submissions
  alter column reward_amount_snapshot set not null,
  alter column reward_currency_snapshot set not null,
  alter column reward_snapshot_source set not null,
  add constraint task_submissions_reward_snapshot_source_check
    check (reward_snapshot_source in ('submission_time', 'legacy_backfill_current_task'));

comment on column public.task_submissions.reward_amount_snapshot is
  'Reward amount locked when the submission is created. Legacy rows use the current task amount and are explicitly marked as estimates.';
comment on column public.task_submissions.reward_currency_snapshot is
  'Reward currency locked when the submission is created.';
comment on column public.task_submissions.reward_snapshot_source is
  'submission_time for new submissions; legacy_backfill_current_task identifies historical rows whose original reward cannot be proven.';

create or replace function private.capture_task_submission_reward_snapshot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reward_amount numeric(18,2);
  v_reward_currency char(3);
begin
  if tg_op = 'INSERT' then
    select t.reward_amount, t.reward_currency
      into v_reward_amount, v_reward_currency
    from public.contribution_tasks t
    where t.id = new.task_id
    for share;

    if not found then
      raise exception 'contribution task not found';
    end if;

    -- Never trust snapshot values supplied by a client or service caller.
    new.reward_amount_snapshot := v_reward_amount;
    new.reward_currency_snapshot := v_reward_currency;
    new.reward_snapshot_source := 'submission_time';
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
$$;

revoke all on function private.capture_task_submission_reward_snapshot()
  from public, anon, authenticated;

create trigger task_submissions_reward_snapshot
  before insert or update on public.task_submissions
  for each row execute function private.capture_task_submission_reward_snapshot();

-- Use the immutable submission-time snapshot for all reward decisions.
-- sha256(bytea) is PostgreSQL's one-argument built-in function; it does not take
-- a separate algorithm-name argument.

create or replace function public.review_task_submission(
  p_actor_id uuid,
  p_submission_id uuid,
  p_decision text,
  p_rationale text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hash bytea;
  v_existing public.task_review_idempotency%rowtype;
  v_submission_status public.submission_status;
  v_contributor_id uuid;
  v_reward_amount numeric(18,2);
  v_reward_currency char(3);
  v_review_id uuid;
  v_new_status public.submission_status;
  v_response jsonb;
begin
  if p_actor_id is null or p_submission_id is null then
    raise exception 'actor and submission are required';
  end if;
  if p_decision is null or p_decision not in ('accept', 'reject') then
    raise exception 'decision must be accept or reject';
  end if;
  if p_rationale is null or char_length(pg_catalog.btrim(p_rationale)) < 10
     or char_length(p_rationale) > 4000 then
    raise exception 'rationale must be between 10 and 4000 characters';
  end if;
  if p_idempotency_key is null or p_idempotency_key !~ '^[A-Za-z0-9._:-]{8,128}$' then
    raise exception 'invalid idempotency key';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = p_actor_id and p.role in ('admin','reviewer')
      and p.account_status = 'active'
  ) then
    raise exception 'active reviewer permission required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('task-review:' || p_idempotency_key, 0)
  );

  v_hash := pg_catalog.sha256(
    pg_catalog.convert_to(
      pg_catalog.jsonb_build_object(
        'actor', p_actor_id,
        'submission', p_submission_id,
        'decision', p_decision,
        'rationale', pg_catalog.btrim(p_rationale)
      )::text,
      'UTF8'
    )
  );

  select * into v_existing
  from public.task_review_idempotency
  where idempotency_key = p_idempotency_key;

  if found then
    if v_existing.request_hash <> v_hash then
      raise exception 'idempotency key payload conflict';
    end if;
    return v_existing.response_json || pg_catalog.jsonb_build_object('replayed', true);
  end if;

  select s.status, s.contributor_id, s.reward_amount_snapshot, s.reward_currency_snapshot
    into v_submission_status, v_contributor_id, v_reward_amount, v_reward_currency
  from public.task_submissions s
  where s.id = p_submission_id
  for update of s;

  if not found then
    raise exception 'submission not found';
  end if;
  if v_submission_status not in ('submitted','under_review') then
    raise exception 'submission is not reviewable';
  end if;

  v_new_status := case
    when p_decision = 'accept' then 'accepted'::public.submission_status
    else 'rejected'::public.submission_status
  end;

  insert into public.task_reviews (submission_id, reviewer_id, decision, rationale)
  values (p_submission_id, p_actor_id, p_decision, pg_catalog.btrim(p_rationale))
  returning id into v_review_id;

  update public.task_submissions
  set status = v_new_status
  where id = p_submission_id;

  insert into public.contribution_ledger (
    contributor_id, submission_id, event_type, points, metadata
  ) values (
    v_contributor_id,
    p_submission_id,
    case when p_decision = 'accept' then 'accepted' else 'rejected' end,
    case when p_decision = 'accept' then 1 else 0 end,
    pg_catalog.jsonb_build_object('review_id', v_review_id, 'decision', p_decision)
  );

  if p_decision = 'accept' and v_reward_amount > 0 then
    insert into public.reward_ledger (
      owner_id, submission_id, event_type, amount, currency, status,
      idempotency_key, reason, created_by
    ) values (
      v_contributor_id,
      p_submission_id,
      'earned',
      v_reward_amount,
      v_reward_currency,
      'pending',
      'task-review:' || p_idempotency_key,
      '貢獻任務通過驗收：' || p_submission_id::text,
      p_actor_id
    );
  end if;

  insert into public.audit_logs (
    actor_id, action, resource_type, resource_id, outcome, metadata
  ) values (
    p_actor_id,
    'contribution_submission_reviewed',
    'task_submission',
    p_submission_id,
    'allowed',
    pg_catalog.jsonb_build_object(
      'decision', p_decision,
      'review_id', v_review_id,
      'reward_amount', case when p_decision = 'accept' then v_reward_amount else 0 end,
      'reward_currency', v_reward_currency
    )
  );

  v_response := pg_catalog.jsonb_build_object(
    'submission_id', p_submission_id,
    'review_id', v_review_id,
    'status', v_new_status,
    'decision', p_decision,
    'reward_amount', case when p_decision = 'accept' then v_reward_amount else 0 end,
    'reward_currency', v_reward_currency,
    'replayed', false
  );

  insert into public.task_review_idempotency (
    idempotency_key, request_hash, response_json, created_by
  ) values (
    p_idempotency_key, v_hash, v_response, p_actor_id
  );

  return v_response;
end;
$$;

revoke all on function public.review_task_submission(uuid,uuid,text,text,text)
  from public, anon, authenticated;
grant execute on function public.review_task_submission(uuid,uuid,text,text,text)
  to service_role;

comment on function public.review_task_submission(uuid,uuid,text,text,text) is
  'Atomically reviews a submission, writes immutable contribution/reward ledger entries using the submission-time reward snapshot, and records an idempotent audit trail.';

create or replace function public.review_task_appeal(
  p_actor_id uuid,
  p_appeal_id uuid,
  p_decision text,
  p_rationale text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hash bytea;
  v_existing public.task_appeal_review_idempotency%rowtype;
  v_appeal_status text;
  v_submission_id uuid;
  v_submission_status public.submission_status;
  v_contributor_id uuid;
  v_reward_amount numeric(18,2);
  v_reward_currency char(3);
  v_review_id uuid;
  v_new_appeal_status text;
  v_new_submission_status public.submission_status;
  v_response jsonb;
begin
  if p_actor_id is null or p_appeal_id is null then
    raise exception 'actor and appeal are required';
  end if;
  if p_decision is null or p_decision not in ('overturn', 'uphold') then
    raise exception 'decision must be overturn or uphold';
  end if;
  if p_rationale is null or char_length(pg_catalog.btrim(p_rationale)) < 10
     or char_length(p_rationale) > 4000 then
    raise exception 'rationale must be between 10 and 4000 characters';
  end if;
  if p_idempotency_key is null or p_idempotency_key !~ '^[A-Za-z0-9._:-]{8,128}$' then
    raise exception 'invalid idempotency key';
  end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = p_actor_id and p.role in ('admin','reviewer')
      and p.account_status = 'active'
  ) then
    raise exception 'active reviewer permission required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('task-appeal-review:' || p_idempotency_key, 0)
  );

  v_hash := pg_catalog.sha256(
    pg_catalog.convert_to(
      pg_catalog.jsonb_build_object(
        'actor', p_actor_id,
        'appeal', p_appeal_id,
        'decision', p_decision,
        'rationale', pg_catalog.btrim(p_rationale)
      )::text,
      'UTF8'
    )
  );

  select * into v_existing
  from public.task_appeal_review_idempotency
  where idempotency_key = p_idempotency_key;

  if found then
    if v_existing.request_hash <> v_hash then
      raise exception 'idempotency key payload conflict';
    end if;
    return v_existing.response_json || pg_catalog.jsonb_build_object('replayed', true);
  end if;

  select a.status, a.submission_id, s.status, s.contributor_id,
         s.reward_amount_snapshot, s.reward_currency_snapshot
    into v_appeal_status, v_submission_id, v_submission_status, v_contributor_id,
         v_reward_amount, v_reward_currency
  from public.task_appeals a
  join public.task_submissions s on s.id = a.submission_id
  where a.id = p_appeal_id
  for update of a, s;

  if not found then
    raise exception 'appeal not found';
  end if;
  if v_appeal_status not in ('submitted','under_review') then
    raise exception 'appeal is not reviewable';
  end if;
  if v_submission_status <> 'rejected' then
    raise exception 'appeal submission is no longer rejected';
  end if;

  if p_decision = 'overturn' then
    v_new_appeal_status := 'resolved';
    v_new_submission_status := 'accepted';
  else
    v_new_appeal_status := 'dismissed';
    v_new_submission_status := 'rejected';
  end if;

  insert into public.task_reviews (submission_id, reviewer_id, decision, rationale)
  values (
    v_submission_id,
    p_actor_id,
    case when p_decision = 'overturn' then 'accept' else 'reject' end,
    '申訴複核：' || pg_catalog.btrim(p_rationale)
  ) returning id into v_review_id;

  update public.task_appeals
  set status = v_new_appeal_status,
      resolution = pg_catalog.btrim(p_rationale),
      resolved_at = now()
  where id = p_appeal_id;

  if p_decision = 'overturn' then
    update public.task_submissions set status = 'accepted' where id = v_submission_id;

    insert into public.contribution_ledger (
      contributor_id, submission_id, event_type, points, metadata
    ) values (
      v_contributor_id, v_submission_id, 'accepted', 1,
      pg_catalog.jsonb_build_object('appeal_id', p_appeal_id, 'review_id', v_review_id, 'decision', p_decision)
    );

    if v_reward_amount > 0 then
      insert into public.reward_ledger (
        owner_id, submission_id, event_type, amount, currency, status,
        idempotency_key, reason, created_by
      ) values (
        v_contributor_id, v_submission_id, 'earned', v_reward_amount, v_reward_currency, 'pending',
        'task-appeal-review:' || p_idempotency_key,
        '貢獻任務申訴複核通過：' || v_submission_id::text,
        p_actor_id
      );
    end if;
  end if;

  insert into public.audit_logs (
    actor_id, action, resource_type, resource_id, outcome, metadata
  ) values (
    p_actor_id, 'contribution_appeal_reviewed', 'task_appeal', p_appeal_id, 'allowed',
    pg_catalog.jsonb_build_object(
      'decision', p_decision, 'review_id', v_review_id,
      'submission_id', v_submission_id, 'new_appeal_status', v_new_appeal_status,
      'new_submission_status', v_new_submission_status
    )
  );

  v_response := pg_catalog.jsonb_build_object(
    'appeal_id', p_appeal_id, 'submission_id', v_submission_id,
    'appeal_status', v_new_appeal_status, 'submission_status', v_new_submission_status,
    'decision', p_decision, 'review_id', v_review_id,
    'reward_amount', case when p_decision = 'overturn' then v_reward_amount else 0 end,
    'reward_currency', v_reward_currency, 'replayed', false
  );

  insert into public.task_appeal_review_idempotency (
    idempotency_key, request_hash, response_json, created_by
  ) values (p_idempotency_key, v_hash, v_response, p_actor_id);

  return v_response;
end;
$$;

revoke all on function public.review_task_appeal(uuid,uuid,text,text,text)
  from public, anon, authenticated;
grant execute on function public.review_task_appeal(uuid,uuid,text,text,text)
  to service_role;

comment on function public.review_task_appeal(uuid,uuid,text,text,text) is
  'Atomically adjudicates an appeal using the immutable submission-time reward snapshot. Overturning a rejection restores acceptance and creates immutable contribution/reward ledger entries.';
