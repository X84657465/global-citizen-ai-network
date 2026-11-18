# Agent Handoff

> Single source of truth for the next development session. Refresh after every development round, PR update, scheduler change, or Runner change. Record only verified GitHub state; never infer green CI, an online Runner, a successful task, or a merge.

**Last verified:** 2026-11-19 20:22 UTC  
**Repository:** `X84657465/global-citizen-ai-network`  
**Default branch:** `main`  
**Current main commit:** `bbb4d9d6504015ed10edf784993e77aaedc6cd0f`

## 目前系統狀態

| Component | Verified state |
|---|---|
| Windows self-hosted Runner | Previously assigned to `DESKTOP-S2S4BM9` in run #44384945090. The latest PR #99 run #44389812076 is pending with no jobs listed yet; current Runner online status is therefore not re-verified. |
| Main CI | `main` still uses GitHub-hosted `ubuntu-latest` for build and database jobs. |
| PR #99 CI | PR #99 uses Windows self-hosted jobs and PowerShell. Run #44386825740: build passed; database failed because Docker could not bind TCP port 54322 (already in use). |
| Supabase isolation fix | Commit `43deab8a6cb47375d16c13c5330c239d5a5c61f6` on PR #99 now assigns a unique project ID and probes a free port range for API, DB, and shadow DB. Run #44389812076 is pending; the fix is not yet verified. |
| Scheduler | The current main operating record describes a 30-minute schedule. PR #99 proposes a five-minute factory; it is not active on main. |
| Circuit breaker / cooldown / planner | Proposed in PR #99 only; not active on main. |
| Production safety | No production database mutation or production deployment is authorized by these PRs. Keep review and safety gates intact. |

## Active PRs

| PR | Issue / purpose | Current state |
|---|---|---|
| #18 | Existing integration/audit work; includes admin AI reconciliation resolve route and migration work | Open Draft; overlaps part of Issue #3. Do not duplicate its implementation blindly. |
| #99 | Unattended five-minute AI task factory | Open Draft; head `43deab8`; new CI run pending. Previous build passed; database failed on port 54322 collision. |
| #101 | Durable handoff state file | Open, non-Draft; not merged. |
| #102 | Issue #72 workspace navigation | Open Draft; exact-head CI run #44388165338 failed; job logs unavailable (BlobNotFound). |
| #103 | Issue #17 dependency audit remediation | Open Draft; exact-head CI run #44389105937 failed; rerun attempted, job logs unavailable (BlobNotFound). |
| #104 | Issue #71 scheduled worker operator runbook | Open Draft; exact-head CI run #44389255409 failed; rerun attempted, job logs unavailable (BlobNotFound). |
| #105 | Issue #76 account profile accessibility | Open Draft; exact-head CI run #44389494860 failed; rerun attempted, job logs unavailable (BlobNotFound). |

All open PRs currently show the Vercel status failure associated with the daily preview deployment quota. Treat it as an external preview limitation, not as a substitute for build/database test results.

## Recent implementation

- **Issue #17 → PR #103:** Added a lockfile-grounded dependency security report and focused lockfile regression test. No package manifest or lockfile was changed. The report records that GHSA-fc5q-39xc-vjpf (picomatch through 4.0.7) and GHSA-vfj7-8cjw-p6xm (braces 3.0.3) have no published patched version in the reviewed sources. No clean audit is claimed.
- **Issue #71 → PR #104:** Added the scheduled AI worker operator runbook. It distinguishes the main 30-minute scheduler from the proposed PR #99 five-minute factory and does not claim the Runner is currently online.
- **Issue #76 → PR #105:** Added accessible account summary UI, server-side auth preserved, visible member UUID removed, and source-contract tests. The new focused test is not in the current explicit `test:unit` file list because Issue #76 does not allow package manifest edits; execute it directly or obtain a scope-approved test registration change before claiming it is covered by the normal CI command.

## Queue inventory and execution order

Latest repository search: **26 open Issues**, consisting of **25 `[AI Task]` Issues plus the scheduler state Issue #100**. There are **21 open PRs** after PRs #103–#105 were created.

The factory selector's priority order is:
`17, 3, 71, 94, 81, 97, 95, 72, 73, 74, 75, 96, 76, 86, 82, 83, 84, 85, 87, 88, 89, 90, 92, 91, 93`.

Already represented by active task PRs and therefore not to be duplicated: #17, #71, #72, #76.

Before dispatching the next task:
1. Issue #3 is partially represented by open PR #18 (which contains `app/api/admin/ai-reconciliation/resolve/route.ts` and migration `20261118003138_audited_ai_reconciliation_resolution.sql`). Compare remaining acceptance criteria and PR #18 before opening a duplicate.
2. Issue #94 depends on #3, #81, and #84; do not start its full migration-chain proof until those dependencies are resolved.
3. Issues #73 overlaps the workspace surface touched by PR #102; avoid concurrent edits to `app/workspace/workspace-client.tsx`.
4. Issues #74 and #75 list component/test paths that do not currently exist on main. Inspect their existing client components and revise the task scope before implementation; do not silently modify unapproved paths.
5. Issue #84 lists `app/api/ai/route.ts`, which does not exist on main; the existing chat handler is `app/api/ai/chat/route.ts`. Re-scope before attempting implementation.
6. Issues #85–#93 and #94–#97 do not all follow the task validator's exact four-section format. The validator requires exactly `Goal`, `Allowed paths`, `Acceptance criteria`, and `Explicit exclusions`; these task bodies must be normalized before unattended execution.

Recommended next execution sequence after resolving overlap / malformed task specs:
- #3 reconcile remaining work against PR #18.
- #81 two-member RLS tests.
- #84 provider adapter (after correcting its allowed path to the existing API structure).
- #94 disposable migration-chain verification.
- #97 ownership/context integrity.
- #95 conversation history and pending recovery.
- Then continue contribution lifecycle (#73–#75, #96), privacy/security (#82–#83, #86), and Phase 2–4 validation / governance (#85, #87–#93).

## Verification rules

- Distinguish queued, in-progress, failed, cancelled, and successful Actions runs. A missing job log is not evidence of a code failure or success.
- A Vercel quota failure is an external preview limitation; continue independent work while recording it.
- Do not claim tests pass unless the exact head SHA has a successful run.
- Do not claim the Runner is online unless a current run confirms assignment and execution.
- No automatic merge or production deployment unless the user-authorized gate is satisfied and the exact head SHA is verified.
- For a new session, the user can say **「讀取交接檔案並繼續」**. Read this file, then refresh live GitHub PR, Issue, branch, and Actions state before changing code.
