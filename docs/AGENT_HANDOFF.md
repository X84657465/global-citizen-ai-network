# Global Citizen AI Network — Agent Handoff

**Last verified:** 2026-11-19 00:38 UTC  
**Main commit:** `e60cc24fc0b4bcf0e68ca5e69942bbf20cb368f0`

## Current system state

- **Windows self-hosted Runner:** The repository workflow targets `[self-hosted, Windows, X64]`. Recent prior jobs were assigned to `DESKTOP-S2S4BM9`; current online/idle state has not been re-queried in this handoff.
- **Five-minute scheduler:** Active on `main` via `.github/workflows/agent-task-preflight.yml` (`*/5 * * * *`).
- **Circuit breaker:** Merged to `main`; three consecutive factory failures trigger a 15-minute cooldown. State is persisted locally and in a GitHub issue. Per-Issue failures are counted and an Issue is skipped after three failures.
- **Roadmap planner:** Merged to `main`; creates at most one approved, bounded task when no eligible open task or active task PR remains.
- **CI:** Build and database jobs target the Windows self-hosted Runner and use PowerShell. Main push CI Run #44428734911 completed successfully.
- **Post-merge scheduler validation:** Push-triggered preflight Run #44428734964 was cancelled during the shared-concurrency period. The last successful scheduled preflight before merge was Run #44426935151 on the previous main SHA. A post-merge scheduled execution still needs to be observed.
- **Production safety:** No automatic merge of arbitrary candidate code and no production deployment are enabled by the factory. AI task outputs are Draft PRs and require review.

## Completed / merged

- **PR #99** — five-minute unattended factory, durable circuit breaker, per-Issue retry/skip handling, bounded roadmap planner, and dispatch gating. Merged into `main` as commit `e60cc24fc0b4bcf0e68ca5e69942bbf20cb368f0`.
- The factory CI branch validation reported passing unit tests, TypeScript, lint, production build, and local PostgreSQL/RLS checks before merge.

## Active PRs and task work

- **PR #101** — durable handoff file proposal; open and unmerged, based on the pre-factory main SHA. This file is being reintroduced on a branch based on current main.
- **PR #103 / Issue #17** — development dependency audit evidence and regression guard; open Draft PR. Its recorded CI failure was against the older base SHA `bbb4d9d...`; rerun against current main is required before judging the current revision.
- **PR #108 / Issue #81** — disposable two-member RLS integration harness; open Draft PR. Run #44428907848: database job passed, build job failed because ESLint found a malformed escaped newline in `tests/security/two-member-rls.test.mjs`. Fixed the line break in commit `e5dedffa7465903fc73d3892be0940fc061f5161`; latest CI Run #44430497190 is queued. Recheck exact-head CI.
- Other open task PRs exist for Issues #3, #71, #72, and #76. Do not dispatch duplicate work for an Issue that already has an active PR.

## Current blocker discovered

Both `.github/workflows/ci.yml` and `.github/workflows/agent-task-preflight.yml` used the same repository-wide concurrency group with `cancel-in-progress: false`. GitHub concurrency groups retain only one pending run by default; new runs can replace an older pending run. A simultaneous CI push and factory preflight run therefore risked suppressing the factory poll. This is the reason for the current follow-up PR:

- **PR #109:** `codex/isolate-ci-and-agent-queue` gives CI and the agent factory separate concurrency groups. Draft PR #109 is open: https://github.com/X84657465/global-citizen-ai-network/pull/109. The single Windows Runner still serializes actual job execution, while CI events can no longer replace the factory's pending workflow run. Exact-head CI is pending.
- A regression test is added to `tests/agent-factory-workflow.test.mjs` and included in `npm run test:unit`.

## Next actions

1. Validate PR #109 on its exact head SHA; do not merge until build and database CI pass.
2. Observe at least one successful scheduled run on the post-merge main SHA and verify Runner assignment.
3. Inspect PR #108 build failure logs; do not assume database success means the full PR passed.
4. Rebase/revalidate PR #103 against current main and resolve the dependency-audit acceptance criteria accurately; do not claim unresolved upstream advisories are fixed.
5. Update this file after each material scheduler, CI, PR, or Runner state change.

## Continuation instruction

When the user says **「讀取交接檔案並繼續」**, fetch this file from the current default branch, refresh open PRs, Issues, workflow runs, and Runner assignment, then continue from the first unblocked action above. Never infer live Runner status or CI success from old records.
