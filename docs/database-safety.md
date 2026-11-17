# Database Safety and Operational Notes

## Current migration status

The SQL files under supabase/migrations are intended for a fresh Supabase project. They have been reviewed and guarded by static CI checks, but have not been executed against a live Supabase/PostgreSQL instance. Do not describe the database as deployed or integration-tested until the migrations and the checks below have actually run.

## Immutable ledger and deletion policy

The AI cost, contribution, and reward ledgers are append-only. Corrections must be represented by new reversal or adjustment entries; historical rows must not be edited or deleted.

Ledger foreign keys use restrictive deletion behavior where deleting a referenced request, invoice, submission, or profile would otherwise rewrite a ledger row. Such an update would violate the append-only trigger and erase the historical relationship.

Until a reviewed retention and erasure workflow exists:

- Close or suspend an account by changing its account status; do not hard-delete its profile or Auth identity through ad hoc SQL.
- Do not delete AI requests, provider invoice imports, accepted submissions, or any record referenced by a ledger.
- Keep identity/profile data separate from the pseudonymous ledger identifier where a future privacy-erasure workflow can remove or irreversibly anonymize personal fields without rewriting financial history.
- Before public launch, define retention periods, user export, account closure, legal erasure exceptions, and a tested anonymization procedure with Taiwan privacy-law review.

This is a deliberate interim restriction, not a claim that permanent retention is legally acceptable.

## Account status enforcement

Migration 0002 applies account status to the RLS boundary:

- active: may read and write their own permitted data;
- restricted: may read their own data but cannot create or modify workspace/contribution data;
- suspended or closed: cannot access member data through authenticated Data API policies.

The status-check helpers live in a non-exposed schema and are callable by authenticated users only for RLS policy evaluation. Role/status changes remain reserved for trusted server-side administration.

## Required database verification before enabling real users

Run these checks on a disposable Supabase project first:

1. Apply all four migrations in order to an empty project and confirm they complete without SQL errors.
2. Create two test users. Verify each can read and modify only their own profile/workspace.
3. Verify a user cannot assign themselves admin/reviewer, change account_status, insert assistant/system messages, or read another user's requests or ledgers.
4. Verify a user cannot attach a conversation to another user's project.
5. Configure a disposable test platform cap and per-member daily/monthly quotas; run concurrent reservation attempts and verify the global cap cannot be oversubscribed.
6. Verify released failed requests no longer consume reserved spend but still count toward daily/monthly request quotas; verify provider actual cost above the estimate is recorded and blocks later requests once the remaining cap is exhausted.
7. Verify raw provider invoice currency is kept separate from the normalized TWD amount used for budget enforcement.
8. Verify unpublished tasks are not visible to ordinary members and submissions require a published task.
9. Verify rejected submissions can be resubmitted, while a second active submission for the same task/user is rejected.
10. Verify a rejected submission can be appealed by its owner only.
11. Verify authenticated users cannot write to AI controls, AI limits, cost ledgers, contribution ledgers, reward ledgers, invoice imports, or audit logs.
12. Verify ledger UPDATE and DELETE operations fail, including attempts caused by deleting referenced records.
13. Verify restricted members can read but cannot write, and suspended/closed members cannot read or write member data.
14. Verify service-role operations are performed only in trusted server code and the service-role key is never exposed to a browser bundle.

## Important implementation boundary

The schema's AI kill switch and budget columns are configuration data only. Migration 0003 adds a database-side reservation workflow: `reserve_ai_budget` serializes global reservations with a row lock, checks whether AI is enabled plus platform and member spending controls, validates active account status, applies daily/monthly request limits, and creates the request plus reservation in one transaction. The separate `hard_stop_enabled` flag controls whether an actual monthly overrun automatically disables `ai_enabled`; it does not itself prevent otherwise-authorized requests. `finalize_ai_budget` records actual provider charges (including estimate overruns), while `release_ai_budget` releases reservations for failed requests. These functions are executable by `service_role` only; browser clients cannot call them. The reservation amount and normalized actual cost are stored in TWD for budget enforcement, while raw provider invoice amount/currency are recorded separately when available. If the provider does not expose an exact charge, those invoice fields remain null and the allocation must remain explicitly estimated.

This is a database primitive, not a complete AI gateway. The application still needs a trusted server-only orchestration route, provider adapter, timeout/retry policy, idempotency strategy, and integration tests. A provider charge above the estimate is recorded as actual cost and consumes budget for subsequent requests; it cannot be retroactively prevented. Until migrations are applied and the complete gateway is tested, keep real AI generation disabled.


## AI operational retention and uncertain-request recovery

Migration 0007 adds two service-role-only operations:

- \`cleanup_expired_ai_operational_records()\` deletes only expired \`completed\` or \`failed\` idempotency mappings and rate-limit windows untouched for more than 48 hours. It never deletes \`processing\` rows, AI requests, budget reservations, cost ledgers, reward ledgers, or contribution ledgers.
- \`list_stale_ai_requests(seconds)\` is a read-only report of queued/running AI requests whose budget reservation is still reserved and whose age exceeds the selected threshold (300–86,400 seconds; default 900 seconds).

A stale request is an incident requiring provider-side reconciliation. Do not automatically retry, settle, release, or mark it failed based only on age: the provider may have completed and billed the request even if the application did not receive its response. An operator must inspect provider request/logs and invoice evidence first.

The migration does not enable \`pg_cron\` and does not schedule a cleanup job. After a real Supabase project exists, deliberately enable Cron in the Dashboard, test the cleanup function manually, then schedule it through Supabase Cron. Supabase documents Cron as backed by \`pg_cron\` and supports scheduling database functions: https://supabase.com/docs/guides/cron.
