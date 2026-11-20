# H Track — Runner Observability & Quota Contract

**Contract revision:** 1.0.0  
**Status:** implementation candidate; advisory only.

## Purpose

Define a deterministic, privacy-minimized snapshot for Runner liveness, queue pressure, recent outcomes and quota consumption. Provide a pure evaluator that returns health findings and recommended operator actions.

## Snapshot boundary

A schema version 1 snapshot contains:

- Repository identity and timezone-qualified observation timestamp.
- Runner ID, display name, lifecycle status, last heartbeat and bounded labels.
- Queue depth, running count and oldest queued timestamp.
- Completed, failed and retried counters over a bounded observation window.
- Quota limit, usage, unit and optional reset timestamp.

Unknown fields are rejected. Quota usage may exceed the configured limit because metering and enforcement can lag; such readings must remain valid so the evaluator can raise a critical alert. Do not include tokens, environment variables, secrets, host filesystem paths, raw job payloads, user prompts or unrestricted log excerpts. Runner identifiers and labels must be treated as operational metadata, not authorization credentials.

## Health evaluation

`evaluateRunnerHealth` validates the snapshot and applies configurable thresholds for heartbeat age, queue depth, failure rate and quota utilization. It returns `normal`, `warning`, `critical` or `invalid`, plus findings and advisory actions.

Critical conditions may recommend pausing new tasks or quota-consuming work pending operator review. The evaluator does not pause, cancel, restart, scale or mutate any Runner. A trusted orchestration layer must independently authenticate source telemetry and enforce permissions before taking action.

## Initial default thresholds

| Signal | Warning | Critical |
|---|---:|---:|
| Heartbeat age | — | 120 seconds |
| Queued tasks | 5 | 15 |
| Failure rate | 10% | — |
| Quota utilization | 80% | 95% |

Thresholds are configurable and should be tuned only from measured workload history. A zero-outcome window has a zero failure rate; it must not be interpreted as proof of successful operation.

## Acceptance and integration boundary

- Unit tests cover valid/invalid snapshots, privacy-field rejection, queue consistency, heartbeat staleness, queue pressure, failure rate, quota thresholds and clock skew.
- Exact-head Windows Runner CI remains mandatory.
- This contract is not yet connected to GitHub Actions telemetry, Runner APIs, Agent Factory scheduling, notifications or automatic pause controls.
- Never treat a snapshot supplied by an untrusted PR or job as authoritative operational telemetry.

## Rollback

Remove `lib/runner-observability-contract.mjs`, its unit tests and this document, then restore the previous numeric release metadata. No production Runner configuration, quota, secret, database or deployment is changed.
