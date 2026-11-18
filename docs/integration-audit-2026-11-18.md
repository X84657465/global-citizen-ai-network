# Integration audit — 2026-11-18

## Scope

Read-only inspection of the linked Supabase project, GitHub repository, and Vercel project. No production database writes, environment-variable reads, secret changes, or deployment mutations were performed.

## Observed environment

- GitHub repository: `X84657465/global-citizen-ai-network`
- Audit branch: `work/integration-audit`, created from `main`
- Supabase project: `global-citizen-ai-network` (`rtkpdafkpncoluhdihlv`), region `ap-northeast-1`
- Supabase status: `ACTIVE_HEALTHY`
- Vercel project: `global-citizen-ai-network`
- Latest observed production deployment: `READY`, sourced from `main` at commit `032efc7b6158de84370fbda0159f57fdd2cd0e67`

## Database observations

The migration history reports 18 applied versions, from `initial_schema` through `service_role_ai_reconciliation`. Relevant later entries include:

- `atomic_ai_chat_completion_and_reconciliation`
- `bound_ai_reconciliation_queue`
- `single_unresolved_ai_request_per_member`
- `audited_ai_reconciliation_resolution`
- `conversation_project_ownership`
- `conversation_project_locking`
- `service_role_ai_reconciliation`

The public schema exposes 19 RLS policies in the audit query. The observed AI request and profile tables currently contain zero rows. The platform AI control row currently has `ai_enabled = false`, `hard_stop_enabled = true`, and both spend caps set to zero. AI provider calls should therefore remain unavailable; this is the safe default.

The inspected RPC definitions validate finite monetary values, bind requests to the originating member-owned conversation, enforce one unresolved request per member, and make reconciliation service-role-only with an active-admin check inside the database function. These are static observations of deployed definitions, not proof that all adversarial cases pass.


## Additional security-advisor finding

A Supabase security-advisor pass returned nine `rls_enabled_no_policy` informational findings. A full public-schema inventory confirms all nine affected tables have RLS enabled and zero policies. The no-policy state blocks row access through ordinary client roles, but it does not replace least-privilege table grants. Exact role-grant inspection found unnecessary privileges for both `anon` and `authenticated` only on `audit_logs`, `platform_ai_controls`, and `provider_invoice_imports`; the other six no-policy internal tables had no such client-role grants in the inspected result. The extra grants are avoidable attack surface and are addressed by a reviewed migration. No production grants were changed during this audit.

The security advisor output should not be treated as a pass until the reviewed migration is applied and the post-migration assertion passes. The follow-up grant query confirmed all seven table privileges were granted to both `anon` and `authenticated` on each of the three affected tables; `postgres` and `service_role` grants are deliberately preserved. A performance-advisor pass also reported 17 unindexed foreign keys and 2 multiple-permissive-policy warnings; index changes are deferred until query patterns and workload justify them, rather than adding speculative indexes.

## Application observations

The current `main` branch contains the Next.js AI chat route at `app/api/ai/chat/route.ts`. It authenticates the member, verifies conversation access, requires a server-side service-role key, validates an idempotency key, calculates a finite preflight estimate, claims the request through `claim_ai_request`, and finalizes through `complete_ai_chat_request`. Unknown provider outcomes are routed to manual reconciliation rather than automatically retried.

The latest production deployment is marked `READY`; that status alone does not prove the complete user journey works. The Vercel project metadata also reports `live: false`, which should be clarified before any public launch decision.

## Work completed on this branch

- Created `work/integration-audit` from `main`.
- Updated `docs/database-safety.md` so its migration status no longer incorrectly claims that the linked database has never had migrations applied.
- Added this evidence-based audit record.
- Added timestamped migration `20261118005042_revoke_client_access_to_internal_tables.sql` and a read-only post-migration assertion at `supabase/tests/internal_table_grants.test.sql`, covering all nine internal tables. These are committed to the review branch only; they have not been applied to the linked Supabase project.

## Blocking verification before enabling AI or public launch

1. Run the repository's lint, unit, and production build checks from a clean checkout.
2. Run the database migration replay on a disposable Supabase project, not the linked environment; confirm the timestamped migration ordering.
3. Add automated integration tests for RLS isolation, cross-member conversation access, role escalation, idempotency replay/conflict, cross-conversation unresolved-request locking, and concurrent budget reservations.
4. Test known provider rejection, timeout/unknown outcome, partial usage, malformed provider payload, completion RPC failure, and reconciliation decisions.
5. Verify the admin reconciliation API requires an authenticated active admin and that the service-role secret never reaches client bundles or logs.
6. Confirm Vercel environment configuration without exposing secret values; test login, workspace, contribution, admin, and health routes.
7. Confirm the Vercel `live` state, SSO/custom-domain exposure, and intended launch access policy.
8. Keep global AI disabled until all required tests pass and spend limits are deliberately configured.

## Safety boundary

This branch contains documentation, tests, and a reviewed timestamped SQL migration. The migration has NOT been applied to the linked Supabase project. No production grants, schema, data, secrets, or AI controls were changed, and no production deployment was triggered. Vercel Preview builds may run automatically from the review branch.


## Follow-up: AI request validation and performance evidence

- Extracted the AI Chat `Idempotency-Key` format/length check into `lib/ai/idempotency.ts`; the route now calls the shared validator and `tests/ai-idempotency.test.ts` covers null/undefined, min/max lengths, whitespace, disallowed characters, and accepted punctuation. The test is included in `npm run test:unit`.
- A fresh read-only FK/index comparison confirmed the advisor's 17 unindexed-FK findings. Examples include `ai_cost_ledger.owner_id`, `ai_reconciliation_events.actor_id`, `ai_requests.conversation_id`, `ai_requests.project_id`, `messages.owner_id`, `reward_ledger.created_by`, and `task_reviews.reviewer_id`. No index migration is proposed yet: the advisor simultaneously reports 19 unused indexes, so adding/removing indexes without workload, query-plan, and retention analysis would be speculative.
- The CI run associated with the prior head has completed unit tests, TypeScript type check, and lint successfully; production build and local Supabase migration replay / pgTAP are still running. The subsequent idempotency-helper commits require their own CI run before merge.


## Follow-up: latest-head validation and request hardening

- GitHub Actions CI run #533 validated exact commit `d897a254cb21fe18f4b13115eb904fb7e30c49cd`: build and database jobs succeeded, including unit tests, typecheck, lint, production build, disposable local Supabase migration replay, and `supabase test db`.
- The Vercel Preview for that exact commit reached `READY`; this is a Preview deployment, not a production release.
- Read-only inspection of the linked database confirmed the four AI request lifecycle RPCs (`claim_ai_request`, `complete_ai_chat_request`, `fail_ai_chat_request`, and `mark_ai_request_reconciliation_required`) are SECURITY DEFINER with an empty search_path, executable by `service_role`, and not executable by `anon` or `authenticated`.
- Fixed an input-normalization inconsistency in the AI Chat route: the raw `Idempotency-Key` header is now validated without trimming, so whitespace-padded values are rejected consistently with the shared validator's contract.
- Expanded provider-response unit coverage for malformed Content-Length, empty bodies, invalid UTF-8, malformed usage details, empty answers, and oversized provider request IDs.
- Added `supabase/tests/ai_request_rpc_security.test.sql` with 12 pgTAP assertions covering SECURITY DEFINER, empty search_path, and least-privilege EXECUTE grants for the four lifecycle RPCs. This test has been committed to the review branch and awaits a fresh CI run.
- The new route/test/SQL changes are committed to `work/integration-audit`; no linked production database writes, production migrations, paid provider calls, or production deployment were performed.

- Added `supabase/tests/conversation_project_policy_semantics.test.sql` with eight pgTAP assertions to lock the intended owner-scoped SELECT versus active-member write distinction for conversations/projects, including project ownership checks on conversation writes. This protects the rationale for retaining the two advisor overlap warnings without weakening RLS semantics.


## Follow-up: bounded HTTP JSON body validation

- Added `tests/http-read-json-body.test.ts` with six regression cases for valid JSON, malformed/fractional/negative/unsafe Content-Length, declared oversize bodies, streamed oversize bodies without Content-Length, invalid UTF-8, malformed JSON, and absent bodies.
- Added the HTTP body parser suite to `npm run test:unit`; the tests run without credentials or external services.
- GitHub Actions run #540 was triggered for exact head `0f8b8a6a4bc03bb5d6228b14915b6018bcdf43b0`. Results are pending; do not treat the tests as CI-verified until that run completes.
- This work changes only the review branch. No linked production database, provider settings, or production deployment was modified.


## Follow-up: administrator reconciliation input validation

- Extracted reconciliation request validation into `lib/ai/reconciliation-input.ts`, keeping the route's authenticated active-admin check and privileged RPC boundary intact.
- Added `tests/ai-reconciliation-input.test.ts` covering identifier/decision/evidence validation, billed-cost bounds, ISO currency format, and rejection of cost metadata for non-billed decisions.
- Added the new suite to `npm run test:unit`.
- CI run #542 was observed for an intermediate commit; the latest PR head has advanced since then and requires its own completed CI run before validation can be claimed.
- No production database, secrets, provider settings, or production deployment were changed.

## Follow-up: reconciliation and streamed-request CI fixes
- The exact-head CI #544 exposed two test defects: the billed-cost upper-bound assertion exercised a floating-point boundary that was rounded to the same IEEE-754 number, and the streamed Request fixture did not reliably apply Node/Undici's required duplex: half option.
- Tightened reconciliation parsing with a typed decision guard and a finite exclusive numeric upper bound (cost < 10,000,000,000). Added a regression case above the boundary.
- Updated the streamed Request test fixture to always set duplex: half and explicitly type the Node-specific RequestInit extension.
- Vercel build logs for commit 84c1eda independently confirmed a TypeScript error where an unknown decision was returned as ReconciliationDecision; this was fixed by the type guard in commit 848fde3. A later Preview for commit 8e3ab4b reached READY, confirming that particular compile failure is resolved.
- Current review head: 472512a2c60334c7028bfbc5da992c480e4feb7f. GitHub Actions run #547 is queued for this exact head; no CI pass is claimed yet. The newest Vercel Preview for this head is also queued at last check.
- Previous CI #545 and #546 were cancelled by newer pushes; their partial states are not treated as validation.
- No linked production Supabase changes were made. AI remains disabled with hard-stop enabled; PR #18 remains draft and unmerged.
