# GCAN F–P Integration Acceptance Ledger

**Baseline:** `main` at `639cbc0aee89e9f97df2a9e664035be8d827f2e8`  
**Scope:** F–P shared-core integration only  
**Protected boundary:** A–E and Agent Factory V2 execution authority remain unchanged  
**Status:** Initial engineering ledger; no workstream is declared accepted by this document.

## 1. Operating rules

1. Every implementation change is isolated on a workstream/integration branch and reviewed through a Draft PR.
2. A passing result is valid only for the exact candidate HEAD SHA, workflow run ID, and run attempt.
3. CI success permits human review; it does not grant approval, merge, deployment, production-data, or credential authority.
4. Reuse the existing platform identity, database, middleware, CI, Runner and Agent Factory. Do not introduce parallel services without a separately approved architecture decision.
5. Keep evidence privacy-minimized. Never put secrets, raw user content, credentials, or host paths in shared event envelopes.
6. L federation and J autonomous repair remain disabled. I external side effects remain bounded and require explicit host approval.

## 2. Workstream implementation and acceptance matrix

| Line | Existing implementation evidence | Remaining acceptance work | Authority / guard |
|---|---|---|---|
| F — Security | Security assurance evaluator; RLS/privilege SQL tests; two-member RLS harness; security headers and route checks | Verify every registered control against exact-head database/quality job evidence; close threat-model and vulnerability-scan coverage gaps | Advisory only; no identity or RLS policy redesign |
| G — Release quality | Exact-head release evidence evaluator and required CI job contract | Verify all required jobs against live Actions API evidence; add compatibility checks and documented rollback evidence | Advisory only; never merge/deploy |
| H — Observability | Request correlation middleware/helper; bounded process-local F–P outcome recorder; Runner snapshot contract | Prove end-to-end correlation across actual routes/jobs; distinguish local counters from persistent metrics/traces; add alert evidence only where a real sink exists | Advisory only; no telemetry vendor or secret-bearing payload |
| I — External integration | Bounded capability registry and host approval check | Define one approved connector at a time, credential reference contract, timeout/retry/idempotency and mock contract tests | Bounded; explicit approval required; no live credential or external write in this phase |
| J — Resilience | Advisory diagnosis/repair-proposal contract; existing Factory recovery controls remain owned by A | Add evidence-backed diagnosis and dry-run proposal tests; document operator confirmation and rollback | Advisory only; no autonomous production repair |
| K — Knowledge | Existing architecture, security and operations documents | Keep this ledger, interface catalogue, runbooks and handover synchronized with accepted implementation | Documentation only; no runtime authority |
| L — Federation | Contract placeholder only | Remain deferred until F, H, capacity, isolation and independent security gates pass | Disabled; no node registration or distributed execution |
| M — Compliance/risk | Governance evidence types and security/audit foundations | Build a scoped control map and risk register; distinguish engineering controls from legal certification | Advisory only; no compliance certification claim |
| N — Product analytics | Privacy-minimized event concepts only | Define approved aggregate events, retention and privacy review before collection or dashboards | No collection pipeline or user-level profiling enabled |
| O — Lifecycle | Numeric root/track version metadata and release evidence | Define support windows, deprecation notices, compatibility tests and migration rollback evidence | Advisory only; no automatic retirement |
| P — Governance/trust | Governance dossier evaluator and approval/evidence requirements | Connect owner records, exact-SHA evidence and review decisions; verify policies are enforced rather than merely documented | Advisory only; no policy mutation or automatic approval |

## 3. Five-stage execution ledger

| Stage | Deliverable | State | Exit evidence |
|---|---|---|---|
| 1. Planning and decision gate | Research plan and explicit user authorization | **Approved** | User authorization recorded in conversation |
| 2. Infrastructure confirmation | Confirm existing CI, test runner, correlation boundary, F–P contracts and protected A–E boundary | **In progress** | Repository-backed inventory and cross-file regression checks |
| 3. Workstream implementation | Implement missing F–P slices in dependency order; tests for each slice | **Started** | Exact-head CI plus focused unit/integration tests |
| 4. Integration acceptance | F–P acceptance matrix with exact SHA, run/attempt, job evidence, reviewer and rollback | **Pending** | All required evidence current and human review recorded |
| 5. Handover | Architecture map, interface catalogue, risk register, task ledger and Master Brief | **Pending** | Versioned handover bundle tied to accepted commit |

## 4. Dependency order

`F → G → H → P` establishes the security, release-evidence, observability and governance floor. I/J/M/N/O/K then integrate against those stable contracts. L remains deferred and is not on the activation critical path.

## 5. Current blockers and known limitations

- Recent mainline Vercel status checks have reported a provider build-rate-limit failure. This is an infrastructure/deployment blocker, not evidence that application tests failed.
- GitHub Actions results must be inspected per exact candidate SHA; a missing result or an empty workflow-run lookup is not a pass.
- The process-local F–P recorder is not a centralized persistent telemetry backend.
- The registry and host adapter do not themselves authenticate principals; the existing trusted host must supply authorization and approval decisions.
- No production database migration, secret change, branch-protection change, automatic merge, or deployment is authorized by this ledger.

## 6. Rollback

This initial slice is additive test and documentation work. Revert the integration PR to remove it. No schema, secret, runtime execution, or production deployment changes are included.
