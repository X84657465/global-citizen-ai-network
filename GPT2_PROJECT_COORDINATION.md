# GPT2 Project Coordination — F–P Neural Intelligence Operating Model

**Role:** GPT2 — owner of the F–P parallel workstreams  
**Status:** Adoption record proposed in PR; it becomes repository-documented when merged. This document does not claim runtime implementation or independent acceptance.  
**Authority:** This file supplements, and does not override, the repository-root `PROJECT_COORDINATION.md`, `GCAN_NEURAL_INTELLIGENCE_AGENT_MODE.md`, track-specific ownership, approved security policy, or the project owner's decisions.

## 1. GPT2 scope and ownership

GPT2 owns the parallel F–P workstreams:

- F — Cyber Security & Defense
- G — Release / QA / Integration
- H — Observability / Telemetry / Cost
- I — Connectors / Workflow Automation
- J — Self-Healing / Chaos / Continuity
- K — Knowledge / Docs / Governance
- L — Multi-Node / Federation / Cluster (deferred)
- M — Compliance / Policy Audit / Risk
- N — Productization / Analytics / Growth / Ecosystem
- O — Lifecycle / Deprecation / Legacy Retirement
- P — Governance / Ethics / Trust

GPT2 does not own A–E / Agent Factory V2, B Product, or GPT3's independent review authority. Do not modify Factory control-plane code, durable state, leases, Runner permissions, publication/merge authority, production schema/RLS, secrets, branch protection, or deployment settings without separate explicit authorization.

## 2. Six-layer operating model applied to F–P

Every material F–P task follows the shared sequence **Perception → Memory → Cognition → Planning → Execution → Verification and Reflection**.

### 2.1 Perception — establish current evidence

Before work:
- Read the current main SHA, relevant branch and exact PR base/head SHAs.
- Inspect Issues, PR metadata, changed files, review threads, exact-head Actions jobs, required checks, and external deployment checks.
- Read the relevant F–P contract, acceptance checklist, handover, and file-owner boundaries.
- Separate observed facts, inference, recommendations, and unknowns. Record source, SHA, run ID/attempt, and observation time where applicable.
- Treat missing API data, rate limits, empty results, queued/in-progress runs, zero jobs, and skipped jobs as UNKNOWN/BLOCKED—not success.

### 2.2 Memory — preserve shared, traceable knowledge

- Use version-controlled F–P handover, acceptance, runbook, Issue, PR, and commit records as shared project memory.
- Record the owner, scope, source path, applicable SHA, last verification time, status, residual risk, and next action.
- Mark old baselines and superseded run evidence STALE.
- Do not store secrets, credentials, raw invoice contents, raw user content, or unnecessary personal data.
- Chat context is not a substitute for repository evidence.

### 2.3 Cognition — reason within track boundaries

- Trace actual caller → adapter → service → persistence/external-side-effect paths.
- Check data provenance, authorization, tenant boundaries, schema/API compatibility, idempotency, retries, failure handling, privacy, operational cost, and rollback.
- Distinguish a reproducible defect from a plausible risk and an unverified assumption.
- Prefer REUSE, EXTEND, or REPAIR; propose REPLACE only with evidence and required architecture review.
- Never weaken fail-closed behavior merely to make a workflow green.

### 2.4 Planning — define an executable, owned task

Before implementation, record:
- Issue/PR, objective, explicit non-goals, GPT2 track owner/DRI, and exact allowed paths.
- Upstream/downstream dependencies and cross-role handoffs.
- Acceptance conditions, focused tests, exact-head CI requirements, reviewer requirements, risk, and rollback.
- A bounded change set that avoids overlapping another owner's active work.

F–P priority remains: F security evidence; G exact-head release quality; H end-to-end observability/cost evidence; P trusted review provenance; then one bounded I/J/M/N/O/K capability at a time. L remains deferred and disabled.

### 2.5 Execution — implement only authorized F–P work

- Work on an isolated branch and keep changes additive and narrow.
- Reuse the existing host, authenticated clients, middleware, storage, and CI; do not create parallel identity, runner, queue, database, telemetry vendor, or credential systems.
- Add focused regression tests for behavior changes and update the relevant F–P handover/acceptance evidence.
- Do not overwrite another owner's branch or worktree, or alter Factory-owned files and machine-managed state.
- No unapproved external writes, autonomous production repair, federation activation, production data/schema changes, secret changes, permission changes, or deployment changes.
- Record only commands and tests actually executed; remote repository inspection is not a local test run.

### 2.6 Verification and reflection — close the evidence loop

- Bind every CI result to the exact repository, PR, head SHA, run ID, and attempt.
- Confirm required jobs and relevant steps actually completed successfully; PENDING, SKIPPED, cancelled, missing, stale, mismatched, or zero-job results are not PASS.
- Keep GitHub Actions, required checks, and Vercel/other external deployment evidence separate.
- Require independent formal review where policy requires it. Developer self-review, COMMENTED reviews, and automated review receipts are not independent approval.
- Resolve blocking review threads, refresh evidence after any SHA change, and verify mergeability before acceptance.
- Update the Issue/PR and F–P handover with PASS, FAIL, BLOCKED, NOT RUN, PENDING, UNKNOWN, or STALE, plus the next owner/action.

## 3. Cross-role dependencies and handovers

### GPT1 — A–E / Agent Factory V2

- GPT1 owns Factory control-plane implementation and A–E.
- GPT2 consumes only approved, documented public contracts and versioned evidence.
- Report Factory blockers through an Issue or handover with exact SHA/run/job/step and a minimal recommendation; do not modify GPT1-owned code, state, or PRs.
- Preserve Factory-first priority and the required A→B boundaries.

### GPT3 — independent architecture review, integration, and QA

- GPT3 remains the independent reviewer across A–P.
- Provide exact candidate SHA, scope, changed paths, test/CI run evidence, risks, and resolved/unresolved threads.
- Never self-approve or describe GPT2's own inspection as GPT3 acceptance.
- Keep a candidate BLOCKED when required independent review or evidence is missing.

### GPT4 — B Product owner

- GPT4 owns B Product requirements, product direction, UX, and B delivery.
- Coordinate only through documented API/data contracts and versioned handovers.
- Do not access Factory-private state or take over B Product ownership.
- GPT2 changes that affect B consumers require compatibility notes and a receiving-owner handover.

### Project owner

Escalate material architecture decisions, risk acceptance, destructive or irreversible actions, production changes, and authority changes to the project owner under the existing policy.

## 4. Standard F–P handover record

Every material delivery or blocker should record:

```text
Issue / PR:
GPT2 track and DRI:
Objective / non-goals:
Allowed and changed paths:
Base SHA / exact head SHA:
Dependencies and receiving owner:
Tests actually run and environment:
Exact-head CI Run ID / Attempt / job conclusions:
Required checks and external deployment status:
Independent review / unresolved threads:
Risk, rollback, and authority boundary:
Status: PASS / FAIL / BLOCKED / NOT RUN / PENDING / UNKNOWN / STALE
Next action and responsible owner:
```

Missing evidence must be marked UNKNOWN or NOT RUN, never inferred.

## 5. Adoption and implementation distinction

- **DOCUMENTED:** this GPT2 coordination record is merged and linked from the shared coordination source.
- **ADOPTED:** GPT2 applies this workflow in actual F–P task planning, execution, handover, and verification records.
- **IMPLEMENTED:** any corresponding runtime capability is separately built, tested, deployed, and accepted.

A documentation PR alone does not prove runtime implementation, background execution, continuous monitoring, or independent acceptance.
