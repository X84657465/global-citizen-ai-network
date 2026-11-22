# H — Observability, Telemetry & Cost/Quota Governance

## Purpose

H defines a privacy-minimized, deterministic reporting contract for queue, runner, task, and cost events. It is an evidence evaluator, not a telemetry collector, quota enforcer, billing system, or runner controller.

## Event contract

- Use opaque event IDs; do not include member identifiers, prompts, source documents, credentials, or free-form payloads.
- Timestamps must be canonical UTC with millisecond precision.
- Events must fall within a half-open reporting window: `windowStart <= occurredAt < windowEnd`.
- Durations are bounded non-negative integer milliseconds.
- Money is represented only as integer micro-units with an explicit currency.
- Mixed currencies fail closed and must be reconciled in separate windows or by an explicitly reviewed conversion process.
- Cost fields are accepted only on `cost` events; every cost event must carry an explicit non-negative integer amount and supported currency.
- Event completeness is not inferable from caller-supplied batches; results explicitly report `evidenceCompleteness: not-verifiable` until a trusted collector supplies independently verifiable coverage evidence.
- Duplicate event IDs, malformed values, out-of-window events, and oversized batches are rejected.

## Reporting and quota semantics

- Queue, runner, task, cost, and outcome counts are deterministic.
- Duration percentiles use the nearest-rank method (ceil(n × p)).
- Missing duration samples remain null; absent cost events remain zero with currency null.
- Quota warning and exceeded states are advisory evidence only.
- No automatic cancellation, runner pause, member restriction, billing, or quota mutation is authorized by this module.

## Operational rollout gates

1. Integrate trusted event collection with bounded retention and access controls.
2. Verify clock synchronization and event deduplication.
3. Reconcile actual provider invoices separately from estimates.
4. Add alert delivery and owner acknowledgement without exposing sensitive event payloads.
5. Require exact-head CI and independent review before enabling any enforcement path.

## Current maturity

The pure aggregation and validation contract has implementation code and regression coverage, but H remains `planned` in the authoritative workstream manifest. Live event collection, alert delivery, invoice reconciliation, retention controls, and operational SLOs remain unverified; no implementation or test result alone constitutes acceptance.
