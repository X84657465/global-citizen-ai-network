# GCAN F–P Acceptance Checklist

**Audited main baseline:** `a1c1b58e4d1852f5a09a0e7c6c5cbeb38e1f9582`  
**Merged-but-unverified P provider:** PR #251, merge `a1c1b58e4d1852f5a09a0e7c6c5cbeb38e1f9582`  
**Status:** In progress. No track is marked fully accepted here. PR #251 was merged before its exact-head CI completed; that merge is not acceptance.

## Global hard gates

- [ ] Candidate branch is isolated and based on a current mainline.
- [ ] A–E and Agent Factory V2 files and runtime authority are unchanged.
- [ ] No uncommitted local work is overwritten or discarded.
- [ ] No production schema, secret, workflow permission, branch-protection or deployment setting is changed.
- [ ] Unit/regression suite passes on the exact candidate SHA.
- [ ] TypeScript and lint pass on the exact candidate SHA.
- [ ] Dependency audit and production build pass on the exact candidate SHA.
- [ ] Windows/Ollama and local execution checks pass where required.
- [ ] Disposable Supabase migrations, PostgreSQL and RLS tests pass where required.
- [ ] CI run ID and run attempt are recorded; required jobs are completed and successful, not skipped/pending/cancelled.
- [ ] Independent review is complete; blocking comments are resolved.
- [ ] Rollback path and authority ceiling are documented.

## F — Security

- [ ] All registered F controls map to real test paths and real CI jobs.
- [ ] Database role membership and BYPASSRLS/SUPERUSER regression tests pass.
- [ ] Two-member cross-account RLS tests pass in disposable database.
- [ ] Security headers and route authorization tests pass.
- [ ] Exact-head evidence uses the same repository, PR, SHA, run ID and attempt.
- [ ] Threat model and vulnerability scan coverage gaps are closed.
- [ ] No production RLS/schema change is implied by test-only evidence.

## G — Release quality

- [ ] Every required CI job is present and actually executed.
- [ ] F and G evidence share one exact run ID and attempt.
- [ ] Stale, skipped, cancelled, missing or mismatched job evidence fails closed.
- [ ] Compatibility and rollback evidence are attached.
- [ ] Evaluator remains advisory and cannot approve, merge or deploy.

## H — Observability

- [ ] One validated correlation ID is propagated to downstream request and response headers.
- [ ] Route/job tests prove the same correlation ID is preserved end-to-end.
- [ ] Event payloads exclude secrets, raw user content and unnecessary personal data.
- [ ] Process-local counters are not described as durable or distributed telemetry.
- [ ] Any persistent sink has a separate privacy, retention and operational review.

## I — External integration

- [ ] Each connector is approved individually by the existing host.
- [ ] Credentials are referenced, never embedded in envelopes or logs.
- [ ] Timeout, retry, idempotency and failure behavior have contract tests.
- [ ] Mock tests pass; no live external write is enabled without explicit approval.

## J — Resilience

- [ ] Diagnosis is evidence-backed and read-only.
- [ ] Repair output is a dry-run proposal with scope and rollback.
- [ ] Operator confirmation remains required.
- [ ] Agent Factory recovery and execution authority remain owned by A.

## K — Knowledge

- [ ] Architecture map, API/interface catalogue, runbooks and handover match current code.
- [ ] Each status distinguishes implemented, tested, untested, documentation-only, blocked and not implemented.
- [ ] No historical SHA or stale CI run is presented as current acceptance.

## L — Federation

- [ ] Deferral remains explicit.
- [ ] No node registration, remote execution or federation activation occurs before independent security and capacity gates.

## M — Compliance/risk

- [ ] Control map and risk register identify evidence owner, scope and residual risk.
- [ ] Engineering evidence is not represented as legal certification.

## N — Product analytics

- [ ] Aggregate event allowlist and retention are reviewed.
- [ ] No user-level profiling or collection pipeline is enabled without separate privacy approval.

## O — Lifecycle

- [ ] Version compatibility, support windows and deprecation notice policy are documented.
- [ ] Migration rollback evidence is required before lifecycle changes.
- [ ] No automatic retirement is enabled.

## P — Governance/trust

- [ ] Candidate PR is open, same-repository, targets main and retains exact head SHA.
- [ ] Complete paginated review history is collected within the safe bound.
- [ ] Each review is bound to reviewer, review reference, timestamp and reviewed commit SHA.
- [ ] Trusted host verifies reviewer permission through an authenticated GitHub client.
- [ ] Only `admin`, `maintain` and `push` count as verified review permissions.
- [ ] Failed permission lookup remains unverified; stale reviews do not count.
- [ ] Verified `changes-requested` remains blocking even if another reviewer is unverified.
- [ ] Governance dossier remains descriptive; it grants no governance, execution, merge or deployment authority.

## Current candidate record

| Candidate | Exact SHA | CI | Acceptance |
|---|---|---|---|
| P permission provider PR #251 | merged as `a1c1b58e4d1852f5a09a0e7c6c5cbeb38e1f9582` | Run [44931646871](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44931646871) was still pending at merge | Merged but unverified; follow-up fix requires fresh CI |
| Main baseline | `a1c1b58e4d1852f5a09a0e7c6c5cbeb38e1f9582` | Mainline CI must be refreshed for this SHA | Not certified by this checklist |
