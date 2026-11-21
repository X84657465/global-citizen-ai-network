# GCAN F–P Integration Map

## 1. Baseline and scope

A–P governance registry is present in candidate PR #185, based on integrated-main candidate SHA `5b274eed904e40159c8ab8c13bba68fbc83c1370`, with candidate head `6e76272623333201228d4ed82f63141f56dcb868`. PR #185 is not merged. Treat its registry as a candidate architecture definition, not current mainline state.

## 2. Workstream contracts

| Track | Candidate contract / artifacts | Inputs | Outputs | Dependencies / consumers |
|---|---|---|---|---|
| F Security | Threat model, security gates, incident response, security headers | Change scope, data classification, trust boundaries, vulnerability evidence | Findings, controls, release blockers, incident actions | Cross-cutting: A, B, G, H, I, L, M, P |
| G Release/QA | `lib/release-evidence-contract.mjs` | Repo/track/PR, base/head SHA, timestamp, check records | Validated evidence shape and consistency result | F, GitHub Actions provenance, A publisher, B release view |
| H Observability | `lib/runner-observability-contract.mjs` | Sanitized Runner, queue, task and quota snapshot | Health findings and advisories | A Runner/scheduler, G evidence, operator dashboard |
| I Connectors | Planned provider-neutral connector/event contract | Authenticated provider event, scope, idempotency key | Normalized event, delivery/replay result | F, A authorization, B workflows |
| J Self-healing | Planned recovery/checkpoint contract | Failure domain, durable state, retry budget, backup evidence | Recovery record and restore evidence | A task lifecycle, F, H, M |
| K Knowledge | Existing runbooks and documentation assets | Verified behavior, owner, evidence, review date | Operator procedures, decisions, handover | All tracks; documentation is not executable authority |
| L Federation | `lib/compute/cost-router.ts`, `device-capabilities.ts`, `workload-contract.ts` candidates | Workload class, public metadata, opt-in capability snapshot | Cost route decision and validated workload/lease shape | F security approval, H capacity evidence, signed identity/revocation |
| M Compliance | Planned audit/risk/exception schema | Actor, action, policy decision and evidence | Audit record, risk state, expiring exception | F, G, P, B |
| N Productization | Planned product analytics contract | Consented events, metric definitions, privacy rules | Adoption/quality metrics and feedback | B product events, F, M, P |
| O Lifecycle | Planned deprecation/migration contract | Consumer inventory, compatibility and migration plan | Deprecation notice, migration status, removal approval | K, G, M and each module owner |
| P Governance | Governance/ethics/trust policy candidates | Risk tier, capability request, human decision, evidence | Autonomy boundary, approval/escalation record, policy version | F, G, M and all tracks |

The planned rows are architecture proposals, not implemented API contracts.

## 3. Agent Factory V2 (A) boundary

A owns task lifecycle, planning, isolated patch generation, candidate CI, publication, leases and recovery. F–P are supporting capabilities and must not silently take over A state-machine ownership.

- F defines security and trust-boundary requirements for A execution.
- G may later provide authenticated exact-head release evidence to the A publisher; candidate contract is not currently wired to that publisher.
- H may ingest sanitized A Runner/task/queue telemetry; current candidate is not connected to live sources.
- I may normalize authenticated external events; A must retain authorization and dispatch decisions.
- J may define recovery evidence around A's durable state; do not replace A's existing state machine.
- K documents A operator procedures; source and tested behavior remain authoritative.
- L remains deferred; no community worker, device enrollment, or new resource allocation.
- M/P may advise risk and approval thresholds but cannot bypass A lease/fencing, human merge or deployment boundaries.

## 4. B Product boundary

B owns user-facing product, workspace, contribution workflows, ledger and platform UX. F–P should integrate through reviewed, versioned contracts.

- B must enforce F controls server-side, not merely display policy text.
- B may consume H read-only operational health only after source authentication and privacy review.
- B may display G release evidence only after GitHub provenance is authenticated.
- I webhook payloads cannot grant privileged authority by themselves.
- M audit data must avoid secrets and unnecessary personal information.
- N analytics requires approved consent, event provenance, metric definitions and retention.
- L cannot receive credentials/private user data or privileged work; production activation remains blocked.
- O cannot delete B dependencies without consumer inventory, migration and rollback approval.
- P cannot override F controls or human approval requirements.

## 5. Proposed event envelope — NOT IMPLEMENTED

Before cross-track event wiring, agree a versioned envelope. This is a proposal only:

```json
{
  "schema_version": "1",
  "event_id": "opaque-id",
  "correlation_id": "opaque-id",
  "producer_track": "A-P",
  "event_type": "namespace.event",
  "occurred_at": "RFC3339 timestamp",
  "repository": "owner/repo",
  "branch": "branch-name",
  "commit_sha": "full-commit-sha",
  "subject": { "task_id": "opaque-id", "attempt": 1 },
  "data": {}
}
```

All event data remains untrusted until signature/authentication, schema, authorization, replay and privacy checks pass.

## 6. B candidate ancestry — do not mix

- PR #187 candidate descends from governance PR #185 and migration PR #186; its head is `aad402bf1c718bf85089e4879c044d05c41ca59b`.
- PR #201 candidate descends from A candidate PR #200 (A 2.0.84); its head is `0828491b41244e0f0367a8654bdc07dbfad6d6c6`.
- These are different ancestry stacks. The main controller/B owner must select the authoritative stack, compare changes and rerun exact-head CI after final composition. Do not combine version snapshots by copying metadata.
