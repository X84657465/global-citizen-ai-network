# GCAN F–P Core Architecture Integration

**Status:** Proposed core architecture baseline (documentation-only first slice)  
**Baseline:** `main@be647736ac56c57d44a95f654acbda79e480d86c`  
**Work branch:** `feat/fp-core-architecture-foundation-20261121`  
**Scope:** F–P workstreams within one GCAN ecosystem; not sixteen independent applications.

## 1. Decision

F–P are capability and governance workstreams inside the existing GCAN platform. They are not separate websites, products, or deployables by default.

The platform is organized into three layers:

1. **Shared platform core** — identity, authorization, persistence, API boundaries, background execution (only where implemented), configuration/secrets, observability, CI, and release controls.
2. **Capability workstreams** — F–O implement or improve domain capabilities against shared contracts. They must not create parallel identity stores, databases, admin consoles, or deployment pipelines without an approved architecture decision.
3. **Governance/control plane (P)** — cross-cutting policy, trust, auditability, agent/task ownership, acceptance evidence, and release gates. P governs the workstreams; it is not a duplicate feature application.

Agent Factory V2 (A) remains an independently protected execution/factory boundary. F–P integration must not take over its lifecycle, leases, isolated patching, checks, or publication authority.

## 2. Verified platform foundation at the baseline

The following are evidenced by the repository at the baseline, not merely proposed:

| Capability | Repository evidence | Integration rule |
|---|---|---|
| Web application | Next.js App Router and TypeScript in `package.json` and application routes | Keep one application shell and route tree unless a reviewed boundary requires otherwise. |
| Identity and data | Supabase Auth and PostgreSQL dependencies; migrations and RLS tests under `supabase/` | Reuse the existing identity and database boundary. |
| Authorization | RLS policies and server-side role/ownership checks described in `docs/architecture.md` and implemented in SQL/API paths | Enforce authorization server-side and in the database; never trust client role claims. |
| Application API | Next.js route handlers and server-side domain logic | Share validation, authorization, error, and audit conventions. |
| Atomic domain operations | PostgreSQL RPCs for AI budget/idempotency and contribution review | Keep transactional invariants in database functions where the current design requires atomicity. |
| AI cost and budget | Provider adapter, cost ledger, budget controls, admin cost transparency | Preserve separation between estimates, provider-reported usage, and invoices. |
| Contribution lifecycle | Tasks, submissions, human review, appeals, immutable reward snapshots/ledgers | Keep human review and append-only financial evidence; AI must not be sole authority for high-impact rewards. |
| CI | GitHub Actions workflows under `.github/workflows/` | Bind every result to an exact commit SHA. |

### Not yet established as shared production capabilities

The baseline does **not** establish a production-grade shared queue, object-storage contract for all workstreams, centralized distributed tracing/metrics platform, multi-region federation, or autonomous remediation control plane. Do not introduce Kafka, a new storage provider, regional agents, or self-healing production actions merely because they appear in a target-state design. First prove the need, current integration point, owner, operational cost, and failure/rollback behavior.

## 3. F–P responsibility map

These descriptions preserve the research workstream framing. They are responsibility boundaries, **not proof that a complete implementation exists**.

| Track | Responsibility | Shared-core dependencies | Initial integration posture |
|---|---|---|---|
| F | Security and access assurance | Auth, RLS, migrations, privileged API/RPCs, audit evidence | First engineering priority. Add regression coverage only against verified current schema and a clean isolated worktree; do not edit locally staged SQL files. |
| G | Integration and release engineering | CI, branch ancestry, build/test contracts, release evidence | Resolve duplicate/stacked PR ancestry and make exact-SHA checks reliable before broad integration. |
| H | Observability and operational health | API boundaries, structured logs, error handling, runtime metrics | Start with low-risk instrumentation and operational signals; no new telemetry vendor or secrets without review. |
| I | External connectors and workflows | Server-only credentials, API contracts, job execution, audit log | Use adapters and sandbox fixtures first; no live external side effects until explicitly approved. |
| J | Resilience and self-repair | Health signals, runbooks, bounded job execution, human approval | Begin with detection and recommendation; production mutation/repair remains approval-gated. |
| K | Knowledge, documentation, and runbooks | Repository docs, ownership ledger, versioned interfaces | Keep docs adjacent to the actual implementation and cite tested commit SHAs. |
| L | Federation and edge | Identity trust, network boundary, security, capacity, observability | Deferred until F security gates and H capacity evidence pass. No community worker execution in this phase. |
| M | Compliance and risk | Audit events, retention, access control, evidence export | Define evidence and control mapping before claiming compliance. |
| N | Analytics and product intelligence | Stable event contracts, privacy-minimized data, reporting | Read-only and privacy-minimized first; no new warehouse before demand and data ownership are proven. |
| O | Lifecycle and deprecation | Versioning, migrations, compatibility, release notes | Establish deprecation/rollback rules before removing or migrating shared contracts. |
| P | Governance, ethics, and trust | All shared boundaries, task ledger, policy checks, review gates | Cross-cutting control plane. Begin with explicit ownership, evidence, and approvals; policy enforcement is not accepted until executable checks prove it. |

## 4. Shared contracts

Every workstream must consume the same platform contracts:

- **Identity:** one canonical member identity; service credentials stay server-side.
- **Authorization:** deny by default; validate role, ownership, tenant/resource scope, and state transition at the trusted boundary.
- **Data:** one canonical PostgreSQL schema and ordered migrations; no parallel source of truth for shared entities.
- **API:** versioned request/response schemas, bounded payloads/timeouts, stable error semantics, idempotency for retryable writes, and explicit ownership.
- **Events/jobs:** only use a durable queue after its implementation, delivery semantics, retry/dead-letter behavior, idempotency, and operator ownership are verified. Until then, document the actual execution mechanism rather than claiming a queue exists.
- **Audit:** record actor, action, resource, outcome, timestamp, correlation identifier, and policy decision where appropriate; do not log secrets or unnecessary personal data.
- **Observability:** correlate logs and metrics to request/task identifiers; redact credentials and sensitive payloads.
- **Release:** checks and acceptance attach to the exact tested commit SHA, not a branch name or a different ancestor.

A workstream may be a separate deployable only through a reviewed architecture decision that states the operational reason, trust boundary, data ownership, service contract, cost, failure mode, on-call owner, and rollback plan.

## 5. Development order and gates

1. **F — security baseline:** inspect current migrations and RLS behavior; add targeted regression tests in a clean branch/worktree; do not rewrite applied migrations or use production data.
2. **G — integration reliability:** choose one ancestry for competing PR stacks, reproduce failing checks, and keep the existing Agent Factory V2 path protected.
3. **H — observability baseline:** define minimal structured events and health signals before adding new infrastructure.
4. **P — governance controls:** turn the ownership/evidence/approval rules into reviewable checks incrementally; a policy document alone is not enforcement.
5. **I/J/K/M/N/O — bounded capabilities:** proceed in small, independently testable slices using the shared contracts above.
6. **L — federation/edge:** remain deferred until security, observability, capacity, and operational ownership are accepted.

The order is risk-based, not a claim that every track is currently implemented or that every track must finish serially. Documentation and read-only discovery may proceed in parallel where file ownership does not overlap.

## 6. Agent and Git isolation rules

- One task owner per branch/worktree and an explicit file-ownership list.
- Before editing: record base SHA, branch, worktree, status, and target files. If any target file is dirty, staged, untracked, or owned by another agent, stop and select a non-overlapping file or obtain explicit coordination.
- Never reset, clean, stash-pop, force-push, rewrite another agent's commits, or overwrite uncommitted changes.
- Use small commits; each implementation claim names the exact changed paths, commit SHA, commands, results, and remaining limitations.
- A task is not accepted merely because code or a document exists.

## 7. Evidence states

Use these states consistently:

1. **Planned** — intent only.
2. **Specified** — contract and acceptance criteria documented.
3. **Implemented** — code exists on a named commit.
4. **Tested** — named tests ran successfully on that exact commit.
5. **Accepted** — reviewer confirms criteria and evidence.
6. **Integrated** — merged into the selected baseline and integration checks pass.
7. **Deployed** — environment, version/SHA, and deployment time are evidenced.

Unknown is not pass. A passing documentation-only change does not prove runtime enforcement.

## 8. First implementation slice and acceptance

**Slice:** establish this core architecture decision as a non-runtime integration contract, on an isolated feature branch based on the exact current main SHA.

Files:
- Add `docs/architecture/fp-core-integration.md`.
- Do not modify application code, existing migrations, SQL tests, CI workflows, secrets, permissions, or Agent Factory V2 runtime.

Acceptance:
- The document identifies verified capabilities separately from target-state gaps.
- F–P responsibility boundaries and dependencies are explicit.
- Shared contracts, agent isolation, evidence states, and release gates are stated.
- No new service or deployment is implied.
- The commit is traceable to the stated baseline SHA.

This first slice establishes the governing architecture contract only. The next code-bearing task is F security regression coverage, but it must first be rebased onto the current main migration chain and performed in a clean isolated worktree that does not overlap local staged/untracked files.

## 9. Explicit non-goals and approval gates

This slice does not authorize:
- production deployment, main merge, or production push;
- production database changes, destructive migrations, or data resets;
- secrets, service-role keys, repository permissions, branch protection, or external connector credentials changes;
- enabling live AI providers, payouts, external side effects, community workers, federation, or autonomous repair;
- modifying Agent Factory V2 internals or taking over its authority.

Any of these requires a separate reviewed task and explicit approval.
