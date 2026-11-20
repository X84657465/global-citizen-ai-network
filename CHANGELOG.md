# Changelog

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
- Remove the duplicate AI Agent Scheduler entry from the GitHub documentation index.

### Verification
- README navigation and numeric release metadata checked; exact-head CI remains required.

## 0.3.17 — 2026-11-20

### Documentation
- Align the GitHub homepage release label and CI badge with the default branch.
- Remove a duplicate scheduler documentation entry and keep CI guidance SHA-specific and current.

### Verification
- Static README and version metadata consistency checks completed; exact-head CI is required.

## 0.3.16 — 2026-11-20

### Fixed
- Correct the package-lock regression guard to compare the resolved tarball filename directly with the locked package version.
- Preserve eslint-import-resolver-node at the actual 0.3.10 tarball version.

### Verification
- Regression guard corrected; exact-head Windows Runner CI remains required.

## 0.3.15 — 2026-11-20

### Fixed
- Repair eslint-import-resolver-node lockfile metadata so the package version matches its immutable 0.3.10 tarball URL and integrity entry.
- Add CI regression coverage for resolved tarball/version consistency.
- Keep the five-track candidate manifest synchronized.

### Verification
- Static lockfile consistency guard added; exact-head Windows Runner CI remains required.

## 0.3.14 — 2026-11-20

### Fixed
- Move Windows CI Supabase API/database/shadow port allocation to 20000–39999, outside the default Windows dynamic TCP port range.
- Add a regression guard that rejects reintroduction of the previous 55000–63999 allocator.
- Synchronize the five-track integration manifest and numeric release metadata.

### Documentation
- Refresh the GitHub project homepage release number, CI badge target and current verification status.

### Verification
- Static workflow and metadata review completed; exact-head Windows Runner CI remains required.

## 0.3.13 — 2026-11-20

### Fixed
- Reject prediction residuals and MAE terms that overflow IEEE-754 finite numeric range instead of returning Infinity.
- Compute MAE from per-sample normalized terms to avoid overflowing a large intermediate sum when the true mean remains finite.

### Verification
- Added arithmetic-overflow and large-finite-value regression cases. Exact-head CI is required.

## 0.3.9 — 2026-11-20

### Fixed
- Guard the Predictive Coding overview metric when its source prediction has not yet been observed; render an em dash instead of passing null to the numeric error calculator.
- Reconcile the Predictive Coding track version with the manifest and synchronize the current GCAN Product track version.

### Verification
- The prior exact-head CI isolated this defect to TypeScript nullability after all 136 unit tests and database/RLS tests passed. This commit requires a fresh exact-head CI run.


All notable changes are recorded here. Versions use numeric `MAJOR.MINOR.PATCH` only.

## 0.3.8 — 2026-11-20

### Fixed
- Synchronize the five-track manifest with the latest candidate versions: A 2.0.8, B 0.1.5, C 0.3.3, D 0.3.4 and E 0.1.5.
- Correct stale cross-track maturity labels so Deep Research is recorded as an implementation candidate rather than an interface-only candidate.
- Align VERSION, package.json, package-lock.json, manifest and engineering-governance baseline.

### Verification
- Metadata-only synchronization; no application runtime, database schema, permission or deployment behavior changed.
- Exact-head CI remains required. This version update is not release acceptance.

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

### Added
- Add an Expected Calibration Error metric to Predictive Coding and make its binning and boundary semantics explicit.
- Synchronize Track C to 0.3.0 and the repository integration version to 0.3.5.

### Verification
- Add unit coverage for weighted-bin calculation, perfect calibration, p=1 boundary handling and invalid input rejection.
- Exact-head CI is required; dashboard figures remain synthetic and no production telemetry is claimed.


## 0.3.6

- Run full CI on all explicitly controlled A-E feature branch pushes, not only on main or PR lifecycle events.
- Retain repository-owner push gating and the five-workstream branch allowlist.
- Synchronize Predictive Coding to 0.3.1 and repository metadata to 0.3.6.

Verification: exact-head CI and PostgreSQL/RLS validation required. No merge or deployment implied.


## 0.3.7 — 2026-11-20

### Fixed
- Align CI push policy regression coverage with the exact five-branch allowlist without a duplicate `main` entry.
- Synchronize Predictive Coding to 0.3.2 and repository metadata to 0.3.7.

### Verification
- Exact-head CI required; no merge or deployment is implied.
