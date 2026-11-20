## 0.3.32 — 2026-11-20

### Changed
- Improve homepage supporting-copy and metadata readability across desktop and mobile.
- Add regression coverage for typography minimums and synchronize B track version 0.1.12.

### Verification
- Exact-head CI and browser visual validation remain required.

## 0.3.31 — 2026-11-20

### Changed
- Synchronize the B-branch release manifest with the latest Deep Neural track version 0.3.10.

### Verification
- Exact-head CI required.

## 0.3.29 — 2026-11-20

### Fixed
- Move the Windows Supabase CI port allocator to the IANA dynamic/private range (20000–39999) and add a regression guard against the former 55000–63999 range.

### Verification
- Exact-head CI required; port allocation regression is covered by ci-trigger-policy tests.

## 0.3.23 — 2026-11-20

### Fixed
- Replace the brittle timestamp-validator source-regex spelling assertion with implementation-contract checks; retain runtime tests for valid timezone-qualified instants and invalid dates, clock values and offsets.

### Verification
- Unit tests, TypeScript, ESLint and production build must pass on this exact commit before acceptance.

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

## 0.3.17 — 2026-11-20

### Fixed
- Correct the strict ISO timestamp validator's regular-expression escaping and require Date.parse acceptance for UTC and offset timestamps alike.
- Strengthen source-level regression coverage for the shared validator.

### Verification
- Exact-head CI required; the previous candidate's validator was not accepted as passing.

## 0.3.16 — 2026-11-20

### Security
- Require workspace message and conversation timestamps to be real, timezone-qualified ISO-8601 instants.
- Reject impossible calendar dates, invalid clock/offset fields, timezone-less strings and permissive Date.parse inputs.

### Verification
- Added adversarial timestamp validation tests; exact-head CI required.


## 0.3.15 — 2026-11-20

### Fixed
- Align homepage accessibility regression assertions with minified CSS serialization while still requiring visible focus and reduced-motion hover suppression.
- Keep the package-lock and five-track version metadata synchronized.

### Verification
- Corrected source-level assertions; exact-head Windows Runner CI remains required.

## 0.3.14 — 2026-11-20

### Fixed
- Correct the package-lock regression guard to compare the resolved tarball filename directly with the locked package version.
- Preserve eslint-import-resolver-node at the actual 0.3.10 tarball version.

### Verification
- Static regression guard corrected; exact-head Windows Runner CI remains required.

## 0.3.13 — 2026-11-20

### Fixed
- Repair eslint-import-resolver-node lockfile metadata so the package version matches the immutable 0.3.10 tarball URL and integrity entry.
- Add a CI regression assertion for resolved tarball/version consistency.
- Synchronize the five-track candidate manifest.

### Verification
- Static lockfile consistency guard added; exact-head Windows Runner CI remains required.

## 0.3.12 — 2026-11-20

### Improved
- Increase GCAN public homepage typography across navigation, hero copy, workstream cards, product details, governance and documentation sections.
- Add mobile-specific font-size floors so supporting text remains readable on narrow screens.

### Verification
- Added homepage CSS regression assertions. Exact-head CI is required; no backend, database or deployment behavior changed.

## 0.3.10 — 2026-11-20

### Fixed
- Repair two literal escaped-newline sequences in the GCAN homepage regression test that made the test module syntactically invalid.
- Bump the repository and GCAN Product versions; synchronize the lockfile, manifest and governance baseline.

### Verification
- Source-level syntax defect confirmed by inspecting the exact branch file; exact-head CI is required to validate the repair.


All notable changes are recorded here. Versions use numeric `MAJOR.MINOR.PATCH` only.

## 0.3.9 — 2026-11-20

### Fixed
- Synchronize the five-track manifest to A 2.0.8, B 0.1.5, C 0.3.3, D 0.3.4 and E 0.1.5.
- Align root VERSION, package metadata, lockfile and governance baseline.

### Verification
- Metadata-only synchronization; exact-head CI is required before acceptance.

## 0.3.5 — 2026-11-20

### Added
- Redesign the actual GCAN public homepage with a cohesive dark technology brand and responsive desktop/mobile layouts.
- Distinguish the four platform value pillars from the canonical A–E engineering workstreams.
- Add five workbench entry cards with explicit development, preview and demo maturity labels.
- Add the five-track architecture visual, shared prediction-error learning loop, product entry points, trust/governance rules and technical documentation links.
- Publish the GCAN hero and five-track architecture SVGs under the website public asset path.
- Expand page metadata and social preview information to match the five-workstream product definition.
- Add homepage regression tests for track naming, workbench destinations, learning-loop stages, preview disclosures, responsive layout and accessibility.

### Verification
- Exact-head CI and review are required before this candidate is accepted.
- Linked A/C/D/E workbench URLs are development previews, not production-service guarantees.
- No database schema, account permissions, payment behavior or production data flow is changed.


All notable changes are recorded here. Versions use numeric `MAJOR.MINOR.PATCH` only.

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


## 0.3.6 — 2026-11-20

### Fixed
- Synchronize the GCAN Product track VERSION file with the 0.1.3 manifest version introduced by the homepage redesign.
- Synchronize package metadata, lockfile, root VERSION and integration manifest to 0.3.6.

### Verification
- Exact-head CI is required; this commit does not imply a production release or deployment.


## 0.3.7

- Run full CI on all explicitly controlled A-E feature branch pushes, not only on main or PR lifecycle events.
- Retain repository-owner push gating and the five-workstream branch allowlist.
- Synchronize GCAN Product to 0.1.4 and repository metadata to 0.3.7.

Verification: exact-head CI and PostgreSQL/RLS validation required. No merge or deployment implied.


## 0.3.8 — 2026-11-20

### Fixed
- Align CI push policy regression coverage with the exact allowlist without a duplicate `main` entry.
- Synchronize GCAN Product to 0.1.5 and repository metadata to 0.3.8.

### Verification
- Exact-head CI required; no merge or deployment is implied.
