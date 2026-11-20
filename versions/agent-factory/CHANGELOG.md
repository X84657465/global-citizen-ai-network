# Agent Factory V2 changelog

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
