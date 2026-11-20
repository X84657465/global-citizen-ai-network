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
