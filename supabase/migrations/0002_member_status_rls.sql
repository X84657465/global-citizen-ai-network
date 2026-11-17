-- Enforce profile account status in row-level security.
-- Active members can read/write. Restricted members can read their own data only.
-- Suspended/closed members cannot access member data through the authenticated Data API.

create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon;
grant usage on schema private to authenticated;

create or replace function private.member_can_access()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.account_status in ('active', 'restricted')
  );
$$;

create or replace function private.member_can_write()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.account_status = 'active'
  );
$$;

revoke all on function private.member_can_access() from public, anon;
revoke all on function private.member_can_write() from public, anon;
grant execute on function private.member_can_access() to authenticated;
grant execute on function private.member_can_write() to authenticated;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) and (select private.member_can_access()));
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) and (select private.member_can_write()))
  with check (id = (select auth.uid()) and (select private.member_can_write()));

drop policy if exists "projects_owner_all" on public.projects;
create policy "projects_owner_select" on public.projects
  for select to authenticated
  using (owner_id = (select auth.uid()) and (select private.member_can_access()));
create policy "projects_owner_write" on public.projects
  for all to authenticated
  using (owner_id = (select auth.uid()) and (select private.member_can_write()))
  with check (owner_id = (select auth.uid()) and (select private.member_can_write()));

drop policy if exists "conversations_owner_all" on public.conversations;
create policy "conversations_owner_select" on public.conversations
  for select to authenticated
  using (owner_id = (select auth.uid()) and (select private.member_can_access()));
create policy "conversations_owner_write" on public.conversations
  for all to authenticated
  using (owner_id = (select auth.uid()) and (select private.member_can_write()))
  with check (
    owner_id = (select auth.uid())
    and (select private.member_can_write())
    and (
      project_id is null
      or exists (
        select 1 from public.projects p
        where p.id = project_id and p.owner_id = (select auth.uid())
      )
    )
  );

drop policy if exists "messages_owner_select" on public.messages;
drop policy if exists "messages_owner_insert_user_only" on public.messages;
create policy "messages_owner_select" on public.messages
  for select to authenticated
  using (owner_id = (select auth.uid()) and (select private.member_can_access()));
create policy "messages_owner_insert_user_only" on public.messages
  for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and (select private.member_can_write())
    and role = 'user'
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.owner_id = (select auth.uid())
    )
  );

drop policy if exists "ai_requests_owner_select" on public.ai_requests;
drop policy if exists "ai_user_limits_owner_select" on public.ai_user_limits;
drop policy if exists "ai_cost_owner_select" on public.ai_cost_ledger;
create policy "ai_requests_owner_select" on public.ai_requests
  for select to authenticated
  using (owner_id = (select auth.uid()) and (select private.member_can_access()));
create policy "ai_user_limits_owner_select" on public.ai_user_limits
  for select to authenticated
  using (owner_id = (select auth.uid()) and (select private.member_can_access()));
create policy "ai_cost_owner_select" on public.ai_cost_ledger
  for select to authenticated
  using (owner_id = (select auth.uid()) and (select private.member_can_access()));

drop policy if exists "published_tasks_read" on public.contribution_tasks;
drop policy if exists "submissions_owner_select" on public.task_submissions;
drop policy if exists "submissions_owner_insert" on public.task_submissions;
create policy "published_tasks_read" on public.contribution_tasks
  for select to authenticated
  using (
    (select private.member_can_access())
    and (status = 'published' or created_by = (select auth.uid()))
  );
create policy "submissions_owner_select" on public.task_submissions
  for select to authenticated
  using (contributor_id = (select auth.uid()) and (select private.member_can_access()));
create policy "submissions_owner_insert" on public.task_submissions
  for insert to authenticated
  with check (
    contributor_id = (select auth.uid())
    and (select private.member_can_write())
    and exists (
      select 1 from public.contribution_tasks t
      where t.id = task_id and t.status = 'published'
    )
  );

drop policy if exists "appeals_owner_select" on public.task_appeals;
drop policy if exists "appeals_owner_insert" on public.task_appeals;
drop policy if exists "reviews_owner_select" on public.task_reviews;
create policy "appeals_owner_select" on public.task_appeals
  for select to authenticated
  using (appellant_id = (select auth.uid()) and (select private.member_can_access()));
create policy "appeals_owner_insert" on public.task_appeals
  for insert to authenticated
  with check (
    appellant_id = (select auth.uid())
    and (select private.member_can_write())
    and exists (
      select 1 from public.task_submissions s
      where s.id = submission_id
        and s.contributor_id = (select auth.uid())
        and s.status = 'rejected'
    )
  );
create policy "reviews_owner_select" on public.task_reviews
  for select to authenticated
  using (
    (select private.member_can_access())
    and (
      exists (
        select 1 from public.task_submissions s
        where s.id = submission_id and s.contributor_id = (select auth.uid())
      )
      or reviewer_id = (select auth.uid())
    )
  );

drop policy if exists "contribution_ledger_owner_select" on public.contribution_ledger;
drop policy if exists "reward_ledger_owner_select" on public.reward_ledger;
create policy "contribution_ledger_owner_select" on public.contribution_ledger
  for select to authenticated
  using (contributor_id = (select auth.uid()) and (select private.member_can_access()));
create policy "reward_ledger_owner_select" on public.reward_ledger
  for select to authenticated
  using (owner_id = (select auth.uid()) and (select private.member_can_access()));
