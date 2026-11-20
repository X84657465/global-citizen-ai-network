# Predictive Coding（預測編碼）— Track C Architecture

**Track:** C  
**Track version:** 0.1.0  
**Architecture revision:** 1.0.0  
**Status:** Architecture definition; predictive performance and runtime integration are not yet claimed.

## 1. Mission

Predictive Coding is the system's prediction-and-error learning workstream. It makes expectations explicit, compares predictions with observations, quantifies prediction error and uncertainty, and proposes evidence-based updates. It supports all other tracks; it does not own their roadmaps or autonomously modify their production systems.

## 2. Core loop

`context → prediction → action/observation → outcome → prediction error → explanation → model/plan update → validation`

Every prediction must be testable against an observed outcome. A prediction without a target, horizon, context and evaluation rule is not an accepted prediction record.

## 3. Core subsystems

### C1 — Prediction registry
- Store prediction ID, version, owner, target, context, prediction timestamp and forecast horizon.
- Record expected value or structured outcome, confidence and assumptions.
- Link each prediction to its originating task, product workflow or knowledge artifact.
- Keep prediction records immutable; corrections create a superseding record.

### C2 — Observation and outcome capture
- Capture actual outcomes with timestamps, source provenance and measurement method.
- Distinguish missing observations from negative outcomes.
- Track delayed, partial, censored and disputed observations explicitly.
- Apply privacy classification and data minimization before collecting user/product signals.

### C3 — Prediction-error engine
- Compare prediction with observation using a metric appropriate to the target (e.g. absolute/relative error, log loss, Brier score, calibration error or task-specific structured distance).
- Record metric definition and version so scores remain interpretable.
- Report error distributions and trends, not only a single aggregate score.
- Separate aleatoric uncertainty, epistemic uncertainty and data-quality problems where the evidence supports that distinction.
- Detect drift and alert the owning track; do not silently rewrite models.

### C4 — Calibration and model update proposals
- Evaluate confidence calibration and performance by cohort, time horizon and relevant context.
- Generate proposed rule/model/plan updates with supporting examples, expected benefit and regression risks.
- Require holdout or time-split validation to reduce leakage.
- Preserve a baseline for comparison and a rollback path.
- Publish approved proposals as versioned artifacts for the receiving track to adopt.

### C5 — Cross-track prediction services
- **A — Agent Factory:** predict task duration, likely failure class, retry usefulness, dependency risk and CI failure patterns. Compare forecasts with actual run evidence.
- **B — GCAN:** forecast product workflow friction, service demand, capacity and operational bottlenecks using authorized, appropriately aggregated signals.
- **D — Deep Neural:** identify memory gaps, retrieval uncertainty, reasoning failure patterns and evaluation coverage needs.
- **C itself:** measure prediction quality over time and use verified errors to improve forecasting methods.

## 4. Contracts

### PredictionRecord
- prediction_id, version, track, target, context_ref, predicted_value, confidence, horizon, metric_id, created_at, provenance, status.

### ObservationRecord
- observation_id, prediction_id, observed_value, observed_at, measurement_method, source_ref, data_quality, sensitivity.

### PredictionErrorRecord
- error_id, prediction_id, observation_id, metric_id, metric_version, error_value, uncertainty, calculated_at.

### ModelUpdateProposal
- proposal_id, source_error_refs, baseline_version, candidate_version, expected_benefit, regression_risks, validation_plan, rollback_plan, receiving_track_decisions.

All contracts require schema validation, provenance, numeric versions and sensitivity labels before being used by other tracks.

## 5. Mutual support with four tracks

| Track | Provides to C | Receives from C |
|---|---|---|
| A — Agent Factory V2 | Task/CI/run outcomes, failure categories, recovery results | Risk forecasts, failure likelihood, test-priority recommendations |
| B — GCAN | Authorized product events, workflow outcomes, aggregate usage/operations signals | Demand and bottleneck forecasts, user-flow risk signals |
| C — Predictive Coding | Prediction records, observed outcomes, error and calibration analyses | Better evidence and validation feedback from all tracks |
| D — Deep Neural | Reviewed memories, semantic context, reasoning traces and evaluation evidence | Forecast uncertainty, prediction-error patterns and model-update proposals |

The receiving track owns adoption decisions. Shared data must be authorized, minimized and purpose-limited.

## 6. Quality and scientific controls

- Establish simple baselines before claiming model improvement.
- Use time-aware train/validation/test splits where applicable.
- Avoid data leakage and target leakage.
- Report sample size, coverage, missingness and uncertainty with metrics.
- Compare candidate performance to baseline and include regression slices.
- Treat correlation as evidence for investigation, not proof of causation.
- Keep an explicit unknown state when evidence is insufficient.
- Do not use a model's confidence score as a substitute for calibration.

## 7. Safety, privacy and operational boundaries

- No covert collection of personal or product telemetry.
- No sensitive user data in shared prediction records unless explicitly authorized and strictly necessary.
- No automatic changes to pricing, rewards, account status, production deployment or access control based on predictions.
- Predictions are advisory until the owning track validates and approves a bounded use.
- Maintain provenance, retention, correction/deletion and access-control policies.
- Do not feed untrusted content or prompt-injection instructions into trusted model policy.

## 8. Delivery sequence

1. **0.1.0 — Architecture foundation:** prediction/observation/error contracts, metrics policy and cross-track responsibilities.
2. **0.2.0 — Offline evaluator:** deterministic metric implementations and synthetic fixtures.
3. **0.3.0 — Prediction registry:** versioned records and provenance validation.
4. **0.4.0 — Track adapters:** read-only ingestion of approved A/B/D evidence.
5. **0.5.0 — Proposal workflow:** reviewed model-update proposals and holdout evaluation.
6. **1.0.0 — Stable predictive service:** only after reproducible evaluation, privacy review, calibration evidence and receiving-track acceptance.

## 9. Acceptance criteria for 0.1.0

- Responsibilities and contracts are documented.
- Prediction, observation and error are distinct records.
- Metrics and scientific validation controls are explicit.
- Cross-track read/write boundaries and human approval are defined.
- No live user telemetry ingestion, automatic production decisions or model training is introduced by this architecture-only release.

## 8. Deterministic metric implementation — 0.2.0

The initial metrics module provides three pure calculations:

- `calculatePredictionError(predicted, observed)`: signed residual is `observed - predicted`; absolute residual stays in the target's original unit.
- `calculateMeanAbsoluteError(predictions, observations)`: requires equally sized, non-empty finite-number arrays. Callers must group by metric and unit; percentages, percentage points and elapsed time must never be averaged together.
- `calculateBrierScore(probabilities, outcomes)`: computes mean squared probability error for binary outcomes. Probabilities must be within [0, 1] and outcomes must be 0 or 1.

Missing observations are not converted to zero and are not scored. Invalid, non-finite or structurally mismatched values fail explicitly. These are deterministic building blocks only: they do not ingest telemetry, train a model or trigger operational decisions.
