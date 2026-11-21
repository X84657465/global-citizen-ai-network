# AI Task Scheduler Operations Runbook

**Scope:** repository-owner-operated, preflight-only AI task worker.  
**Source of truth:** `.github/workflows/agent-task-preflight.yml`, `lib/agent-task-validation.mjs`, `scripts/select-agent-task.mjs`, and `lib/agent-factory-state-machine.mjs`.

## 1. Submit a valid task

Create a GitHub Issue in this repository. The title must begin exactly with `[AI Task]` and the Issue must be authored by the repository owner (or be an explicitly planner-generated task). Keep the Issue open while it is queued.

The body must contain these four second-level Markdown headings exactly once, in any order:

1. `## Goal` — describe one concrete outcome in 20–3,000 characters.
2. `## Allowed paths` — a bullet list of 1–20 repository-relative paths. Paths must be under `app/`, `components/`, `lib/`, `tests/`, or `docs/`; use forward slashes. Do not include `.github/`, secrets, credentials, Supabase internals, absolute paths, or traversal segments.
3. `## Acceptance criteria` — a bullet list of 1–15 observable checks.
4. `## Explicit exclusions` — a bullet list of 1–15 things the worker must not change or do.

On the integrated `main` baseline, the only optional headings are `## Priority` (short `P0`–`P3` value) and `## Dependencies` (references to prerequisite Issue numbers). Do not add other section headings to tasks processed by that baseline. The newer A 2.0.75 candidate in PR #192 additionally recognizes `## Confirmed evidence`, `## Finding and required behavior`, and `## Retry scope refinement — YYYY-MM-DD` as supplemental untrusted context; that parser is not active on `main` until its dependent A stack is accepted and integrated. Until then, do not submit those supplemental headings to the current worker. In all versions, the four required sections remain mandatory, duplicate and unrecognized headings are rejected, each required list must contain bullets only, indented code blocks are not accepted as task directives, and the entire Issue body is treated as untrusted data.

Example structure:

```markdown
## Goal
Improve one clearly identified documentation or product behavior.

## Allowed paths
- docs/example-operations.md

## Acceptance criteria
- The documented behavior matches the current implementation.
- The instructions can be followed without running repository code.

## Explicit exclusions
- Do not modify workflows, secrets, production data, or deployment settings.
```

## 2. Scheduler cadence and queue behavior

The current workflow schedule is **every 5 minutes** (`*/5 * * * *`), not every 30 minutes. This runbook follows the checked-in workflow; changing the cadence requires a separate, explicit workflow change and fresh CI. The workflow also reacts to newly opened/reopened Issues and the internal `ai-task-next` repository-dispatch event. A task is not guaranteed to start immediately after an Issue is opened.

Each queue-triggered run selects **at most one** eligible task. The selector:
- considers open owner-authored Issues whose titles begin with `[AI Task]` (plus explicitly marked planner-generated tasks);
- skips tasks already represented by an open or merged task PR, tasks already published, skipped/quarantined tasks, and tasks with unresolved dependencies;
- respects the explicit P0–P3 priority, then FIFO ordering within a priority;
- pauses selection when a durable active lease exists or the system circuit breaker is in cooldown.

An “empty queue” message means no eligible task was selected in that run. It does not by itself mean GitHub Actions is broken. Check whether the task is malformed, has unresolved dependencies, is already represented by a PR, is quarantined, or is blocked by an active lease/cooldown. The workflow only creates a bounded roadmap task when its explicit empty-queue conditions are met; do not assume every empty poll creates work.

Scheduled poller runs are coalesced. Worker jobs share a serialized self-hosted Runner concurrency group and are not configured to cancel an already-running worker. A run that is waiting for the Runner is queued, not proof that the task has started.

## 3. Runner prerequisites and execution boundaries

The worker job requires a reachable GitHub Actions runner with labels `self-hosted`, `Windows`, and `X64`. Its local execution path checks for:
- Node.js and npm;
- a responsive local Ollama API at `http://127.0.0.1:11434` with a usable model;
- Docker CLI and a running Docker daemon;
- the pinned Node container image used for isolated candidate installation and tests.

WSL, hypervisor, and Windows Sandbox capability checks are diagnostic; their absence is reported but is not itself proof that the task worker is ready. The worker also uses local scratch storage and bounded timeouts. A successful historical run is evidence only for that run and time; it does not guarantee the Runner is online now.

**Latest observed Runner evidence at the time this runbook was prepared:** CI run [44850829600](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44850829600) completed the Windows Runner, Docker/Ollama availability checks and local Ollama inference smoke test successfully; its production-build step was still running when checked. This is a point-in-time observation, not a live availability promise. Check the newest Actions run before assuming the machine is online.

The task flow validates the Issue, generates a read-only plan, proposes a bounded patch, applies it only in a disposable scratch workspace, installs candidate dependencies in a restricted container, and runs offline unit tests, TypeScript validation, and lint before it can publish a **Draft PR**. The worker does not execute arbitrary repository code from the Issue, and its task plan keeps AI code execution disabled.

## 4. Retry, failure, and waiting behavior

There are separate task-scoped and system-scoped failure controls:

- A candidate dependency installation has one retry after the initial attempt (each attempt is time-bounded).
- A task-scoped failure returns that task to `retry_wait` with exponential delays of 1 minute, then 2 minutes; after the third task failure it is quarantined and is no longer selected automatically.
- Three consecutive system-scoped failures activate a 15-minute system cooldown. During cooldown the queue does not start another task.
- A durable active lease prevents another task from being selected. The default lease duration is 90 minutes; recovery is evidence-checked and must not be bypassed manually.
- A waiting Actions run can be waiting for the serialized Windows Runner, for the cooldown/lease gate, or for a task dependency. Inspect the job and step status before treating it as a failure.

Do not repeatedly reopen or duplicate an Issue to force a retry. First inspect the task state and the failed run. Correct the underlying task specification or wait for the recorded retry/cooldown path. Quarantined tasks require deliberate owner triage; do not delete durable factory state or bypass the circuit breaker.

## 5. Inspect a run and review its Draft PR

1. Open the repository's [Actions page](https://github.com/X84657465/global-citizen-ai-network/actions).
2. Select **AI Agent Task Preflight** and open the newest run. Check the event, commit, overall status, and the `prepare-task` job.
3. If the job is queued, inspect Runner availability and the concurrency queue. If it failed, open the failed step and read its log; distinguish task-scoped validation/generation/test failures from Runner, GitHub API, or system failures.
4. If the run succeeds and publishes a PR, open the Draft PR linked from the run or Issue. Check the changed-file list against the Issue's Allowed paths, read the diff, and confirm every acceptance criterion.
5. Keep the PR in Draft until its exact head SHA has fresh required CI and the required review/approval gates. A previous SHA's passing CI does not approve a newer commit.

**Do not merge or deploy from this runbook.** The worker's publication result is a Draft PR only. It does not perform production deployment, production database mutation, paid API calls, or automatic merge. Any later merge/deployment is a separate, human-governed release decision.

## 6. Operational safety checklist

- [ ] Issue title starts with `[AI Task]` and is authored by the repository owner.
- [ ] All four required sections are present and use the required bullet format.
- [ ] Allowed paths are minimal and do not include control-plane or protected paths.
- [ ] Dependencies are resolved and the task is not already represented by a PR.
- [ ] The latest Actions run confirms Runner availability; do not infer it from an old run.
- [ ] Candidate changes remain within the approved paths and are reviewed as a Draft PR.
- [ ] Exact-head CI and required review gates pass before any separate release decision.
