# GCAN A–P Engineering Workstream Architecture

**Architecture revision:** 1.0.1  
**Planning baseline:** repository release 0.3.49  
**Scope:** A–P workstream ownership, dependencies, implementation stages and acceptance evidence.

> Status is deliberately explicit: A–E are the existing product/engineering tracks; F provides cross-track security assurance; G and H are implementation candidates pending exact-head CI and formal review; I–P remain planned workstreams. This document does not claim that a planned track has shipped or is operational.

## 1. Design principles

1. Every track has one accountable scope, explicit interfaces, a numeric version, work items, tests and acceptance evidence.
2. A track may advise another track but may not silently modify the other track's owned code, policy, data or credentials.
3. Cross-track changes are proposed as isolated branches and reviewable PRs. Receiving owners review compatibility and security impact.
4. The shared Windows Runner is a constrained resource. Do not add runners, servers or paid infrastructure without a measured bottleneck and explicit approval.
5. AI-generated plans and patches are untrusted proposals. Human approval remains mandatory for merges, production deployment, destructive operations and production data migrations.
6. A commit, PR, green partial job or documentation entry is not proof of completion. Acceptance is tied to the exact tested head SHA and all required gates.

## 2. Workstream ownership

| Track | Name | Owns | Explicitly does not own |
|---|---|---|---|
| A | Agent Factory V2 | Task lifecycle, planning, isolated patch generation, candidate CI, publication, leases and recovery | Product feature decisions or production approval |
| B | GCAN Product | Public product, member experience, workspace, contribution workflows and platform UX | Factory internals or independent security policy |
| C | Predictive Coding | Prediction/observation contracts, error measurement, calibration and drift analysis | Autonomous production model mutation |
| D | Deep Neural | Provenance-aware memory, reasoning, knowledge integration and evaluated learning proposals | Treating unverified model output as authoritative memory |
| E | Deep Research | Research workflow, source provenance, corroboration, counter-evidence and cited synthesis | Unreviewed external instructions or source claims |
| F | Cyber Security & Defense | Cross-track threat model, minimum controls, adversarial validation, vulnerability response and incident readiness | Replacing each track's responsibility to fix its own vulnerabilities |
| G | Release, QA & Integration | Integration sequencing, compatibility matrix, release gates, regression suites and release evidence | Owning feature implementation or bypassing F security gates |
| H | Observability, Telemetry & Cost/Quota Governance | Queue/Runner telemetry, task timing, failure taxonomy, quota/cost accounting and alerts | Secret collection, unbounded telemetry or purchasing resources automatically |
| I | Ecosystem, Connectors & Workflow Automation | External APIs, webhooks, notifications, synchronization and event adapters | Trusting external payloads or granting authority from webhook content |
| J | Self-Healing, Chaos & Continuity | Bounded recovery, circuit breakers, safe degradation, checkpointing, backup/restore and controlled fault drills | Destructive production chaos experiments without explicit approval |
| K | Knowledge Base, Docs & Governance Playbooks | Architecture records, runbooks, handoff templates, decision logs and operator playbooks | Overriding source code, live configuration or formal policy owners |
| L | Multi-Node, Federation & Edge/Cluster Coordination | Future node registration, capability-aware scheduling, leases, health and cross-node coordination | Unapproved distributed compute or hidden use of participant devices |
| M | Compliance, Policy Audit & Risk Governance | Evidence retention, change/audit trails, policy checks, exception expiry and risk register | Legal certification or replacing qualified legal advice |
| N | Productization, Analytics & Growth/Ecosystem Ops | Product outcomes, adoption/quality metrics, feedback loops, onboarding and ecosystem operations | Dark patterns, unsupported growth claims or misleading financial promises |
| O | Lifecycle, Deprecation & Legacy Retirement | Deprecation policy, migration windows, compatibility and removal of obsolete components | Removing live dependencies without owner review and migration evidence |
| P | Governance, Ethics & Trust/Policy Evolution | Autonomy boundaries, human approval thresholds, trust principles and cross-track arbitration | Granting itself authority to override security controls or human approval |

## 3. Dependency and implementation sequence

Tracks are not required to activate in alphabetical order. The sequence below reflects prerequisites and risk.

### Stage 0 — Preserve the existing baseline

- Keep A–H ownership and existing factory/product work intact.
- Complete F's exact-head CI, security review and acceptance independently; apply F controls to every track.
- Do not merge F or any dependent work merely because a downstream branch exists.
- Record the exact base SHA used by each dependent branch.

**Exit criteria:** A–F integration baseline is identifiable, version metadata is consistent, and no unresolved high-severity security gate is silently waived.

### Stage 1 — Integration and visibility foundations (G, H, K)

**G deliverables**
- Track ownership and path-impact matrix.
- PR template/checklist for scope, dependencies, test evidence, security impact and rollback.
- Required checks matrix: unit, type check, lint, production build, database/RLS, security and exact-head SHA.
- Compatibility policy for shared contracts and stacked PRs.
- Release evidence record; failed or pending checks cannot be represented as passed.

**H deliverables**
- Structured task/run events with correlation ID, track, task ID, attempt, branch and commit SHA.
- Queue wait, execution duration, retry, cancellation, quarantine and failure-scope measurements.
- Runner health snapshots using existing runner capabilities only.
- Cost/quota ledger separating actual provider charges from estimates and local resource observations.
- Thresholds for warning, safe pause and manual escalation; no automatic infrastructure purchase.

**K deliverables**
- A–P ownership map, decision records and architecture index.
- Standard incident, deployment, Runner recovery, CI failure and handoff runbooks.
- Evidence format: repository, branch, exact SHA, command, result, timestamp and operator/automation identity.
- Documentation freshness owner and review cadence.

**Exit criteria:** G can reject an incompatible candidate; H can explain queue and task state without exposing secrets; K can hand off a task without relying on chat history.

### Stage 2 — Resilience and accountability (J, M, P)

**J:** bounded retries, idempotent recovery, circuit breakers, checkpoint integrity, backup/restore verification and non-production fault injection. Start with simulated failures; production chaos remains opt-in and approved.

**M:** append-only security-sensitive audit events, actor/action/target/time/result, policy-to-evidence mapping, risk severity, exception owner and expiry. Minimize personal data and never log credentials or raw secrets.

**P:** classify actions by autonomy level. Read-only analysis may be automated; code proposals require tests; merges, production changes, money movement, destructive actions and permission changes require explicit human approval. Define arbitration without weakening F controls.

**Exit criteria:** recovery is tested from a known checkpoint; sensitive changes are traceable; every exception has an owner, rationale and expiry; autonomous actions cannot cross approval boundaries.

### Stage 3 — Controlled external ecosystem (I, N, O)

**I:** signed/authenticated webhook verification where supported, strict schema validation, replay protection, idempotency keys, bounded retries, dead-letter handling and least-privilege credentials. All external data is untrusted and must pass F controls.

**N:** product outcome metrics with documented definitions, privacy-aware aggregation, user feedback triage, accessibility/usability review and measured onboarding improvements. Avoid vanity metrics without denominator and time window.

**O:** inventory obsolete routes, workflows, schemas, flags and dependencies; define deprecation notice, migration path, compatibility window, removal owner and rollback/forward-fix strategy.

**Exit criteria:** integrations are observable and replay-safe; product changes have measurable outcomes; no legacy component is removed without migration evidence.

### Stage 4 — Conditional distributed coordination (L)

L remains deferred until H demonstrates a real capacity or availability bottleneck that cannot be resolved by queue policy or workload optimization.

Deliverables, only after approval:
- Node identity, registration, revocation and capability attestation.
- Capability/resource declarations with hard limits and explicit opt-in.
- Lease-based scheduling, fencing tokens and idempotent task handoff.
- Health checks, stale-node eviction and safe rescheduling.
- Signed workloads, sandboxing, restricted egress, data minimization and independent result validation.

**Exit criteria:** threat model and F review passed; node consent/exit is proven; no credential or tenant-data boundary is weakened; recovery and cost model are validated. No new physical node is assumed by this roadmap.

## 4. Cross-track interfaces

| Interface | Producer | Consumers | Required safeguards |
|---|---|---|---|
| Task lifecycle events | A | G, H, J, K, M | Stable schema, correlation ID, idempotency, no secrets |
| Security findings/control status | F | A–P, especially G/M/P | Severity, evidence, owner, remediation and expiry |
| Release evidence | G | A–P | Exact SHA, required checks, immutable result references |
| Telemetry and quota events | H | A, G, J, N, P | Data minimization, bounded cardinality, cost provenance |
| External events | I | Approved product/workflow owners | Authentication, schema validation, replay protection, F review |
| Runbooks and decisions | K | A–P | Versioned, reviewed, source-linked |
| Audit evidence/risk exceptions | M | F, G, P and authorized operators | Append-only history, least privilege, retention limits |
| Product outcome feedback | N | B, C, D, E | Privacy-aware aggregation and metric definitions |
| Deprecation contracts | O | All affected owners | Compatibility window, migration and rollback |
| Autonomy policy | P | A–P | Human approval gates; cannot override F security controls |

## 5. Release and verification gates

A cross-track release is blocked when any required check is pending, failed, missing or bound to a different head SHA.

- Scope: changed files map to an owning track; shared-file changes identify all receiving owners.
- Quality: unit tests, type checking, lint, production build and relevant integration/database/RLS tests.
- Security: secret/dependency checks, authorization, tenant isolation, input validation, Runner isolation and F review.
- Reliability: retry bounds, idempotency, lease/fencing semantics and rollback/recovery evidence where applicable.
- Operations: H telemetry fields and K runbook updates for new operational behavior.
- Governance: M audit requirements and P approval class are satisfied.
- Human gate: no automatic merge, production deployment, destructive action or production migration.

## 6. Resource and safety constraints

- Use the existing GitHub Actions Windows Runner and current local tooling; no new server or runner is part of this plan.
- Bound concurrent jobs, retries, task duration, response size and external API calls.
- Never loop retries indefinitely or use repeated CI dispatch as a substitute for diagnosis.
- Keep secrets out of prompts, client bundles, logs, artifacts and documentation.
- Do not execute untrusted patches on a persistent host with production credentials.
- L is deferred; participant CPU/GPU use must never be hidden or enabled without granular opt-in and a visible stop/exit path.
- Security controls and human approval requirements take precedence over delivery speed.

## 7. Required work item record

Every implementation issue/PR records: track, owner, objective, non-goals, allowed paths, dependencies, numeric track/repository versions, acceptance tests, exact tested SHA, CI state, security/privacy impact, resource budget, rollback and receiving-owner approvals.

## 8. Current status and non-claims

| Tracks | Status in this baseline | Meaning |
|---|---|---|
| A–E | Existing tracks | Existing scope; individual feature readiness still requires evidence |
| F | Security foundation on integration branch | Separate PR and exact-head security acceptance remain required |
| G–P | Planned | Architecture and ownership defined; no operational capability is implied |

This roadmap is not a security certification, compliance opinion, production-readiness statement, or authorization to add infrastructure.
