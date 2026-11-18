# Production readiness and integration handoff

## Verified deployment (last checked 2026-11-18)

- Production domain: https://global-citizen-ai-network.vercel.app
- Vercel Production deployment: READY, deployment `dpl_FfqBcDe16YUBxCtkjaDb94GRaqV2`, commit `0495355900b16f14f4443f508d569b825e3fbbb3`.
- Latest main commit verified on 2026-11-18: `9999b7b73cf7440a93563ad85db1d48e7a124ac8` (PR #53 migration-history alignment). Production remains READY on `0495355900b16f14f4443f508d569b825e3fbbb3`; it does not contain the latest main changes. The latest Vercel deployment listing did not show a deployment for `9999b7b`. Earlier deployment attempts were rejected by the Hobby `api-deployments-free-per-day` quota; check quota availability before retrying.
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
- Migrations applied: 24 (latest applied version: `20261118061217`, `dedupe_active_submission_index`). PR #53 aligned all 24 repository migration filenames with the exact 14-digit versions already recorded by Production; SQL contents were unchanged and no Production migration was executed.
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
- PR #51 hardened provider response parsing and cleanup; it is merged into `main` but is not yet confirmed deployed to Production.
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



## Current CI observation (2026-11-18)

- PR #53 Build and Database CI passed on commit `61dd6e6b07da71c99eb03f4cdd63a9a8e1f5b0d5` before merge.
- After PR #53 merged, GitHub Actions jobs for the subsequent `main` push terminated before any steps were created. The workflow-job API reported `runner_id: 0`, an empty runner name, and no steps; job logs were unavailable. This is consistent with runner allocation/infrastructure failure, but the exact cause has not been confirmed.
- PR #54 proposes reducing duplicate branch-push and pull-request CI runs. It remains Draft pending successful runner allocation and CI validation. Do not interpret these runner-start failures as application test results.
