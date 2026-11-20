# Deep Research Changelog

## 0.1.0 — 2026-11-20

### Added
- Initial interactive research workbench at `/deep-research`.
- Research project creation and local filtering demonstration.
- Evidence-first workflow, source-quality gates and five-track collaboration panel.

### Limitations
- Demonstration records only; no live web retrieval, persistent database or autonomous research agent is connected yet.

### Verification
- Exact-head CI and independent review pending.

## 0.1.1 — 2026-11-20

### Fixed
- Scope research workspace footer styles to the local page class.
- Carry the Predictive Coding CSS Module selector fix required by the integrated five-track build.

### Verification
- CI rerun required for this exact commit and its C-track base.

## 0.1.2 — 2026-11-20

### Fixed
- Generate the next research project ID from the highest existing numeric ID, so DR-026 is followed by DR-027 rather than skipping to DR-030.
- Reject malformed identifiers and unsafe numeric overflow; preserve uniqueness for sparse ID sequences.

### Tests
- Add deterministic unit coverage for empty, sequential, sparse and malformed ID collections.
- Register the regression suite in `npm run test:unit`.

### Verification boundary
- Research records remain local demonstration state; no persistence, live retrieval or autonomous research is implied.
- Exact-head CI is required before acceptance.


## 0.1.3

- Run full CI on the explicit A-E development-branch push allowlist.
- Keep push execution restricted to repository-owner events and verify the five workstream branches in the CI policy test.

Verification: exact-head CI and database/RLS validation required; no merge or deployment implied.


## 0.1.4 — 2026-11-20

### Fixed
- Register `tests/deep-research-source-quality.test.mjs` in the canonical unit-test command so source provenance and independent corroboration rules are actually executed in CI.

### Verification
- Exact-head CI must execute source URL safety, claim linkage, publisher-independence and counter-evidence tests; registration alone is not acceptance evidence.


## 0.1.5 — 2026-11-20

### Fixed
- Correct the CI push-allowlist regression assertion to match the actual workflow list: `main` appears once, followed by the five controlled A-E branches.
- Keep the Deep Research source quality suite registered in the canonical unit-test command.

### Verification
- Exact-head CI must execute source provenance, publisher independence, counter-evidence and research ID tests, plus build and database checks.
