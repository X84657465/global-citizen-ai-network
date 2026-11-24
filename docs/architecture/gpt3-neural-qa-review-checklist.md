# GPT3 A–P Neural Intelligence QA Review Checklist

> Owner: GPT3 — independent architecture review, integration and QA  
> Status: review procedure / documentation only. This checklist does not assert that neural-agent capabilities, background execution, persistence, monitoring, or any runtime feature are implemented.  
> Scope: A–P architecture and cross-workstream PR / integration acceptance.  
> Source baseline: apply only after re-reading the current `PROJECT_COORDINATION.md`, the relevant owner charter, and the exact candidate SHA.

## 1. Purpose and operating model

Use the six-layer engineering loop for every material A–P review:

1. **Perception** — collect current repository, issue, PR, CI, test, runtime and ownership evidence.
2. **Memory** — preserve verified decisions and findings with source, SHA, time and applicability; mark stale evidence.
3. **Cognition** — trace real call paths, data flows, trust boundaries, dependencies, failure modes and counter-examples.
4. **Planning** — define the review scope, owner, acceptance conditions, tests, rollback and stop conditions before acting.
5. **Execution** — perform only authorized review, test and GPT3-owned documentation work; never take over another workstream's implementation.
6. **Verification and reflection** — validate the exact candidate SHA, classify evidence, record gaps and update the handoff.

This is a review method, not a seventh workstream or an additional GPT role. It does not reassign D / Deep Neural, grant background execution, or relax Factory-first and human-approval constraints.

## 2. Developer–Reviewer separation and anti-self-approval

For every change produced by the Neural Intelligence Agent (the authorized ChatGPT Factory Developer seat):

- Treat that seat as the implementation owner / Developer only; it must not issue or simulate GPT3 review, approval, PASS, or ACCEPTED status for its own change.
- GPT3 remains the independent architecture Reviewer and QA authority. Review must be performed from the exact candidate repository, PR, and head SHA, with the reviewer identity and review record visible in GitHub or another approved immutable project record.
- The Developer may run tests and provide evidence, but test execution is not independent acceptance.
- GPT3 must independently inspect the diff, architecture / contracts, security boundaries, regression coverage, and exact-SHA CI evidence; it may return PASS, FAIL, BLOCKED, NOT RUN, PENDING, UNKNOWN, or STALE.
- No GPT3 review, unavailable reviewer, missing review record, stale evidence, or SHA mismatch means no acceptance. The release / merge gate remains closed (Fail-Closed).
- The Developer must not alter acceptance criteria, required checks, branch protection, reviewer identity, or review policy to make its own change pass.
- A separate Integrator may confirm that all required gates are satisfied, but cannot manufacture or override GPT3's review disposition.

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:beaacf805b2d0767c9b9e6eaf0a930e64493f333a2b0f681ddaf510de53d8eaa -->

This rule applies equally to Factory code and Factory self-improvement changes. Independent GPT3 review of the exact candidate SHA is mandatory, and the release / merge gate must remain closed when GPT3 is unavailable. A GPT3 FAIL on the exact candidate SHA always blocks release and merge. No exception, including a project-owner decision, can override that FAIL, allow the Developer to issue or simulate PASS or ACCEPTED for its own change, or waive the independent review, GPT3 availability, required-check, or branch-protection requirements. Any other exception requires an explicit project-owner decision recorded in the repository and cannot be self-approved by the Developer.

<!-- /coderabbit-ai-generated:v1 -->

## 3. Mandatory review intake

Before reviewing a change, record:

- Repository and default branch; current default-branch HEAD.
- Issue / PR, base SHA, exact head SHA, branch and current open/draft state.
- Track(s), primary owner, receiving owners and shared-file ownership.
- Objective, explicit non-goals, changed paths and relevant contracts / versions.
- Required tests, exact-head Actions run ID and attempt, job conclusions, review state.
- Security / privacy classification, operational impact, resource cost and rollback path.
- Relevant upstream dependencies and whether their evidence is current.

If the source, SHA, owner, authorization or required evidence cannot be confirmed, mark UNKNOWN or BLOCKED. Do not silently substitute an older snapshot.

## 3. Six-layer review checklist

### Layer 1 — Perception

- [ ] Re-read current coordination rules and the owning track's current charter.
- [ ] Fetch the exact current source files and PR diff; do not rely on titles, snippets or previous review text.
- [ ] Verify default-branch HEAD, PR base/head, merge base and changed-file list.
- [ ] Fetch all relevant issue / PR discussions, review decisions, CI runs and latest attempts.
- [ ] Distinguish current state from historical snapshots and candidate branches.
- [ ] Identify which evidence is unavailable because of access, environment or API limitations.

**Required evidence:** source paths, blob / commit SHA, observation time, PR / Issue URL, CI Run ID and Attempt where applicable.

### Layer 2 — Memory

- [ ] Link each retained decision, defect and test result to its authoritative source.
- [ ] Record the applicable repository / track version and exact SHA.
- [ ] Mark superseded handoffs, old run IDs and old candidate results STALE.
- [ ] Separate DOCUMENTED, ADOPTED, IMPLEMENTED, TESTED and ACCEPTED.
- [ ] Never persist secrets, tokens, credentials, raw personal data or unnecessary sensitive logs.
- [ ] Prefer versioned repository records over chat summaries.

**Required evidence:** source-linked decision / finding record with owner, status, last-verified time and next action.

### Layer 3 — Cognition

- [ ] Trace the real caller → adapter → service → persistence / external side-effect path.
- [ ] Verify authorization at the server / control-plane boundary; do not trust client-supplied identity, tenant or resource references.
- [ ] Check module ownership, data classification, API / schema compatibility and dependency direction.
- [ ] Examine concurrency, idempotency, retries, lease / fencing, cancellation and ambiguous-write behavior where relevant.
- [ ] Examine failure handling, fail-closed defaults, stale evidence and unknown enum / error-code behavior.
- [ ] Consider adversarial inputs, tenant crossover, replay, resource exhaustion, privacy leakage and rollback failure.
- [ ] Distinguish a proven defect from a plausible risk and from an unverified assumption.

**Required evidence:** call-path references, affected paths / lines, trigger conditions, impact, severity and reproducible counter-example or explicit uncertainty.

### Layer 4 — Planning

- [ ] Assign the finding to the correct A–P owner; GPT3 does not take over implementation.
- [ ] State the smallest safe scope and explicit non-goals.
- [ ] Define acceptance conditions before proposing a fix.
- [ ] Specify focused unit / contract / integration / fault-injection tests.
- [ ] Include exact-SHA CI, security review and receiving-owner review requirements.
- [ ] Identify rollback / forward-fix strategy and stop conditions.
- [ ] Keep Factory P0 ahead of non-blocking enhancements; keep B Runtime preparation-only until A acceptance.

**Required evidence:** owner, task / PR, dependencies, test plan, risk and rollback.

### Layer 5 — Execution

- [ ] Default to read-only review.
- [ ] Make changes only in a GPT3-owned, explicitly scoped branch / document / test task.
- [ ] Do not overwrite another owner's files, branches, uncommitted work or active PR.
- [ ] Do not change Factory control-plane workflows, leases, Runner permissions, secrets, database / RLS, production data or deployment policy without explicit authorization.
- [ ] Do not dispatch / retry machine-managed tasks or alter durable task state to manufacture evidence.
- [ ] Do not bypass branch protection, CI, formal review or human approval.
- [ ] Record exactly which commands / tools were actually run and their results.

**Required evidence:** branch, commit, diff, changed paths, actual test output and authorization reference for any gated action.

### Layer 6 — Verification and reflection

- [ ] Bind every test and CI conclusion to the exact candidate SHA and run attempt.
- [ ] Verify required jobs actually ran; Pending, Skipped, Cancelled, missing and stale jobs are not PASS.
- [ ] Check independent review identity / state; self-review and automated review receipts are not independent approval.
- [ ] Verify changed contracts against producer and consumer versions.
- [ ] Re-run or invalidate evidence when the candidate SHA changes.
- [ ] Record residual risks, false-positive tests, missing fault injection and environment blockers.
- [ ] Update the Issue / PR / handoff with the disposition and next owner.

**Required evidence:** exact SHA, Run ID / Attempt, job conclusions, review state, test results and final PASS / FAIL / BLOCKED / NOT RUN / PENDING / UNKNOWN / STALE classification.

## 4. A–P coverage matrix

| Track | GPT3 review focus | Minimum acceptance evidence |
|---|---|---|
| A — Agent Factory V2 | Task lifecycle, controller / state-machine boundary, lease fencing, Runner isolation, retry / recovery, publication and durable evidence | State-machine and workflow contract tests; exact-head CI; natural execution evidence where runtime behavior is claimed; independent review |
| B — GCAN Product | Authenticated identity, tenant / workspace isolation, server-side authorization, product API, data lifecycle, cost and user-facing failure semantics | Cross-user / cross-tenant RLS and IDOR tests; API contract tests; exact-head CI; no Factory-private data exposure |
| C — Predictive Coding | Prediction provenance, measured prediction error, uncertainty and calibration, update safety | Reproducible evaluation dataset / protocol, calibration metrics, regression and provenance |
| D — Deep Neural | Provenance-aware memory, retrieval, reasoning, knowledge integration and evaluated learning proposals | Source-linked memory, uncertainty handling, evaluation / regression evidence; no unreviewed model output treated as fact |
| E — Deep Research | Source quality, corroboration, counter-evidence, citation fidelity and synthesis | Traceable sources, independent corroboration, explicit unknowns and citation checks |
| F — Cyber Security & Defense | Threat model, least privilege, input validation, isolation, vulnerability handling and adversarial controls | Threat-linked tests, security findings with owner / expiry, exact-head security checks |
| G — Release / QA / Integration | Compatibility, regression coverage, release gates and immutable evidence | Exact SHA + Run ID / Attempt, required jobs actually executed, receiving-owner and independent review |
| H — Observability / Telemetry / Cost | Event provenance, bounded cardinality, privacy minimization, cost / quota accuracy and alert semantics | Schema / privacy tests, metric definitions, failure and cost reconciliation evidence |
| I — Connectors / Workflow Automation | Authentication, signature / replay defense, idempotency, schema validation, bounded retries and least-privilege credentials | Contract tests, replay / duplicate / timeout tests, credential-scope review |
| J — Self-Healing / Chaos / Continuity | Recovery bounds, circuit breakers, checkpoint consistency, backup / restore and fault containment | Deterministic fault-injection, recovery / idempotency tests, explicit stop conditions |
| K — Knowledge / Docs / Governance Playbooks | Documentation freshness, ownership, decision provenance, runbook accuracy and handoff completeness | Link / version checks, source SHA, owner and review cadence; docs must not overclaim runtime status |
| L — Multi-Node / Federation / Cluster | Node identity, consent, attestation, lease / fencing, isolation, scheduling and safe exit | Remains DEFERRED until demonstrated need and explicit approval; threat model, consent / revocation and recovery evidence before activation |
| M — Compliance / Policy Audit / Risk | Audit integrity, retention, policy-to-evidence mapping, exception owner / expiry and privacy | Tamper-evident audit tests, traceability, retention controls and reviewed exceptions |
| N — Productization / Analytics / Growth | Metric definitions, privacy-aware aggregation, feedback quality, onboarding and accessibility | Defined denominators / windows, privacy review, usability / accessibility evidence |
| O — Lifecycle / Deprecation / Legacy | Inventory, compatibility windows, migration, owner sign-off and retirement / rollback | Consumer impact analysis, migration tests, deprecation notice and rollback / forward-fix |
| P — Governance / Ethics / Trust | Autonomy classes, human approval, fairness / transparency, exception arbitration and trust boundaries | Explicit approval matrix, auditable decisions, owner / expiry for exceptions; P cannot weaken F security controls |

This matrix is a review coverage guide. It does not change track ownership, status, version or roadmap priority. A track marked planned or implementation-candidate is not thereby operationally accepted.

## 5. Cross-cutting release gates

A change cannot receive overall PASS while any required gate is missing, stale or failed.

- **Ownership:** one primary owner per changed module / file; all receiving owners identified.
- **Contract:** producer / consumer schema, identity, error, retry, idempotency, version and freshness semantics are compatible.
- **Security:** authorization, tenant isolation, least privilege, secret handling, data minimization and untrusted-input boundaries are verified.
- **Reliability:** concurrency, retries, timeout, duplicate / replay, partial failure, recovery and rollback are tested where relevant.
- **Observability:** operational state is diagnosable without leaking secrets or unnecessary personal data.
- **Evidence:** all required checks bind to the same repository and exact head SHA; run attempts and reviewer state are explicit.
- **Human gate:** production, financial, destructive, permission, secret, security-policy and deployment actions retain explicit authorization.

## 6. Formal disposition vocabulary

- **PASS:** every required acceptance condition was actually executed and passed on the stated exact SHA, with reproducible evidence.
- **FAIL:** an executed check or trace demonstrates a concrete violation.
- **BLOCKED:** required dependency, authorization, environment or evidence is unavailable.
- **NOT RUN:** the required check has not been executed.
- **PENDING:** the check is running or awaiting a result.
- **UNKNOWN:** available evidence cannot establish the state.
- **STALE:** evidence refers to a superseded SHA, attempt, version, environment or decision.

A static source inspection may be reported as **PASS (static scope only)**, but must not be promoted to runtime PASS or overall acceptance.

## 7. Standard finding record

For every material finding, record:

```text
Finding ID:
Track / owner:
Severity:
Repository / branch:
Base SHA / candidate SHA:
Path and line:
Evidence source and observation time:
Call path / data flow:
Trigger condition:
Impact:
Confirmed defect / plausible risk / UNKNOWN:
Reproduction or missing evidence:
Minimal remediation:
Required tests:
Security / privacy / tenant impact:
Rollback / stop condition:
Disposition:
Next owner and due dependency:
```

## 8. Neural-mode maturity and non-claims

Report the operating model in three independent dimensions:

- **DOCUMENTED:** the checklist / shared method exists in a versioned repository document.
- **ADOPTED:** the responsible role has explicitly incorporated it into its own authoritative coordination or handoff record.
- **IMPLEMENTED:** corresponding code, storage, scheduling, permissions, monitoring and tests are deployed and accepted.

Reading a document or adding a checklist proves neither adoption by other roles nor implementation of a persistent autonomous agent. Do not claim background monitoring, cross-GPT real-time communication, autonomous deployment or L3–L5 maturity without the corresponding infrastructure and acceptance evidence.

## 9. Stop conditions

Stop and report BLOCKED when:

- The required audit baseline has advanced and the governing Issue requires an owner-approved replacement baseline.
- The PR head changes after review or the required CI / review evidence is bound to a different SHA.
- A required permission, authorization label, environment or owner decision is absent.
- A test would mutate machine-managed state, production data or an external system outside the authorized scope.
- A proposed change crosses another workstream's ownership or changes a protected control-plane boundary.
- The only available evidence is a historical snapshot, model assertion, skipped job or unverified source claim.

**Final rule:** GPT3 makes the system more verifiable by identifying evidence gaps and returning fixes to the correct owner. The checklist never grants GPT3 authority to replace an owner, weaken a control or self-approve a change.
