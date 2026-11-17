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

1. Apply both migrations to an empty project and confirm they complete without SQL errors.
2. Create two test users. Verify each can read and modify only their own profile/workspace.
3. Verify a user cannot assign themselves admin/reviewer, change account_status, insert assistant/system messages, or read another user's requests or ledgers.
4. Verify a user cannot attach a conversation to another user's project.
5. Verify unpublished tasks are not visible to ordinary members and submissions require a published task.
6. Verify rejected submissions can be resubmitted, while a second active submission for the same task/user is rejected.
7. Verify a rejected submission can be appealed by its owner only.
8. Verify authenticated users cannot write to AI controls, AI limits, cost ledgers, contribution ledgers, reward ledgers, invoice imports, or audit logs.
9. Verify ledger UPDATE and DELETE operations fail, including attempts caused by deleting referenced records.
10. Verify restricted members can read but cannot write, and suspended/closed members cannot read or write member data.
11. Verify service-role operations are performed only in trusted server code and the service-role key is never exposed to a browser bundle.

## Important implementation boundary

The schema's AI kill switch and budget columns are configuration data only. They do not enforce spend limits by themselves. A production AI gateway must atomically reserve budget, enforce global and per-user limits, record each request, reconcile provider-reported usage, and fail closed when controls are missing or exceeded. Until that gateway exists and has integration tests, keep real AI generation disabled.
