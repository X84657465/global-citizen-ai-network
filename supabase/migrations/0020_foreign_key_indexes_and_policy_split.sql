-- Add covering indexes for every foreign key reported without one by
-- the Supabase performance advisor on 2026-11-18.
create index if not exists ai_cost_ledger_owner_id_idx on public.ai_cost_ledger (owner_id);
create index if not exists ai_reconciliation_events_actor_id_idx on public.ai_reconciliation_events (actor_id);
create index if not exists ai_requests_conversation_id_idx on public.ai_requests (conversation_id);
create index if not exists ai_requests_project_id_idx on public.ai_requests (project_id);
create index if not exists audit_logs_actor_id_idx on public.audit_logs (actor_id);
create index if not exists contribution_ledger_submission_id_idx on public.contribution_ledger (submission_id);
create index if not exists contribution_tasks_created_by_idx on public.contribution_tasks (created_by);
create index if not exists conversations_project_id_idx on public.conversations (project_id);
create index if not exists messages_owner_id_idx on public.messages (owner_id);
create index if not exists platform_ai_controls_updated_by_idx on public.platform_ai_controls (updated_by);
create index if not exists provider_invoice_imports_imported_by_idx on public.provider_invoice_imports (imported_by);
create index if not exists reward_ledger_created_by_idx on public.reward_ledger (created_by);
create index if not exists reward_ledger_reversal_of_idx on public.reward_ledger (reversal_of);
create index if not exists reward_ledger_submission_id_idx on public.reward_ledger (submission_id);
create index if not exists task_appeal_review_idempotency_created_by_idx on public.task_appeal_review_idempotency (created_by);
create index if not exists task_review_idempotency_created_by_idx on public.task_review_idempotency (created_by);
create index if not exists task_reviews_reviewer_id_idx on public.task_reviews (reviewer_id);

-- Split FOR ALL policies: their SELECT branch duplicated the dedicated
-- read policy and evaluated the stricter write predicate on every read.
drop policy if exists projects_owner_write on public.projects;
create policy projects_owner_insert on public.projects
  for insert to authenticated
  with check (owner_id = (select auth.uid()) and (select private.member_can_write()));
create policy projects_owner_update on public.projects
  for update to authenticated
  using (owner_id = (select auth.uid()) and (select private.member_can_write()))
  with check (owner_id = (select auth.uid()) and (select private.member_can_write()));
create policy projects_owner_delete on public.projects
  for delete to authenticated
  using (owner_id = (select auth.uid()) and (select private.member_can_write()));

drop policy if exists conversations_owner_write on public.conversations;
create policy conversations_owner_insert on public.conversations
  for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and (select private.member_can_write())
    and (
      project_id is null
      or exists (
        select 1 from public.projects p
        where p.id = conversations.project_id
          and p.owner_id = (select auth.uid())
      )
    )
  );
create policy conversations_owner_update on public.conversations
  for update to authenticated
  using (owner_id = (select auth.uid()) and (select private.member_can_write()))
  with check (
    owner_id = (select auth.uid())
    and (select private.member_can_write())
    and (
      project_id is null
      or exists (
        select 1 from public.projects p
        where p.id = conversations.project_id
          and p.owner_id = (select auth.uid())
      )
    )
  );
create policy conversations_owner_delete on public.conversations
  for delete to authenticated
  using (owner_id = (select auth.uid()) and (select private.member_can_write()));
