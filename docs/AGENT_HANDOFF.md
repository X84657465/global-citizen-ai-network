# Agent Handoff

> Single source of truth for the next development session. Update this file at the end of every development round, after opening/updating a PR, and after any scheduling or runner change. Record verified GitHub state only; never infer a green CI, online Runner, successful task, or merge.

**Last verified:** 2026-11-19 19:53 UTC  
**Repository:** `X84657465/global-citizen-ai-network`  
**Default branch:** `main`  
**Current main commit:** `bbb4d9d6504015ed10edf784993e77aaedc6cd0f`  
**Factory PR head:** `fac5b8845a0977bb04735ba3a37f0ef3c6fbd3df`

## 目前系統狀態

| Component | Verified state |
|---|---|
| Windows self-hosted Runner | Workflow targets `[self-hosted, Windows, X64]`. Latest observed preflight/CI jobs were queued without an assigned runner name; online/idle status is **not verified**. |
| CI build/database | `.github/workflows/ci.yml` currently targets `ubuntu-latest` for both build and Supabase database jobs. Previous runs failed; the most recent inspected unit-test log showed three failing assertions (factory success-state expectation, planner task expectation, and owner-authored-task expectation). |
| Local task worker | `.github/workflows/agent-task-preflight.yml` on `main` still schedules every 30 minutes. |
| Five-minute unattended loop | Proposed in PR #99 only; **not active on main**. |
| Circuit breaker / cooldown / planner | Proposed in PR #99 only; **not active on main**. |
| Production safety | No automatic merge or production deployment is enabled on main. Keep validation and review gates intact. |

## 已完成與已合併

- PR #98 — closed without merge. Its issue-trigger reduction was not integrated into `main`.
- PR #80 — closed without merge; its branch was stale and based on an older main commit.
- No new factory PR has been verified as merged in this handoff update.
- PR #99 — `[Automation] Add unattended five-minute AI task factory`; open Draft PR, not merged: https://github.com/X84657465/global-citizen-ai-network/pull/99

## 當前阻塞與待辦

1. **PR #99 CI is currently running and not yet green.** Latest run #44384945090 is executing on `DESKTOP-S2S4BM9`; Supabase startup/migration application is in progress and the build job is queued. The previous 101-test run had three assertion-only failures; fixes are committed in PR #99 at `c7db5ed`, `82afb74`, `a9d9924`, and `fac5b88`. Wait for the current run before any further push to avoid cancellation.
2. Confirm the current database job completes PostgreSQL/RLS tests and the queued build job is subsequently assigned. Runner assignment is verified, but the full CI pass is not yet verified.
3. Review PR #99 end-to-end before merge: verify durable remote/local cooldown consistency, per-Issue skip after three attempts, planner deduplication, and queue handoff after failures. Confirm that workflow concurrency prevents simultaneous task workers; the five-minute cron is a polling trigger, not a guarantee of a fresh Runner every five minutes.
4. **Next queued task: Issue #17** — `[AI Task] Remediate high-severity development dependency audit findings`. The current selector priority places #17 first, followed by #3 and #71. Recheck open Issues and linked PRs before dispatch; do not rely on this cached order if repository state changes.
5. There are 25 open `[AI Task]` Issues in the latest inspected search. Validate each task body and ensure closed/unmerged PRs do not permanently suppress their source Issues.
6. CI build and database jobs currently use GitHub-hosted `ubuntu-latest`; the Windows self-hosted Runner is used by the preflight workflow. Treat these as separate execution paths.

## 無縫交接規則

- At the end of every development round, update this file with the current UTC verification time, main commit, Runner/CI/schedule state, completed and merged PR/Issue numbers, active PRs, blockers, and the next eligible Issue.
- When creating or updating a PR, include the handoff-file update in that PR. After a PR is merged, immediately refresh this file against the new `main` and commit the updated handoff record to `main` through the repository's approved merge/review process.
- Never claim a PR is merged, CI passed, or Runner is online without checking the live GitHub state. Distinguish queued, in-progress, failed, cancelled, and successful runs.
- Preserve the project safety boundary: no unreviewed auto-merge or production deployment. A future auto-merge policy must require all required checks to pass, a non-draft PR, no merge conflicts, and an explicit repository-level authorization.
- For a new ChatGPT conversation, the user can say: **「讀取交接檔案並繼續」**. The assistant must read this file and then refresh current GitHub PR, Issue, branch, and Actions state before making changes; do not ask the user to repeat project history.
