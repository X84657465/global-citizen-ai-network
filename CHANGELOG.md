## 0.3.92 — 2026-11-21

- Correct the 24-task Agent Factory lifecycle soak assertion: the deduplication ledger records candidate-start and candidate-result callbacks, not reserve/state-transition operations (48 unique callback events for 24 completed tasks).
- Agent Factory V2 advances to 2.0.61; B remains unchanged at 0.1.13.
- Exact-head full CI and controlled Windows factory validation remain required; no merge or deployment is claimed.

## 0.3.91 — 2026-11-21

- Add queue-selector integration regression coverage for dependency gating before dispatch, including completed, open, missing, and merged-PR prerequisites.
- Agent Factory V2 advances to 2.0.60; B remains unchanged at 0.1.13.
- Exact-head full CI and controlled Windows factory validation remain required; no merge or deployment is claimed.

## 0.3.90 — 2026-11-21

- Fix the P0 factory queue dependency parser: Issue #96-style multiline dependency sections are now recognized before task dispatch.
- Preflight accepts optional dependency sections and returns normalized dependency issue numbers; queue selection remains the authoritative completion gate.
- Agent Factory V2 advances to 2.0.59; B remains unchanged at 0.1.13.
- Exact-head full CI and Windows factory validation remain required; no merge or deployment is claimed.

## 0.3.89 — 2026-11-21

- Prevent successful candidate CI for one task from clearing the factory-wide infrastructure circuit breaker.
- Add regression coverage proving global cooldown fields and unrelated task quarantine remain unchanged, including duplicate callback replay.
- Agent Factory V2 advances to 2.0.58; B track remains unchanged at 0.1.13.
- Exact-head full CI and controlled Windows factory validation are required; no live factory completion or deployment is claimed.

## 0.3.88 — 2026-11-20

- Restrict full CI push-triggered runs to `main`; development branches are validated by their pull-request lifecycle events, avoiding duplicate full-suite execution for the same PR head.
- Preserve `pull_request` opened/reopened/synchronize checks and explicit `repository_dispatch: ai-task-ci` exact-SHA factory validation.
- Extend CI trigger-policy regression coverage; no jobs, database/RLS checks, Ollama checks, Runner settings, or concurrency protections are removed.
- Required branch-protection status checks must be confirmed by a repository maintainer; this change is proposed in a Draft PR for review.

## 0.3.87 — 2026-11-20

- Integrate the GCAN public homepage, five-track architecture visuals and login entry on top of Agent Factory V2 without replacing the factory-owned Workspace client, API, validation or RLS contracts.
- Route A and C workbenches to first-party `/factory` and `/predictive-coding` paths; keep D and E as explicitly isolated previews until their in-repository routes are available.
- Preserve exact-head CI, human review and no-auto-merge safeguards; no production deployment or task completion is claimed.

## 0.3.86 — 2026-11-20

- Include tests/agent-failure-scope.test.mjs in the Agent Factory preflight path filter so isolated changes to the task-failure regression suite still execute Windows factory validation.
- Extend CI policy coverage to guard both the helper implementation and its dedicated tests.
- Agent Factory V2 advances to 2.0.57; root/package/lock/manifest metadata stays synchronized.
- Exact-head full CI remains required; no live task completion is claimed.

## 0.3.85 — 2026-11-20

- Include the new Agent Factory task-failure scope helper in the V2 preflight push path filter, ensuring helper-only changes cannot bypass Windows factory validation.
- Add a CI policy assertion that protects the helper-to-validation trigger contract.
- Agent Factory V2 advances to 2.0.56; root/package/lock/manifest metadata stays synchronized.
- Exact-head CI remains required; no live task completion is claimed.

## 0.3.84 — 2026-11-20

- Correct the task-scoped failure marker writer to emit a real newline in GitHub Actions' environment file; cover both successful propagation and safe failure behavior.
- Add a CI policy assertion tying Ollama token-limit exhaustion to the task-scoped failure path so it cannot increment the global system breaker.
- Agent Factory V2 advances to 2.0.55; root/package/lock/manifest metadata remains synchronized.
- No production data, database schema, secrets, merge or deployment changes.
- Exact-head full CI and controlled Windows factory smoke remain required; no live task acceptance is claimed.

## 0.3.83 — 2026-11-20

- Extract task-failure scope persistence into a small tested helper so Ollama output truncation and invalid patch proposals cannot be misrecorded as global infrastructure failures.
- Add regression coverage for GitHub Actions environment-file propagation and the token-limit task-classification path.
- Agent Factory V2 advances to 2.0.54; root/package/lock/manifest metadata stays synchronized.
- No production data, database schema, secrets, merge or deployment changes.
- Exact-head full CI and the controlled Windows factory smoke remain required; this commit does not claim live task acceptance.

## 0.3.82 — 2026-11-20

- Fix an Agent Factory throughput blocker: large approved source files could exhaust the calculated Ollama output-token budget and be rejected before scratch testing.
- Raise the bounded per-file generation budget to a 16,384-token floor and 24,576-token ceiling, scaled to source bytes; keep the shared timeout, one-file batches, strict manifest validation and no-truncation acceptance.
- Add deterministic unit coverage for budget scaling, cap and invalid inputs.
- No database schema, production data, dependency or deployment changes.
- Exact-head full CI and Windows synthetic preflight are required; no completion is claimed until both pass.

## 0.3.81 — 2026-11-20

- Correct the stale README root/A release labels and engineering-governance baseline so public release metadata matches the authoritative VERSION files and manifest.
- Extend the blocking CI regression test to verify the README root version, Agent Factory version and governance baseline against the authoritative release metadata.
- Agent Factory V2 advances to 2.0.52; no runtime behavior, dependency, database schema or production data changes.
- Verification: exact-head full CI and the Windows synthetic Agent Factory preflight are required; no completion is claimed before both finish successfully.
- Rollback: revert this single metadata-and-regression-test commit; no database rollback is required.

## 0.3.80 — 2026-11-20

- Port the B-line strict workspace message contract into the A integration branch: validate message UUID, role, content and timezone-qualified timestamp before rendering.
- Reject malformed API envelopes and catch network/JSON parsing failures without crashing the workspace; preserve pending-request idempotency handling.
- Add adversarial unit coverage for malformed messages, invalid calendar dates, clock fields and timezone offsets.
- Align the integrated B product track metadata with its current release, 0.1.12. Agent Factory V2 remains 2.0.51.
- Exact-head full CI on the resulting commit is mandatory; no completion is claimed before all required Actions jobs pass.
- Rollback: revert the workspace-bridge commits as one reviewed range back to the pre-bridge parent; no database schema or production data is changed.

## 0.3.79 — 2026-11-20

- Harden the conversation message read API with an explicit authenticated owner filter and deterministic newest-500 pagination returned in chronological order.
- Add pgTAP coverage for cross-member message reads, owner spoofing, cross-conversation writes and forged assistant messages.
- Add a unit-level source contract to prevent regressions in the API query boundary.
- Synchronize repository and Agent Factory numeric release metadata atomically. Exact-head full CI remains required.

## 0.3.78 — 2026-11-20

- Run the full CI workflow on Agent Factory branch pushes, not only on main and pull-request lifecycle events, so every latest A-line head can receive exact-SHA quality, build, Ollama and Supabase validation.
- Include the candidate execution SHA in CI run names to distinguish current-head evidence from stale runs.
- Update release metadata atomically with the workflow and policy-test changes; do not expose partially synchronized version trees to CI.
- No CI pass is claimed until the new exact-head run completes all required jobs.

## 0.3.77 — 2026-11-20

- Extend the Supabase startup workflow regression guard to require the CLI exit code to be captured before the redaction process changes PowerShell's `$LASTEXITCODE`.
- Synchronize repository and Agent Factory numeric release metadata.
- Exact-head CI remains required; no pass is claimed.

## 0.3.76 — 2026-11-20

- Tighten the Supabase startup redaction regression guard to verify the actual single-line cmd.exe-to-PowerShell pipeline, including the closing quote before the PowerShell pipe.
- Synchronize repository, package, lockfile, Agent Factory and governance release metadata.
- Trigger a fresh PR validation for the corrected exact head; no CI pass is claimed until GitHub Actions completes on that SHA.

## 0.3.75 — 2026-11-20

- Correct the Supabase startup workflow regression test to recognize PowerShell's actual command-boundary syntax: stderr redirection occurs inside the quoted cmd.exe command, followed by the PowerShell pipeline to Out-String.
- Keep the assertion semantic and order-sensitive rather than requiring an invalid contiguous substring.
- Synchronize repository and Agent Factory numeric release metadata.

### Verification
- The latest exact-head synthetic preflight exposed this assertion mismatch (358/359 tests passed). The corrected assertion requires a fresh exact-head full CI and Windows Runner preflight; no pass is claimed.

## 0.3.74 — 2026-11-20

- Fix Windows PowerShell 5.1 handling of Supabase CLI stderr by capturing the native command through cmd.exe before applying fail-closed output redaction.
- Add a CI policy regression test preventing the original NativeCommandError-prone capture path.
- Synchronize repository and Agent Factory numeric release metadata.

### Verification
- Exact-head full CI, including Supabase migrations, PostgreSQL/RLS and Ollama integration, is required. No pass is claimed for this change.

## 0.3.73 — 2026-11-20

- Capture local Supabase startup output before logging and redact ephemeral anon/service-role, publishable/secret, Storage access/secret keys, JWT-shaped tokens and URL passwords.
- Add executable redaction logic and regression coverage; fail closed if the redaction process fails.

### Verification
- Exact-head full CI and Windows synthetic preflight are required. This change is not yet verified by CI.

## 0.3.72 — 2026-11-20

- Preserve V1 skipped Issue numbers even when no failure-counter entry exists; reject malformed quarantine history rather than silently dropping it.
- Add migration regression tests for skipped-only numeric/string Issue identifiers and invalid legacy history.
- Synchronize numeric repository and Agent Factory versions.

### Verification
- Exact-head full CI and Windows Runner preflight are required; live Issue #100 migration remains unverified.

## 0.3.71 — 2026-11-20

- Correct the Agent Factory runbook: scheduled and issue events are default-branch-only, but manual `workflow_dispatch` can select the V2 feature ref because the workflow path and dispatch trigger already exist on the default branch.
- Add a controlled Issue #138 dispatch procedure and regression assertions for the owner-only manual trigger, selected-ref input wiring, and the distinction between manual smoke tests and default-branch scheduling.
- Synchronize repository and Agent Factory numeric release metadata.

### Verification
- Exact-head full CI and V2 Windows preflight are required. This change does not claim that Issue #138 has run or that the V2 scheduler has been promoted to the default branch.

## 0.3.70 — 2026-11-20

- Enable the Agent Factory V2 feature branch to run the synthetic Windows Runner preflight on owner pushes, including real local Ollama plan generation, bounded patch proposal, isolated candidate checks and publisher dry-run.
- Add a policy regression proving that feature-branch pushes run only the read-only synthetic validation job; live task reservation, Issue mutation and PR publication remain excluded from push events.
- Synchronize repository and Agent Factory numeric release metadata.

### Verification
- Previous exact head `17ca58d106c464e31ead51af7af041d55cc0e184` passed complete GitHub Actions CI run [#44721263122](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44721263122), including Windows Runner, real Ollama inference, Supabase migrations, PostgreSQL and RLS.
- This trigger-policy change requires a fresh exact-head full CI and the newly enabled Windows synthetic factory preflight. No acceptance is claimed until both complete successfully.

## 0.3.68 — 2026-11-20

- Resolve the isolated Supabase PostgreSQL container from its published database port instead of relying on version-dependent Compose names.
- Classify database-container discovery failures as CI infrastructure errors; only failures after application RLS assertions begin are candidate defects.

### Verification
- Exact-head full CI is required; no pass is claimed before the new SHA completes.

## 0.3.67 — 2026-11-20

- Correct the package-lock root package metadata so both lockfile version fields match the repository release version.
- Keep the Agent Factory future-schema downgrade guard and its single regression test unchanged.

### Verification
- Exact-head full CI is required; no test pass or production migration is claimed.

## 0.3.66 — 2026-11-20

- Remove a duplicate migration regression test while retaining the future-schema downgrade protection.
- Synchronize repository package, lockfile, manifest and Agent Factory track versions.

### Verification
- Exact-head full CI is required; no test pass or production migration is claimed.

## 0.3.65 — 2026-11-20

- Reject unsupported future Agent Factory state schema versions instead of silently treating them as legacy V1 and potentially discarding fields.
- Add regression coverage proving unknown schema payloads fail closed and the durable Issue body remains unchanged.
- Synchronize repository package, lockfile, manifest and Agent Factory track versions.

### Verification
- Exact-head full CI is required; no test pass or production migration is claimed.

## 0.3.64 — 2026-11-20

- Restore the CI policy regression assertions to the current workflow contract after verifying Docker/Ollama readiness and bounded inference steps are present.
- Preserve exact candidate-evidence artifact checks and synchronized root package metadata.

## 0.3.63 — 2026-11-20

- Restore explicit Windows Runner Docker Engine and Ollama API/model readiness gates in the A-line CI.
- Run the bounded real structured Ollama inference smoke test before database integration; preserve the 180-second hard timeout.
- Keep CI policy assertions aligned with the actual workflow steps; no security audit or exact-SHA gate is weakened.

## 0.3.62 — 2026-11-20

- Correct stale Agent Factory CI policy assertions to match the current security-audit, Windows Runner and Ollama smoke-test step names.
- Scope the candidate-evidence artifact assertion to the two exact-SHA callback uploads, excluding independent diagnostic artifacts.
- No runtime behavior or security policy is relaxed; root package, lockfile, manifest and track versions are synchronized.

## 0.3.61 — 2026-11-20

- Align the Predictive Coding ECE malformed-options regression assertion with the stricter plain-object validation error emitted by the implementation.
- Synchronize root package, lockfile, manifest, and Predictive Coding track version metadata.
- This is a test-contract correction; the ECE validation behavior is unchanged.

## 0.3.60 — 2026-11-20

- Preserve synthetic and real Agent Factory offline-test stdout/stderr as separate CI artifacts, including when container tests fail.
- Record the native Docker exit code before raising a PowerShell failure so diagnostics remain actionable when GitHub job logs are unavailable.
- Add regression coverage for failure-path artifact retention and synchronize Agent Factory release metadata.

## 0.3.59 — 2026-11-20

- Fix the Agent Factory expired-lease lifecycle regression fixture: require a complete GitHub workflow identity, attempt, completed status, and conclusion before recovery is authorized.
- Add an explicit fail-closed assertion for completed workflow responses that omit their conclusion.
- Keep root package, lockfile, version manifest, and Agent Factory release metadata synchronized.

## 0.3.58 — 2026-11-20

- Align every CI job with the repository's verified Windows self-hosted Runner; the current Ubuntu-hosted jobs failed before starting any steps because no hosted runner was assigned.
- Port resolver, quality gates, Supabase migrations/PostgreSQL/RLS, state callbacks and diagnostics to the native PowerShell Windows execution path.
- Serialize all CI jobs through the existing shared Runner queue, preserve non-cancelling semantics for durable state writers, and retain exact event-head SHA fencing.
- Restore the verified Windows Supabase CLI installation path, isolated per-run project/ports, and two-member application RLS integration gate.
- This is an infrastructure alignment, not an acceptance claim; exact-head full CI and Runner smoke evidence are still mandatory.

## 0.3.57 — 2026-11-20

- Restore non-cancelling workflow-level concurrency: GitHub keeps one active run and coalesces pending runs to the newest event, so stale pending commits do not require cancelling active work.
- Protect shared Agent Factory state writers from being interrupted by a newer ordinary PR event; retain per-PR concurrency groups and exact event-head SHA fencing.
- CI runner-start failures remain infrastructure-blocked; no code-test success is claimed.

## 0.3.56 — 2026-11-20

- Supersede stale ordinary PR CI runs so obsolete queued commits cannot block current-head validation.
- Preserve AI-task workflow runs from cancellation to protect durable factory state writes; keep the shared Windows Runner queue non-cancelling.
- Correct CI policy assertions to verify exact event-head SHA fencing instead of a removed SHA-based concurrency group.
- Full exact-head CI remains the acceptance gate; no completion is claimed before all required jobs pass.

## 0.3.55 — 2026-11-20

- Defer durable Agent Factory state lookup until a pull request is positively classified as an authorized AI-task PR.
- Add CI regression coverage so ordinary product/documentation PR metadata checks do not depend on factory state storage.
- Exact-head full CI remains mandatory; this change is not complete until all required jobs pass.

## 0.3.54 — 2026-11-20

- Corrected the Agent Factory V2 lease-recovery integration fixture to include the authoritative GitHub workflow run ID for every simulated run attempt, while retaining the missing-attempt fail-closed regression.
- Exact-head CI remains the acceptance gate; no full CI pass is claimed.

## 0.3.53 — 2026-11-20

- Corrected Ubuntu candidate-resolution shell selection and removed the head-SHA suffix from PR concurrency grouping so superseded commits coalesce as intended.
- Added CI policy assertions for Linux-compatible shell selection; exact-head CI is required to verify the workflow startup correction.

## 0.3.52 — 2026-11-20

- Replaced fragile escaped-regex matching in the exact-SHA concurrency regression with literal workflow-expression assertions.

## 0.3.51 — 2026-11-20

- Corrected the exact-SHA concurrency regression assertion to match the literal GitHub Actions expression without requiring a backslash in the workflow source.

## 0.3.50 — 2026-11-20

- Added exact-head SHA fencing to CI concurrency groups so stale queued commits cannot block current-head validation.
- Added Ubuntu CI failure diagnostics: failed-step extraction, failure classification, runner/concurrency queue diagnosis, stale-SHA rejection, credential redaction and machine-readable evidence artifacts.
- Added regression coverage for exact-SHA binding, failure classification, queue diagnosis and secret redaction.
- Diagnostics collect evidence only; automated code repair is not yet claimed.

## 0.3.49 — 2026-11-20

- Added regression coverage proving Supabase startup, pgTAP and two-member RLS checks stay on Ubuntu and outside the shared Windows Runner queue.
- Updated Runner policy assertions to reserve the Windows queue for the remaining Windows/Ollama build integration only.
- Removed the obsolete Windows dynamic-port allocation regression after moving database integration to isolated Ubuntu-hosted Docker.

## 0.3.48 — 2026-11-20

- Moved Supabase CLI startup, migration application, PostgreSQL pgTAP/RLS suite and two-member application RLS integration from the Windows Runner to GitHub-hosted Ubuntu.
- Replaced PowerShell/Windows-specific orchestration with pinned Supabase CLI, isolated per-run project IDs, Linux Docker discovery and guaranteed Supabase teardown.
- Kept Windows Runner reserved for the remaining Windows/Ollama integration path; no new Runner or server introduced.

## 0.3.47 — 2026-11-20

- Corrected the Ubuntu quality job dependency graph: portable quality gates depend only on candidate resolution, while Windows build/database and both circuit-breaker callbacks explicitly depend on the quality result.
- Prevented a self-referential quality dependency and ensured failure/success callbacks can read the quality job result and failure classification.

## 0.3.46 — 2026-11-20

- Split portable quality gates onto GitHub-hosted Ubuntu: migration/schema guards, dependency audits, Agent Factory syntax checks, CI policy tests, unit tests, TypeScript, lint and production build no longer consume the single Windows Runner.
- Reduced the Windows build job to exact-candidate registration and Windows/Docker/Ollama integration checks; database integration remains on Windows.
- Wired Ubuntu quality failure classification into the factory CI circuit-breaker and success gates; Windows integration now runs only after portable quality gates pass.
- Fixed the CI policy test job-section lookup and added regression checks for Ubuntu execution and required quality commands.

## 0.3.45 — 2026-11-20

- Removed the active Agent Factory feature branch from the heavyweight Windows preflight push trigger; the exact-head PR CI remains the authoritative validation path, while scheduled/manual preflight and main-branch environment smoke checks remain available.
- Added a regression assertion preventing duplicate full Windows preflight runs on the active feature branch.

## 0.3.44 — 2026-11-20

- Corrected CI runner placement: GitHub API-only candidate resolution and CI result persistence use GitHub-hosted Ubuntu runners; Windows build and database validation remain serialized on the self-hosted Runner.
- Added policy assertions to prevent API-only jobs from consuming or queueing behind the Windows Runner.

## 0.3.43 — 2026-11-20

- Moved GitHub API-only candidate resolution and CI result persistence to GitHub-hosted Ubuntu runners, reserving the single Windows self-hosted Runner for Windows, Docker, Ollama and database validation.
- Kept build and database validation serialized through the shared Windows Runner queue; added CI policy assertions for runner placement.

## 0.3.42 — 2026-11-20

### Integration — Agent Factory and Predictive Coding
- Synchronize Agent Factory V2 with the latest B base through an explicit two-parent integration commit while preserving A's newer factory implementation.
- Import Predictive Coding 0.3.8 ECE option hardening, adversarial regression tests, and the matching track version/changelog.
- Keep repository package metadata and manifest aligned at 0.3.42; align Track C manifest with its 0.3.8 version file.

### Verification
- Merge ancestry and source read-back are checked; exact-head GitHub Actions CI remains required. No test pass is claimed.

## 0.3.41 — 2026-11-20

### Fixed — Agent Factory Release Metadata and Exact-Head Verification
- Reconcile the A-track manifest version with the authoritative `versions/agent-factory/VERSION` and track changelog (`2.0.22`).
- Add a CI regression test requiring package.json, package-lock.json, root VERSION, manifest overall version, and Agent Factory manifest/version file to agree.
- Previous run #44641219370 is not current-head acceptance evidence: its log predates current head `392fc270d7d5d8993ff2fd42e03df6cb02adfd80` and failed the older CI trigger assertion plus a `psql` executable fallback in the application RLS test. The current branch contains the Docker-container execution path and matching trigger assertion; exact-head rerun remains required.

### Verification
- Metadata read-back is synchronized to repository `0.3.41` and Agent Factory `2.0.22`.
- No local test execution or fresh exact-head CI pass is claimed.

## 0.3.40 — 2026-11-20

### Reliability
- Serialize legacy V1-to-V2 state migrations through the repository-scoped write queue so independent store instances cannot race the same migration.
- Recover idempotently when another process completes the migration first, and add a concurrent two-store regression test.

### Verification
- Static read-back is required; exact-head Windows Runner CI remains the acceptance gate.

## 0.3.39 — 2026-11-20

### Reliability
- Strengthen the durable-state write-queue regression across two independent store instances using differently-cased repository identifiers.
- Prove that a stale write rejection does not poison the shared repository queue and that a subsequent valid write persists state version 2 without creating a duplicate Issue.

### Verification
- Static read-back is required; exact-head Windows Runner CI remains the acceptance gate.

## 0.3.38 — 2026-11-20

### Reliability
- Add a regression test proving the repository-scoped durable-state write queue remains usable after a stale-version write is rejected.
- Verify a subsequent valid write advances the exact persisted state version without creating a duplicate state Issue.

### Verification
- Exact-head Windows Runner CI is required; this test is not considered passed until the new branch head completes CI.

## 0.3.37 — 2026-11-20

### Reliability
- Verify the exact durable GitHub Issue state after factory state creation and updates.
- Reject stale successful-looking write responses instead of advancing controller state on unconfirmed persistence.

### Verification
- Exact-head CI and live Runner validation remain required.

## 0.3.36 — 2026-11-20

### Reliability
- Require a recognized GitHub Actions conclusion before Agent Factory expired-lease recovery.
- Synchronize A track version 2.0.21 and repository package metadata.

### Verification
- Exact-head CI and live Runner validation remain required.

## 0.3.35 — 2026-11-20

### Reliability
- Add Agent Factory regression coverage for same-ID GitHub Actions reruns and stale attempt responses.
- Synchronize package.json and package-lock.json root package versions at 0.3.35.

### Verification
- Exact-head Windows Runner CI remains required; no test pass is claimed.

## 0.3.33 — 2026-11-20

### Fixed
- Correct the schedule-gate regression assertion to compare the actual YAML newline sequence and normalize CRLF correctly.

### Verification
- Exact-head Windows Runner CI remains required; no test pass is claimed.

## 0.3.32 — 2026-11-20

### Reliability
- Document and regression-guard the GitHub default-branch scheduling boundary for Agent Factory V2.
- Make explicit that feature-branch schedules do not activate production polling or V1-to-V2 migration while the default branch still hosts the legacy workflow.
- Define exact-SHA Windows Runner and same-Issue read-back evidence required before accepting the Issue #100 migration.

### Verification
- Added a CI policy assertion for the runbook's default-branch gate.
- No production state was changed; Issue #100 remains V1 pending approved integration and an actual V2 workflow run.

## 0.3.30 — 2026-11-20

### Fixed
- Reconcile the five-track integration manifest with the latest available workstream release versions: A 2.0.16, B 0.1.11, C 0.3.6, D 0.3.10 and E 0.1.11.
- Keep the integration release version aligned across VERSION, package.json, package-lock.json and versions/manifest.json.

### Verification
- JSON parsing and exact version-field consistency are checked after the write.
- Track C's current source branch was not discoverable during this audit; its 0.3.6 value is retained from the latest manifests on B, D and E branches. Exact-head CI remains required.
- This is metadata synchronization only; no track merge, production migration, deployment or runtime acceptance is implied.

## 0.3.29 — 2026-11-20

### Reliability
- Add a production-path regression test for configured Agent Factory V1 state-Issue migration.
- Verify legacy failure and quarantine counters survive migration and the existing Issue is updated in place without duplicate creation.

### Verification
- Exact-head Windows Runner CI is required. The test uses a synthetic fixture and does not modify production state.

## 0.3.28 — 2026-11-20

### Fixed
- Separate scheduled preflight poller concurrency from actionable task triggers so recurring polls cannot replace a pending issue-triggered worker.
- Serialize both self-hosted preflight jobs through the shared bounded Runner queue while retaining poller coalescing.

### Regression coverage
- Verify that only scheduled poller runs share a workflow concurrency group and that both self-hosted jobs preserve pending work in the shared Runner queue.

### Verification
- Exact-head Windows Runner CI is required for acceptance. This change does not claim that a real AI task was executed or published.

### Rollback
- Revert the exact scheduler-concurrency commit; no application runtime or database schema is changed.

## 0.3.26 — 2026-11-20

### Changed
- Record the successful Agent Factory V2 isolated end-to-end preflight: Ollama plan and patch proposal, disposable-container isolation, scratch patch application, offline candidate tests, publisher dry-run, locked dependency installation, full unit tests, TypeScript, ESLint and cleanup.
- Synchronize the five-track manifest with B 0.1.10 and D 0.3.9; no PR merge or production deployment is implied.

### Verification
- Exact-head AI Agent Task Preflight passed on `eb35c272b268d03a9f914ba12d39fd08f1dd31f9`.
- Full PR CI, including production build and database/RLS jobs, remains required on the new metadata commit.

### Rollback
- Revert this metadata-only release record; no runtime code or database schema changed.

## 0.3.25 — 2026-11-20

### Changed
- Complete the Agent Factory V2 release record by synchronizing its track-specific VERSION and changelog with the overall release metadata.

### Verification
- Confirmed root package, lockfile, VERSION and manifest values are synchronized; exact-head CI remains pending.

### Rollback
- Revert the exact metadata synchronization commit; no application or database behavior changes.

## 0.3.24 — 2026-11-20

### Fixed
- Correct newline escaping in the Ollama retry regression fixtures so tests exercise actual NDJSON line boundaries rather than literal backslash sequences.

### Changed
- Advance Agent Factory V2 from 2.0.11 to 2.0.12; retain the bounded one-time incomplete-stream retry introduced in 0.3.23.

### Verification
- The retry tests must pass against the exact branch head in CI before acceptance; live Windows Runner/Ollama task acceptance remains required.

### Rollback
- Revert the exact test-fixture correction commit; no database migration or production data change is involved.

## 0.3.23 — 2026-11-20

### Fixed
- Retry one incomplete Ollama patch-generation stream with a fresh bounded request.
- Discard partial output from an interrupted attempt; retain strict completion-marker validation and reject malformed/provider-error streams without retry.

### Changed
- Advance Agent Factory V2 from 2.0.10 to 2.0.11.

### Verification
- Added deterministic regression coverage for successful retry, partial-output isolation, non-retryable malformed streams, and the two-attempt ceiling.
- Exact-head CI and live Windows Runner/Ollama task acceptance are required before this change is considered verified.

### Rollback
- Revert the exact Agent Factory V2 commit; no database migration or production data change is involved.

# Changelog

## 0.3.22 — 2026-11-20

### Fixed
- Harden Deep Research source-field length validation against whitespace-padding bypasses.

### Changed
- Advance E track to 0.1.10 and align five-track release metadata.

### Verification
- Added a regression test; exact-head CI is required before acceptance.

## 0.3.21 — 2026-11-20

### Changed
- Synchronize five-track branch histories and canonical repository release metadata.
- Align the version manifest with the latest recorded versions across all five tracks.

### Verification
- Exact-head CI and independent review remain required.

## 0.3.20 — 2026-11-20

### Fixed
- Reject sparse prediction/observation arrays in MAE, Brier and ECE calculations instead of allowing inconsistent skipped-sample behavior.
- Preserve strict finite-number validation for every sample index.

### Verification
- Added sparse prediction and sparse outcome regression cases across all three metrics; exact-head CI required.

## 0.3.19 — 2026-11-20

### Fixed
- Synchronize the GitHub homepage release label with the canonical repository version.

### Verification
- Homepage release and package metadata cross-check completed; exact-head CI remains required.

## 0.3.18 — 2026-11-20

### Fixed
- Enforce the ISO-8601 maximum timezone offset of ±14:00 in Agent Factory durable state validation.
- Reject offsets beyond 14 hours and non-zero minutes at the 14-hour boundary.

### Verification
- Added ±14-hour boundary regressions; exact-head Windows Runner CI required.

## 0.3.17 — 2026-11-20

### Fixed
- Correct the lockfile regression test to compare the exact resolved tarball filename without an escaped-regex ambiguity.
- Keep eslint-import-resolver-node locked at the tarball's actual 0.3.10 version.

### Verification
- Regression test now compares the resolved filename to the lockfile version; exact-head CI remains required.

## 0.3.16 — 2026-11-20

### Fixed
- Repair the lockfile metadata for eslint-import-resolver-node: package version now matches the immutable 0.3.10 tarball URL and integrity entry.
- Add a CI regression test that compares the locked package version with its resolved tarball version.
- Synchronize the five-track manifest to the current A–E candidate versions.

### Verification
- Static lockfile consistency check added; exact-head Windows Runner CI remains required.

## 0.3.15 — 2026-11-20

### Fixed
- Enforce strict timezone-qualified ISO-8601 validation for durable Agent Factory state, including actual calendar dates and bounded clock/offset fields.
- Reject malformed lease, cooldown and event timestamps before state transitions can be accepted.

### Verification
- Added regression tests for impossible dates, impossible times, missing timezone and invalid offsets. Exact-head Windows Runner CI required.

All notable changes are recorded here. Versions use numeric `MAJOR.MINOR.PATCH` only.

## 0.3.10 — 2026-11-20

### Fixed
- Synchronize the five-track manifest to A 2.0.8, B 0.1.5, C 0.3.3, D 0.3.4 and E 0.1.5.
- Align root VERSION, package metadata, lockfile and governance baseline.

### Verification
- Metadata-only synchronization; exact-head CI is required before acceptance.

## 0.1.1 — 2026-11-20

### Added
- Four-track engineering governance and cross-track learning rules.
- Numeric versioning policy, per-track version manifest, and release evidence requirements.
- Deep Neural workstream charter and safety boundaries are being established in its dedicated development branch.

### Changed
- Repository engineering workflow now requires every material improvement, including small fixes, to update the relevant numeric version and changelog.

### Verification
- Documentation and version metadata change only; runtime behavior and database schema are unchanged.
- CI/build validation must be recorded against the exact PR head before acceptance.


## 0.2.0 — 2026-11-20

### Changed
- Renamed Track C to Predictive Coding（預測編碼） and defined its prediction, observation, prediction-error, calibration and evidence-based update responsibilities.
- Upgraded the four-track model to a mutual-support learning loop across Agent Factory, GCAN, Predictive Coding and Deep Neural.
- Added cross-track ownership, prediction evidence and receiving-track adoption requirements.

### Added
- Predictive Coding architecture charter and prediction record contract.
- Four-track responsibility and mutual-support matrix.

### Verification
- Documentation, version manifest and package metadata update only in this PR.
- Runtime tests and CI must pass against the exact candidate SHA before acceptance.

## 0.2.5 — 2026-11-20

### Fixed
- Complete the Predictive Coding CSS Module footer selector scoping, including responsive footer rules.
- Synchronize the five-track version manifest and the Predictive Coding track version.
- Refresh the public project overview to describe all five workstreams and their current evidence-based status.

### Documentation and media
- Add a five-track architecture visual and a dedicated GCAN introduction storyboard for video production.
- Add explicit video-production status so a storyboard is not misrepresented as a rendered video.

### Verification
- Exact-head CI and independent review are required before acceptance.

## 0.2.6 — 2026-11-20

### Changed
- Replace the obsolete four-track governance model with the five-track A–E operating model.
- Define Deep Research ownership, evidence responsibilities and cross-track support.
- Synchronize the repository version and manifest to `0.2.6`.

### Verification
- Documentation and version metadata updated; exact-head CI and independent review remain required.

## 0.2.7 — 2026-11-20

### Added
- Add a CSS Module selector regression test to prevent the global-selector build failure from returning.
- Align the root package version, overall version and Predictive Coding track version.

### Verification
- Exact-head CI is required; no release acceptance implied.

## 0.2.8 — 2026-11-20

### Added
- Promote the Deep Neural workbench from a static knowledge overview to an interactive local demonstration with search, type filters, artifact details and a proposal interaction.
- Expand the knowledge exchange view to all five workstreams.
- Synchronize the Deep Neural track version to `0.2.2` and the overall integration version to `0.2.8`.

### Limitations
- Deep Neural interactions remain local demo state; persistent knowledge storage and live reasoning are not connected.

### Verification
- Exact-head CI and independent review required.

## 0.2.9 — 2026-11-20

### Fixed
- Correct the CSS Module selector regression guard regex to ensure the test detects unscoped selectors rather than escaped literal characters.
- Synchronize the overall version and Predictive Coding track version.

### Verification
- Exact-head CI required; this change does not constitute release acceptance.

## 0.3.0 — 2026-11-20

### Added
- Enable the shared CI workflow for pull requests targeting the five-track integration branch, so dependent Deep Neural and Deep Research PRs receive exact-head build and database verification.
- Add a CI policy regression assertion and document the integration-branch dependency and retargeting procedure.

### Verification
- CI must pass on each dependent PR's exact head; the branch filter itself is not acceptance evidence.

## 0.3.1 — 2026-11-20

### Changed
- Correct the GCAN homepage CI status wording: the previous GCAN Product candidate passed, while the latest version-synchronization commit is awaiting its own exact-head CI run.

### Verification
- README status is informational; GitHub Actions remains the source of truth for current CI state.

## 0.3.2 — 2026-11-20

### Changed
- Synchronize the five-track engineering governance revision and repository release baseline after adding dependent-branch CI support.

### Verification
- Exact-head CI and independent review remain required.

## 0.3.3 — 2026-11-20

### Fixed
- Separate database-backed two-member RLS integration tests from the generic unit-test discovery runner.
- Execute application-level RLS integration tests in the isolated Supabase CI job using its local database URL.
- Synchronize Agent Factory track version to `2.0.2` and overall integration version to `0.3.3`.

### Verification
- New exact-head Agent Factory CI required; previous candidate failed because database integration tests were invoked without `SUPABASE_DB_URL`.

## 0.3.4 — 2026-11-20

### Fixed
- Classify application-level two-member RLS test failures as task validation failures in Agent Factory CI.
- Synchronize Agent Factory track version to `2.0.3` and overall integration version to `0.3.4`.

### Verification
- New exact-head CI required.


## 0.3.5 — 2026-11-20

### Fixed
- Execute the two-member application RLS suite inside the isolated Supabase PostgreSQL container so the Windows Runner no longer depends on a separately installed host `psql` binary.
- Scope Agent Factory table, header and cell selectors to its CSS Module wrapper; retain the regression guard.
- Extend CI policy tests to require the container-based database integration path.

### Documentation and media
- Synchronize the repository homepage release version and current five-track CI status.
- Keep the existing five-track architecture visual and video storyboard as production assets; no rendered MP4 is claimed.

### Verification
- Previous A exact-head CI failed on the missing host `psql` executable and one CSS Module selector regression.
- This repair is pending fresh exact-head CI; no release acceptance is implied.


## 0.3.6 — 2026-11-20

### Fixed
- Pass the isolated Supabase container name into the current Windows Runner process so the RLS integration suite invokes Docker instead of falling back to a missing host-side psql executable.
- Resolve docker.exe explicitly and expose subprocess execution errors for actionable diagnostics.
- Update CI policy regression coverage to assert the current-step container environment contract.

### Verification
- The prior exact-head run exposed the missing current-process environment variable and one stale CI policy assertion. This release candidate requires a fresh exact-head CI run; it is not accepted until all checks pass.


## 0.3.7 — 2026-11-20

### Added
- Add a versioned cross-track candidate CI evidence export compatible with the Deep Neural `EvidenceRecord` contract.
- Upload exact-commit candidate CI evidence as a 90-day GitHub Actions artifact for downstream Predictive Coding research and review.

### Verification
- New helper and controller tests cover result mapping, exact branch/SHA/run provenance, malformed evidence rejection and callback replay behavior.
- Exact-head CI is required before acceptance; no live C/D ingestion or production deployment is implied.


## 0.3.8 — 2026-11-20

### Fixed
- Align the Agent Factory lifecycle integration fixtures with the strict exact-branch EvidenceRecord contract.
- Synchronize Agent Factory to 2.0.7 and the repository integration version to 0.3.8.

### Verification
- The latest isolated Preflight exposed three lifecycle callbacks missing the newly required candidate branch ref. The regression fixtures now supply the deterministic branch for every terminal callback.
- Exact-head Preflight and full CI must pass before the change is accepted.


## 0.3.9

- Run full CI on all explicitly controlled A-E feature branch pushes, not only main or PR lifecycle events.
- Retain repository-owner push gating and the explicit five-workstream branch allowlist.
- Synchronize Agent Factory V2 to 2.0.8 and repository metadata to 0.3.9.

Verification: exact-head CI and PostgreSQL/RLS validation are required. No PR merge or deployment is implied.
