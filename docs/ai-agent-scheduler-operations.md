# AI Task Scheduler Operations Runbook

**Verified baseline:** `main` `f622c852346577d67aed0bde2922ade17044057c` (2026-11-23).  
**Source of truth:** `.github/workflows/agent-task-preflight.yml`, `lib/agent-task-validation.mjs`, `scripts/select-agent-task.mjs`, `lib/agent-factory-controller.mjs`, and `lib/agent-factory-state-machine.mjs`.

This is a point-in-time operator guide. Before acting, inspect the current workflow and newest Actions run; a later `main` commit may change behavior.

## 1. Submit a valid task

Create an open GitHub Issue in this repository. Its title must begin exactly with `[AI Task]`. The normal queue accepts Issues authored by the repository owner. The explicitly planner-generated bot path is a separate exception and requires the generated-task marker; it is not a general way to submit arbitrary bot-authored tasks.

The Issue body must contain these four second-level headings exactly once:

1. `## Goal` — one concrete outcome, 20–3,000 characters.
2. `## Allowed paths` — 1–20 repository-relative paths.
3. `## Acceptance criteria` — 1–15 observable checks.
4. `## Explicit exclusions` — 1–15 prohibited changes or actions.

The complete body must not exceed 20,000 characters. Required lists use Markdown bullets. The normal writable roots are `app/`, `components/`, `lib/`, `tests/`, and `docs/`. The scheduler workflow path is a narrow control-plane exception and requires the `factory-control-plane-approved` Issue label; do not use it for ordinary product tasks. Absolute paths, traversal segments, backslashes, secret/credential paths, and Supabase internals are rejected.

The current validator also recognizes these optional sections when needed: `Priority`, `Dependencies`, `Required patch paths`, `Forbidden content`, `Confirmed evidence`, `Finding and required behavior`, and date-specific `Retry scope refinement — YYYY-MM-DD`. `Dependencies / context` is accepted as an alias for `Dependencies`. Keep the four required sections; optional context is untrusted task data, not executable instructions. Do not assume a heading accepted by an older worker is accepted by the current `main` validator.

Example:

```markdown
## Goal
Improve one clearly identified behavior or document one verified operational procedure.

## Allowed paths
- docs/example-operations.md

## Acceptance criteria
- The document matches the checked-in implementation.
- A non-technical operator can follow the steps.

## Explicit exclusions
- Do not modify workflows, application code, secrets, production data, or deployment settings.
```

## 2. Schedule, triggers, and queue behavior

The checked-in workflow on the verified baseline declares:

```yaml
schedule:
  - cron: "3-59/5 * * * *"
```

This runs every five minutes at minute 3, 8, 13, …, 58. It is **not** the literal expression `*/5 * * * *`; both describe a five-minute cadence, but their minute offsets differ. The runbook documents the exact checked-in expression and does not change the workflow.

The workflow also has these triggers:
- Issues opened or reopened;
- repository dispatch event `ai-task-next`;
- manual `workflow_dispatch` with an Issue number;
- selected owner pushes that match the workflow's branch and path filters.

A queue-triggered selection run chooses **at most one** eligible task. The selector considers open owner-authored Issues with titles beginning `[AI Task]` (plus the explicit planner-generated path), and excludes tasks already represented by an open or merged task PR, already published tasks, skipped tasks, and tasks with unresolved dependencies. It sorts by explicit P0–P3 priority and then FIFO within a priority.

An empty-queue message means no eligible task was selected in that run. It does not prove Actions is broken. Check for unresolved dependencies, an existing task PR, skipped/quarantined state, an active lease, or a system/provider cooldown. The workflow may create one roadmap task only under its explicit empty-queue conditions; an empty poll does not guarantee a new task.

Scheduled pollers are coalesced. Worker jobs share a serialized Windows self-hosted Runner concurrency group and are not configured to cancel an already-running worker. A queued run is waiting for capacity; it is not evidence that task execution has started.

## 3. Runner prerequisites and execution boundaries

The task worker's main execution job requires a reachable GitHub Actions Runner with labels `self-hosted`, `Windows`, and `X64`. The workflow pins Node.js `22.13.0` and checks local execution dependencies, including:

- Node.js and npm;
- a responsive local Ollama API at `http://127.0.0.1:11434` and a usable local model;
- Docker CLI and a running Docker daemon;
- the pinned Node container image used for isolated candidate dependency installation and testing.

WSL, hypervisor, and Windows Sandbox checks are diagnostic. Their absence is reported, but it is not a substitute for the mandatory disposable-container isolation gate. A successful historical run proves only what happened in that run; it does not prove the Runner is online now.

The normal task path checks durable cooldown/lease state, requeues tasks whose retry deadline has elapsed, selects one task, reserves a durable lease, validates the Issue, generates a read-only plan, proposes a bounded patch, applies it in disposable scratch, installs candidate dependencies in a restricted container, and runs offline tests plus TypeScript and lint checks. Publication is a separate permission-scoped job and creates a **Draft PR** only after the candidate validation path succeeds.

The workflow does not perform production deployment, production database mutation, paid provider calls, or automatic PR merge. Do not infer any of those permissions from a successful preflight or Draft PR.

## 4. Retry, failure, and waiting behavior

The Factory distinguishes task/candidate failures from shared-system failures:

- Candidate dependency installation has one retry after its initial attempt.
- A task-scoped failure enters `retry_wait`; eligible tasks are requeued by the controller after the recorded deadline. The delay grows exponentially (starting at 1 minute and 2 minutes for the first two task failures). A task is quarantined after three task failures.
- Candidate CI failures are tracked separately; retry deadlines also grow exponentially, and a candidate is quarantined after three candidate failures.
- Three consecutive system-scoped failures activate a 15-minute system cooldown.
- A validated external provider rate-limit deadline is carried separately and is bounded to at most 24 hours; do not repeatedly dispatch work during that cooldown.
- The default worker lease is 90 minutes. An active lease prevents another task from being selected. Expired-lease recovery is evidence-checked; do not bypass it manually.
- A system-health recovery is not triggered by a task's own successful publication. It requires the separate evidence-verified recovery path.

Do not repeatedly reopen or duplicate an Issue to force a retry. Inspect the failed step and task state, correct the underlying task specification or code within its allowed scope, and let the normal retry/requeue policy operate. Quarantined tasks require deliberate owner triage.

## 5. Inspect Actions and review a Draft PR

1. Open the repository's [Actions page](https://github.com/X84657465/global-citizen-ai-network/actions).
2. Select **AI Agent Task Preflight** and open the newest run. Verify its event, commit SHA, run attempt, overall status, and job list.
3. Open the `Validate task and generate read-only AI plan` job. Inspect the step that is queued, pending, or failed; distinguish task validation/planning failures from Runner, GitHub API, Docker/Ollama, and provider failures.
4. A run marked `PENDING`, a run exposing zero jobs, or a missing required job is **not PASS**. A `SKIPPED` conditional job is not a successful execution of that job. Overall run success alone does not prove that a task was selected, patched, tested, or published; inspect the actual job and step outcomes.
5. If a Draft PR is published, check its exact head SHA, base SHA, changed-file list, diff, acceptance criteria, and required CI/review gates. Every changed path must be within the Issue's allowlist.
6. Keep the PR in Draft until the exact current head has the required terminal CI evidence and independent review. A previous SHA's passing result does not transfer to a newer commit.

**Runner availability is not asserted by this runbook.** Check a real, recent workflow run and its Runner job to establish point-in-time availability. Historical CI, Preview, or Runner results from PR #191 are not current availability evidence and are intentionally not used here.

## 6. Operational safety checklist

- [ ] Issue title begins with `[AI Task]` and the author meets the owner/planner rule.
- [ ] All four required sections are present exactly once and use the required bullet format.
- [ ] Allowed paths are minimal and within the current write allowlist.
- [ ] Dependencies are resolved and the task is not already represented by a task PR.
- [ ] The newest Actions run confirms whether a Runner job actually started; do not infer availability from history.
- [ ] PENDING, zero-job, SKIPPED, stale-SHA, and rate-limit states are recorded as blockers, not PASS.
- [ ] Candidate changes remain within the approved paths and are reviewed as a Draft PR.
- [ ] Exact-head CI and independent review pass before any separate release decision.
