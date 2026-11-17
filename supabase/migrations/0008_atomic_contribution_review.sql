-- Atomic contribution review, contribution scoring, and reward accrual.
-- Review actions are idempotent and all ledger writes occur in one transaction.

-- Enforce contribution submission bounds and task deadlines at the database boundary,
-- not only in the Next.js route (members can also access Supabase Data API).
alter table public.task_submissions
  add constraint task_submissions_content_length_check
  check (char_length(content) between 10 and 16000);

drop policy if exists "submissions_owner_insert" on public.task_submissions;
create policy "submissions_owner_insert" on public.task_submissions
  for insert to authenticated
  with check (
    contributor_id = (select auth.uid())
    and (select private.member_can_write())
    and exists (
      select 1 from public.contribution_tasks t
      where t.id = task_id
        and t.status = 'published'
        and (t.closes_at is null or t.closes_at > now())
    )
  );

create table public.task_review_idempotency (
  idempotency_key text primary key,
  request_hash bytea not null,
  response_json jsonb not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

alter table public.task_review_idempotency enable row level security;
revoke all on public.task_review_idempotency from public, anon, authenticated;
grant all privileges on public.task_review_idempotency to service_role;

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
    ),
    'sha256'
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

  select s.status, s.contributor_id, t.reward_amount, t.reward_currency
    into v_submission_status, v_contributor_id, v_reward_amount, v_reward_currency
  from public.task_submissions s
  join public.contribution_tasks t on t.id = s.task_id
  where s.id = p_submission_id
  for update of s, t;

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
  'Atomically reviews a submission, writes immutable contribution/reward ledger entries, and records an idempotent audit trail. Only active admin/reviewer actors are accepted.';
