# Agent Factory V2 — Architecture and Failure-Prevention Plan

Status: Design baseline only. No runtime code or production workflow has been changed by this document.
Repository: X84657465/global-citizen-ai-network
Baseline branch: main
Design branch: architecture/agent-factory-v2-design
Review date: 2026-11-19

## 1. Executive decision

Stop adding independent repair workflows. Keep the existing GitHub Actions + one Windows self-hosted Runner + local Ollama + Docker sandbox stack. Reorganize it around one durable task queue, one worker execution path, one authoritative state writer, and a bounded recovery policy.

Do not introduce n8n, another database, another scheduler service, a second agent framework, or another global state mechanism in this phase.

The factory must create Draft PRs only. AI must never approve, merge, close the source task issue, or deploy to production. Human approval remains mandatory.

## 2. Evidence-based findings from main

The following findings were verified by reading the current main branch source and workflow files on 2026-11-19.

### 2.1 Runner contention is architectural

- .github/workflows/ci.yml has two separate self-hosted jobs: build and database.
- The same workflow then schedules a third self-hosted job for successful circuit-breaker reset, or a separate self-hosted failure-recording job.
- .github/workflows/agent-task-preflight.yml has a separate self-hosted validation job and a separate task worker job.
- The CI workflow concurrency group is scoped by PR number/ref, while the preflight workflow uses a different group. These groups do not create one repository-wide runner queue.
- One physical Windows Runner therefore receives jobs from multiple independent workflow queues. A job can pass while its state-update job remains queued.

### 2.2 The scheduler is not strict FIFO

scripts/select-agent-task.mjs uses a hard-coded priorityOrder array before issue number. It does not sort all eligible tasks by creation time. The current behavior is priority ordering with issue-number tie-break, not FIFO.

The task queue is durable in GitHub Issues, so coalescing trigger events can be safe only if every worker invocation re-scans the entire eligible queue and no task reservation is lost.

### 2.3 Workflow concurrency can replace pending events

The preflight workflow uses one concurrency group for schedule, issue, dispatch, and manual triggers. GitHub's default concurrency behavior allows one running and one pending item in a group; a newer pending run can replace the older pending run. This is not a durable event queue.

Use concurrency only as a runner gate. The GitHub Issues backlog remains the durable task queue.

### 2.4 Factory state has two competing copies

scripts/agent-factory-controller.mjs reads and writes:
- a local JSON file under the runner account's home directory; and
- a base64 state payload in the machine-managed GitHub Issue #100.

The controller selects whichever state has the newer updated_at timestamp. Its check mode can return early based on local cooldown without first checking remote state. This allows stale local state to hide a remote recovery.

State writes are read-modify-write operations without an explicit version/lease protocol. Multiple workflow entry points can update the same state record. Even if one runner serializes execution today, this design is fragile under retries, manual dispatch, duplicate events, or a future additional runner.

### 2.5 Publisher has a partial-success recovery gap

scripts/publish-agent-patch.mjs creates Git blobs, a tree, a commit, a branch ref, a Draft PR, and may dispatch CI. It detects an existing open PR by the issue marker, but it does not first recover and verify an already-created deterministic branch if a previous attempt created the ref and then lost its response before PR creation.

The new-PR duplicate-dispatch fix in PR #133 is correct in principle: a newly opened PR should rely on pull_request: opened. Explicit dispatch should be reserved for revalidating an already-open PR.

### 2.6 Current verification is synthetic, not end-to-end

Preflight #106 completed its synthetic Ollama, Docker isolation, scratch patch, offline test, Publisher dry-run, unit, TypeScript, and lint steps successfully. Its prepare-task job was skipped because the run was a push event. This proves the synthetic validation chain, not a real Issue-to-Draft-PR task.

Main CI #1497 and PR #133 CI later completed successfully, including the state reset job. Issue #100 was then verified with consecutive_failures = 0 and cooldown_until = null. The old global cooldown is currently recovered; the design flaws above remain.

## 3. Target architecture

### 3.1 Keep the stack small

- GitHub Issues: durable task backlog and operator-visible task specification.
- One factory controller: selection, reservation, state transitions, retry policy, and recovery decisions.
- One Windows self-hosted Runner: one active factory/CI job at a time.
- Local Ollama: planning and bounded patch proposal only.
- Docker: disposable, non-root, resource-limited validation sandbox.
- GitHub Draft PR: review boundary and immutable candidate reference.
- GitHub Actions: event delivery, runner execution, CI, and logs.

No new database or orchestration platform is required.

### 3.2 Ownership boundaries

Only the factory controller may:
- select and reserve a task;
- transition task state;
- increment task or system failure counters;
- set or clear cooldown;
- release a stale lease;
- decide whether another task can start.

CI validates a candidate PR and reports a structured outcome. It must not run a second independent state-management implementation. The controller processes the CI outcome through the same serialized state-transition path.

### 3.3 One task state machine

Use explicit states:

queued -> reserved -> preparing -> planning -> patching -> sandbox_testing -> publishing -> draft_pr_created -> awaiting_ci -> completed

Failure paths:

- task-scoped validation failure -> retry_wait -> queued
- retry limit reached -> quarantined
- system/infrastructure failure -> system_cooldown
- lease expired after runner interruption -> recoverable queued state
- CI failure -> candidate_rejected or retry_wait, according to the structured failure classification

A task is not considered completed merely because a PR was created. It is completed for factory accounting only when the expected PR exists, the exact head SHA has CI evidence, and the PR remains Draft with human review required. The source Issue remains open until a human closes it according to repository policy.

### 3.4 Reservation and crash recovery

Before processing a task, persist:
- issue_number;
- task_attempt;
- state;
- lease_owner (runner name);
- lease_started_at;
- lease_expires_at;
- workflow_run_id and run_attempt;
- selected_base_sha;
- idempotency_key.

Use a bounded lease (initial proposal: 90 minutes, greater than the 60-minute worker timeout plus cleanup margin). On startup, recover expired leases only after confirming the associated workflow run is no longer in progress. Never let a second worker silently steal a live lease.

The task queue remains in Issues. The machine-managed state Issue remains a compact operational ledger, not an alternate source of task truth.

### 3.5 One authoritative state writer

Keep one remote state record, but remove local JSON as an authoritative competing copy.

- Remote state is authoritative.
- Local cache is read-only diagnostic cache and must never override remote state.
- Read remote state before every state-dependent dispatch decision.
- If remote state cannot be read, fail closed: do not start another task.
- Store schema_version, state_version, updated_at, last_processed_event_id, active_task, lease, system_failures, task_failures, quarantine list, last_error_code, and last_success_at.
- Make event processing idempotent by workflow run ID + run attempt + event type.
- Serialize all writes through the single controller path. Re-fetch before write and reject stale state_version. Do not use updated_at comparison as a concurrency-control mechanism.

### 3.6 One runner gate across all self-hosted workflows

Use one shared job-level concurrency group for every job that requires the Windows Runner, including CI and factory execution. Configure a bounded queue (GitHub Actions queue: max, up to the documented limit) and cancel-in-progress: false. Retain a separate workflow-level per-PR coalescing group where appropriate so obsolete commits from the same PR do not consume the runner.

The scheduler's durable issue queue means a replaced scheduler trigger does not lose work: the next invocation always scans the complete backlog. Monitor queued age and alert before the 24-hour GitHub job queue expiry.

Do not claim that independent concurrency groups serialize a physical runner. They do not.

### 3.7 Reduce runner job count

Refactor CI into one self-hosted job that runs, sequentially:
1. toolchain and checkout validation;
2. migration/schema safety checks;
3. npm ci;
4. unit tests;
5. TypeScript;
6. ESLint;
7. production build;
8. local Supabase/PostgreSQL/RLS verification;
9. cleanup;
10. one final structured state/reporting step.

Remove separate self-hosted circuit-breaker success and failure jobs. The final step must run with an always() condition, inspect earlier step outcomes, and make one idempotent controller call. Do not reset global state if any required health/validation step failed.

The CI job must have the minimum permissions required for its final reporting step. Normal build/test steps do not need write permissions.

### 3.8 Reduce redundant preflight work

- Keep the real task worker as the only event-driven task executor.
- Keep synthetic Ollama + Docker environment smoke tests, but run them manually and on a low-frequency health schedule (initial proposal: daily), not on every factory-related push.
- Normal code changes use the standard CI workflow.
- Change the fallback task poll from every 5 minutes to every 15 minutes initially. Issue events and explicit task-completion handoff remain the fast path. The poll is a recovery mechanism, not the main task queue.
- Process at most one task per worker invocation; after a task outcome is persisted, dispatch exactly one follow-up scan if another eligible task may exist.

## 4. Failure classification and bounded retry policy

Count one failed attempt once, after the complete attempt has been classified. Do not increment counters independently in multiple steps for the same attempt.

| Failure | Scope | Policy |
|---|---|---|
| Invalid task structure, unauthorized task, path violation | Task | Reject; do not call Ollama |
| Invalid/truncated/oversized model output after bounded model retries | Task | Increment task attempt |
| Candidate unit/type/lint/build assertion fails | Task | Increment task attempt; quarantine after 3 |
| Ollama service unavailable or request transport fails | System | Retry 2 times with backoff; then system failure |
| Docker daemon unavailable, image pull failure, disk full | System | Fail preflight; no task attempt consumed |
| npm registry/network transient during install | System | Retry once, then system failure |
| Reproducible dependency/lockfile incompatibility | Task or repository-maintenance | Record exact diagnostic; do not loop |
| GitHub 429 / secondary rate limit | System | Honor Retry-After; otherwise honor x-ratelimit-reset; exponential backoff |
| GitHub 5xx / network timeout | System | Bounded retry only for idempotent operations |
| Permission 401/403 (not rate limit) | Configuration | Stop immediately; require operator permission repair |
| Branch already exists after ambiguous create response | Recovery | Fetch branch and verify expected commit/digest; reuse only if exact |
| PR already exists for issue marker | Recovery | Reuse existing PR; never create duplicate |
| Runner offline/restarted | System | Lease expiry + workflow state reconciliation; resume safely |
| CI event for stale PR head SHA | Superseded | Mark stale run superseded; validate latest head only |

Initial limits:
- Task failures: 3 attempts per Issue, then quarantine; never stop unrelated tasks.
- System failures: 3 consecutive failures, then 15-minute cooldown.
- Ollama planning request: 3 minutes; patch generation: 15 minutes total, configurable within a hard 30-minute ceiling.
- GitHub API request timeout: 15 seconds; bounded retries for network/5xx/429 only.
- Docker dependency installation: 15 minutes, one retry for transient registry/network failure.
- Whole task worker: 60 minutes; cleanup and state persistence must still run.
- Runner queue alert threshold: 15 minutes; escalate at 60 minutes; GitHub hard queue expiry is 24 hours.

For GitHub rate limiting, honor Retry-After first, then x-ratelimit-reset when remaining quota is zero. For secondary limits without headers, wait at least one minute and use increasing backoff. Never retry non-idempotent POST blindly.

## 5. Component-level implementation plan

| File / workflow | Required change |
|---|---|
| .github/workflows/ci.yml | Merge build + database checks into one self-hosted job; shared runner gate; remove separate state writer jobs; one final state report |
| .github/workflows/agent-task-preflight.yml | Keep one task worker; 15-minute fallback; daily/manual synthetic smoke test; shared runner gate; one-task-per-run |
| scripts/agent-factory-controller.mjs | Replace local/remote timestamp arbitration; add versioned state, lease, idempotent event handling, one state writer, recovery |
| scripts/select-agent-task.mjs | True FIFO by created_at then issue number; explicit priority only if task schema includes it; never rely on hard-coded issue-number list |
| scripts/prepare-agent-task.mjs | Distinguish invalid task from GitHub/network/system failures; emit structured error code |
| scripts/generate-agent-plan.mjs | Use bounded request helper; keep model warm across plan + patch; validate schema and base SHA |
| scripts/generate-agent-patch.mjs | Bounded retry for malformed output; keep transport failures system-scoped; preserve one total deadline |
| lib/ollama-generate-stream.mjs | Enforce stream deadline, max bytes, valid terminal marker, and clear error categories |
| scripts/apply-agent-patch-to-scratch.mjs | Verify sandbox output and base SHA; ensure scratch path is unique per run and cleaned on all exits |
| scripts/publish-agent-patch.mjs | Recover deterministic existing branch; verify exact tree/commit; idempotent PR lookup; no duplicate dispatch for new PR |
| lib/agent-factory-policy.mjs | Pure state transitions with explicit task/system scopes, lease expiry, event idempotency, and retry timing |
| lib/github-api-client.mjs (new) | Shared timeout, Retry-After, rate-limit handling, bounded retries, and method-aware idempotency |
| tests/agent-factory-integration.test.mjs (new) | End-to-end controller state-machine and publisher partial-success recovery tests |
| docs/agent-factory-operations.md (new or replace existing operator docs) | One accurate runbook with pause/resume, diagnostics, queue, and recovery |

Security rule: remove the special AI write exception for .github/workflows/agent-task-preflight.yml. All .github workflow files remain human-maintained only. PR #119's exact-path exception must not be adopted into the new design.

PR #132's task-vs-system classification and PR #133's duplicate-dispatch correction are useful changes to preserve conceptually, but they should be integrated into the single planned change set after review, not merged as unrelated repair layers.

## 6. Fault-injection test matrix

| Test | Injection | Expected evidence |
|---|---|---|
| Ollama unavailable | Stop service before task | No patch step; system failure recorded; cooldown only after threshold |
| Ollama malformed output | Return invalid JSON / truncated stream | Bounded retry; task failure counted once |
| Docker unavailable | Stop Docker daemon | Task remains unconsumed; system failure recorded |
| npm registry timeout | Block registry during install | One retry; no duplicate branch/PR |
| GitHub 429 | Mock 429 + Retry-After | No request before header delay |
| GitHub 403 permission | Remove required permission in test app | Immediate configuration failure, no retry loop |
| Runner restart | Terminate worker after reservation | Expired lease recovered; task is not duplicated |
| Duplicate issue event | Deliver same event twice | One reservation and one active attempt |
| Duplicate CI event | Deliver same run ID twice | State transition applied once |
| Branch creation ambiguous | Simulate successful POST with lost response | Existing branch fetched and verified, no second branch |
| PR creation ambiguous | Simulate successful PR POST with lost response | Existing marker PR recovered, no duplicate |
| CI stale SHA | Queue old then new PR head | Old run superseded; latest SHA is the accepted evidence |
| Task failure limit | Fail same task 3 times | Task quarantined; next eligible Issue starts |
| System failure limit | Fail infra 3 times | 15-minute cooldown; no task starts before expiry |
| Remote state unavailable | Block GitHub state read | Fail closed; do not use stale local cache to dispatch |
| Cleanup interruption | Kill sandbox test | Orphan cleanup runs on next startup; no workspace reused |
| Runner queue saturation | Queue multiple CI + task events | One active runner job; bounded pending queue; no duplicate task claim |

## 7. Acceptance criteria

Do not call the factory complete until all of the following are demonstrated:

1. A real owner-authored Issue is selected and reserved.
2. Ollama creates a valid plan and patch proposal.
3. Docker applies and tests the candidate in a disposable non-root sandbox.
4. Publisher creates exactly one Draft PR for that Issue.
5. The PR is validated against the exact head SHA.
6. No automatic approval, merge, source issue closure, or production deployment occurs.
7. The worker automatically selects the next eligible Issue without a human prompt.
8. One deliberately failed task is quarantined after 3 attempts while the next task proceeds.
9. Injected Ollama, Docker, GitHub API, and Runner restart failures recover according to policy.
10. No duplicate branch, PR, state transition, or task reservation occurs.
11. The queue remains operational for a 24-hour unattended observation window with evidence logs.
12. The final report includes run IDs, issue numbers, PR URLs, exact head SHAs, test outcomes, retry counters, and recovery evidence.

A green unit-test suite or successful synthetic preflight is not sufficient.

## 8. Rollout and rollback

### Phase A — Design and baseline (this branch)
- Freeze unrelated factory changes.
- Review the existing open factory PRs.
- Finalize the architecture and acceptance criteria.
- Do not merge PR #119, #132, or #133 during this phase.

### Phase B — One integrated implementation branch
- Build the state model and pure tests first.
- Implement the shared GitHub API helper and controller.
- Refactor selector and publisher idempotency.
- Refactor CI and worker concurrency as one change set.
- Add fault-injection tests before enabling the new scheduler.
- Keep old scheduler disabled during cutover; do not run two dispatchers concurrently.

### Phase C — Staging and proof
- Run unit, static, Docker, Ollama, and integration tests.
- Run one real Issue end-to-end.
- Run a second real Issue without manual continuation.
- Inject failures and verify recovery.
- Observe 24 hours before declaring unattended operation.

### Rollback
- Pause new task dispatch first.
- Preserve all Issues, PRs, artifacts, and the machine-managed state record.
- Restore the previous workflow/controller revision as one coordinated rollback.
- Never delete candidate branches or close PRs as part of automatic rollback.
- Require a fresh health check before resuming the old worker.
- Keep human-only merge/deploy protections unchanged.

## 9. Operational constraints and unresolved verification

- Confirm the Windows Runner is installed as a Windows service and starts automatically. Verify with Get-Service and inspect the runner _diag directory and Windows Application event log. Do not assume service recovery settings from GitHub's registration status alone.
- Confirm Docker Desktop WSL 2 resource allocation, free disk space, and daemon readiness before task reservation. Docker Desktop's VM resource limits can constrain CPU, memory, and disk independently of host capacity.
- Keep Ollama request concurrency at one for this single-worker machine. Current plan and patch scripts use keep_alive: 60s; raise this to an initial 10m to avoid unnecessary model unload/reload between adjacent calls, then measure memory before changing further.
- Current task worker has a 60-minute job timeout; keep a strict overall deadline and cleanup path.
- No local Windows service or Docker Desktop settings can be verified from GitHub source alone. Those require an on-machine diagnostic run.

## 10. Official references

- GitHub Actions concurrency: https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency
- GitHub Actions limits: https://docs.github.com/en/actions/reference/limits
- GitHub workflow cancellation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-cancellation
- GitHub self-hosted runner monitoring: https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/monitor-and-troubleshoot?platform=windows
- GitHub Windows runner service: https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/configure-the-application
- GitHub REST API rate limits: https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api
- Ollama API: https://github.com/ollama/ollama/blob/main/docs/api.md
- Ollama FAQ and queue behavior: https://github.com/ollama/ollama/blob/main/docs/faq.mdx
- Docker Desktop resources: https://docs.docker.com/desktop/settings-and-maintenance/settings/
- Docker Desktop WSL 2: https://docs.docker.com/desktop/features/wsl

## 11. Concurrency design correction — verified against current GitHub documentation (2026-11-19)

The initial design must not rely on the old one-pending-run concurrency behavior. GitHub Actions now supports queue: max, allowing up to 100 pending jobs or workflow runs per concurrency group when cancel-in-progress is false or omitted.

Required implementation:
- Remove the preflight workflow-level concurrency group that currently serializes the whole workflow independently of CI.
- Add the same repository-wide runner gate at the job level to every job using the Windows self-hosted Runner, across CI and preflight workflows. Use one exact, stable group key such as global-citizen-ai-network-windows-runner.
- Configure queue: max and cancel-in-progress: false for the shared runner gate.
- Keep PR-level superseded-commit coalescing only where it cannot bypass the shared job-level runner gate.
- Consolidate CI build and database work into one self-hosted job as already specified. Do not create parallel self-hosted jobs that then wait on the same runner gate.
- Ensure preflight synthetic validation and real task processing cannot overlap on the same machine. If retained as separate jobs, both must use the same runner gate.
- Monitor pending queue depth and oldest queued age. GitHub permits at most 100 pending items per concurrency group; items beyond that are rejected/cancelled, so the durable Issue queue and periodic full rescan remain mandatory recovery mechanisms.
- Do not claim strict FIFO from GitHub concurrency. GitHub documents queue order by the time a job/run starts waiting on the concurrency group, not the time the event was dispatched; ordering is not guaranteed. Strict task order is implemented by the controller Issue scan using created_at and issue number as deterministic tie-break.
- A queued self-hosted job can fail after 24 hours if no matching Runner becomes available. Alert on queue age well before that limit.

This correction supersedes any earlier wording that could imply a single pending slot, unlimited queueing, or guaranteed event-dispatch FIFO.

## 12. PR disposition and merge-gate decisions

Verified open Draft PRs on 2026-11-19:
- PR #119: exact scheduler workflow write exception. Reject from V2. Keep .github/** excluded from AI-generated write paths. Do not merge.
- PR #132: classify malformed model patch output as task-scoped while preserving stream/transport failures as system-scoped. Preserve the intent, but integrate into the single V2 failure classifier. Do not merge independently.
- PR #133: avoid duplicate CI dispatch after creating a new Draft PR; rely on pull_request: opened for new PRs and explicit dispatch only for existing-PR revalidation. Preserve the intent and regression test in the V2 Publisher. Do not merge independently.

No PR is merged as part of this design phase. Rebase/port the approved portions into one V2 implementation branch after the complete state machine and tests are ready.
## 13. Additional source-code audit findings — confirmed on main

### 13.1 Preserve the existing task validation and dependency controls
- scripts/select-agent-task.mjs already paginates the complete Issues and PR collections, restricts tasks to owner-authored or explicitly planner-authored Issues, excludes open/merged task PRs, honors quarantined Issue numbers, and checks declared task dependencies.
- Preserve those protections. Replace only the hard-coded issue-number priorityOrder array. The task validator already supports an optional validated P0-P3 Priority field; V2 ordering should be explicit priority first (P0, P1, P2, P3, then no priority), then created_at ascending, then issue number ascending. This is deterministic FIFO within each explicit priority class. If product policy later requires strict FIFO regardless of priority, remove the optional priority field in the same change rather than silently ignoring it.

### 13.2 Correct the controller's local-state early exit
- scripts/agent-factory-controller.mjs currently checks local cooldown before any GitHub read and exits successfully. This can hide a newer remote reset or quarantine update.
- It later chooses local or remote state by updated_at, saves local state before remote persistence, and has no state_version or compare-and-swap. A failed remote PATCH can leave a newer local state that masks the remote state on the next run.
- V2 must always read the remote state before a state-dependent dispatch decision. Remote read failure must fail closed without writing a new local authoritative state. Local cache must never win over remote state.

### 13.3 Current API cooldown classification is too broad
- lib/agent-factory-policy.mjs currently returns a default 15-minute cooldown timestamp for essentially any API error, not only 429/secondary rate limits or transient 5xx/network errors. This can turn a 401/403 permission error, 404, validation error, or malformed response into a misleading temporary cooldown.
- V2 classification must separate: 401/403 permission/configuration (stop and alert; no retry loop), 404/422 or schema errors (permanent/request/task classification according to operation), 429/secondary rate limit (honor Retry-After then x-ratelimit-reset), 5xx/network/timeouts (bounded exponential retry), and unknown errors (fail closed with diagnostic; no automatic repeated write).
- Retry logic must be HTTP-method aware. Never blindly replay a non-idempotent POST after an ambiguous network timeout.

### 13.4 Task attempt counting is not event-idempotent
- The current controller increments counters whenever failure mode is invoked. It has no durable processed-event key, workflow run ID/run attempt identity, or duplicate-event guard.
- V2 must store a unique attempt/event key and apply each state transition at most once. A retry is a new attempt only after the previous attempt has been conclusively classified and closed.

### 13.5 Publisher recovery must verify the existing branch before creating anything
- scripts/publish-agent-patch.mjs currently looks for an existing open PR marker, then proceeds to create blobs, tree, commit, and a new branch ref. It does not recover a branch that was successfully created before a lost response or worker crash.
- V2 branch names must be deterministic from the Issue number and task attempt or patch digest. Before creating a branch, fetch the ref. If it exists, verify its commit/tree against the expected candidate digest and reuse it only on an exact match; otherwise stop for reconciliation. Before creating a PR, re-query open PRs by marker and head branch. If PR creation response is ambiguous, query again before retrying.

### 13.6 CI and task worker are currently independent concurrency domains
- ci.yml uses a PR/ref-scoped workflow concurrency group. agent-task-preflight.yml uses a separate repository-wide workflow concurrency group. These do not serialize each other.
- The preflight workflow itself contains two self-hosted jobs (validation-tests and prepare-task) which can consume the same physical runner at different times. CI currently has build and database self-hosted jobs plus separate state update jobs.
- V2 must put every self-hosted job across both workflows behind the exact same job-level runner gate. The single CI job consolidation remains mandatory. Do not rely on a workflow-level group in one workflow to gate another workflow.

These findings are implementation blockers, not optional cleanup. The integrated change must include unit tests for each regression before the new worker is enabled.
## 14. Lifecycle correction — worker lease and candidate CI are separate

The worker lease protects only the active task-generation worker. It must not be held until a separate pull_request CI workflow completes, because the original worker run has already ended while CI may still be queued or running.

Required lifecycle:
1. The worker acquires a lease and progresses through reserved, preparing, planning, patching, sandbox_testing, and publishing.
2. After the publisher creates or recovers the Draft PR, it records the exact pull_request_number and head_sha.
3. Transition to awaiting_ci persists candidate metadata and releases the worker lease. The task remains non-complete and is not eligible for another generation attempt while that candidate is pending.
4. CI reports its conclusion using a unique CI run ID + run attempt + exact head SHA + PR number. The controller accepts success/failure only if the evidence matches the currently pending candidate.
5. Exact-head CI success marks the task completed. A stale SHA result is marked superseded and must not overwrite the current candidate.
6. Candidate CI failure is recorded separately from worker-generation retries. It becomes candidate_rejected and remains visible for human review; it does not silently count as a new generation attempt while the existing PR remains open.

Worker lease expiry recovery applies only to a worker that still owns active_task. It must never reclaim an awaiting_ci candidate merely because the generation workflow has completed. CI completion is reconciled by PR identity and head SHA, not by the generation worker's lease.

## 15. V2 implementation branch progress (not yet integrated or runtime-verified)

Implementation branch: feat/agent-factory-v2 (created from main).

Added as isolated, not-yet-integrated modules:
- lib/agent-factory-state-machine.mjs: versioned state schema, one active worker lease, legal transitions, task/system failure separation, event idempotency, retry backoff, quarantine, lease recovery, and exact-head candidate CI callbacks.
- tests/agent-factory-state-machine.test.mjs: transition, lease, retry, quarantine, duplicate event, system cooldown, and candidate evidence cases.
- lib/agent-task-queue.mjs and tests/agent-task-queue.test.mjs: explicit P0-P3 priority then FIFO creation time and issue-number tie-break.
- scripts/select-agent-task.mjs now uses the queue comparator instead of a hard-coded list of Issue numbers.
- package.json includes the new unit test files in test:unit.

These changes are committed on the implementation branch only. They have not yet been run in the Windows Runner or integrated with the current controller, Publisher, or workflows. Do not enable the V2 worker until integration and CI evidence are complete.