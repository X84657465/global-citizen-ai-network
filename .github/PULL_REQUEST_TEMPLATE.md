## Delivery summary

- Task / Issue:
- Workstream(s): A / B / C / D / E / F / G / H / I / J / K / L / M / N / O / P
- DRI:
- Developer:
- Independent Reviewer:
- User-visible outcome:
- Non-goals:

## Scope and traceability

- [ ] Base branch and base SHA recorded.
- [ ] Exact candidate HEAD SHA recorded after the final change.
- [ ] Changed files are within the approved allowlist.
- [ ] No unrelated changes, secrets, credentials or unnecessary personal data.
- [ ] Dependencies, compatibility impact and rollback/fallback are documented.

## Acceptance gates

- [ ] G0 — Task contract is complete (Task ID, DRI, Developer, Reviewer, allowlist, acceptance, tests, risks).
- [ ] G1 — Implementation is complete and diff is within scope.
- [ ] G2 — Required tests and CI completed successfully on this exact HEAD SHA.
- [ ] G3 — Independent review is complete; author did not approve their own work.
- [ ] G4 — PR is non-Draft, mergeable, targets the intended base, and all repository-required checks/reviews are satisfied.
- [ ] G5 — Release evidence is attached, or explicitly marked NOT RUN because this PR does not release.

## Exact evidence (required)

- Base SHA:
- Candidate HEAD SHA:
- Test commands and environment:
- Workflow run ID / attempt:
- Required job IDs and terminal conclusions:
- Logs / artifacts:
- Reviewer / review timestamp / reviewed SHA:
- Blocking review threads and resolution:
- Deployment environment / deployment ID / URL / source SHA (if applicable):
- Smoke tests / monitoring / rollback evidence (if applicable):

## Workstream-specific overlay

- A Factory: task state, runner isolation, retry/cancel/recovery and durable-state safety:
- B Product: user journey, UX, API/data contract, tenant isolation and product acceptance:
- C Predictive Coding: dataset/version provenance, leakage controls and baseline comparison:
- D Deep Neural: model/config provenance, reproducible evaluation, safety/quality, latency/cost:
- E Deep Research: source provenance, freshness, citations and uncertainty:
- F Security: threat model, authorization, dependency/supply-chain and RLS tests:
- G Release/QA: required-check completeness, exact-head evidence and rollback:
- H Observability: correlation, logs/metrics, privacy and alert/failure-path tests:
- I Connectors: authorization, credential isolation, retry/idempotency and side-effect bounds:
- J Resilience: fault injection, bounded retry, recovery and dry-run/rollback:
- K Knowledge: source/version/freshness, code-doc consistency and stale marking:
- L Federation: identity/trust, tenant/data isolation, revocation and failure isolation:
- M Compliance/Risk: control mapping, evidence owner, residual risk and scope disclaimer:
- N Analytics: data minimization, event allowlist, aggregation and retention:
- O Lifecycle: compatibility, migration/rollback, support/deprecation:
- P Governance/Trust: review provenance, reviewer permission and decision traceability:

## Final status (choose one)

- `BLOCKED`
- `NOT RUN`
- `PENDING`
- `FAIL`
- `VERIFIED`
- `ACCEPTED`
- `MERGED`
- `PREVIEW`
- `RELEASED`

> [!IMPORTANT]
> PENDING, 0 jobs, SKIPPED, CANCELLED, NEUTRAL, UNKNOWN, NOT RUN, stale-SHA evidence, missing logs, author self-approval, or a queued/unreachable deployment are never PASS. A merged PR is not proof of production release. Follow `docs/GCAN_AP_UNIFIED_DELIVERY_ACCEPTANCE_STANDARD.md`.
