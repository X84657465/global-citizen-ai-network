# AI Agent Task Scheduler

## Purpose

The scheduler turns the validated task workflow into a bounded queue worker. It is designed to continue processing repository tasks without a person repeatedly dispatching each run.

## Execution model

- GitHub Actions schedules a queue scan every 30 minutes.
- The worker runs on the Windows self-hosted runner and uses the local Ollama API.
- Each scheduled cycle selects at most one eligible task, ordered oldest first.
- Eligible tasks are open issues titled `[AI Task]`, authored by the repository owner, and not already represented by a task PR.
- Existing task PRs are detected using the `<!-- ai-task:ISSUE_NUMBER -->` marker. This prevents successful tasks from being selected repeatedly.
- If a task run fails before a PR is created, the issue remains eligible for a later scheduled retry.
- The existing issue template defines the required Goal, Allowed paths, Acceptance criteria, and Explicit exclusions sections.

## Resource and safety limits

- One task per scheduled cycle; no parallel task execution.
- The worker remains on the self-hosted Windows runner and local Ollama; no paid model API is introduced.
- Candidate patches remain constrained by the task allowlist and validated plan/patch schemas.
- Candidate tests run in the disposable restricted container.
- Successful output is a Draft PR only. No automatic merge, production deployment, production database access, or secret changes are enabled.

## Activation requirements

1. The workflow change must be merged into the repository's default branch. GitHub scheduled workflows run from the default branch, not from an unmerged feature branch.
2. The Windows self-hosted runner must be online, awake, and running `run.cmd` when a scheduled job is dispatched.
3. Local Ollama and Docker Desktop must be available on that machine.
4. Submit tasks through the repository's **AI Task** issue template.

Until the workflow is merged, this scheduler code is present only in the feature branch and does not run on a schedule.

## Operational behavior

A 30-minute schedule is a queue polling interval, not a promise that a task completes within 30 minutes. GitHub may delay scheduled events. If the PC is offline, jobs wait for an eligible runner; they do not execute locally while the PC is powered off.
