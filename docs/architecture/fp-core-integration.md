# GCAN F–P Core Architecture Integration

**Status:** Core architecture baseline — documentation-only foundation  
**Mainline baseline:** `ebb56f5d6e7b4b732e0a059443571aa4c2b12f55`  
**Work branch:** `feat/fp-core-integration-mainline-current-20261121`  
**Scope:** F–P workstreams within the 16-track A–P GCAN ecosystem; not separate applications. P is independently versioned in the registry and operates as the cross-cutting governance layer, not as a separate user-facing feature module.

## 1. Architecture decision

F–P are capability and governance workstreams inside the existing GCAN platform. They are not separate websites, products, databases, identity systems, admin consoles, or deployables by default.

The platform has three layers:

1. **Shared platform core:** identity, authorization, persistence, API boundaries, background execution only where implemented, configuration/secrets, observability, CI, and release controls.
2. **Capability workstreams:** F–O implement domain capabilities against shared contracts. They must not create parallel foundations without an approved architecture decision.
3. **Governance/control plane (P):** policy, trust, auditability, agent/task ownership, acceptance evidence, and release gates. The A–P registry retains sixteen independently versioned workstreams; P's operational role is cross-cutting governance rather than a separate user-facing feature application.

**Agent Factory V2 (A) is the highest-priority protected execution boundary.** F–P work must not take over or destabilize its lifecycle, leases, isolated patching, checks, or publication authority. No broad factory refactor is authorized by this architecture decision.

## 2. Verified shared foundation

The following are evidenced in the repository at the mainline baseline:

| Capability | Evidence at baseline | Integration rule |
|---|---|---|
| Web application | Next.js App Router and TypeScript | Keep one application shell and route tree unless a reviewed boundary requires otherwise. |
| Identity and data | Supabase Auth, PostgreSQL, migrations and RLS tests | Reuse the existing identity and database boundary. |
| Authorization | RLS policies plus server-side role/ownership checks | Enforce authorization at trusted server boundaries and in the database; never trust client role claims. |
| Application API | Next.js route handlers and server-side domain logic | Share validation, authorization, error, and audit conventions. |
| Atomic operations | PostgreSQL RPCs for selected budget/idempotency and review operations | Preserve transactional invariants in database functions where required. |
| AI cost and budget | Provider adapter, cost ledger, budget controls and admin transparency | Separate estimates, provider-reported usage, and invoices. |
| Contribution lifecycle | Tasks, submissions, human review, appeals, and ledger snapshots | Preserve human review and append-only financial evidence; AI must not be sole authority for high-impact rewards. |
| CI | GitHub Actions workflows | Bind every check to the exact tested commit SHA. |
| Security regression | Catalog-wide RLS and two-member isolation tests are present on mainline | Treat implementation as integrated, not accepted, until exact-head CI evidence is green and reviewed. |

### Not established as shared production capabilities

The baseline does not establish a production-grade shared queue, a universal object-storage contract, centralized distributed tracing/metrics, multi-region federation, or an autonomous remediation control plane.

Do not introduce Kafka, a new storage provider, regional agents, or self-healing production actions merely because they appear in a target-state design. First prove the need, integration point, owner, operational cost, failure behavior, and rollback plan.

## 3. F–P responsibility map

These are responsibility boundaries, not claims that each workstream is fully implemented.

| Track | Responsibility | Shared dependencies | Initial posture |
|---|---|---|---|
| F | Security and access assurance | Auth, RLS, migrations, privileged API/RPCs, audit evidence | First engineering priority. Verify current security tests and close regressions before expanding privileges or schema. |
| G | Integration and release engineering | CI, branch ancestry, build/test contracts, release evidence | Resolve competing PR ancestry and make exact-SHA checks reliable before broad integration. |
| H | Observability and operational health | API boundaries, structured logs, error handling, runtime signals | Start with low-risk instrumentation; no new telemetry vendor or secrets without review. |
| I | External connectors and workflows | Server-only credentials, API contracts, job execution, audit log | Adapters and sandbox fixtures first; no live external side effects without explicit approval. |
| J | Resilience and self-repair | Health signals, runbooks, bounded execution, human approval | Detection and recommendations first; production repair remains approval-gated. |
| K | Knowledge, documentation, and runbooks | Repository docs, ownership ledger, versioned interfaces | Keep docs adjacent to implementation and cite tested commit SHAs. |
| L | Federation and edge | Identity trust, network boundary, security, capacity, observability | Deferred until F security gates and H capacity evidence pass. No community worker execution in this phase. |
| M | Compliance and risk | Audit events, retention, access control, evidence export | Define evidence and control mapping before claiming compliance. |
| N | Analytics and product intelligence | Stable event contracts, privacy-minimized data, reporting | Read-only and privacy-minimized first; no new warehouse before demand and data ownership are proven. |
| O | Lifecycle and deprecation | Versioning, migrations, compatibility, release notes | Establish deprecation and rollback rules before removing or migrating shared contracts. |
| P | Governance, ethics, and trust | All shared boundaries, task ledger, policy checks, review gates | Cross-cutting control plane. Start with ownership, evidence, and approvals; policy is not enforced until executable checks prove it. |

## 4. Shared contracts

Every workstream must consume the same platform contracts:

- **Identity:** one canonical member identity; service credentials stay server-side.
- **Authorization:** deny by default; validate role, ownership, tenant/resource scope, and state transition at the trusted boundary.
- **Data:** one canonical PostgreSQL schema and ordered migrations; no parallel source of truth for shared entities.
- **API:** versioned request/response schemas, bounded payloads/timeouts, stable error semantics, idempotency for retryable writes, and explicit ownership.
- **Events/jobs:** use a durable queue only after implementation, delivery semantics, retry/dead-letter behavior, idempotency, and operator ownership are verified. Until then, document the actual execution mechanism.
- **Audit:** record actor, action, resource, outcome, timestamp, correlation identifier, and policy decision where appropriate; never log secrets or unnecessary personal data.
- **Observability:** correlate logs and metrics to request/task identifiers; redact credentials and sensitive payloads.
- **Release:** checks and acceptance attach to the exact tested commit SHA, not a branch name or a different ancestor.

A workstream may become a separate deployable only through a reviewed architecture decision stating the operational reason, trust boundary, data ownership, service contract, cost, failure mode, on-call owner, and rollback plan.

## 5. Development order and gates

1. **F — security baseline:** inspect current migrations and RLS behavior; run targeted regression tests in a clean isolated worktree; do not rewrite applied migrations or use production data.
2. **G — integration reliability:** choose one ancestry for competing PR stacks, reproduce failing checks, and protect the existing Agent Factory V2 path.
3. **H — observability baseline:** define minimal structured events and health signals before adding infrastructure.
4. **P — governance controls:** turn ownership/evidence/approval rules into reviewable checks incrementally; documentation alone is not enforcement.
5. **I/J/K/M/N/O — bounded capabilities:** proceed in small, independently testable slices using shared contracts.
6. **L — federation/edge:** remain deferred until security, observability, capacity, and operational ownership are accepted.

This is a risk-based order, not a claim that every track is implemented or must finish serially. Read-only discovery and non-overlapping documentation can proceed in parallel.

## 6. Agent and Git isolation

- One task owner per branch/worktree and an explicit file-ownership list.
- Before editing, record base SHA, branch, worktree, status, and target paths.
- If a target file is dirty, staged, untracked, or owned by another agent, stop and choose a non-overlapping path or obtain explicit coordination.
- Never reset, clean, stash-pop, force-push, rewrite another agent's commits, or overwrite uncommitted changes.
- Use small commits. Each implementation claim names exact paths, commit SHA, commands, results, and remaining limitations.
- Do not assume that a local uncommitted change exists remotely, or that a remote commit is present in a local worktree.

## 7. Evidence states

Use these states consistently:

1. **Planned** — intent only.
2. **Specified** — contract and acceptance criteria documented.
3. **Implemented** — code exists on a named commit.
4. **Tested** — named tests passed on that exact commit.
5. **Accepted** — reviewer confirms criteria and evidence.
6. **Integrated** — merged into the selected baseline and integration checks pass.
7. **Deployed** — environment, version/SHA, and deployment time are evidenced.

Unknown is not pass. A passing documentation-only change does not prove runtime enforcement. A merged PR is not, by itself, proof of testing or acceptance.

## 8. Current F security disposition — corrected against live GitHub evidence (2026-11-21)

F has multiple security-related slices. They must not be conflated:

- **F security governance candidate — PR #145:** open branch `feat/cyber-security-defense-integration`, head `27d31444d8fb8d57040e60aa554e5d8e905d00e4`, originally based on main SHA `7045f9599886ae8ef07b76f9ed9fc553be3dc7a6`. At the latest audit it was 66 commits ahead and 8 behind that base comparison, and GitHub reported it as non-mergeable. No PR-triggered exact-head workflow run was returned. Its security headers, threat model, release gates, incident runbook and tests are a candidate, not an accepted F release.
- **Database/RLS security slice — PR #209:** separately merged at `34a23019e0b875bdf08274139e3774895788d3ec`, with final candidate head `e1ec407c2df92404fc2fe710ba2ef95eb7a335fc`. It adds catalog-wide RLS/API-role checks and two-member RLS regression coverage. The exact-head workflow run `44919663002` was still pending at the last live recheck. This is useful database-security evidence, but it does **not** mean F PR #145 or the overall F workstream has passed.
- **Current integrated baseline:** `ebb56f5d6e7b4b732e0a059443571aa4c2b12f55`. The shared architecture and F security candidate must be reconciled to this baseline; do not transplant stale root/package/lockfile/manifest version snapshots from #145.
- **Disposition:** the RLS slice is merged but its exact-head CI result must be confirmed; the F security governance candidate remains unaccepted and requires ancestry/diff reconciliation, exact-head tests, and independent security review. A merged PR, a green unrelated run, or a security document alone is not F acceptance.

Do not infer status from a parent commit, branch name, Vercel status, merge state, or a different security PR. In particular, PR #209 is not PR #145.

## 9. First-slice scope and exclusions

This document establishes the shared architecture contract. It does not authorize:

- production deployment, main merge, or production push;
- production database changes, destructive migrations, or data resets;
- secrets, service-role keys, repository permissions, branch protection, or external connector credential changes;
- enabling live AI providers, payouts, external side effects, community workers, federation, or autonomous repair;
- modifying Agent Factory V2 internals or taking over its authority.

Any such change requires a separate reviewed task and explicit approval.
