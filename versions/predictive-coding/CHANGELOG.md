# Predictive Coding Changelog

## 0.3.5 — 2026-11-20

### Fixed
- Align the five-track integration CI Supabase port allocator with the Windows-safe 20000–39999 range.
- Add a workflow regression test to prevent the previous dynamic-range allocator from returning.

### Verification
- Exact-head Windows Runner CI is required, including Supabase startup, migrations, PostgreSQL and RLS tests.

## 0.3.4 — 2026-11-20

### Fixed
- Reject arithmetic overflow in signed prediction residuals and MAE instead of emitting non-finite metrics.
- Avoid intermediate MAE sum overflow by accumulating normalized absolute-error contributions.

### Tests
- Cover overflow rejection and large finite MAE calculations.

### Verification
- Exact-head CI required before acceptance.

## 0.3.3 — 2026-11-20

### Fixed
- Handle an unobserved prediction safely in the overview metric; show a placeholder until an observation exists.
- Reconcile the track version file with the integration manifest.

### Verification
- The preceding candidate passed 136 unit tests and database/RLS tests; its TypeScript check exposed the nullable observation path. Exact-head CI must pass before acceptance.


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

## 0.1.4 — 2026-11-20

### Fixed
- Correct the CSS Module selector regression guard so its regular expressions detect actual whitespace and element boundaries.

### Verification
- Exact-head CI required.

## 0.2.0 — 2026-11-20

### Added
- Add deterministic prediction-error, mean-absolute-error and binary Brier-score calculations.
- Define residual sign as observed minus predicted; validate finite values, array shape, probability bounds and binary outcomes.
- Render prediction residuals from numeric inputs and leave missing observations explicitly unscored.
- Register the regression suite in `npm run test:unit`.

### Verification boundary
- Deterministic utilities only; no live telemetry, model training or production decision automation is connected.
- Exact-head CI is required before acceptance.

## 0.2.1 — 2026-11-20

### Fixed
- Correct the MAE regression fixture expectation: absolute errors 4, 4 and 0 yield a mean of 8/3, not 2.

### Verification
- The deterministic metric implementation is unchanged; exact-head CI must pass the corrected regression suite before acceptance.


## 0.3.0 — 2026-11-20

### Added
- Implement Expected Calibration Error (ECE) for binary probability forecasts with configurable, bounded bins.
- Handle the p=1 boundary in the final bin and weight per-bin calibration gaps by sample share.
- Reject non-finite values, mismatched/empty arrays, out-of-range probabilities, non-binary outcomes and invalid bin counts.
- Replace the dashboard's hardcoded 0.91 calibration number with an explicitly labeled synthetic ECE calculation.

### Verification boundary
- ECE is a diagnostic that depends on binning and sample size; no live telemetry, predictive training or production decision automation is connected.
- Exact-head CI is required before acceptance.


## 0.3.1

- Run full CI on the explicit A-E development-branch push allowlist.
- Keep push execution restricted to repository-owner events and verify the five workstream branches in the CI policy test.

Verification: exact-head CI and database/RLS validation required; no merge or deployment implied.


## 0.3.2 — 2026-11-20

### Fixed
- Correct the CI push-allowlist regression assertion to match the actual workflow list: `main` appears once, followed by the five controlled A-E branches.

### Verification
- Exact-head CI must complete the policy test, metric suite, TypeScript, lint, production build and database/RLS jobs.
