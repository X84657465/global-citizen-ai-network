-- Defense in depth: RLS remains the row-level boundary, while SQL grants
-- restrict which API roles can attempt operations at all.
--
-- The application uses the authenticated role only for member-scoped reads,
-- project/conversation CRUD, profile edits, and user submissions. Privileged
-- administration, billing, reconciliation, and ledger writes use trusted
-- server-side operations and service_role.
--
-- No anonymous browser route requires direct access to public-schema tables.

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

-- Member profile: users can read and update their own profile. Triggers and RLS
-- prevent role/status escalation and constrain mutable columns.
grant select, update on table public.profiles to authenticated;

-- Workspace resources: ownership is enforced by RLS and ownership triggers.
grant select, insert, update, delete on table public.projects to authenticated;
grant select, insert, update, delete on table public.conversations to authenticated;

-- Members can append only their own user messages; assistant/system messages
-- are written by trusted server-side orchestration.
grant select, insert on table public.messages to authenticated;

-- Member-facing AI usage and cost transparency is read-only.
grant select on table public.ai_requests to authenticated;
grant select on table public.ai_cost_ledger to authenticated;
grant select on table public.ai_user_limits to authenticated;

-- Contribution task discovery and member submission are constrained by RLS.
grant select on table public.contribution_tasks to authenticated;
grant select, insert on table public.task_submissions to authenticated;
grant select on table public.task_reviews to authenticated;
grant select, insert on table public.task_appeals to authenticated;
grant select on table public.contribution_ledger to authenticated;
grant select on table public.reward_ledger to authenticated;

-- All internal controls, reservations, idempotency, reconciliation evidence,
-- invoice imports, audit logs, and review idempotency tables remain inaccessible
-- to anon/authenticated. Trusted service_role grants are intentionally retained.

-- Future application migrations run as postgres. Remove Supabase's permissive
-- default table/sequence grants so a new public table is not accidentally
-- exposed to anon/authenticated before its RLS and explicit grants are reviewed.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

