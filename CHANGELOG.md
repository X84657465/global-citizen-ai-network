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
