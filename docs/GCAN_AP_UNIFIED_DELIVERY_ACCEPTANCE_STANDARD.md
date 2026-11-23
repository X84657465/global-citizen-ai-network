# GCAN A–P Unified Delivery & Acceptance Standard

**Document ID:** GCAN-AP-DELIVERY-GATES-1.0  
**Status:** PROPOSED — submitted for independent GPT3 review and the repository's existing governance approval process.  
**Applies to:** A–P workstreams, GPT1–GPT5, developers, reviewers, Factory tasks, product work, CI workflows, integrations and releases.  
**Baseline at proposal creation:** `main` = `4225a244407f7a323262c4d6e17b2749193d6476`. Re-read the current main and candidate SHA before every review or release.  
**Authority boundary:** This standard does not change module ownership, grant permissions, bypass branch protection, authorize production deployment, or replace any higher-priority security, privacy, data, owner or product charter.

## 1. Purpose and one shared rule

Every A–P delivery uses the same evidence vocabulary and release gates. Module-specific tests may differ, but no workstream may lower the shared minimum.

The canonical governance hierarchy remains: platform/security/branch-protection rules → approved governance and owner charters → this standard once approved → workstream-specific implementation details. Until this proposal is independently reviewed and accepted, existing approved rules remain in force.

This document operationalizes the existing `GCAN_UNIFIED_EXECUTION_CONSTITUTION_V3.md`, `GCAN_EXECUTION_OPERATING_SYSTEM.md`, `PROJECT_COORDINATION.md` and `GCAN_F_TO_P_ACCEPTANCE.md`; it does not create a competing role charter.

## 2. Common delivery states

Use these states consistently in Issues, PRs, handoffs and reports:

| State | Meaning | May be described as delivered? |
|---|---|---|
| `PLANNED` | Scope and acceptance criteria proposed | No |
| `IN_PROGRESS` | Work has actually started | No |
| `BLOCKED` | A named dependency, permission, environment or evidence gap prevents progress | No |
| `NOT RUN` | Required validation has not executed | No |
| `PENDING` | Validation is still running or waiting for capacity | No |
| `FAIL` | A required check or acceptance criterion failed | No |
| `VERIFIED` | Required technical checks passed on the exact candidate SHA | Not yet accepted |
| `ACCEPTED` | Required independent review and acceptance evidence are complete | Yes, as accepted change |
| `MERGED` | GitHub confirms the PR merge and merge SHA | Yes, as integrated code |
| `PREVIEW` | A real preview deployment exists and is reachable | Yes, as preview only |
| `RELEASED` | The intended release environment is deployed and smoke-verified | Yes, as released |
| `STALE` | Evidence no longer matches the current SHA, workflow, environment or policy | No |

Never collapse `ACCEPTED`, `MERGED`, `PREVIEW` and `RELEASED` into one status. A merged PR is not proof of a working production product.

## 3. Shared acceptance gates

Every task declares which gates apply. A gate may be marked N/A only with a written reason approved by the task DRI and, where required, the independent reviewer.

### G0 — Task contract ready

Required before risky implementation:
- Unique Issue/Task ID, one DRI, one Developer and an independent Reviewer where risk requires it.
- Objective, non-goals, workstream(s), dependencies, allowlist and denylist.
- User-visible outcome and objectively testable acceptance criteria.
- Test plan, risk classification, rollback/fallback and target environment.
- Baseline branch and exact base SHA recorded.

**Pass evidence:** complete task contract linked from the PR.

### G1 — Implementation complete

- Intended code/configuration/documentation changes are present in the candidate branch.
- Diff stays within the approved scope; no unrelated or hidden changes.
- Error paths, authorization, input validation and compatibility are addressed for the changed surface.
- Required migrations/configuration changes are versioned and reversible where applicable.
- Documentation and handoff reflect actual implementation, not intended future behavior.

**Pass evidence:** PR diff, changed-file list and candidate head SHA.

### G2 — Technical verification complete

Run the applicable tests against the exact candidate SHA:
- Unit and regression tests for changed behavior.
- Integration/contract tests for affected module boundaries.
- Typecheck, lint, build and dependency/security checks required by repository policy.
- Platform-specific execution tests (for example Windows/Linux, self-hosted runner, database/RLS, Ollama or external connector) when the changed path depends on them.
- Negative tests for authorization failures, malformed inputs, failure recovery and relevant security boundaries.
- Record commands, environment, output, test coverage gaps and CI run ID/attempt/job IDs.

A successful local test does not replace required CI. A green run for another SHA does not count.

**Pass evidence:** every required check completed successfully on the exact head SHA, with logs or retrievable run/job evidence.

### G3 — Independent review and acceptance

- Developer cannot approve their own work.
- Reviewer checks the diff, task scope, acceptance criteria, test evidence, security/privacy impact, compatibility and rollback.
- High-risk changes (Factory lifecycle/state, permissions, secrets, data/RLS, cross-module contracts, self-modification, production write paths) require an independent qualified review under the existing governance rules.
- Blocking review threads are resolved; review is bound to the candidate SHA.
- Product acceptance and technical QA are separate: product owner confirms user/business behavior; independent technical reviewer confirms engineering gates.

**Pass evidence:** formal GitHub review or approved repository review record, reviewer identity, timestamp, reviewed SHA and resolved blocking threads.

### G4 — Integration and merge ready

- PR is open, non-Draft, targets the intended base and is mergeable.
- Required checks and required reviews are satisfied for the latest head SHA.
- No unresolved blocking comments, failing required checks, stale evidence or unapproved scope expansion.
- Branch protection and repository rules permit the merge.
- Merge method and rollback path are understood.

**Pass evidence:** current PR metadata, required-check results, review record and mergeability. Merge only through the repository's normal protected process.

### G5 — Release and user handoff

For a release intended for users:
- Deployment succeeded in the intended environment; record deployment ID, URL, environment, version and source SHA.
- Database/API/authentication and critical user journeys work in the deployed environment.
- Smoke tests pass; monitoring/logging and error visibility are available.
- Data migration, rollback and recovery procedures are verified where applicable.
- Known limitations, operational owner, support/incident path and handoff are documented.
- Product owner confirms the delivered user-visible scope.

**Pass evidence:** real deployment record plus environment smoke-test output. A deployment queued, rate-limited, skipped or lacking a reachable URL is not released.

## 4. Universal fail-closed rules

The following are never a pass: `PENDING`, `0 jobs`, `SKIPPED`, `CANCELLED`, `NEUTRAL`, `UNKNOWN`, `NOT RUN`, missing logs, missing required jobs, stale SHA evidence, local-only success where CI is required, an author's self-review, or an unverified deployment claim.

If a provider is rate-limited, report it separately as a provider/environment blocker. Do not mislabel it as a code failure or as a successful CI result.

If the head SHA, base SHA, workflow definition, required-check set or relevant environment changes, re-evaluate the affected gates. Do not carry forward evidence that no longer matches.

A task remains `BLOCKED` if a required reviewer, runner, permission, test environment or deployment proof is unavailable. Continue independent work, state the concrete unblock condition, and do not invent an ETA.

## 5. A–P workstream-specific overlays

The shared gates above apply to every workstream. These overlays add domain checks; they do not replace G0–G5.

| Workstream | Additional acceptance focus |
|---|---|
| A — Agent Factory | Task state integrity, lease/fencing, runner isolation, retry/cancel/recovery, durable-state safety, end-to-end execution evidence |
| B — Product | User journey, product requirements, UX/accessibility, API/data contract, tenant isolation, product-owner acceptance and deployed smoke test |
| C — Predictive Coding | Reproducible dataset/version, leakage controls, baseline comparison, regression and quality metrics |
| D — Deep Neural | Model/config/version provenance, reproducible evaluation, safety/quality regression, latency and cost bounds |
| E — Deep Research | Source provenance, freshness, citations, reproducibility, uncertainty and factuality review |
| F — Security | Threat model, authorization tests, dependency/supply-chain checks, privilege/RLS regression and security evidence |
| G — Release/QA | Required-check completeness, exact-head evidence, compatibility, release/rollback verification |
| H — Observability | Correlation continuity, useful logs/metrics, privacy minimization, alert and failure-path tests |
| I — Connectors | Explicit host authorization, credential isolation, timeout/retry/idempotency, contract tests and side-effect boundaries |
| J — Resilience | Fault injection, bounded retries, recovery proof, dry-run/rollback and no unauthorized autonomous repair |
| K — Knowledge | Source/version/freshness metadata, code-to-doc consistency, stale marking and handoff completeness |
| L — Federation | Identity/trust, tenant isolation, data sovereignty, revocation, node failure isolation and explicit activation gate |
| M — Compliance/Risk | Control mapping, evidence owner, residual risk, scope limits; engineering evidence is not legal certification |
| N — Analytics/Productization | Data minimization, event allowlist, aggregation, retention, metric definitions and reproducibility |
| O — Lifecycle | Compatibility matrix, migration/rollback proof, support/deprecation policy and no unapproved retirement |
| P — Governance/Trust | Review provenance, reviewer permission verification, decision traceability and no authority escalation |

Where a workstream's charter imposes a stricter rule, the stricter rule wins. A–E must not be treated as exempt merely because the existing F–P checklist is more detailed.

## 6. What the user can see, and when

- **Working preview:** may be shown after the relevant G1–G3 checks pass and a real preview deployment is available; label it PREVIEW and list known gaps.
- **Beta / limited use:** requires G1–G4, a reachable preview/staging environment, core user journeys verified, known limitations disclosed, and an explicit product-owner decision to invite users.
- **Production release:** requires G1–G5, all required security/data/review/branch-protection gates, production smoke tests, monitoring and rollback readiness.
- **Finished product:** means the agreed product scope has been accepted and released; it does not mean every future roadmap feature is complete. The scope must be listed in the release notes.

No date is promised solely from a policy document. The first credible user-visible delivery estimate is made after G0 scope and dependencies are confirmed and the critical path has observable execution capacity.

## 7. Standard evidence record

Every PR/handoff must include:

```text
Task ID / Issue:
Workstream(s):
DRI:
Developer:
Independent Reviewer:
Objective / Non-goals:
Allowlist / Denylist:
Base branch + base SHA:
Candidate branch + exact head SHA:
G0 Task Contract: PASS / FAIL / BLOCKED / N/A (reason)
G1 Implementation: PASS / FAIL / BLOCKED / NOT RUN
G2 Tests & CI: PASS / FAIL / BLOCKED / PENDING / NOT RUN
  - Commands / environment:
  - Workflow run ID / attempt:
  - Required job IDs / conclusions:
  - Logs / artifacts:
G3 Independent Review: PASS / FAIL / BLOCKED / NOT RUN
  - Reviewer / timestamp / reviewed SHA:
  - Blocking threads:
G4 Merge readiness: PASS / FAIL / BLOCKED
  - Draft / mergeable / required checks:
G5 Release: PREVIEW / BETA / RELEASED / NOT RUN
  - Environment / deployment ID / URL / source SHA:
  - Smoke tests / monitoring / rollback:
Known gaps / risks:
Next action / owner / unblock condition:
```

## 8. Adoption and enforcement status

Adoption has three separate levels:
- **DOCUMENTED:** this standard is merged and discoverable from the project coordination entry point.
- **ADOPTED:** GPT1–GPT5 / relevant A–P owners have independently recorded that they read and apply the current standard version.
- **ENFORCED:** PR templates, automated policy checks, required reviews/checks and release workflows technically block violations.

A document or PR merge alone proves DOCUMENTED only. Do not claim ADOPTED or ENFORCED until the corresponding records and mechanisms exist and are tested.

**Current status:** PROPOSED. This branch does not alter branch protection, required checks, permissions, deployment settings, secrets, production data or any agent runtime. GPT3 independent review and the existing governance approval are still required.
