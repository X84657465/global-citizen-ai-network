## 0.3.34 — 2026-11-20

### Security
- Harden Deep Neural capability schema inputs against class instances, inherited prototypes, symbol keys and accessors.
- Synchronize D track version 0.3.14 and repository package metadata.

### Verification
- Exact-head CI and runtime capability integration remain required.

## 0.3.33 — 2026-11-20

### Fixed
- Preserve the existing missing-schema-type validation contract while rejecting unsupported JSON Schema type names in capability manifests.

### Verification
- Existing and new schema validation regressions are covered by the updated test suite; exact-head CI required.

## 0.3.32 — 2026-11-20

### Fixed
- Validate capability input/output schema types against the supported JSON Schema type vocabulary instead of accepting arbitrary non-empty strings.

### Tests
- Add negative cases for unsupported type names in both schema positions.

### Verification
- Exact-head CI required; no live capability execution or production data mutation is claimed.

## 0.3.31 — 2026-11-20

### Fixed
- Normalize validated Deep Neural EvidenceRecord GitHub run URLs before returning them, preventing whitespace-padded input from leaking into persisted evidence references.

### Tests
- Add a regression assertion that accepts a valid padded URL but returns the canonical trimmed URL.

### Verification
- Exact-head Windows Runner CI remains required; no local or remote test pass is claimed.

## 0.3.30 — 2026-11-20

### Fixed
- Move the Windows Supabase CI port allocator to the IANA dynamic/private range (20000–39999) and add a regression guard against the former 55000–63999 range.

### Verification
- Exact-head CI required; port allocation regression is covered by ci-trigger-policy tests.

## 0.3.23 — 2026-11-20

### Fixed
- Correct the Deep Neural timezone-boundary regression to assert the validator's intentional preservation of the original ISO-8601 timestamp string; the contract validates but does not canonicalize timestamps.

### Verification
- The +14:00 input is accepted and preserved; +14:01 and -15:00 remain rejected. Exact-head CI is required.

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
- Synchronize five-track branch history and canonical repository release metadata.
- Align the version manifest with the latest recorded versions across all five tracks.

### Verification
- Exact-head CI and independent review remain required.

## 0.3.19 — 2026-11-20

### Fixed
- Align Deep Neural knowledge/evidence timestamp validation with the ISO-8601 maximum timezone offset of ±14:00.
- Reject offsets beyond 14 hours and non-zero minutes at the 14-hour boundary.

### Verification
- Added +14:00 acceptance and +14:01/-15:00 rejection tests; exact-head CI required.

## 0.3.18 — 2026-11-20

### Fixed
- Restore the complete historical root changelog after detecting an accidental truncation in the previous security commit.
- Preserve the Track D source URL hardening and adversarial regression coverage.

### Verification
- Metadata restoration only; exact-head CI required.

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
- Synchronize the five-track candidate manifest.

### Verification
- Static lockfile consistency guard added; exact-head Windows Runner CI remains required.

## 0.3.14 — 2026-11-20

### Fixed
- Require timezone-qualified ISO-8601 timestamps with real calendar dates and bounded clock/offset fields in Deep Neural knowledge and evidence contracts.
- Reject normalized invalid dates and timezone-less evidence records before they can enter the knowledge provenance layer.

### Verification
- Added adversarial timestamp regression tests. Exact-head CI is required.

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

### Added
- Add the Track E research source provenance receiver contract to Deep Neural.
- Synchronize Deep Neural to 0.3.0 and repository integration version to 0.3.5.

### Verification
- Add source compatibility and adversarial-input tests. Exact-head CI is required; no live page retrieval or automatic memory ingestion is implied.


## 0.3.6 — 2026-11-20

### Fixed
- Correct the Deep Neural Track E compatibility test import and synchronize D to 0.3.1 / overall integration to 0.3.6.

### Verification
- Exact-head CI required; no automatic research ingestion or production memory changes are enabled.


## 0.3.7

- Run full CI on all explicitly controlled A-E feature branch pushes, not only on main or PR lifecycle events.
- Retain repository-owner push gating and the five-workstream branch allowlist.
- Synchronize Deep Neural to 0.3.2 and repository metadata to 0.3.7.

Verification: exact-head CI and PostgreSQL/RLS validation required. No merge or deployment implied.


## 0.3.8 — 2026-11-20

### Fixed
- Ensure Deep Neural runtime contracts, including the Track E ResearchSourceRecord adapter, are part of the blocking CI unit-test suite.
- Synchronize Track D to 0.3.3 and repository metadata to 0.3.8.

### Verification
- Exact-head CI must pass the full unit suite, type checking, lint, production build and PostgreSQL/RLS validation.


## 0.3.9 — 2026-11-20

### Fixed
- Align CI push policy regression coverage with the exact five-branch allowlist without a duplicate `main` entry.
- Synchronize Deep Neural to 0.3.4 and repository metadata to 0.3.9.

### Verification
- Exact-head CI required; no merge or deployment is implied.
