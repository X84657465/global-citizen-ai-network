# Agent Handoff

> Single source of truth for the next development session. Update this file at the end of every development round, after opening/updating a PR, and after any scheduling or runner change. Record verified GitHub state only; never infer a green CI, online Runner, successful task, or merge.

**Last verified:** 2026-11-19 19:57 UTC  
**Repository:** `X84657465/global-citizen-ai-network`  
**Default branch:** `main`  
**Current main commit:** `bbb4d9d6504015ed10edf784993e77aaedc6cd0f`  
**Factory PR head:** `d6a590a276dfbd88a1acb468e2d0205c4ccb0e4c`

## 目前系統狀態

| Component | Verified state |
|---|---|
| Windows self-hosted Runner | **Verified online and assigned**: CI Run #44384945090 job #135086889010 was assigned to `DESKTOP-S2S4BM9` with labels `self-hosted, Windows, X64`; Supabase CLI installation and local config initialization passed, and Supabase startup was in progress at last check. |
| CI build/database | On `main`, both jobs still target `ubuntu-latest`. In PR #99, both target the Windows self-hosted Runner and use `powershell`; the redundant `docker info` probe has been removed. Run #44384945090 previously assigned database job #135086889010 to `DESKTOP-S2S4BM9` (labels `self-hosted, Windows, X64`); CLI install and config initialization passed, but that run was later cancelled during Supabase startup. Latest run #44385225050 has both jobs queued for the same Runner. |
| Local task worker | `main` remains on a 30-minute schedule. PR #99 changes it to every 5 minutes. |
| Five-minute unattended loop | Proposed in PR #99 only; **not active on main**. |
| Circuit breaker / cooldown / planner | Proposed in PR #99 only; **not active on main**. |
| Production safety | No automatic merge or production deployment is enabled on main. Keep validation and review gates intact. |

## 已完成與已合併

- PR #98 — closed without merge. Its issue-trigger reduction was not integrated into `main`.
- PR #80 — closed without merge; its branch was stale and based on an older main commit.
- No new factory PR has been verified as merged in this handoff update.
- PR #99 — `[Automation] Add unattended five-minute AI task factory`; open Draft PR, not merged: https://github.com/X84657465/global-citizen-ai-network/pull/99. Latest branch includes fixes for three unit-test assertions, removal of the redundant Docker probe, and numeric `Retry-After` parsing.

## 當前阻塞與待辦

1. **PR #99 CI is not yet green.** Latest useful validation is PR run #44385185298 on commit `a151af8`: assigned to `DESKTOP-S2S4BM9`; unit tests, dependency audits, TypeScript, lint, and production build passed. The job is stalled in setup-node post cleanup, so database tests never started. Latest PR #99 run #44385744040 is queued on commit `d6a590a`, which removes npm caching. Commits `dfa54b3` and `197a1bb` after that run only change cross-workflow concurrency and CI trigger scheduling; runs #44385218789 and #44385225050 are queued for those revisions. The previous 101-test run had three assertion-only failures; the fixes are committed in PR #99 at `c7db5ed` and `82afb74`. A subsequent run on `a151af8` passed unit tests and both dependency audits; TypeScript and database validation are still pending. Later commits `dfa54b3` and `197a1bb` only alter workflow concurrency/trigger behavior. Wait for the current run before any further push to avoid cancellation.
2. Confirm the current database job completes PostgreSQL/RLS tests and the queued build job is subsequently assigned. Runner assignment is verified, but the full CI pass is not yet verified.
3. Review PR #99 end-to-end before merge: verify durable remote/local cooldown consistency, per-Issue skip after three attempts, planner deduplication, and queue handoff after failures. Confirm that workflow concurrency prevents simultaneous task workers; the five-minute cron is a polling trigger, not a guarantee of a fresh Runner every five minutes.
4. **Next queued task: Issue #17** — `[AI Task] Remediate high-severity development dependency audit findings`. The current selector priority places #17 first, followed by #3 and #71. Recheck open Issues and linked PRs before dispatch; do not rely on this cached order if repository state changes.
5. There are 25 open `[AI Task]` Issues in the latest inspected search. Validate each task body and ensure closed/unmerged PRs do not permanently suppress their source Issues.
6. On `main`, CI still uses GitHub-hosted `ubuntu-latest`; PR #99 proposes moving CI build and database jobs to the Windows self-hosted Runner. Treat PR branch configuration as proposed until merged.

## 無縫交接規則

- At the end of every development round, update this file with the current UTC verification time, main commit, Runner/CI/schedule state, completed and merged PR/Issue numbers, active PRs, blockers, and the next eligible Issue.
- When creating or updating a PR, include the handoff-file update in that PR. After a PR is merged, immediately refresh this file against the new `main` and commit the updated handoff record to `main` through the repository's approved merge/review process.
- Never claim a PR is merged, CI passed, or Runner is online without checking the live GitHub state. Distinguish queued, in-progress, failed, cancelled, and successful runs.
- Preserve the project safety boundary: no unreviewed auto-merge or production deployment. A future auto-merge policy must require all required checks to pass, a non-draft PR, no merge conflicts, and an explicit repository-level authorization.
- For a new ChatGPT conversation, the user can say: **「讀取交接檔案並繼續」**. The assistant must read this file and then refresh current GitHub PR, Issue, branch, and Actions state before making changes; do not ask the user to repeat project history.
