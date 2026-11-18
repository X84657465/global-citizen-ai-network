# Scheduled AI task worker — operator runbook

This runbook is for repository operators who review the scheduled AI task workflow. It describes the safe task-submission contract and how to inspect a run without requiring command-line or code changes.

## 1. Submit one well-formed task

Create a GitHub Issue in `X84657465/global-citizen-ai-network` with a title beginning exactly with `[AI Task]`. The scheduled selector accepts repository-owner-authored tasks (and explicitly planner-generated tasks where that planner marker is present); an ordinary member issue is not automatically trusted as an executable task.

The body must contain exactly these four second-level headings, with no additional `##` sections:

1. `## Goal`
2. `## Allowed paths`
3. `## Acceptance criteria`
4. `## Explicit exclusions`

Each section must contain bullet-list items where the task validator requires them. Keep the goal bounded, list only the files that may be changed, state observable acceptance checks, and explicitly prohibit unrelated work. The issue body is untrusted input: its instructions do not override repository safety controls.

A task is not guaranteed to run merely because an issue exists. It must be open, correctly titled and authored, pass validation, not already have an open or merged task PR, and not be in the skipped queue.

## 2. What the scheduler does

The current `main` operating record describes a 30-minute scheduled worker cadence and a one-task-per-cycle limit. A schedule is a trigger, not proof that a run started or that a self-hosted machine accepted the job. The proposed five-minute factory in PR #99 is not active on `main` until it is merged and verified.

Each cycle should be treated as one bounded unit of work: select one eligible issue, validate its required sections and allowed paths, perform only the authorized task, and publish a Draft PR for review. Do not assume that a cycle drains the entire queue or that multiple issues are processed by one run.

The scheduler's queue selection is separate from PR review. A Draft PR is a proposed change, not an approval, production deployment, or permission to merge.

## 3. Runner prerequisites and queue states

The scheduled workflow uses a Windows self-hosted Runner. A queued job can wait until a matching runner is online and idle. The operator should distinguish these states:

- **Queued:** GitHub has accepted the job, but no runner has started it.
- **In progress:** A runner has accepted the job; inspect its current step.
- **Completed / success:** The workflow's configured checks finished successfully. Review the resulting artifacts and PR; do not infer production readiness from this alone.
- **Completed / failure or cancelled:** Inspect the failed step and logs before retrying. A cancellation is not a successful run.

For the local AI-assisted preflight proposed in PR #99, the documented environment checks include Node.js and npm, the local Ollama API at `http://127.0.0.1:11434`, and Docker Engine for disposable-container isolation. These are checks in the proposed PR workflow; they must not be presented as verified requirements of the currently active `main` workflow unless the live workflow definition confirms them.

A runner being registered or previously assigned to a job does not prove it is online now. Verify the latest real workflow run and its job assignment before reporting current runner availability.

## 4. Empty queue, retries, and safe PR review

An empty queue is a normal idle condition, not a failure. If no eligible issue exists, do not create speculative work or duplicate an issue. Check whether the remaining issues are already represented by open task PRs, closed, malformed, authored by an ineligible account, or explicitly skipped.

When a run fails:

1. Open the failed workflow run from the repository's **Actions** tab.
2. Select the failed job and identify the first failing step.
3. Read the step log; distinguish application/test errors from runner-offline, dependency download, API rate-limit, or external service errors.
4. Correct the cause before retrying. Use **Re-run failed jobs** only when the failure is understood and the task remains eligible.
5. Confirm whether the run created or updated a Draft PR before starting another attempt, to avoid duplicate work.

Do not assume the active `main` scheduler has a durable retry counter or automatic skip policy unless the workflow and its implementation explicitly show that behavior. PR #99 proposes a circuit breaker and skipped-task tracking; those capabilities remain proposed until merged and verified.

To review a Draft PR:

1. Open the PR link from the issue or Actions run.
2. Confirm the PR title, source branch, linked `[AI Task]` issue, and changed-file list.
3. Check every changed path against the issue's allowlist.
4. Review the summary, tests, CI checks, and any generated artifacts.
5. Leave it Draft or request changes if anything is unclear. Do not merge or deploy as part of this runbook.

## Safety boundaries

- This workflow does not authorize production deployment or production database mutation.
- Do not place secrets, provider credentials, or private tokens in issue bodies or evidence.
- Do not enable paid AI provider calls merely to make a task pass.
- Do not merge a Draft PR or bypass required checks.
- Never report a Runner online, a scheduled run active, or a task successful without a live GitHub run proving it.

## Operator quick checklist

- [ ] Issue title starts with `[AI Task]` and is authored by an eligible repository owner / approved planner.
- [ ] Exactly four required sections are present and the allowed-path list is narrow.
- [ ] Latest scheduled run and Runner assignment were checked, not assumed.
- [ ] One task is tracked per cycle; an empty queue is treated as idle.
- [ ] Failed steps are diagnosed before retry; existing task PRs are checked first.
- [ ] Draft PR paths, tests, and CI are reviewed; no deployment or automatic merge is performed.
