## 2.0.22 — 2026-11-20

### Durable write confirmation
- Verify GitHub returns the expected machine-managed Issue and exact persisted state payload after both creation and update.
- Reject stale or misleading successful-looking responses; reread the durable record before treating an ambiguous write as recovered.

### Regression coverage
- Add a PATCH response fixture that returns the previous state and verify the store rejects it without reporting the new version as persisted.

### Verification
- Exact-head Windows Runner CI remains required; no test pass is claimed.

## 2.0.21 — 2026-11-20

### Lease recovery hardening
- Require completed GitHub Actions runs to include a recognized conclusion before recovering an expired lease.
- Fail closed for null, missing or unknown conclusions while preserving the active lease and state version.

### Regression coverage
- Add controller cases for missing and unsupported workflow conclusions.

### Verification
- Exact-head Windows Runner CI remains required; no test pass is claimed.

## 2.0.20 — 2026-11-20

### Reliability regression coverage
- Cover expired-lease handling when a GitHub Actions run is rerun under the same run ID.
- Verify a newer in-progress attempt keeps the lease reserved, a completed newer attempt permits recovery, and an older attempt can never authorize recovery.

### Verification
- Exact-head Windows Runner CI remains required; these are added regression tests, not a claimed test pass.

## 2.0.19 — 2026-11-20

### Reliability
- Verify the GitHub Actions workflow-run response ID exactly matches the active lease's persisted workflow ID before considering an expired lease recoverable.
- Fail closed on mismatched or malformed workflow identity responses.

### Regression coverage
- Add a controller test proving a completed response for a different run ID cannot release the active lease.
- Update workflow recovery fixtures to include the authoritative GitHub run ID.

### Verification
- Exact-head Windows Runner CI is required; no live lease recovery or production state mutation is claimed.

## 2.0.18 — 2026-11-20

### Fixed
- Correct the default-branch schedule-gate regression assertion's newline handling so it tests the workflow YAML rather than a literal backslash sequence.

### Verification
- Exact-head Windows Runner CI remains required.

## 2.0.17 — 2026-11-20

### Reliability
- Clarify the default-branch-only execution boundary for scheduled and manually dispatched GitHub Actions workflows.
- Document the release dependency that prevents feature-branch V2 code from migrating production Issue #100 before the V2 workflow is incorporated into the default branch.
- Specify exact-SHA Runner evidence and same-Issue schema-v2 read-back as migration acceptance criteria.

### Tests
- Add a CI policy regression assertion that keeps this operational boundary visible.

### Verification
- Documentation and policy-test changes only; no production Issue mutation or migration is claimed.

## 2.0.16 — 2026-11-20

### Reliability
- Add a regression test for V1-to-V2 migration through the configured state-Issue ID used by the production workflow.
- Verify migration updates the existing state Issue in place, preserves failure/quarantine history, and does not create a duplicate Issue.

### Verification
- Exact-head Windows Runner CI and a real controller migration remain required; the test fixture is synthetic and does not mutate production Issue #100.

## 2.0.15 — 2026-11-20

### Reliability
- Isolate five-minute scheduled pollers from issue, repository-dispatch and manual task triggers at workflow concurrency level.
- Add a shared bounded Runner queue to both preflight self-hosted jobs so actionable task runs are not displaced by recurring polls.

### Regression coverage
- Assert poller-only coalescing, unique actionable workflow runs, and shared Runner serialization for validation and task-worker jobs.

### Verification
- Exact-head CI is required. The current change does not claim real task planning, patch validation or publication; those require an actionable run on the default-branch workflow.

## 2.0.13 — 2026-11-20


### Reliability
- Retry one incomplete Ollama patch-generation stream with a fresh bounded request; discard partial output and retain strict completion-marker validation.
- Do not retry malformed NDJSON, provider errors, HTTP errors or unrelated failures.

### Regression coverage
- Cover successful retry, partial-output isolation, non-retryable malformed streams, and the two-attempt ceiling.

### Verification
- Exact-head CI and live Windows Runner/Ollama task acceptance are required before this release is accepted.

### Rollback
- Revert the exact Agent Factory V2 change commit; no database migration or production data change is involved.

# Agent Factory V2 changelog

## 2.0.10 — 2026-11-20

### Fixed
- Enforce the ISO-8601 maximum timezone offset of ±14:00 for persisted factory timestamps.

### Tests
- Accept the valid +14:00 boundary and reject +14:01 and -15:00.

### Verification
- Exact-head Windows Runner CI required.

## 2.0.9 — 2026-11-20

### Fixed
- Tighten durable state timestamp validation to reject impossible calendar dates, out-of-range clock and timezone fields, and timezone-less values.

### Tests
- Add malformed timestamp regressions for factory state update and lease-related validation.

### Verification
- Exact-head Windows Runner CI required before acceptance.

## 2.0.0

- Introduce the durable task lifecycle with explicit state transitions and a persistent state store.
- Add lease ownership, workflow-attempt-aware recovery, retry scheduling, quarantine and system cooldown controls.
- Add bounded candidate patch validation, isolated scratch testing and deterministic Draft PR publication.
- Add lifecycle, state-machine, policy, path-safety, publisher and integration regression coverage.
- Add an operations runbook documenting Windows Runner, Docker, Ollama, CI, recovery and security boundaries.
- Add the Factory V2 operations console at `/factory` (demonstration status only; live runner telemetry is not implied).

**Release status:** development candidate under PR #134. Version metadata does not constitute release acceptance; exact-head CI and independent review remain required.

## 2.0.1

- Fix an escaped newline in the patch generator comment that prevented `patchBatches` from being declared at runtime.
- Add an explicit Node.js syntax-validation step for the patch generator and factory controller to CI.

**Verification:** exact-head CI is required; not yet accepted as complete.

## 2.0.2

- Exclude the database-backed two-member RLS integration test from the generic unit-test discovery runner.
- Execute that test in the isolated Supabase database job after migrations and SQL RLS tests, using the local `DB_URL` only.
- Allow dependent five-track pull requests targeting the integration branch to run the full CI workflow.

**Verification:** exact-head CI required.

## 2.0.3

- Classify failures from the two-member application RLS integration test as task-level validation failures, not infrastructure failures.
- Add a CI policy regression assertion for the application RLS test step and its failure classification.

**Verification:** exact-head CI required.


## 2.0.4

- Run the two-member application RLS integration suite through the isolated Supabase PostgreSQL container, avoiding an undeclared host-side `psql` dependency on Windows Runner.
- Scope all factory workbench table header and cell selectors under the local `.tableWrap` CSS Module class.
- Extend CI policy coverage for isolated-container RLS execution.

**Verification:** fresh exact-head CI required; previous run failed because the host Runner lacked `psql` and the factory CSS Module contained unscoped table selectors.


## 2.0.5

- Resolve the Docker executable explicitly on Windows Runner and pass the isolated Supabase container name into the current test process.
- Improve subprocess diagnostics so missing executables, spawn errors and exit status are visible in RLS test output.
- Update CI policy regression coverage for the current-step Docker/container environment.

**Verification:** exact-head CI is required; this version is not accepted until the full build and database/RLS jobs pass.

## 2.0.6

- Emit a validated `EvidenceRecord v1.0.0` for exact candidate CI success/failure callbacks.
- Bind evidence to the deterministic task branch, exact 40-character candidate SHA, PR number, workflow run ID and run attempt.
- Publish a machine-readable `candidate-evidence.json` workflow artifact with a 90-day retention window; do not emit duplicate artifacts for replayed callback events.
- Keep cancelled and non-terminal runs out of the scored evidence stream.

**Verification:** exact-head CI required. Export is not a live Predictive Coding ingestion or production decision.

## 2.0.7

- Update durable lifecycle integration fixtures to include the exact deterministic candidate branch ref on terminal CI callbacks.
- Keep candidate evidence generation strict: callbacks without an exact branch ref remain rejected.
- Add regression coverage for single-task, 24-task, failure/backoff and retry-success lifecycles under the EvidenceRecord export contract.

**Verification:** exact-head Agent Factory Preflight and full CI must pass before acceptance.


## 2.0.8

- Trigger full CI on controlled A-E feature branch pushes, in addition to main and pull-request events.
- Keep the push allowlist explicit and build execution restricted to repository-owner events.
- Extend CI trigger policy regression coverage for the five controlled workstreams.

Verification: exact-head CI and database/RLS validation are required. No merge or deployment is implied.
