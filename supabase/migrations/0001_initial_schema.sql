-- Global Citizen AI Network — initial PostgreSQL schema
-- Apply to a fresh Supabase project using the SQL editor or Supabase CLI.
-- This migration is intentionally additive and enables RLS on every user-facing table.

create extension if not exists pgcrypto;

create type public.member_role as enum ('member', 'reviewer', 'admin');
create type public.ai_request_status as enum ('queued', 'running', 'succeeded', 'failed', 'blocked');
create type public.ledger_status as enum ('pending', 'confirmed', 'reversed', 'settled');
create type public.task_status as enum ('draft', 'published', 'paused', 'closed');
create type public.submission_status as enum ('submitted', 'under_review', 'accepted', 'rejected', 'appealed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  preferred_language text not null default 'zh-TW',
  role public.member_role not null default 'member',
  account_status text not null default 'active' check (account_status in ('active','restricted','suspended','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  description text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  title text not null default '新對話',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('system','user','assistant','tool')),
  content text not null,
  model text,
  token_input integer check (token_input is null or token_input >= 0),
  token_output integer check (token_output is null or token_output >= 0),
  created_at timestamptz not null default now()
);

-- Global kill switch and hard budget ceilings. AI is disabled until explicitly enabled.
create table public.platform_ai_controls (
  id boolean primary key default true check (id = true),
  ai_enabled boolean not null default false,
  monthly_spend_cap numeric(18,2) not null default 0 check (monthly_spend_cap >= 0),
  per_request_spend_cap numeric(18,4) not null default 0 check (per_request_spend_cap >= 0),
  currency char(3) not null default 'TWD',
  hard_stop_enabled boolean not null default true,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.platform_ai_controls (id, ai_enabled, monthly_spend_cap, per_request_spend_cap, currency, hard_stop_enabled)
values (true, false, 0, 0, 'TWD', true)
on conflict (id) do nothing;

create table public.ai_user_limits (
  owner_id uuid primary key references public.profiles(id) on delete cascade,
  ai_enabled boolean not null default false,
  daily_request_limit integer not null default 0 check (daily_request_limit >= 0),
  monthly_request_limit integer not null default 0 check (monthly_request_limit >= 0),
  monthly_spend_limit numeric(18,2) not null default 0 check (monthly_spend_limit >= 0),
  currency char(3) not null default 'TWD',
  updated_at timestamptz not null default now()
);

create table public.ai_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete set null,
  provider text not null,
  model text not null,
  feature text not null,
  status public.ai_request_status not null default 'queued',
  provider_request_id text,
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  cached_tokens integer check (cached_tokens is null or cached_tokens >= 0),
  tool_calls integer not null default 0 check (tool_calls >= 0),
  provider_billed_cost numeric(18,8),
  provider_billed_currency char(3),
  estimated_internal_cost numeric(18,8),
  cost_method text,
  latency_ms integer check (latency_ms is null or latency_ms >= 0),
  retry_count integer not null default 0 check (retry_count >= 0),
  error_code text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  check (provider_billed_cost is null or provider_billed_cost >= 0),
  check (estimated_internal_cost is null or estimated_internal_cost >= 0)
);

create table public.provider_invoice_imports (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  billing_period_start date not null,
  billing_period_end date not null,
  currency char(3) not null,
  invoice_total numeric(18,8) not null check (invoice_total >= 0),
  source_file_hash text not null,
  source_storage_key text,
  reconciliation_status text not null default 'pending' check (reconciliation_status in ('pending','matched','variance','rejected')),
  imported_by uuid references public.profiles(id) on delete set null,
  imported_at timestamptz not null default now(),
  reconciled_at timestamptz,
  check (billing_period_end >= billing_period_start),
  unique (provider, billing_period_start, billing_period_end, source_file_hash)
);

create table public.ai_cost_ledger (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.ai_requests(id) on delete restrict,
  invoice_import_id uuid references public.provider_invoice_imports(id) on delete restrict,
  owner_id uuid references public.profiles(id) on delete restrict,
  cost_category text not null check (cost_category in ('model_provider','search_tool','storage','compute','human_review','payment_fee','infrastructure','other')),
  amount numeric(18,8) not null check (amount >= 0),
  currency char(3) not null,
  amount_kind text not null check (amount_kind in ('actual_invoice','estimated_allocation','internal_estimate')),
  calculation_method text,
  source_reference text,
  occurred_at timestamptz not null default now(),
  recorded_at timestamptz not null default now()
);

create table public.contribution_tasks (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.profiles(id) on delete set null,
  title text not null check (char_length(title) between 1 and 180),
  description text not null,
  category text not null,
  acceptance_criteria jsonb not null default '[]'::jsonb,
  reward_amount numeric(18,2) not null default 0 check (reward_amount >= 0),
  reward_currency char(3) not null default 'TWD',
  status public.task_status not null default 'draft',
  published_at timestamptz,
  closes_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.task_submissions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.contribution_tasks(id) on delete restrict,
  contributor_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  evidence jsonb not null default '[]'::jsonb,
  status public.submission_status not null default 'submitted',
  submitted_at timestamptz not null default now(),
  unique (task_id, contributor_id, id)
);

create table public.task_appeals (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.task_submissions(id) on delete cascade,
  appellant_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (char_length(reason) between 10 and 4000),
  evidence jsonb not null default '[]'::jsonb,
  status text not null default 'submitted' check (status in ('submitted','under_review','resolved','dismissed')),
  resolution text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table public.task_reviews (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.task_submissions(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete restrict,
  decision text not null check (decision in ('accept','reject','needs_changes')),
  rationale text not null,
  reviewed_at timestamptz not null default now()
);

create table public.contribution_ledger (
  id uuid primary key default gen_random_uuid(),
  contributor_id uuid not null references public.profiles(id) on delete restrict,
  submission_id uuid references public.task_submissions(id) on delete restrict,
  event_type text not null check (event_type in ('submitted','accepted','rejected','appealed','verified')),
  points numeric(18,4) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create table public.reward_ledger (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  submission_id uuid references public.task_submissions(id) on delete restrict,
  event_type text not null check (event_type in ('earned','adjustment','reversal','settlement','refund')),
  amount numeric(18,2) not null,
  currency char(3) not null default 'TWD',
  status public.ledger_status not null default 'pending',
  idempotency_key text not null unique,
  reversal_of uuid references public.reward_ledger(id) on delete restrict,
  reason text not null,
  created_by uuid references public.profiles(id) on delete restrict,
  occurred_at timestamptz not null default now(),
  recorded_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  outcome text not null check (outcome in ('allowed','denied','error')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index projects_owner_updated_idx on public.projects(owner_id, updated_at desc);
create index conversations_owner_updated_idx on public.conversations(owner_id, updated_at desc);
create index messages_conversation_created_idx on public.messages(conversation_id, created_at);
create index ai_requests_owner_created_idx on public.ai_requests(owner_id, created_at desc);
create index ai_cost_ledger_request_idx on public.ai_cost_ledger(request_id);
create index ai_cost_ledger_invoice_idx on public.ai_cost_ledger(invoice_import_id);
create index provider_invoice_period_idx on public.provider_invoice_imports(provider, billing_period_start desc);
create index contribution_tasks_status_created_idx on public.contribution_tasks(status, created_at desc);
create index task_submissions_contributor_idx on public.task_submissions(contributor_id, submitted_at desc);
create index task_reviews_submission_idx on public.task_reviews(submission_id, reviewed_at desc);
create index task_appeals_appellant_idx on public.task_appeals(appellant_id, created_at desc);

create unique index task_submissions_one_active_per_user
  on public.task_submissions(task_id, contributor_id)
  where status in ('submitted','under_review','accepted','appealed');
create index contribution_ledger_owner_idx on public.contribution_ledger(contributor_id, occurred_at desc);
create index reward_ledger_owner_idx on public.reward_ledger(owner_id, recorded_at desc);

-- New accounts receive a basic profile. The role is always assigned server-side.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- updated_at is maintained by the database.
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Prevent privilege escalation through the profile self-update policy.
-- Role and account status can only be changed by trusted server-side operations.
create or replace function public.protect_profile_privileges()
returns trigger language plpgsql set search_path = '' as $$
begin
  if auth.uid() is not null and (
    new.role is distinct from old.role
    or new.account_status is distinct from old.account_status
  ) then
    raise exception 'Role and account status changes require a trusted server-side operation.';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_privileges before update on public.profiles
  for each row execute procedure public.protect_profile_privileges();

create trigger profiles_updated_at before update on public.profiles
  for each row execute procedure public.set_updated_at();
create trigger projects_updated_at before update on public.projects
  for each row execute procedure public.set_updated_at();
create trigger conversations_updated_at before update on public.conversations
  for each row execute procedure public.set_updated_at();
create trigger contribution_tasks_updated_at before update on public.contribution_tasks
  for each row execute procedure public.set_updated_at();
create trigger platform_ai_controls_updated_at before update on public.platform_ai_controls
  for each row execute procedure public.set_updated_at();
create trigger ai_user_limits_updated_at before update on public.ai_user_limits
  for each row execute procedure public.set_updated_at();

-- Ledger records are append-only. Correct mistakes with a reversal/adjustment row.
create or replace function public.prevent_ledger_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'Ledger records are append-only; create a reversal or adjustment event.';
end;
$$;

create trigger ai_cost_ledger_immutable before update or delete on public.ai_cost_ledger
  for each row execute procedure public.prevent_ledger_mutation();
create trigger contribution_ledger_immutable before update or delete on public.contribution_ledger
  for each row execute procedure public.prevent_ledger_mutation();
create trigger reward_ledger_immutable before update or delete on public.reward_ledger
  for each row execute procedure public.prevent_ledger_mutation();

-- Enable row-level security on every table.
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.ai_requests enable row level security;
alter table public.platform_ai_controls enable row level security;
alter table public.ai_user_limits enable row level security;
alter table public.ai_cost_ledger enable row level security;
alter table public.provider_invoice_imports enable row level security;
alter table public.contribution_tasks enable row level security;
alter table public.task_submissions enable row level security;
alter table public.task_reviews enable row level security;
alter table public.task_appeals enable row level security;
alter table public.contribution_ledger enable row level security;
alter table public.reward_ledger enable row level security;
alter table public.audit_logs enable row level security;

-- Profiles: members can read/update only their own non-privileged profile fields.
create policy "profiles_select_own" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "profiles_update_own" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- User-owned workspace records.
create policy "projects_owner_all" on public.projects for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "conversations_owner_all" on public.conversations for all to authenticated
  using (owner_id = (select auth.uid())) with check (
    owner_id = (select auth.uid())
    and (
      project_id is null
      or exists (
        select 1 from public.projects p
        where p.id = project_id and p.owner_id = (select auth.uid())
      )
    )
  );
create policy "messages_owner_select" on public.messages for select to authenticated
  using (owner_id = (select auth.uid()));
create policy "messages_owner_insert_user_only" on public.messages for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and role = 'user'
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.owner_id = (select auth.uid())
    )
  );
create policy "ai_requests_owner_select" on public.ai_requests for select to authenticated
  using (owner_id = (select auth.uid()));
create policy "ai_user_limits_owner_select" on public.ai_user_limits for select to authenticated
  using (owner_id = (select auth.uid()));
create policy "ai_cost_owner_select" on public.ai_cost_ledger for select to authenticated
  using (owner_id = (select auth.uid()));

-- Tasks are public to authenticated members only when published.
create policy "published_tasks_read" on public.contribution_tasks for select to authenticated
  using (status = 'published' or created_by = (select auth.uid()));
create policy "submissions_owner_select" on public.task_submissions for select to authenticated
  using (contributor_id = (select auth.uid()));
create policy "submissions_owner_insert" on public.task_submissions for insert to authenticated
  with check (
    contributor_id = (select auth.uid())
    and exists (
      select 1 from public.contribution_tasks t
      where t.id = task_id and t.status = 'published'
    )
  );
create policy "appeals_owner_select" on public.task_appeals for select to authenticated
  using (appellant_id = (select auth.uid()));
create policy "appeals_owner_insert" on public.task_appeals for insert to authenticated
  with check (
    appellant_id = (select auth.uid())
    and exists (
      select 1 from public.task_submissions s
      where s.id = submission_id and s.contributor_id = (select auth.uid())
        and s.status = 'rejected'
    )
  );
create policy "reviews_owner_select" on public.task_reviews for select to authenticated
  using (
    exists (select 1 from public.task_submissions s
      where s.id = submission_id and s.contributor_id = (select auth.uid()))
    or reviewer_id = (select auth.uid())
  );
create policy "contribution_ledger_owner_select" on public.contribution_ledger for select to authenticated
  using (contributor_id = (select auth.uid()));
create policy "reward_ledger_owner_select" on public.reward_ledger for select to authenticated
  using (owner_id = (select auth.uid()));

-- Audit log access is intentionally service/admin-only; no client policy is granted.

-- Explicit least-privilege Data API grants. RLS remains the row-level boundary.
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.conversations to authenticated;
grant select, insert on public.messages to authenticated;
grant select on public.ai_requests to authenticated;
grant select on public.ai_user_limits to authenticated;
grant select on public.ai_cost_ledger to authenticated;
grant select on public.contribution_tasks to authenticated;
grant select, insert on public.task_submissions to authenticated;
grant select on public.task_reviews to authenticated;
grant select, insert on public.task_appeals to authenticated;
grant select on public.contribution_ledger to authenticated;
grant select on public.reward_ledger to authenticated;

grant usage on schema public to authenticated, service_role;

grant all privileges on public.profiles to service_role;
grant all privileges on public.projects to service_role;
grant all privileges on public.conversations to service_role;
grant all privileges on public.messages to service_role;
grant all privileges on public.ai_requests to service_role;
grant all privileges on public.platform_ai_controls to service_role;
grant all privileges on public.ai_user_limits to service_role;
grant all privileges on public.ai_cost_ledger to service_role;
grant all privileges on public.provider_invoice_imports to service_role;
grant all privileges on public.contribution_tasks to service_role;
grant all privileges on public.task_submissions to service_role;
grant all privileges on public.task_appeals to service_role;
grant all privileges on public.task_reviews to service_role;
grant all privileges on public.contribution_ledger to service_role;
grant all privileges on public.reward_ledger to service_role;
grant all privileges on public.audit_logs to service_role;
