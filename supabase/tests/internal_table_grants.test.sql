begin;

select plan(175);

-- Verify default ACLs apply to objects created by the migration owner.
create table public.__default_privilege_probe (id integer);
create sequence public.__default_privilege_sequence_probe;

-- Verify the same policy for objects created by Supabase's secondary owner role.
set local role supabase_admin;
create table public.__default_privilege_admin_probe (id integer);
create sequence public.__default_privilege_admin_sequence_probe;
reset role;

select ok(not has_table_privilege('anon', 'public.__default_privilege_probe', 'SELECT'),
  'new public tables do not grant SELECT to anon');
select ok(not has_table_privilege('authenticated', 'public.__default_privilege_probe', 'SELECT'),
  'new public tables do not grant SELECT to authenticated');
select ok(not has_table_privilege('anon', 'public.__default_privilege_probe', 'INSERT'),
  'new public tables do not grant INSERT to anon');
select ok(not has_table_privilege('authenticated', 'public.__default_privilege_probe', 'INSERT'),
  'new public tables do not grant INSERT to authenticated');
select ok(not has_sequence_privilege('anon', 'public.__default_privilege_sequence_probe', 'USAGE'),
  'new public sequences do not grant USAGE to anon');
select ok(not has_sequence_privilege('authenticated', 'public.__default_privilege_sequence_probe', 'USAGE'),
  'new public sequences do not grant USAGE to authenticated');
select ok(not has_table_privilege('anon', 'public.__default_privilege_probe', 'UPDATE'),
  'new public tables do not grant UPDATE to anon');
select ok(not has_table_privilege('authenticated', 'public.__default_privilege_probe', 'UPDATE'),
  'new public tables do not grant UPDATE to authenticated');
select ok(not has_table_privilege('anon', 'public.__default_privilege_probe', 'DELETE'),
  'new public tables do not grant DELETE to anon');
select ok(not has_table_privilege('authenticated', 'public.__default_privilege_probe', 'DELETE'),
  'new public tables do not grant DELETE to authenticated');
select ok(not has_table_privilege('anon', 'public.__default_privilege_probe', 'TRUNCATE'),
  'new public tables do not grant TRUNCATE to anon');
select ok(not has_table_privilege('authenticated', 'public.__default_privilege_probe', 'TRUNCATE'),
  'new public tables do not grant TRUNCATE to authenticated');
select ok(not has_table_privilege('anon', 'public.__default_privilege_probe', 'REFERENCES'),
  'new public tables do not grant REFERENCES to anon');
select ok(not has_table_privilege('authenticated', 'public.__default_privilege_probe', 'REFERENCES'),
  'new public tables do not grant REFERENCES to authenticated');
select ok(not has_table_privilege('anon', 'public.__default_privilege_probe', 'TRIGGER'),
  'new public tables do not grant TRIGGER to anon');
select ok(not has_table_privilege('authenticated', 'public.__default_privilege_probe', 'TRIGGER'),
  'new public tables do not grant TRIGGER to authenticated');
select ok(not has_sequence_privilege('anon', 'public.__default_privilege_sequence_probe', 'SELECT'),
  'new public sequences do not grant SELECT to anon');
select ok(not has_sequence_privilege('authenticated', 'public.__default_privilege_sequence_probe', 'SELECT'),
  'new public sequences do not grant SELECT to authenticated');
select ok(not has_sequence_privilege('anon', 'public.__default_privilege_sequence_probe', 'UPDATE'),
  'new public sequences do not grant UPDATE to anon');
select ok(not has_sequence_privilege('authenticated', 'public.__default_privilege_sequence_probe', 'UPDATE'),
  'new public sequences do not grant UPDATE to authenticated');
select ok(not has_table_privilege('anon', 'public.__default_privilege_admin_probe', 'SELECT'),
  'supabase_admin-created tables do not grant SELECT to anon');
select ok(not has_table_privilege('anon', 'public.__default_privilege_admin_probe', 'INSERT'),
  'supabase_admin-created tables do not grant INSERT to anon');
select ok(not has_table_privilege('anon', 'public.__default_privilege_admin_probe', 'UPDATE'),
  'supabase_admin-created tables do not grant UPDATE to anon');
select ok(not has_table_privilege('anon', 'public.__default_privilege_admin_probe', 'DELETE'),
  'supabase_admin-created tables do not grant DELETE to anon');
select ok(not has_table_privilege('anon', 'public.__default_privilege_admin_probe', 'TRUNCATE'),
  'supabase_admin-created tables do not grant TRUNCATE to anon');
select ok(not has_table_privilege('anon', 'public.__default_privilege_admin_probe', 'REFERENCES'),
  'supabase_admin-created tables do not grant REFERENCES to anon');
select ok(not has_table_privilege('anon', 'public.__default_privilege_admin_probe', 'TRIGGER'),
  'supabase_admin-created tables do not grant TRIGGER to anon');
select ok(not has_sequence_privilege('anon', 'public.__default_privilege_admin_sequence_probe', 'USAGE'),
  'supabase_admin-created sequences do not grant USAGE to anon');
select ok(not has_sequence_privilege('anon', 'public.__default_privilege_admin_sequence_probe', 'SELECT'),
  'supabase_admin-created sequences do not grant SELECT to anon');
select ok(not has_sequence_privilege('anon', 'public.__default_privilege_admin_sequence_probe', 'UPDATE'),
  'supabase_admin-created sequences do not grant UPDATE to anon');
select ok(not has_table_privilege('authenticated', 'public.__default_privilege_admin_probe', 'SELECT'),
  'supabase_admin-created tables do not grant SELECT to authenticated');
select ok(not has_table_privilege('authenticated', 'public.__default_privilege_admin_probe', 'INSERT'),
  'supabase_admin-created tables do not grant INSERT to authenticated');
select ok(not has_table_privilege('authenticated', 'public.__default_privilege_admin_probe', 'UPDATE'),
  'supabase_admin-created tables do not grant UPDATE to authenticated');
select ok(not has_table_privilege('authenticated', 'public.__default_privilege_admin_probe', 'DELETE'),
  'supabase_admin-created tables do not grant DELETE to authenticated');
select ok(not has_table_privilege('authenticated', 'public.__default_privilege_admin_probe', 'TRUNCATE'),
  'supabase_admin-created tables do not grant TRUNCATE to authenticated');
select ok(not has_table_privilege('authenticated', 'public.__default_privilege_admin_probe', 'REFERENCES'),
  'supabase_admin-created tables do not grant REFERENCES to authenticated');
select ok(not has_table_privilege('authenticated', 'public.__default_privilege_admin_probe', 'TRIGGER'),
  'supabase_admin-created tables do not grant TRIGGER to authenticated');
select ok(not has_sequence_privilege('authenticated', 'public.__default_privilege_admin_sequence_probe', 'USAGE'),
  'supabase_admin-created sequences do not grant USAGE to authenticated');
select ok(not has_sequence_privilege('authenticated', 'public.__default_privilege_admin_sequence_probe', 'SELECT'),
  'supabase_admin-created sequences do not grant SELECT to authenticated');
select ok(not has_sequence_privilege('authenticated', 'public.__default_privilege_admin_sequence_probe', 'UPDATE'),
  'supabase_admin-created sequences do not grant UPDATE to authenticated');

-- These operational tables intentionally have no client-facing RLS policies.
-- Assert RLS remains enabled and no table-level privilege is granted to client roles.
select ok((select relrowsecurity from pg_class where oid = 'public.ai_budget_reservations'::regclass), 'RLS enabled on ai_budget_reservations');
select ok((select relrowsecurity from pg_class where oid = 'public.ai_reconciliation_events'::regclass), 'RLS enabled on ai_reconciliation_events');
select ok((select relrowsecurity from pg_class where oid = 'public.ai_request_idempotency'::regclass), 'RLS enabled on ai_request_idempotency');
select ok((select relrowsecurity from pg_class where oid = 'public.ai_request_rate_limits'::regclass), 'RLS enabled on ai_request_rate_limits');
select ok((select relrowsecurity from pg_class where oid = 'public.audit_logs'::regclass), 'RLS enabled on audit_logs');
select ok((select relrowsecurity from pg_class where oid = 'public.platform_ai_controls'::regclass), 'RLS enabled on platform_ai_controls');
select ok((select relrowsecurity from pg_class where oid = 'public.provider_invoice_imports'::regclass), 'RLS enabled on provider_invoice_imports');
select ok((select relrowsecurity from pg_class where oid = 'public.task_appeal_review_idempotency'::regclass), 'RLS enabled on task_appeal_review_idempotency');
select ok((select relrowsecurity from pg_class where oid = 'public.task_review_idempotency'::regclass), 'RLS enabled on task_review_idempotency');
select ok(not has_table_privilege('anon', 'public.ai_budget_reservations', 'SELECT'), 'anon lacks SELECT on ai_budget_reservations');
select ok(not has_table_privilege('anon', 'public.ai_budget_reservations', 'INSERT'), 'anon lacks INSERT on ai_budget_reservations');
select ok(not has_table_privilege('anon', 'public.ai_budget_reservations', 'UPDATE'), 'anon lacks UPDATE on ai_budget_reservations');
select ok(not has_table_privilege('anon', 'public.ai_budget_reservations', 'DELETE'), 'anon lacks DELETE on ai_budget_reservations');
select ok(not has_table_privilege('anon', 'public.ai_budget_reservations', 'TRUNCATE'), 'anon lacks TRUNCATE on ai_budget_reservations');
select ok(not has_table_privilege('anon', 'public.ai_budget_reservations', 'REFERENCES'), 'anon lacks REFERENCES on ai_budget_reservations');
select ok(not has_table_privilege('anon', 'public.ai_budget_reservations', 'TRIGGER'), 'anon lacks TRIGGER on ai_budget_reservations');
select ok(not has_table_privilege('authenticated', 'public.ai_budget_reservations', 'SELECT'), 'authenticated lacks SELECT on ai_budget_reservations');
select ok(not has_table_privilege('authenticated', 'public.ai_budget_reservations', 'INSERT'), 'authenticated lacks INSERT on ai_budget_reservations');
select ok(not has_table_privilege('authenticated', 'public.ai_budget_reservations', 'UPDATE'), 'authenticated lacks UPDATE on ai_budget_reservations');
select ok(not has_table_privilege('authenticated', 'public.ai_budget_reservations', 'DELETE'), 'authenticated lacks DELETE on ai_budget_reservations');
select ok(not has_table_privilege('authenticated', 'public.ai_budget_reservations', 'TRUNCATE'), 'authenticated lacks TRUNCATE on ai_budget_reservations');
select ok(not has_table_privilege('authenticated', 'public.ai_budget_reservations', 'REFERENCES'), 'authenticated lacks REFERENCES on ai_budget_reservations');
select ok(not has_table_privilege('authenticated', 'public.ai_budget_reservations', 'TRIGGER'), 'authenticated lacks TRIGGER on ai_budget_reservations');
select ok(not has_table_privilege('anon', 'public.ai_reconciliation_events', 'SELECT'), 'anon lacks SELECT on ai_reconciliation_events');
select ok(not has_table_privilege('anon', 'public.ai_reconciliation_events', 'INSERT'), 'anon lacks INSERT on ai_reconciliation_events');
select ok(not has_table_privilege('anon', 'public.ai_reconciliation_events', 'UPDATE'), 'anon lacks UPDATE on ai_reconciliation_events');
select ok(not has_table_privilege('anon', 'public.ai_reconciliation_events', 'DELETE'), 'anon lacks DELETE on ai_reconciliation_events');
select ok(not has_table_privilege('anon', 'public.ai_reconciliation_events', 'TRUNCATE'), 'anon lacks TRUNCATE on ai_reconciliation_events');
select ok(not has_table_privilege('anon', 'public.ai_reconciliation_events', 'REFERENCES'), 'anon lacks REFERENCES on ai_reconciliation_events');
select ok(not has_table_privilege('anon', 'public.ai_reconciliation_events', 'TRIGGER'), 'anon lacks TRIGGER on ai_reconciliation_events');
select ok(not has_table_privilege('authenticated', 'public.ai_reconciliation_events', 'SELECT'), 'authenticated lacks SELECT on ai_reconciliation_events');
select ok(not has_table_privilege('authenticated', 'public.ai_reconciliation_events', 'INSERT'), 'authenticated lacks INSERT on ai_reconciliation_events');
select ok(not has_table_privilege('authenticated', 'public.ai_reconciliation_events', 'UPDATE'), 'authenticated lacks UPDATE on ai_reconciliation_events');
select ok(not has_table_privilege('authenticated', 'public.ai_reconciliation_events', 'DELETE'), 'authenticated lacks DELETE on ai_reconciliation_events');
select ok(not has_table_privilege('authenticated', 'public.ai_reconciliation_events', 'TRUNCATE'), 'authenticated lacks TRUNCATE on ai_reconciliation_events');
select ok(not has_table_privilege('authenticated', 'public.ai_reconciliation_events', 'REFERENCES'), 'authenticated lacks REFERENCES on ai_reconciliation_events');
select ok(not has_table_privilege('authenticated', 'public.ai_reconciliation_events', 'TRIGGER'), 'authenticated lacks TRIGGER on ai_reconciliation_events');
select ok(not has_table_privilege('anon', 'public.ai_request_idempotency', 'SELECT'), 'anon lacks SELECT on ai_request_idempotency');
select ok(not has_table_privilege('anon', 'public.ai_request_idempotency', 'INSERT'), 'anon lacks INSERT on ai_request_idempotency');
select ok(not has_table_privilege('anon', 'public.ai_request_idempotency', 'UPDATE'), 'anon lacks UPDATE on ai_request_idempotency');
select ok(not has_table_privilege('anon', 'public.ai_request_idempotency', 'DELETE'), 'anon lacks DELETE on ai_request_idempotency');
select ok(not has_table_privilege('anon', 'public.ai_request_idempotency', 'TRUNCATE'), 'anon lacks TRUNCATE on ai_request_idempotency');
select ok(not has_table_privilege('anon', 'public.ai_request_idempotency', 'REFERENCES'), 'anon lacks REFERENCES on ai_request_idempotency');
select ok(not has_table_privilege('anon', 'public.ai_request_idempotency', 'TRIGGER'), 'anon lacks TRIGGER on ai_request_idempotency');
select ok(not has_table_privilege('authenticated', 'public.ai_request_idempotency', 'SELECT'), 'authenticated lacks SELECT on ai_request_idempotency');
select ok(not has_table_privilege('authenticated', 'public.ai_request_idempotency', 'INSERT'), 'authenticated lacks INSERT on ai_request_idempotency');
select ok(not has_table_privilege('authenticated', 'public.ai_request_idempotency', 'UPDATE'), 'authenticated lacks UPDATE on ai_request_idempotency');
select ok(not has_table_privilege('authenticated', 'public.ai_request_idempotency', 'DELETE'), 'authenticated lacks DELETE on ai_request_idempotency');
select ok(not has_table_privilege('authenticated', 'public.ai_request_idempotency', 'TRUNCATE'), 'authenticated lacks TRUNCATE on ai_request_idempotency');
select ok(not has_table_privilege('authenticated', 'public.ai_request_idempotency', 'REFERENCES'), 'authenticated lacks REFERENCES on ai_request_idempotency');
select ok(not has_table_privilege('authenticated', 'public.ai_request_idempotency', 'TRIGGER'), 'authenticated lacks TRIGGER on ai_request_idempotency');
select ok(not has_table_privilege('anon', 'public.ai_request_rate_limits', 'SELECT'), 'anon lacks SELECT on ai_request_rate_limits');
select ok(not has_table_privilege('anon', 'public.ai_request_rate_limits', 'INSERT'), 'anon lacks INSERT on ai_request_rate_limits');
select ok(not has_table_privilege('anon', 'public.ai_request_rate_limits', 'UPDATE'), 'anon lacks UPDATE on ai_request_rate_limits');
select ok(not has_table_privilege('anon', 'public.ai_request_rate_limits', 'DELETE'), 'anon lacks DELETE on ai_request_rate_limits');
select ok(not has_table_privilege('anon', 'public.ai_request_rate_limits', 'TRUNCATE'), 'anon lacks TRUNCATE on ai_request_rate_limits');
select ok(not has_table_privilege('anon', 'public.ai_request_rate_limits', 'REFERENCES'), 'anon lacks REFERENCES on ai_request_rate_limits');
select ok(not has_table_privilege('anon', 'public.ai_request_rate_limits', 'TRIGGER'), 'anon lacks TRIGGER on ai_request_rate_limits');
select ok(not has_table_privilege('authenticated', 'public.ai_request_rate_limits', 'SELECT'), 'authenticated lacks SELECT on ai_request_rate_limits');
select ok(not has_table_privilege('authenticated', 'public.ai_request_rate_limits', 'INSERT'), 'authenticated lacks INSERT on ai_request_rate_limits');
select ok(not has_table_privilege('authenticated', 'public.ai_request_rate_limits', 'UPDATE'), 'authenticated lacks UPDATE on ai_request_rate_limits');
select ok(not has_table_privilege('authenticated', 'public.ai_request_rate_limits', 'DELETE'), 'authenticated lacks DELETE on ai_request_rate_limits');
select ok(not has_table_privilege('authenticated', 'public.ai_request_rate_limits', 'TRUNCATE'), 'authenticated lacks TRUNCATE on ai_request_rate_limits');
select ok(not has_table_privilege('authenticated', 'public.ai_request_rate_limits', 'REFERENCES'), 'authenticated lacks REFERENCES on ai_request_rate_limits');
select ok(not has_table_privilege('authenticated', 'public.ai_request_rate_limits', 'TRIGGER'), 'authenticated lacks TRIGGER on ai_request_rate_limits');
select ok(not has_table_privilege('anon', 'public.audit_logs', 'SELECT'), 'anon lacks SELECT on audit_logs');
select ok(not has_table_privilege('anon', 'public.audit_logs', 'INSERT'), 'anon lacks INSERT on audit_logs');
select ok(not has_table_privilege('anon', 'public.audit_logs', 'UPDATE'), 'anon lacks UPDATE on audit_logs');
select ok(not has_table_privilege('anon', 'public.audit_logs', 'DELETE'), 'anon lacks DELETE on audit_logs');
select ok(not has_table_privilege('anon', 'public.audit_logs', 'TRUNCATE'), 'anon lacks TRUNCATE on audit_logs');
select ok(not has_table_privilege('anon', 'public.audit_logs', 'REFERENCES'), 'anon lacks REFERENCES on audit_logs');
select ok(not has_table_privilege('anon', 'public.audit_logs', 'TRIGGER'), 'anon lacks TRIGGER on audit_logs');
select ok(not has_table_privilege('authenticated', 'public.audit_logs', 'SELECT'), 'authenticated lacks SELECT on audit_logs');
select ok(not has_table_privilege('authenticated', 'public.audit_logs', 'INSERT'), 'authenticated lacks INSERT on audit_logs');
select ok(not has_table_privilege('authenticated', 'public.audit_logs', 'UPDATE'), 'authenticated lacks UPDATE on audit_logs');
select ok(not has_table_privilege('authenticated', 'public.audit_logs', 'DELETE'), 'authenticated lacks DELETE on audit_logs');
select ok(not has_table_privilege('authenticated', 'public.audit_logs', 'TRUNCATE'), 'authenticated lacks TRUNCATE on audit_logs');
select ok(not has_table_privilege('authenticated', 'public.audit_logs', 'REFERENCES'), 'authenticated lacks REFERENCES on audit_logs');
select ok(not has_table_privilege('authenticated', 'public.audit_logs', 'TRIGGER'), 'authenticated lacks TRIGGER on audit_logs');
select ok(not has_table_privilege('anon', 'public.platform_ai_controls', 'SELECT'), 'anon lacks SELECT on platform_ai_controls');
select ok(not has_table_privilege('anon', 'public.platform_ai_controls', 'INSERT'), 'anon lacks INSERT on platform_ai_controls');
select ok(not has_table_privilege('anon', 'public.platform_ai_controls', 'UPDATE'), 'anon lacks UPDATE on platform_ai_controls');
select ok(not has_table_privilege('anon', 'public.platform_ai_controls', 'DELETE'), 'anon lacks DELETE on platform_ai_controls');
select ok(not has_table_privilege('anon', 'public.platform_ai_controls', 'TRUNCATE'), 'anon lacks TRUNCATE on platform_ai_controls');
select ok(not has_table_privilege('anon', 'public.platform_ai_controls', 'REFERENCES'), 'anon lacks REFERENCES on platform_ai_controls');
select ok(not has_table_privilege('anon', 'public.platform_ai_controls', 'TRIGGER'), 'anon lacks TRIGGER on platform_ai_controls');
select ok(not has_table_privilege('authenticated', 'public.platform_ai_controls', 'SELECT'), 'authenticated lacks SELECT on platform_ai_controls');
select ok(not has_table_privilege('authenticated', 'public.platform_ai_controls', 'INSERT'), 'authenticated lacks INSERT on platform_ai_controls');
select ok(not has_table_privilege('authenticated', 'public.platform_ai_controls', 'UPDATE'), 'authenticated lacks UPDATE on platform_ai_controls');
select ok(not has_table_privilege('authenticated', 'public.platform_ai_controls', 'DELETE'), 'authenticated lacks DELETE on platform_ai_controls');
select ok(not has_table_privilege('authenticated', 'public.platform_ai_controls', 'TRUNCATE'), 'authenticated lacks TRUNCATE on platform_ai_controls');
select ok(not has_table_privilege('authenticated', 'public.platform_ai_controls', 'REFERENCES'), 'authenticated lacks REFERENCES on platform_ai_controls');
select ok(not has_table_privilege('authenticated', 'public.platform_ai_controls', 'TRIGGER'), 'authenticated lacks TRIGGER on platform_ai_controls');
select ok(not has_table_privilege('anon', 'public.provider_invoice_imports', 'SELECT'), 'anon lacks SELECT on provider_invoice_imports');
select ok(not has_table_privilege('anon', 'public.provider_invoice_imports', 'INSERT'), 'anon lacks INSERT on provider_invoice_imports');
select ok(not has_table_privilege('anon', 'public.provider_invoice_imports', 'UPDATE'), 'anon lacks UPDATE on provider_invoice_imports');
select ok(not has_table_privilege('anon', 'public.provider_invoice_imports', 'DELETE'), 'anon lacks DELETE on provider_invoice_imports');
select ok(not has_table_privilege('anon', 'public.provider_invoice_imports', 'TRUNCATE'), 'anon lacks TRUNCATE on provider_invoice_imports');
select ok(not has_table_privilege('anon', 'public.provider_invoice_imports', 'REFERENCES'), 'anon lacks REFERENCES on provider_invoice_imports');
select ok(not has_table_privilege('anon', 'public.provider_invoice_imports', 'TRIGGER'), 'anon lacks TRIGGER on provider_invoice_imports');
select ok(not has_table_privilege('authenticated', 'public.provider_invoice_imports', 'SELECT'), 'authenticated lacks SELECT on provider_invoice_imports');
select ok(not has_table_privilege('authenticated', 'public.provider_invoice_imports', 'INSERT'), 'authenticated lacks INSERT on provider_invoice_imports');
select ok(not has_table_privilege('authenticated', 'public.provider_invoice_imports', 'UPDATE'), 'authenticated lacks UPDATE on provider_invoice_imports');
select ok(not has_table_privilege('authenticated', 'public.provider_invoice_imports', 'DELETE'), 'authenticated lacks DELETE on provider_invoice_imports');
select ok(not has_table_privilege('authenticated', 'public.provider_invoice_imports', 'TRUNCATE'), 'authenticated lacks TRUNCATE on provider_invoice_imports');
select ok(not has_table_privilege('authenticated', 'public.provider_invoice_imports', 'REFERENCES'), 'authenticated lacks REFERENCES on provider_invoice_imports');
select ok(not has_table_privilege('authenticated', 'public.provider_invoice_imports', 'TRIGGER'), 'authenticated lacks TRIGGER on provider_invoice_imports');
select ok(not has_table_privilege('anon', 'public.task_appeal_review_idempotency', 'SELECT'), 'anon lacks SELECT on task_appeal_review_idempotency');
select ok(not has_table_privilege('anon', 'public.task_appeal_review_idempotency', 'INSERT'), 'anon lacks INSERT on task_appeal_review_idempotency');
select ok(not has_table_privilege('anon', 'public.task_appeal_review_idempotency', 'UPDATE'), 'anon lacks UPDATE on task_appeal_review_idempotency');
select ok(not has_table_privilege('anon', 'public.task_appeal_review_idempotency', 'DELETE'), 'anon lacks DELETE on task_appeal_review_idempotency');
select ok(not has_table_privilege('anon', 'public.task_appeal_review_idempotency', 'TRUNCATE'), 'anon lacks TRUNCATE on task_appeal_review_idempotency');
select ok(not has_table_privilege('anon', 'public.task_appeal_review_idempotency', 'REFERENCES'), 'anon lacks REFERENCES on task_appeal_review_idempotency');
select ok(not has_table_privilege('anon', 'public.task_appeal_review_idempotency', 'TRIGGER'), 'anon lacks TRIGGER on task_appeal_review_idempotency');
select ok(not has_table_privilege('authenticated', 'public.task_appeal_review_idempotency', 'SELECT'), 'authenticated lacks SELECT on task_appeal_review_idempotency');
select ok(not has_table_privilege('authenticated', 'public.task_appeal_review_idempotency', 'INSERT'), 'authenticated lacks INSERT on task_appeal_review_idempotency');
select ok(not has_table_privilege('authenticated', 'public.task_appeal_review_idempotency', 'UPDATE'), 'authenticated lacks UPDATE on task_appeal_review_idempotency');
select ok(not has_table_privilege('authenticated', 'public.task_appeal_review_idempotency', 'DELETE'), 'authenticated lacks DELETE on task_appeal_review_idempotency');
select ok(not has_table_privilege('authenticated', 'public.task_appeal_review_idempotency', 'TRUNCATE'), 'authenticated lacks TRUNCATE on task_appeal_review_idempotency');
select ok(not has_table_privilege('authenticated', 'public.task_appeal_review_idempotency', 'REFERENCES'), 'authenticated lacks REFERENCES on task_appeal_review_idempotency');
select ok(not has_table_privilege('authenticated', 'public.task_appeal_review_idempotency', 'TRIGGER'), 'authenticated lacks TRIGGER on task_appeal_review_idempotency');
select ok(not has_table_privilege('anon', 'public.task_review_idempotency', 'SELECT'), 'anon lacks SELECT on task_review_idempotency');
select ok(not has_table_privilege('anon', 'public.task_review_idempotency', 'INSERT'), 'anon lacks INSERT on task_review_idempotency');
select ok(not has_table_privilege('anon', 'public.task_review_idempotency', 'UPDATE'), 'anon lacks UPDATE on task_review_idempotency');
select ok(not has_table_privilege('anon', 'public.task_review_idempotency', 'DELETE'), 'anon lacks DELETE on task_review_idempotency');
select ok(not has_table_privilege('anon', 'public.task_review_idempotency', 'TRUNCATE'), 'anon lacks TRUNCATE on task_review_idempotency');
select ok(not has_table_privilege('anon', 'public.task_review_idempotency', 'REFERENCES'), 'anon lacks REFERENCES on task_review_idempotency');
select ok(not has_table_privilege('anon', 'public.task_review_idempotency', 'TRIGGER'), 'anon lacks TRIGGER on task_review_idempotency');
select ok(not has_table_privilege('authenticated', 'public.task_review_idempotency', 'SELECT'), 'authenticated lacks SELECT on task_review_idempotency');
select ok(not has_table_privilege('authenticated', 'public.task_review_idempotency', 'INSERT'), 'authenticated lacks INSERT on task_review_idempotency');
select ok(not has_table_privilege('authenticated', 'public.task_review_idempotency', 'UPDATE'), 'authenticated lacks UPDATE on task_review_idempotency');
select ok(not has_table_privilege('authenticated', 'public.task_review_idempotency', 'DELETE'), 'authenticated lacks DELETE on task_review_idempotency');
select ok(not has_table_privilege('authenticated', 'public.task_review_idempotency', 'TRUNCATE'), 'authenticated lacks TRUNCATE on task_review_idempotency');
select ok(not has_table_privilege('authenticated', 'public.task_review_idempotency', 'REFERENCES'), 'authenticated lacks REFERENCES on task_review_idempotency');
select ok(not has_table_privilege('authenticated', 'public.task_review_idempotency', 'TRIGGER'), 'authenticated lacks TRIGGER on task_review_idempotency');

select * from finish();
rollback;
