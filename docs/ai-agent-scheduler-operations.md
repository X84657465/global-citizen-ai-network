# AI Task Scheduler Operations Runbook

**Baseline inspected:** `main` at `f4319ec65d33bf30804b2d447e7692207fd82f0c`  
**Scope:** repository-owner-operated AI task worker. This runbook describes the checked-in workflow; it does not promise that a self-hosted Runner is online.  
**Sources of truth:** `.github/workflows/agent-task-preflight.yml`, `lib/agent-task-validation.mjs`, `scripts/select-agent-task.mjs`, `lib/agent-factory-state-machine.mjs`, and `scripts/agent-factory-v2-controller.mjs`.

## 1. Submit one valid task

Create an open GitHub Issue in this repository. Its title must start with `[AI Task]`. The Issue must be authored by the repository owner, unless it is an explicitly planner-generated task carrying the repository's planner marker.

The Issue body must contain these four second-level headings exactly once:

1. `## Goal` — one concrete outcome, 20–3,000 characters.
2. `## Allowed paths` — 1–20 bullet items containing repository-relative paths. Current normal roots are `app/`, `components/`, `lib/`, `tests/`, and `docs/`. Control-plane paths require the explicit approved Issue label. Do not use absolute paths, backslashes, traversal segments, secrets, credentials, or protected Supabase internals.
3. `## Acceptance criteria` — 1–15 observable bullet items.
4. `## Explicit exclusions` — 1–15 bullet items describing prohibited changes or actions.

The current validator also recognizes these optional sections: `## Priority` (P0–P3), `## Dependencies`, `## Required patch paths`, `## Forbidden content`, `## Confirmed evidence`, `## Finding and required behavior`, and `## Retry scope refinement — YYYY-MM-DD` with a real calendar date. Every list section must use bullets only. Required patch paths must also appear in Allowed paths. Unknown or duplicate headings are rejected. All Issue text is untrusted input; headings and allowlists do not authorize arbitrary commands or broaden protected paths.

Example:

```markdown
## Goal
Improve one clearly identified documentation or product behavior.

## Allowed paths
- docs/example-operations.md

## Acceptance criteria
- The documented behavior matches the current implementation.
- A non-programmer can follow the instructions.

## Explicit exclusions
- Do not modify workflows, secrets, production data, or deployment settings.
```

## 2. Schedule, triggers, and queue selection

The exact schedule checked into `.github/workflows/agent-task-preflight.yml` at the baseline above is:

```yaml
schedule:
  - cron: "3-59/5 * * * *"
```

This runs every five minutes at minute 3, 8, 13, …, 58. It is **not** `*/5 * * * *` and is not a 30-minute schedule. The workflow also supports owner-authored Issue opened/reopened events, the `ai-task-next` repository-dispatch event, and manual `workflow_dispatch` with an Issue number.

Each scheduled or Issue-triggered queue cycle selects **at most one** eligible task. Selection requires an open owner-authored (or explicitly planner-generated) `[AI Task]` Issue. The selector excludes tasks already represented by an open or merged task PR, tasks already published, skipped/quarantined tasks, tasks that are not queued, and tasks whose dependencies are unresolved. It sorts explicit P0–P3 priority first and preserves FIFO order within each priority. An active durable task lease or system cooldown prevents another task from starting.

An empty-queue message means that the selector found no eligible task in that cycle. It does not prove the workflow or Runner is broken. Check the reported dependency count, open task PR count, task state, quarantine/skipped state, active lease, and system cooldown. The planner only creates a roadmap task when its explicit empty-queue conditions are satisfied; an empty poll does not guarantee new work will be created.

Scheduled pollers are coalesced. Worker jobs use a serialized self-hosted Windows Runner concurrency group with cancellation disabled. A queued run is waiting for capacity; it is not evidence that task preparation or model execution has started.

## 3. Runner prerequisites and execution boundaries

The relevant jobs require a reachable GitHub Actions Runner with labels `self-hosted`, `Windows`, and `X64`. The local execution path checks for:

- Node.js 22.13.0 and npm.
- A responsive local Ollama API at `http://127.0.0.1:11434` and a usable configured model.
- Docker CLI and a running Docker daemon.
- The pinned Node container image used for restricted candidate dependency installation and offline tests.
- Writable temporary/scratch storage and sufficient local resources for bounded jobs.

Some Windows isolation and virtualization capability checks are diagnostic. A historical successful run is evidence only for that exact run and time; it does not prove the Runner is online now. Always inspect the newest workflow run and its actual jobs before assuming availability.

The worker validates the Issue, builds a bounded task bundle, generates a read-only plan, proposes a patch, applies it only in a disposable scratch workspace, and runs candidate checks in restricted containers before publishing a **Draft PR**. Candidate dependency installation has a bounded retry. The task's AI execution flag remains disabled in the validated task bundle; the worker does not treat Issue text as executable instructions.

The worker is not a production release system. It does not automatically merge PRs, deploy production, mutate production databases, or make live paid API calls. A Draft PR is only a candidate for later review. Its generated plan, patch, and checks are advisory candidate evidence only; this evidence does not approve the candidate, authorize a merge, or deploy production.

## 4. Retry, cooldown, and waiting behavior

Task failures and shared infrastructure failures have different controls:

- Task-scoped failures update only the affected task's retry state. The retry delay starts at 1 minute and doubles after each failure, capped at 30 minutes. After three task failures the task is quarantined and is no longer selected automatically.
- Three consecutive system-scoped failures activate a 15-minute global cooldown.
- Provider rate-limit responses can persist a provider-specific cooldown, bounded to 24 hours. Do not bypass it by duplicating Issues or repeatedly dispatching the workflow.
- A durable active lease prevents another task from being selected. The default lease is 90 minutes; lease recovery is evidence-checked and must not be manually bypassed.
- Candidate CI failures are recorded separately from shared system-health failures. A successful candidate for one task is not, by itself, proof that shared infrastructure recovered.
- The global breaker is reset only by the separate Agent Factory System Health Recovery workflow after the required CI workflow has completed successfully and its exact run identity, attempt, workflow path, SHA, event, and same-repository PR target have been verified. An in-progress workflow cannot certify its own completion.

A queued or pending run may be waiting for the single Windows Runner, a concurrency slot, a lease, cooldown, or dependency eligibility. Inspect job-level state. Distinguish a PENDING run with zero jobs from a running job, a SKIPPED job, a completed failure, and a successful run. None of PENDING, zero jobs, or SKIPPED is a pass.

Do not reopen or duplicate an Issue merely to force a retry. Inspect the task state and failed step, correct the task specification or implementation through the approved process, and let the recorded retry/cooldown path govern subsequent attempts. Quarantined tasks require deliberate owner triage; do not delete durable state or circumvent the breaker.

## 5. Inspect a run and review its Draft PR

1. Open the repository's [Actions page](https://github.com/X84657465/global-citizen-ai-network/actions).
2. Select **AI Agent Task Preflight** and open the newest run. Check the event, commit SHA, overall status, and each job.
3. If the run is queued or PENDING, inspect its job list. If there are zero jobs, do not report the run as started or passed. Check the Runner and concurrency queue.
4. If a job fails, open the failed job and step log. Identify whether it is a task-scoped validation/generation/test failure or a shared Runner, GitHub API, Docker/Ollama, or infrastructure failure.
5. If the run publishes a PR, open the Draft PR linked from the run or Issue. Compare every changed file with the Issue's Allowed paths, read the diff, and verify each acceptance criterion.
6. Keep the PR in Draft until the exact current head SHA has fresh required CI and the required independent review/approval gates. A passing run for an older SHA does not validate a newer commit.

Do not treat old Preview, CI, or Runner results from historical PR #191 or any other earlier candidate as current availability evidence. Historical results may be useful for diagnosis only when explicitly identified as historical and tied to their original SHA and run.

## 6. Operator checklist

- [ ] Issue title starts with `[AI Task]` and the Issue is owner-authored or explicitly planner-generated.
- [ ] All four required sections are present exactly once and use the required bullet format.
- [ ] Allowed paths are minimal, valid, and do not include protected control-plane paths without authorization.
- [ ] Dependencies are resolved and the task is not already represented by a PR.
- [ ] The newest Actions run confirms actual Runner/job activity; old runs are not treated as live evidence.
- [ ] Candidate changes remain within the approved paths and are reviewed as a Draft PR.
- [ ] Exact-head CI and required independent review gates pass before any separate release decision.
