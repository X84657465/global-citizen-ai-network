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

A Supabase security-advisor pass returned nine `rls_enabled_no_policy` informational findings. The follow-up grant inspection confirms that several internal tables have RLS enabled with zero policies, which blocks row access through normal client roles, but it also shows unnecessary table-level grants to `anon` and/or `authenticated` on `audit_logs`, `platform_ai_controls`, and `provider_invoice_imports`. The AI budget/idempotency/rate-limit internals are limited to `postgres` and `service_role` in the inspected grant output. The no-policy state is not itself a data leak, but the extra client-role grants are avoidable attack surface and should be revoked in a reviewed migration. No production grants were changed during this audit.

The security advisor output should not be treated as a pass until those grants are removed or the intended access model is explicitly documented and tested. The follow-up grant query confirmed all seven table privileges were granted to both `anon` and `authenticated` on each of the three tables; `postgres` and `service_role` grants were also present and are deliberately preserved.

## Application observations

The current `main` branch contains the Next.js AI chat route at `app/api/ai/chat/route.ts`. It authenticates the member, verifies conversation access, requires a server-side service-role key, validates an idempotency key, calculates a finite preflight estimate, claims the request through `claim_ai_request`, and finalizes through `complete_ai_chat_request`. Unknown provider outcomes are routed to manual reconciliation rather than automatically retried.

The latest production deployment is marked `READY`; that status alone does not prove the complete user journey works. The Vercel project metadata also reports `live: false`, which should be clarified before any public launch decision.

## Work completed on this branch

- Created `work/integration-audit` from `main`.
- Updated `docs/database-safety.md` so its migration status no longer incorrectly claims that the linked database has never had migrations applied.
- Added this evidence-based audit record.
- Added migration `0019_revoke_client_access_to_internal_tables.sql` and a read-only post-migration assertion at `tests/database/internal-table-grants.sql`. These are committed to the review branch only; they have not been applied to the linked Supabase project.

## Blocking verification before enabling AI or public launch

1. Run the repository's lint, unit, and production build checks from a clean checkout.
2. Run the database migration replay on a disposable Supabase project, not the linked environment.
3. Add automated integration tests for RLS isolation, cross-member conversation access, role escalation, idempotency replay/conflict, cross-conversation unresolved-request locking, and concurrent budget reservations.
4. Test known provider rejection, timeout/unknown outcome, partial usage, malformed provider payload, completion RPC failure, and reconciliation decisions.
5. Verify the admin reconciliation API requires an authenticated active admin and that the service-role secret never reaches client bundles or logs.
6. Confirm Vercel environment configuration without exposing secret values; test login, workspace, contribution, admin, and health routes.
7. Confirm the Vercel `live` state, SSO/custom-domain exposure, and intended launch access policy.
8. Keep global AI disabled until all required tests pass and spend limits are deliberately configured.

## Safety boundary

This branch contains documentation, tests, and a reviewed SQL migration. The migration has NOT been applied to the linked Supabase project. No production grants, schema, data, secrets, or AI controls were changed, and no production deployment was triggered. Vercel Preview builds may run automatically from the review branch.
