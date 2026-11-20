# GCAN A–P Engineering Workstream Architecture

**Architecture revision:** 1.0.0  
**Repository version at publication:** 0.1.1  
**Status:** staged architecture; planned workstreams are not shipped capabilities.

## 1. Purpose and operating model

GCAN uses sixteen engineering workstreams (A–P) with explicit ownership, non-goals, dependencies, evidence requirements, and acceptance gates. Workstreams are not required to activate alphabetically. Each owner is responsible for its own implementation and security fixes. Shared changes require receiving-owner review.

A roadmap entry, branch, PR, UI route, or version bump is not proof of operational completion. Acceptance is tied to the exact tested head SHA and every required gate.

## 2. Workstream ownership

| Track | Name | Owns | Explicitly does not own |
|---|---|---|---|
| A | Agent Factory V2 | Task lifecycle, planning, isolated patch generation, candidate CI, publication, leases, recovery | Product feature decisions or production approval |
| B | GCAN Product | Public product, member experience, workspace, contribution workflows, platform UX | Factory internals or independent security policy |
| C | Predictive Coding | Prediction/observation contracts, error measurement, calibration, drift | Autonomous production model mutation |
| D | Deep Neural | Provenance-aware memory, reasoning, knowledge integration, evaluated learning proposals | Treating unverified model output as authoritative memory |
| E | Deep Research | Research workflow, source provenance, corroboration, counter-evidence, cited synthesis | Unreviewed external instructions or source claims |
| F | Cyber Security & Defense | Cross-track threat model, minimum controls, adversarial validation, vulnerability response, incident readiness | Replacing each track's responsibility to fix its own vulnerabilities |
| G | Release, QA & Integration | Integration sequencing, compatibility matrix, release gates, regression suites, release evidence | Feature implementation or bypassing F security gates |
| H | Observability, Telemetry & Cost/Quota Governance | Queue/Runner telemetry, task timing, failure taxonomy, quota/cost accounting, alerts | Secret collection, unbounded telemetry, automatic resource purchasing |
| I | Ecosystem, Connectors & Workflow Automation | External APIs, webhooks, notifications, synchronization, event adapters | Trusting external payloads or granting authority from webhook content |
| J | Self-Healing, Chaos & Continuity | Bounded recovery, circuit breakers, safe degradation, checkpointing, backup/restore, controlled fault drills | Destructive production chaos without explicit approval |
| K | Knowledge Base, Docs & Governance Playbooks | Architecture records, runbooks, handoffs, decision logs, operator playbooks | Overriding source code, live configuration, or policy owners |
| L | Multi-Node, Federation & Edge/Cluster Coordination | Future opt-in node identity, capability scheduling, leases, fencing, health, cross-node coordination | Unapproved distributed compute or hidden use of participant devices |
| M | Compliance, Policy Audit & Risk Governance | Audit trails, policy evidence, risk register, scoped exceptions, expiry, retention | Legal certification or replacing qualified legal advice |
| N | Productization, Analytics & Growth/Ecosystem Ops | Product outcomes, adoption/quality metrics, feedback, onboarding, ecosystem operations | Dark patterns or unsupported financial promises |
| O | Lifecycle, Deprecation & Legacy Retirement | Deprecation policy, migration windows, compatibility, safe retirement | Removing live dependencies without owner review and migration evidence |
| P | Governance, Ethics & Trust/Policy Evolution | Autonomy boundaries, human approval thresholds, trust principles, cross-track arbitration | Overriding security controls or human approval |

## 3. Dependency and implementation sequence

### Stage 0 — Preserve the existing baseline

- Preserve A–E ownership and existing work.
- Complete F's exact-head CI, security review, and acceptance independently.
- Do not merge F or dependent work solely because a downstream branch exists.
- Record the exact base SHA for every dependent branch.

**Exit criteria:** the A–F baseline is identifiable, version metadata is consistent, and no unresolved high-severity security gate is silently waived.

### Stage 1 — Integration and visibility foundations (G, H, K)

**G deliverables**
- Track ownership and path-impact matrix.
- PR checklist for scope, dependencies, evidence, security impact, and rollback.
- Required-check matrix: unit, type check, lint, production build, database/RLS, security, exact-head SHA.
- Compatibility policy for shared contracts and stacked PRs.
- Release evidence record; pending or failed checks cannot be represented as passed.

**H deliverables**
- Structured task/run events with correlation ID, track, task ID, attempt, branch, and commit SHA.
- Queue wait, execution duration, retry, cancellation, quarantine, and failure-scope measurements.
- Runner health snapshots using existing Runner capabilities only.
- Cost/quota ledger separating actual provider charges from estimates and local resource observations.
- Warning, safe-pause, and manual-escalation thresholds; no automatic infrastructure purchase.

**K deliverables**
- A–P ownership map, decision records, and architecture index.
- Incident, deployment, Runner recovery, CI failure, and handoff runbooks.
- Evidence format: repository, branch, exact SHA, command, result, timestamp, and actor.
- Documentation freshness owner and review cadence.

**Exit criteria:** G rejects incompatible candidates; H explains queue/task state without exposing secrets; K supports handoff without relying on chat history.

### Stage 2 — Resilience and accountability (J, M, P)

- **J:** bounded retries, idempotent recovery, circuit breakers, checkpoint integrity, backup/restore verification, and non-production fault injection. Production chaos remains opt-in and approved.
- **M:** append-only security-sensitive audit events, actor/action/target/time/result, policy-to-evidence mapping, risk severity, exception owner, and expiry. Minimize personal data; never log credentials or secrets.
- **P:** classify actions by autonomy level. Read-only analysis may be automated; code proposals require tests; merges, production changes, money movement, destructive actions, and permission changes require explicit human approval.

**Exit criteria:** recovery is tested from a known checkpoint; sensitive changes are traceable; exceptions have owners and expiry; autonomous actions cannot cross approval boundaries.

### Stage 3 — Controlled external ecosystem (I, N, O)

- **I:** authenticated webhook verification, strict schema validation, replay protection, idempotency, bounded retries, dead-letter handling, and least-privilege credentials.
- **N:** product outcome metrics with documented definitions, privacy-aware aggregation, feedback triage, accessibility/usability review, and measured onboarding improvements.
- **O:** inventory obsolete routes, workflows, schemas, flags, and dependencies; define deprecation notice, migration path, compatibility window, owner, and rollback/forward-fix strategy.

**Exit criteria:** integrations are observable and replay-safe; product changes have measurable outcomes; legacy components are not removed without migration evidence.

### Stage 4 — Conditional distributed coordination (L)

L is deferred until H demonstrates a real capacity or availability bottleneck that cannot be resolved by queue policy or workload optimization.

Only after explicit approval:
- Node identity, registration, revocation, and capability attestation.
- Capability/resource declarations with hard limits and explicit opt-in.
- Lease-based scheduling, fencing tokens, and idempotent task handoff.
- Health checks, stale-node eviction, and safe rescheduling.
- Signed workloads, sandboxing, restricted egress, data minimization, and independent result validation.

**Exit criteria:** F threat-model review passes; node consent/exit is proven; credential and tenant-data boundaries remain intact; recovery and cost models are validated. No new physical node is assumed.

## 4. Cross-track interfaces

| Interface | Producer | Consumers | Required safeguards |
|---|---|---|---|
| Task lifecycle events | A | G, H, J, K, M | Stable schema, correlation ID, idempotency, no secrets |
| Security findings/control status | F | A–P, especially G/M/P | Severity, evidence, owner, remediation, expiry |
| Release evidence | G | A–P | Exact SHA, required checks, immutable result references |
| Telemetry and quota events | H | A, G, J, N, P | Data minimization, bounded cardinality, cost provenance |
| External events | I | Approved product/workflow owners | Authentication, schema validation, replay protection, F review |
| Runbooks and decisions | K | A–P | Versioned, reviewed, source-linked |
| Audit evidence/risk exceptions | M | F, G, P, authorized operators | Append-only history, least privilege, retention limits |
| Product outcome feedback | N | B, C, D, E | Privacy-aware aggregation, metric definitions |
| Deprecation contracts | O | Affected owners | Compatibility window, migration, rollback |
| Autonomy policy | P | A–P | Human approval gates; cannot override F controls |

## 5. Release and verification gates

A cross-track release is blocked when any required check is pending, failed, missing, or bound to a different head SHA.

- **Scope:** changed files map to an owning track; shared-file changes identify receiving owners.
- **Quality:** unit tests, type checking, lint, production build, and relevant integration/database/RLS tests.
- **Security:** secret/dependency checks, authorization, tenant isolation, input validation, Runner isolation, and F review.
- **Reliability:** bounded retries, idempotency, lease/fencing semantics, rollback/recovery evidence.
- **Operations:** H telemetry fields and K runbook updates for new operational behavior.
- **Governance:** M audit requirements and P approval class are satisfied.
- **Human gate:** no automatic merge, production deployment, destructive action, or production migration.

## 6. Resource and safety constraints

- Use existing GitHub Actions and local tooling; no new server or Runner is assumed.
- Bound concurrent jobs, retries, task duration, response size, and external API calls.
- Never loop retries indefinitely or use repeated CI dispatch as a substitute for diagnosis.
- Keep secrets out of prompts, client bundles, logs, artifacts, and documentation.
- Do not execute untrusted patches on a persistent host with production credentials.
- L is deferred; participant CPU/GPU use must never be hidden or enabled without granular opt-in and a visible stop/exit path.
- Security controls and human approval take precedence over delivery speed.

## 7. Required work item record

Every implementation issue/PR records: track, owner, objective, non-goals, allowed paths, dependencies, numeric track/repository versions, acceptance tests, exact tested SHA, CI state, security/privacy impact, resource budget, rollback, and receiving-owner approvals.

## 8. Status and non-claims

| Tracks | Architecture status | Meaning |
|---|---|---|
| A–E | Existing tracks | Existing scope; feature readiness still requires evidence |
| F | Security foundation | Separate PR and exact-head security acceptance remain required |
| G–P | Defined/planned | Ownership and roadmap are defined; no operational capability is implied |

This roadmap is not a security certification, compliance opinion, production-readiness statement, or authorization to add infrastructure.
