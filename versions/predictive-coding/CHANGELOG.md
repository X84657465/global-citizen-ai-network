# Predictive Coding Changelog

## 0.1.0 — 2026-11-20

### Added
- Established Track C as Predictive Coding（預測編碼）.
- Defined prediction, observation, prediction-error, uncertainty/calibration and model-update proposal responsibilities.
- Documented integration with Agent Factory V2, GCAN and Deep Neural.
- Added provenance, privacy, scientific validation and receiving-track approval requirements.

### Verification
- Architecture and governance documentation only.
- No live telemetry ingestion, predictive model training or production decision automation.

## 0.1.1 — 2026-11-20

### Fixed
- Scope table and footer element selectors to local CSS Module classes so the production build accepts the workspace styles.

### Verification
- CI rerun required for this exact commit.

## 0.1.2 — 2026-11-20

### Fixed
- Scope responsive footer and footer-span selectors to `.page` so the CSS Module does not emit unapproved global selectors.
- Keep table styles scoped to `.tableScroll`.

### Verification
- Exact-head CI rerun required; no release acceptance implied.

## 0.1.3 — 2026-11-20

### Added
- Add a regression test that rejects unscoped global element selectors in application CSS Modules.
- Include the selector contract in the standard unit-test command.

### Verification
- Exact-head CI required for this commit.
