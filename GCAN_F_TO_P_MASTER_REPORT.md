# GCAN F–P Master Engineering Report

**Audit date:** 2026-11-22  
**Repository:** `X84657465/global-citizen-ai-network`  
**Audited main baseline:** `a1c1b58e4d1852f5a09a0e7c6c5cbeb38e1f9582`  
**Release baseline:** `0.3.124`  
**Scope:** F–P shared-core integration; A–E and Agent Factory V2 are protected  
**Overall status:** Implementation in progress; no F–P workstream is declared fully accepted by this report.

## 1. Executive result

GCAN already contains a substantial F–P shared-core foundation. The correct next step is integration and evidence completion, not a parallel platform rewrite.

The dependency order remains **F → G → H → P → I/J/M/N/O/K**, with **L deferred**. A–E and Agent Factory V2 remain outside the change boundary. No production schema, secret, workflow permission, branch protection, deployment, or autonomous execution change is included in the current F–P work.

P permission provider PR #251 was merged at `a1c1b58e4d1852f5a09a0e7c6c5cbeb38e1f9582` while its exact-head CI run [44931646871](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44931646871) was still pending at the candidate resolver. The Codex review bot also reported it could not complete review because of usage limits. Therefore the merge is recorded as merged-but-unverified, not accepted. A post-merge follow-up branch `feat/p-trusted-review-permission-provider-20261122` now contains a narrow repository-path validation fix and the five requested handover artifacts; it must receive fresh exact-head CI and review before acceptance.

## 2. Protected core and integration boundary

- A–E remain the existing product/intelligence/research/execution tracks.
- Agent Factory V2 remains the highest-priority execution core and owner of task selection, durable state, leases, retries, quarantine, isolated candidate execution, patch integrity, CI evidence and publication controls.
- F–P are hosted capabilities. They may provide security, release, observability, integration, resilience, knowledge, compliance, analytics, lifecycle and governance evidence.
- F–P must not change Factory lifecycle, leases, patch isolation, checks, candidate publication authority or production deployment behavior.
- No F–P evidence or approval record independently authorizes execution, merge or deployment.

## 3. Workstream status

| Track | Current implementation evidence | Remaining work / acceptance | Authority |
|---|---|---|---|
| F — Security | `lib/fp/security-assurance.ts`; RLS and database privilege regressions; two-member RLS harness; security-header and route checks | Obtain live exact-head quality and database job evidence for all registered controls; close threat-model and vulnerability-scan coverage gaps | Advisory |
| G — Release quality | `lib/fp/release-assurance.ts`; `lib/fp/f-g-integration-assurance.ts`; required CI job contract | Prove every required job passed for the same PR, SHA, run ID and attempt as F; add compatibility and rollback evidence | Advisory |
| H — Observability | Paired request/response correlation helper and middleware integration; bounded process-local F–P outcome recorder | End-to-end route/job correlation proof; durable metrics/traces and alert evidence only after a real sink is selected | Advisory |
| I — External integration | Bounded capability registry and host approval contract | Connector-by-connector design, credential-reference contract, timeout/retry/idempotency and mock contract tests | Bounded; explicit host approval |
| J — Resilience | Advisory diagnosis and repair-proposal contract; Factory recovery remains owned by A | Evidence-backed diagnosis and dry-run proposal tests; operator confirmation and rollback documentation | Advisory; no autonomous production repair |
| K — Knowledge | Architecture, engineering governance, scheduler runbook and F–P host contract | Keep reports, interface catalogue, task ledger and runbooks synchronized with verified implementation | Documentation only |
| L — Federation | Contract placeholder and deferral record | Remain deferred until security, isolation, capacity and independent review gates pass | Disabled |
| M — Compliance/risk | Governance evidence types and security/audit foundations | Scoped control map and risk register; distinguish engineering controls from legal certification | Advisory; no certification claim |
| N — Product analytics | Privacy-minimized event concepts | Approve aggregate events, retention and privacy review before collection/dashboard work | No collection or user-level profiling |
| O — Lifecycle | Numeric root/track version metadata and release evidence | Support windows, deprecation notices, compatibility tests and migration rollback evidence | Advisory |
| P — Governance/trust | Governance dossier evaluator; exact-head paginated GitHub review collector; trusted-host permission callback contract | Integrate the permission provider at an explicitly authenticated host entry point; run exact-head CI and independent review | Advisory; no automatic approval/merge |

## 4. Verified repository evidence

- Main branch at audit time: `a1c1b58e4d1852f5a09a0e7c6c5cbeb38e1f9582`.
- Package/release baseline at audit time: `0.3.124`.
- PR #248 merged P's exact-head review collector at merge commit `f1c10a92ec7ffca510c0d42210062a52334dde94`.
- PR #250 merged the P review-decision precedence correction before PR #251; PR #251 then advanced main to `a1c1b58e4d1852f5a09a0e7c6c5cbeb38e1f9582`.
- Main push CI run [44931253584](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44931253584) was pending at audit time.
PR #252's current exact candidate SHA and active workflow run are authoritative in the pull request metadata and Checks tab. The Windows self-hosted resolver had not started at the last check; pending or cancelled runs are not acceptance evidence.
- A completed workflow with skipped quality/database jobs is not a pass. A pending resolver is not a pass. A historical pass for another SHA is not a pass for the current candidate.

## 5. Current risks and blockers

1. Windows self-hosted Runner / CI execution has not yet produced exact-head quality, build/Ollama and database/RLS results for the current F–P candidate.
2. H has correlation propagation at the middleware edge, but the existing recorder is process-local and no persistent telemetry sink is configured.
3. P's collector delegates reviewer permission verification to a trusted host. PR #251 adds a reusable GitHub permission adapter but does not wire a production API route or authenticate a human session.
4. I remains bounded and must not perform external writes without explicit host approval.
5. J must remain advisory; no autonomous production repair.
6. L remains deferred; no node registration or distributed execution.
7. M is not a legal compliance certification. N must not collect user-level profiling data. O must not automatically retire components.

## 6. Acceptance rules

A workstream can be accepted only when all applicable evidence is tied to the exact candidate SHA and includes:
- focused unit/regression tests;
- TypeScript, lint, dependency audit and production build;
- relevant local Ollama/Windows execution checks;
- isolated Supabase migration, PostgreSQL and RLS integration where applicable;
- exact GitHub Actions run ID and attempt, with all required jobs completed successfully;
- independent review and no unresolved blocking comments;
- documented rollback and authority boundaries.

Acceptance does not grant merge or deployment authority. A merge requires the repository's explicit review and branch-policy conditions; deployment remains separately controlled.

## 7. Immediate next actions

1. Open a follow-up PR from `feat/p-trusted-review-permission-provider-20261122` for the repository-path validation fix and handover documents; require a fresh exact-head CI run.
2. If all required jobs pass and review is clean, mark the follow-up PR ready and merge only after the repository's normal review requirements are satisfied.
3. Wire the P permission provider only at an existing authenticated host boundary after confirming how the host supplies reviewer identity and authorization. Do not add a parallel identity system or new secret.
4. Run the F–G shared-run evaluator using trusted GitHub Actions evidence for the same run/attempt.
5. Complete H route/job correlation evidence and explicitly label process-local versus persistent telemetry.
6. Continue I/J/M/N/O/K in dependency order; keep L deferred.

## 8. Change safety

This report and the current P provider candidate are additive F–P work. They do not modify A–E, Agent Factory V2, production schema, secrets, workflow permissions or deployment settings. Do not use destructive Git recovery commands to synchronize a local workspace with remote main; inspect and preserve any existing local changes first.
