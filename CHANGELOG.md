## 0.3.28 — 2026-11-20

### Fixed
- Reject duplicate numeric research project IDs, including aliases with different zero-padding such as DR-024 and DR-0024.
- Prevent corrupted or ambiguous existing ID collections from silently producing new project identifiers.

### Tests
- Cover exact duplicates and equivalent numeric IDs with different padding widths.

### Verification
- Exact-head Windows Runner CI remains required; no runtime or database persistence is claimed.

## 0.3.27 — 2026-11-20

### Fixed
- Restore the Windows Supabase CI port allocator to the verified 20000–39999 base-port range and reinstate a regression test that rejects the 55000–63999 allocator.
- Synchronize the five-track release manifest with current A–D track versions and Deep Research 0.1.11.

### Verification
- Static workflow and regression-test source updated; exact-head Windows Runner CI is required before acceptance.
- No production database, deployment, or paid service was changed.

### Rollback
- Revert this exact commit; the change affects CI test port allocation and release metadata only.

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

## 0.3.14 — 2026-11-20

### Fixed
- Enforce the ISO-8601 maximum timezone offset of ±14:00 for curated Deep Research source provenance timestamps.
- Reject offsets beyond 14 hours and non-zero minutes at the 14-hour boundary.

### Verification
- Added valid +14:00 boundary and invalid +14:01/-15:00 cases; exact-head CI required.

## 0.3.13 — 2026-11-20

### Fixed
- Correct the package-lock regression guard to compare the resolved tarball filename directly with the locked package version.
- Preserve eslint-import-resolver-node at the actual 0.3.10 tarball version.

### Verification
- Regression guard corrected; exact-head Windows Runner CI remains required.

## 0.3.12 — 2026-11-20

### Fixed
- Repair eslint-import-resolver-node lockfile metadata so the package version matches its immutable 0.3.10 tarball URL and integrity entry.
- Add CI regression coverage for resolved tarball/version consistency.
- Synchronize the five-track candidate manifest.

### Verification
- Static lockfile consistency guard added; exact-head Windows Runner CI remains required.

## 0.3.11 — 2026-11-20

### Fixed
- Reject impossible calendar dates, out-of-range clock fields and invalid timezone offsets in Track E research-source provenance timestamps.
- Add regression coverage for invalid dates and offsets that JavaScript Date.parse may normalize instead of rejecting.

### Verification
- Exact-head CI must pass the full unit, type, lint, build and Supabase/PostgreSQL/RLS jobs. This change does not enable live URL fetching or claim source authenticity.

## 0.3.10 — 2026-11-20

### Fixed
- Correct regular-expression escaping in the new research-source host and timestamp guards so the intended address and ISO-8601 checks execute as designed.
- Bump the integration and Deep Research patch versions; synchronize package metadata and governance baseline.

### Verification
- Exact-head CI is required to validate this correction and the preceding security regression cases.


## 0.3.9 — 2026-11-20

### Security
- Harden research-source URL validation against non-public IPv4/IPv6 literals, carrier-grade NAT, link-local, documentation and transition ranges, plus localhost subdomains and trailing-dot hostnames.
- Require timezone-qualified ISO-8601 timestamps for publication and retrieval provenance.

### Verification
- Added regression cases for reserved address ranges and timezone-less dates. This validation is syntactic only; any future URL fetcher must still enforce DNS resolution and redirect checks at connection time.
- Exact-head CI required before acceptance.


All notable changes are recorded here. Versions use numeric `MAJOR.MINOR.PATCH` only.

## 0.3.8 — 2026-11-20

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


## 0.3.5

- Run full CI on all explicitly controlled A-E feature branch pushes, not only on main or PR lifecycle events.
- Retain repository-owner push gating and the five-workstream branch allowlist.
- Synchronize Deep Research to 0.1.3 and repository metadata to 0.3.5.

Verification: exact-head CI and PostgreSQL/RLS validation required. No merge or deployment implied.


## 0.3.6 — 2026-11-20

### Fixed
- Ensure Deep Research source quality, provenance and corroboration tests are included in the blocking CI unit-test suite.
- Synchronize Track E to 0.1.4 and repository metadata to 0.3.6.

### Verification
- Exact-head CI must pass unit tests, type checking, lint, production build and PostgreSQL/RLS validation.


## 0.3.7 — 2026-11-20

### Fixed
- Align CI push policy regression coverage with the exact five-branch allowlist without a duplicate `main` entry.
- Synchronize Deep Research to 0.1.5 and repository metadata to 0.3.7.

### Verification
- Exact-head CI required; no merge or deployment is implied.
