# A–P Engineering Governance

**Governance revision: 2.0.0**  
**Repository release baseline: 0.3.42**  
**Architecture detail:** [A–P Engineering Workstream Architecture](engineering-workstreams.md)

## 1. Track ownership

GCAN has sixteen defined workstream boundaries. A–F retain their existing engineering ownership; G–P are planned until implementation evidence and acceptance gates are delivered.

| Track | Scope | Primary responsibility |
|---|---|---|
| A — Agent Factory V2 | Autonomous engineering workflow | Task lifecycle, isolated patch generation, CI, recovery and evidence |
| B — Global Citizen AI Network | Public product | User experience, AI workspace, contribution workflows, ledger and platform |
| C — Predictive Coding | Predictive processing | Predictions, observations, error measurement, calibration and drift |
| D — Deep Neural | Knowledge and reasoning | Provenance-aware memory, reasoning, evaluation and reviewed learning proposals |
| E — Deep Research | Research and evidence synthesis | Multi-source research, source quality, corroboration, counter-evidence and cited reports |
| F — Cyber Security & Defense | Cross-track security | Threat model, minimum controls, adversarial validation, vulnerability response and incident readiness |
| G — Release, QA & Integration | Integration quality | Compatibility matrix, release gates, regression suites and exact-SHA evidence |
| H — Observability & Cost Governance | Operations visibility | Queue/Runner telemetry, failure taxonomy, quotas, cost provenance and alerts |
| I — Ecosystem & Connectors | External integration | Authenticated APIs, webhooks, synchronization and replay-safe automation |
| J — Self-Healing & Continuity | Reliability | Bounded recovery, degradation, checkpoints, backup/restore and fault drills |
| K — Knowledge & Playbooks | Operational knowledge | Architecture records, runbooks, handoffs, decisions and troubleshooting |
| L — Multi-Node Coordination | Future distributed execution | Opt-in nodes, capability scheduling, leases, fencing and health |
| M — Compliance & Risk Audit | Assurance evidence | Audit trails, policy checks, risk register and expiring exceptions |
| N — Productization & Analytics | Product outcomes | Privacy-aware metrics, feedback loops, onboarding and ecosystem operations |
| O — Lifecycle & Deprecation | Legacy retirement | Migration, compatibility windows, deprecation and safe removal |
| P — Governance & Trust | Autonomy governance | Human approval thresholds, ethics, trust rules and cross-track arbitration |

A track owns its own roadmap and implementation. It does not silently modify another track's code, configuration, database or policy. Shared changes require explicit receiving-owner review.

## 2. Numeric version policy

Use numeric `MAJOR.MINOR.PATCH` only. Do not use alpha, beta or rc labels as version identifiers.

- **MAJOR**: incompatible architecture or contract change.
- **MINOR**: backward-compatible capability or subsystem addition.
- **PATCH**: smaller improvements, defect fixes, documentation changes to operational rules, and test/quality improvements.

Every release updates the authoritative `VERSION`, `versions/manifest.json` and `CHANGELOG.md`; package metadata and lockfile root metadata must remain synchronized. Track versions advance independently when that track changes. A planned track version is a planning baseline, not a shipped release.

A version bump is not evidence of completion. Acceptance requires exact commit SHA, tests, CI outcome, reviewer decision and rollback instructions.

## 3. Cross-track contracts

- Task/event schemas include correlation ID, task ID, attempt, track, branch and commit SHA.
- Shared API/module boundaries are versioned and have explicit owners.
- Retry semantics are bounded and distinguish task failures from infrastructure failures.
- Evidence records repository, branch, exact SHA, command, result, timestamp and actor.
- Security/privacy classification applies to shared knowledge and telemetry.
- External events are untrusted; authentication, schema validation, replay protection and idempotency are mandatory.
- Cross-track learning proposals include source evidence, affected tracks, expected benefit, risk, validation plan and receiving-owner decision.

## 4. Dependency sequence

1. Preserve A–F and complete F's security acceptance independently.
2. Establish G/H/K foundations: integration gates, observability/resource governance and operational playbooks.
3. Add J/M/P resilience, audit and autonomy governance after observability is reliable.
4. Add I/N/O after core security and integration contracts stabilize.
5. Defer L until measured capacity evidence, explicit approval and independent security review justify multi-node execution.

The detailed deliverables and exit criteria are maintained in [engineering-workstreams.md](engineering-workstreams.md).

## 5. Release and safety gates

- Unit tests, type checking, lint, production build and relevant database/RLS tests must pass.
- CI evidence must match the exact PR head SHA; pending, missing or stale checks are not passes.
- F security controls apply to every track. Each track remains responsible for fixing its own vulnerabilities.
- Runner jobs are bounded and serialized according to the shared queue policy.
- Secrets never enter prompts, client bundles, logs, artifacts or docs.
- No automatic approval, merge, production deployment, destructive operation or production data migration.
- Production chaos testing and distributed compute require separate explicit authorization.
- No new server or Runner is assumed by the roadmap.

## 6. Required change record

Every change records old/new numeric versions, affected tracks, objective, non-goals, dependencies, allowed paths, acceptance tests, exact tested SHA, CI state, security/privacy impact, resource budget, receiving-owner approvals and rollback.

## 7. Rollback

Use the smallest safe rollback unit. Application changes may be reverted by commit/PR. Database changes require a separately reviewed forward-fix or verified rollback strategy; never assume a migration is reversible.

## 8. Status semantics

- `active`: implementation work exists; readiness remains subject to per-change evidence.
- `implementation-candidate`: workbench/implementation is under development and not a production capability claim.
- `foundation`: baseline controls and ownership are established; further acceptance may remain.
- `planned`: architecture/ownership is defined; implementation is not claimed.

A PR, branch, version bump or documentation entry alone never establishes operational readiness.
