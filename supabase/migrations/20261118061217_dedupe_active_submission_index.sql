-- Keep one canonical active-submission unique index.
-- The live project already had task_submissions_one_active_per_user with the same
-- key and predicate; migration 0023 introduced an equivalent index under a new name.
-- This migration converges fresh and existing databases to the original index.

drop index if exists public.task_submissions_one_active_per_task_contributor_idx;

create unique index if not exists task_submissions_one_active_per_user
  on public.task_submissions (task_id, contributor_id)
  where status in ('submitted', 'under_review', 'accepted', 'appealed');

comment on index public.task_submissions_one_active_per_user is
  'Allows at most one submitted, under-review, accepted, or appealed submission per member and task; rejected submissions may be resubmitted after any appeal is closed.';
