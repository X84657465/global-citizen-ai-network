begin;
select plan(3);
select ok(
  (select count(*) = 17 from pg_indexes where schemaname='public' and indexname = any(array[
    'ai_cost_ledger_owner_id_idx','ai_reconciliation_events_actor_id_idx',
    'ai_requests_conversation_id_idx','ai_requests_project_id_idx','audit_logs_actor_id_idx',
    'contribution_ledger_submission_id_idx','contribution_tasks_created_by_idx',
    'conversations_project_id_idx','messages_owner_id_idx','platform_ai_controls_updated_by_idx',
    'provider_invoice_imports_imported_by_idx','reward_ledger_created_by_idx',
    'reward_ledger_reversal_of_idx','reward_ledger_submission_id_idx',
    'task_appeal_review_idempotency_created_by_idx','task_review_idempotency_created_by_idx',
    'task_reviews_reviewer_id_idx'
  ])),
  'all 17 missing foreign-key covering indexes are created'
);
select ok(
  (select count(*)=1 from pg_policies where schemaname='public' and tablename='projects' and cmd='SELECT' and roles @> array['authenticated']::name[])
  and
  (select count(*)=1 from pg_policies where schemaname='public' and tablename='conversations' and cmd='SELECT' and roles @> array['authenticated']::name[]),
  'projects and conversations each have exactly one authenticated SELECT policy'
);
select ok(
  (select count(*)=3 from pg_policies where schemaname='public' and tablename='projects' and cmd in ('INSERT','UPDATE','DELETE') and roles @> array['authenticated']::name[])
  and
  (select count(*)=3 from pg_policies where schemaname='public' and tablename='conversations' and cmd in ('INSERT','UPDATE','DELETE') and roles @> array['authenticated']::name[]),
  'projects and conversations retain distinct INSERT, UPDATE, and DELETE policies'
);
select * from finish();
rollback;
