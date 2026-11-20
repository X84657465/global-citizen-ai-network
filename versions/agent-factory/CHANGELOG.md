## 2.0.42 — 2026-11-20

### Changed — Enable safe A-line synthetic Runner preflight
- Allow owner pushes to `feat/agent-factory-v2` to execute the existing synthetic factory validation workflow.
- Keep live task processing and publication excluded from push events; only the read-only validation job is eligible.
- Add regression coverage for the trigger boundary and shared Runner serialization.

### Verification
- Previous exact head `17ca58d106c464e31ead51af7af041d55cc0e184` passed full CI run [#44721263122](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44721263122).
- New exact-head CI and Windows synthetic preflight are required before this change is accepted.

## 2.0.41 — 2026-11-20

### Fixed — Align PostgreSQL integration policy guard with port-based container discovery
- Update the CI regression test to assert the current Supabase DB_URL published-port lookup rather than the removed container-name assumption.
- Verify exactly one matching PostgreSQL container is selected and that discovery failures remain system-scoped while actual two-member RLS assertion failures remain task-scoped.
- Synchronize numeric repository and Agent Factory release metadata.

### Verification
- This corrects a stale policy assertion identified by static comparison of the latest CI workflow and its regression test. Exact-head full CI is required; no pass is claimed before it completes.

## 2.0.40 — 2026-11-20

### Fixed — Make local PostgreSQL integration portable across Supabase CLI container naming
- Locate the ephemeral PostgreSQL container by the DB port reported by Supabase, not an assumed container name.
- Distinguish container-discovery/infrastructure failures from actual two-member RLS assertion failures in the CI circuit-breaker classification.

### Verification
- Exact-head full CI and live Runner validation are required; no pass is claimed before the new SHA completes.

## 2.0.39 — 2026-11-20

### Fixed — Synchronize lockfile root metadata
- Align the package-lock root and root package entry with the repository release version.
- Preserve fail-closed handling for unsupported future state schemas.

### Verification
- Exact-head full CI and live Runner validation remain required.

## 2.0.38 — 2026-11-20

### Changed — Keep migration regression coverage singular
- Retain one focused regression test proving unknown future state schemas fail closed without mutating the durable Issue.
- Synchronize Agent Factory and repository release metadata.

### Verification
- Exact-head full CI and live Runner validation remain required.

## 2.0.37 — 2026-11-20

### Fixed — Fail closed on unsupported durable-state schemas
- Accept only supported V2 and known legacy V1/unversioned payloads for migration.
- Reject unknown future schema versions to prevent accidental downgrade and silent loss of scheduler metadata.
- Add regression coverage confirming the existing Issue payload is not mutated on rejection.

### Verification
- Exact-head full CI and live Runner validation are required; production Issue #100 was not modified.

## 2.0.36 — 2026-11-20

### Fixed — Preserve CI contract regression coverage
- Align the policy regression tests with the current full security audit, Windows Runner and bounded Ollama inference step names.
- Retain the exact count of candidate-evidence uploads without conflating diagnostic artifacts.
- Synchronize root package and manifest versions; no security checks are weakened.

### Verification
- Previous exact-SHA run passed 28/30 policy tests; the remaining two failures identified the missing runner and Ollama readiness steps, now restored. This commit requires a fresh full CI run.

## 2.0.35 — 2026-11-20

### Fixed — Restore local execution prerequisites to the factory CI
- Verify Docker Engine and the local Ollama API/model inventory on the Windows Runner.
- Execute the existing bounded structured-inference smoke test with a 180-second timeout before migration and database integration.
- Preserve all dependency audits, candidate SHA checks, Runner serialization and fail-closed behavior.

### Verification
- Exact-head CI found two policy-test failures because the required runtime capability and inference steps were absent. A fresh complete CI run on this commit is required before acceptance.

## 2.0.34 — 2026-11-20

### Fixed — Align CI regression guards with the current workflow contract
- Update policy tests to match the active full dependency audit and Windows Runner/Ollama verification step names.
- Assert exactly two candidate-evidence uploads by artifact path while allowing the separate CI diagnostic artifact.
- Preserve all blocking security audits and the bounded local inference requirement; no runtime behavior is changed.

### Verification
- The latest exact-head CI isolated four stale static assertions; corrected tests require a fresh full CI run on the new commit before acceptance.

## 2.0.33 — 2026-11-20

### Improved — Preserve offline candidate-test diagnostics
- Capture Docker offline-test stdout/stderr and its native exit code before failing the preflight step.
- Upload synthetic-validation and real-task test logs independently with failure-safe artifact steps.
- Add CI policy regression coverage for both diagnostic paths.

### Verification
- Targeted static policy assertions are added; full CI on the exact commit remains required for acceptance.

## 2.0.32 — 2026-11-20

### Fixed — Verify complete workflow evidence before recovering expired worker leases
- Strengthen the lifecycle integration test to ensure a completed workflow response without a conclusion cannot authorize lease recovery.
- Confirm recovery succeeds only after the same run ID, newer attempt, completed status, and terminal conclusion are all present.

### Verification
- This is a targeted regression fix. Full CI on the exact branch head remains required before acceptance.

## 2.0.31 — 2026-11-20

### Fixed — Align CI execution with the available Windows Runner
- Move resolver, quality, database/RLS, circuit-breaker callbacks and diagnostics to the verified Windows self-hosted Runner; remove reliance on unassigned `ubuntu-latest` jobs.
- Convert shell-dependent gates to PowerShell and serialize every job with the shared `queue: max` Runner concurrency group.
- Retain exact-head candidate fencing, non-cancelling state-writer behavior, verified Supabase CLI installation, isolated Windows-safe ports, and two-member RLS integration tests.

### Verification
- CI policy tests now require every CI job to use the shared Windows Runner and native PowerShell shell.
- Not accepted until all required jobs pass on this exact head, including Supabase, Ollama and application RLS integration.

## 2.0.30 — 2026-11-20

### Fixed — Preserve active factory state writers during CI coalescing
- Restore `cancel-in-progress: false` at workflow level. GitHub permits one active and one pending run per concurrency group; a newer pending run replaces the older pending run without cancelling active state-writing work.
- Retain per-PR concurrency grouping and exact event-head SHA validation.
- Do not treat runner allocation failures as application test failures; exact-head full CI remains mandatory.

### Verification
- Updated CI policy regression to enforce non-cancelling workflow-level concurrency.
- This release remains unaccepted until all required jobs pass on the exact head.

## 2.0.29 — 2026-11-20

### Fixed — Prevent stale ordinary PR runs from blocking current-head CI
- Supersede older workflow runs for the same ordinary PR/ref when a newer commit arrives.
- Keep AI-task PR workflow runs non-cancelling so durable factory state writes and Runner work are not interrupted.
- Preserve the dedicated shared Windows Runner queue with queue:max and cancel-in-progress:false.

### Verification
- Updated CI policy tests for conditional workflow cancellation and exact event-head SHA fencing.
- Exact-head full CI is mandatory; this release is not accepted until all required jobs pass.

## 2.0.28 — 2026-11-20

### Changed — Isolate PR metadata resolution
- Defer durable factory state Issue discovery until a PR is positively classified as an authorized AI-task PR.
- Ordinary product and documentation PRs no longer perform an unnecessary machine-state lookup during candidate resolution.

### Verification
- Added a CI regression assertion for lazy state lookup.
- Exact-head full CI remains required; no successful CI or production readiness is claimed.

## 2.0.27 — 2026-11-20

### Fixed — Workflow-attempt recovery fixture
- Populate the GitHub workflow run `id` in simulated run responses for original and rerun attempts so controller recovery tests match the actual GitHub Actions API contract.
- Preserve the negative case where missing `run_attempt` metadata must fail closed.

### Verification
- Exact-head full CI remains required; this change does not claim live lease recovery or production state mutation.

## 2.0.26 — 2026-11-20

- Set the Ubuntu candidate resolver to Bash instead of inheriting the Windows PowerShell default.
- Align PR concurrency grouping with the policy test: serialize by PR/ref, not by individual head SHA, so pending superseded commits coalesce.
- Added a regression assertion that Ubuntu-only control jobs use a Linux-compatible shell. Runtime verification remains pending exact-head CI.

## 2.0.25 — 2026-11-20

- Stabilized the exact-SHA concurrency policy test by matching the literal workflow expression.

## 2.0.24 — 2026-11-20

- Corrected the exact-SHA concurrency policy test's escaped-expression matcher; no workflow behavior changed.

## 2.0.23 — 2026-11-20

- Added exact-SHA CI failure diagnostics, failed-step extraction, failure-domain classification, queue diagnosis and redacted evidence artifacts.
- Reject stale workflow evidence before acceptance; diagnostic collection remains read-only.
- Regression tests added; execution awaits exact-head CI.

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
