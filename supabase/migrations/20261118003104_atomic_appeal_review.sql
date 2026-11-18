-- Atomic appeal adjudication. An overturned rejection follows the same
-- immutable contribution/reward ledger rules as an initially accepted submission.

create table public.task_appeal_review_idempotency (
  idempotency_key text primary key,
  request_hash bytea not null,
  response_json jsonb not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

alter table public.task_appeal_review_idempotency enable row level security;
revoke all on public.task_appeal_review_idempotency from public, anon, authenticated;
grant all privileges on public.task_appeal_review_idempotency to service_role;

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
    ),
    'sha256'
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

  select a.status, a.submission_id, s.status, s.contributor_id, t.reward_amount, t.reward_currency
    into v_appeal_status, v_submission_id, v_submission_status, v_contributor_id, v_reward_amount, v_reward_currency
  from public.task_appeals a
  join public.task_submissions s on s.id = a.submission_id
  join public.contribution_tasks t on t.id = s.task_id
  where a.id = p_appeal_id
  for update of a, s, t;

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
  'Atomically adjudicates an appeal. Overturning a rejection restores acceptance and creates immutable contribution/reward ledger entries.';
