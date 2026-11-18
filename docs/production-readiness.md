# Production readiness and integration handoff

## Verified deployment (last checked 2026-11-18)

- Production domain: https://global-citizen-ai-network.vercel.app
- Vercel Production deployment: READY, deployment `dpl_FfqBcDe16YUBxCtkjaDb94GRaqV2`, commit `0495355900b16f14f4443f508d569b825e3fbbb3`.
- Latest main commit and application-code commit: `5065b9987df661451d35ed028544f1a47699c4d3`. Production remains READY on `0495355900b16f14f4443f508d569b825e3fbbb3`, which contains application commit `7a2e4d990fdfa5290484ffcae647dcc802a64f61` and migration 0024. Main has since added global response security headers and a reconciliation-form correction path; these code changes are not yet deployed. Vercel has rejected new deployments with the Hobby `api-deployments-free-per-day` quota.
- PR #20 Build and Database CI: PASS; 101 database assertions.
- PR #22 combined migrations 0019+0020 Build and Database CI: PASS; 104 database assertions.
- `GET /`: HTTP 200
- `GET /api/health`: HTTP 200; `GET /login`: HTTP 200.
- Latest 24-hour Vercel Runtime Errors query returned no error clusters. Recent production logs contain no error/fatal records.
- The health endpoint reports environment-variable presence only. It does not prove that the database or AI provider can authenticate. AI provider remains `mock`.

## Verified Supabase state

- Project: `global-citizen-ai-network`
- Region: `ap-northeast-1` (Tokyo)
- Project status: `ACTIVE_HEALTHY`
- Database engine: PostgreSQL 17
- Migrations applied: 24 (latest: `20261118061217`, `dedupe_active_submission_index`).
- Public tables: 22
- Public tables with RLS enabled: 22
- All 22 public base tables have RLS enabled.
- After migration 0019: zero direct public-table grants to `anon`; zero public-schema function EXECUTE grants to `PUBLIC`, `anon`, or `authenticated`; service-role access retained for all 22 public relations and 19 public functions.
- The health advisor returns no findings. Security advisor's 9 remaining RLS-without-policy findings are internal service-only tables. PR #22 migration 0020 is applied live as `20261118045832`: the 17 unindexed FK and 2 duplicate permissive SELECT-policy findings are gone. PR #24 migration 0021 is applied live as `20261118050801`: contribution-task mutations and audit events now commit atomically through a service-role-only RPC with active-admin revalidation. Performance advisor now reports 35 unused indexes (including the 17 newly added FK indexes; current data volume is too low to exercise them). PR #36 removed the duplicate active-submission index; no duplicate-index finding remains. The effective grant audit after migration 0021 confirms 0 browser-role function EXECUTE privileges and 20 service-role-executable public functions.

## Preview verification

- Documentation-only Preview for PR #19 built successfully on 2026-11-18.
- The Preview build compiled Next.js, completed TypeScript validation, generated static pages, and deployed successfully.
- The two unused-import warnings found in the earlier Preview were removed in PR #21; subsequent GitHub Build CI passed.
- This Preview does not modify the Production deployment or prove authenticated end-to-end workflows. The most recent PR #22 preview attempt is subject to the team's Vercel build-rate limit.

## Remaining operator configuration

1. In Supabase Dashboard → Project Settings → API, copy the service-role secret for this project.
2. In Vercel → Project Settings → Environment Variables, set `SUPABASE_SERVICE_ROLE_KEY` as a Sensitive variable. Select only the environments that should access the server-side admin API.
3. Do not use a `NEXT_PUBLIC_` prefix for this key. Never paste the key into chat, GitHub, source files, or browser code.
4. Redeploy Production after changing the variable.
5. Run the protected admin workflows and authenticated signup/login smoke tests in Preview before enabling public registration.

## AI and cost controls

- AI provider remains `mock`.
- No paid AI provider credentials are configured.
- Do not enable production AI until provider credentials, per-request limits, monthly budget caps, uncertain-outcome reconciliation, and billing verification have been tested.
- Keep public registration disabled until privacy, terms, support, retention, deletion, email verification, CAPTCHA, and abuse controls are ready.

## Health endpoint contract

`GET /api/health` is intentionally a lightweight deployment smoke check. It reports only whether required configuration is present. It must not expose keys, hostnames, stack traces, or infrastructure identifiers, and a configured status must never be interpreted as a successful live integration test.
- PR #30 AI replay change: Build and Database CI PASS (40 unit tests; 114 pgTAP assertions). Migration 0022 is applied live as `20261118060600`.
- PR #33 signup body hardening: Build and Database CI PASS (47 unit tests; 119 pgTAP assertions); signup remains disabled by default because `ENABLE_PUBLIC_SIGNUP` is not configured.
- PR #34 single active contribution submission: Build and Database CI PASS (47 unit tests; 125 pgTAP assertions). Migration 0023 is applied live as `20261118060607`.

- PR #36 index cleanup: migration 0024 applied live as `20261118061217`; exactly one canonical active-submission partial unique index remains. Performance Advisor: 35 unused indexes, 0 duplicate-index findings.

## Baseline browser security headers

Main now applies the following response headers globally through `next.config.ts`. These headers are merged in PR #42, but are **not yet active in Production** because the current READY deployment predates that change. Verify them on the live domain after a new Production deployment:

- `X-Content-Type-Options: nosniff` — prevent MIME-type sniffing.
- `X-Frame-Options: DENY` — prevent framing and common clickjacking attacks.
- `Referrer-Policy: strict-origin-when-cross-origin` — limit cross-origin referrer detail.
- `Permissions-Policy` disables camera, microphone, and geolocation because the current application does not require them.
- `X-Permitted-Cross-Domain-Policies: none`.
- `Cross-Origin-Opener-Policy: same-origin-allow-popups` to isolate the top-level browsing context while retaining compatibility with future popup-based auth flows.

A strict Content Security Policy is intentionally deferred. Next.js App Router streaming and inline bootstrap scripts require a nonce-aware CSP design; adding a broad `unsafe-inline` policy would create a false sense of protection. Cross-Origin-Resource-Policy is also deferred until all intentional external asset origins are inventoried. Vercel currently supplies HSTS on the live deployment; verify it remains present after the next deployment.

## Legacy integration branch audit — 2026-11-18

### Scope and decision

The open integration PR #18 branch (`work/integration-audit`) is not safe to merge as a unit. At the time of review it is 85 commits ahead of `main` and 28 commits behind it, with a merge base at `032efc7b6158de84370fbda0159f57fdd2cd0e67`. Keep the PR open and Draft; do not merge it or rebase it wholesale onto the production line.

### Verified overlap with current main

- `app/api/ai/chat/route.ts` is byte-for-byte identical between the PR #18 head and current `main`; do not cherry-pick this file from PR #18.
- The providerless completed-replay migration in PR #18 (`20261118013000_replay_completed_ai_requests_without_provider_config.sql`) implements the same `claim_ai_request` function body as the current main migration `20261118060600_ai_providerless_completed_replay.sql`, but the legacy file also starts with three `DROP FUNCTION IF EXISTS` statements. Do not reapply the legacy migration or copy those drops without first proving that the exact overloads exist and are safe to remove.
- PR #18's `20261118014000_revoke_client_default_table_and_sequence_privileges.sql` sets default table and sequence privileges for role `postgres`. Current main migration `20261118045417_least_privilege_public_grants.sql` already includes those same revocations and additionally revokes default function execution from `PUBLIC`, `anon`, and `authenticated`. The legacy migration is therefore functionally redundant for the `postgres` table/sequence defaults and should not be replayed. Main also has pgTAP checks for the `postgres` default ACLs. The old PR's additional `supabase_admin` fixture is a separate platform-role behavior check; current project documentation says managed `supabase_admin` defaults are platform-owned and application migrations must run as `postgres`.
- PR #18 also contains a legacy internal-table revoke migration (`20261118005042_revoke_client_access_to_internal_tables.sql`). Current main's later least-privilege migration revokes client access across public-schema tables and functions, so the older migration must not be replayed blindly.

### Required follow-up before any selective port

1. Inspect live PostgreSQL default ACLs for the migration owner and compare them with the intended `anon`/`authenticated` policy.
2. Inspect `pg_proc` for the exact historical `claim_ai_request` overload signatures before considering any function drop.
3. Compare the remaining PR #18 changes by semantic unit, not by commit count; the branch contains overlapping application, migration, test, and documentation changes.
4. Port only a minimal, independently reviewed change onto a branch created from current `main`, then run the complete local database and application test suites.
5. Keep Production read-only until the migration history, grants, and tests are reconciled.

### Validation boundary

This audit used GitHub branch/file comparisons and reviewed the listed SQL and application patches. It did not execute SQL against Production, change database privileges, run GitHub Actions, or deploy Production.
