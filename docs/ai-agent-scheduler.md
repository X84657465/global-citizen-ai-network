# AI Agent Task Scheduler

## Purpose

The scheduler turns the validated task workflow into a bounded queue worker. It is designed to continue processing repository tasks without a person repeatedly dispatching each run.

## Execution model

- GitHub Actions schedules a queue scan every 5 minutes.
- The worker runs on the Windows self-hosted runner and uses the local Ollama API.
- Each scheduled cycle selects at most one eligible task, ordered oldest first.
- Eligible tasks are open issues titled `[AI Task]`, authored by the repository owner, and not already represented by a task PR.
- Existing task PRs are detected using the `<!-- ai-task:ISSUE_NUMBER -->` marker. This prevents successful tasks from being selected repeatedly.
- If a task run fails before a PR is created, the issue remains eligible for a later scheduled retry.
- After a task Draft PR is created, the workflow sends a `repository_dispatch` event (`ai-task-next`) to start the next queue cycle automatically. The same queue-selection path is used when an owner-authored `[AI Task]` issue is closed. Workflow-level concurrency serializes these handoffs so only one queue worker runs at a time.
- The 30-minute schedule remains a recovery/polling mechanism if a handoff event is missed; it is not the only way to advance the queue.
- The existing issue template defines the required Goal, Allowed paths, Acceptance criteria, and Explicit exclusions sections.

## Resource and safety limits

- One task per queue-worker cycle; no parallel task execution.
- Candidate dependency installation is limited to 15 minutes per attempt and is retried once. The npm cache is persisted on the self-hosted runner, and the pinned Docker image is reused from the local Docker daemon cache when present.
- The worker remains on the self-hosted Windows runner and local Ollama; no paid model API is introduced.
- Candidate patches remain constrained by the task allowlist and validated plan/patch schemas.
- Candidate tests run in the disposable restricted container.
- Successful output is a Draft PR only. No automatic merge, production deployment, production database access, or secret changes are enabled.
- Repository setting prerequisite: under **Settings → Actions → General → Workflow permissions**, enable **Allow GitHub Actions to create and approve pull requests**. Without this repository-level permission, the publisher receives HTTP 403 even when the workflow job has `pull-requests: write`; the task can pass isolated tests but cannot publish its Draft PR or dispatch the next queue cycle.

## Activation requirements

1. The workflow change must be merged into the repository's default branch. GitHub scheduled workflows run from the default branch, not from an unmerged feature branch.
2. The Windows self-hosted runner must be online, awake, and running `run.cmd` when a scheduled job is dispatched.
3. Local Ollama and Docker Desktop must be available on that machine.
4. Submit tasks through the repository's **AI Task** issue template.

Until the workflow is merged, this scheduler code is present only in the feature branch and does not run on a schedule.

## Operational behavior

A 30-minute schedule is a queue polling interval, not a promise that a task completes within 30 minutes. GitHub may delay scheduled events. If the PC is offline, jobs wait for an eligible runner; they do not execute locally while the PC is powered off.


## CI validation event matrix

The full CI workflow is intentionally triggered by one event for each normal code change:

| Event | Validation behavior |
| --- | --- |
| Push to `main` | Run the full CI suite for the new main commit. |
| Pull request opened, reopened, or synchronized | Run the full CI suite for the current PR head SHA. |
| Explicit `repository_dispatch: ai-task-ci` | Re-run validation for the supplied PR number and exact head SHA when an already-open task PR needs an explicit recheck. |
| Push to a `codex/*` branch | Does not independently start the full CI suite; the PR lifecycle event validates the commit. |

When the factory creates a new Draft PR, it relies on the GitHub `pull_request: opened` event and does not send a second `ai-task-ci` dispatch for the same SHA. When the publisher finds an already-open PR for the task, it keeps the explicit dispatch path so the current head can be revalidated on request. Per-PR concurrency coalesces superseded pending commits without cancelling an in-progress validation or unrelated queued PRs.
