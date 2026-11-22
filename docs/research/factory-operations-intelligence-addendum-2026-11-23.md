# Agent Factory Operations Intelligence — Current-Main Addendum

> 查閱日期：2026-11-23（Taipei）；GitHub Actions run timestamps are UTC.  
> Repository: `X84657465/global-citizen-ai-network`  
> **Authoritative baseline: `main = dce81ed801c41bca9bc364e3d0f248244d88f88f`**  
> Repository version: `0.3.137`; Agent Factory V2 (A): `2.0.84`; GCAN Product (B): `0.1.20`.  
> This addendum supersedes the live-state claims in the original 2026-11-23 brief where they cite main `9f1e56a81a79b9fa3f6a2207a9ee979275db46c8`. The original brief is retained as historical evidence. This is GPT5 operations intelligence, not GPT3 independent acceptance or an operational authorization.

## Executive assessment

**Factory remains NOT ACCEPTED for operational recovery.** The mainline advanced and the B/Factory charter documentation is now integrated, but the exact-current-main CI run is still pending with no job records. The operator-recovery Environment configuration remains unverified through repository reads, and the A-wide independent audit has only had its target SHA refreshed; no independent audit report or approval is established by this addendum.

Do not dispatch operator recovery, unquarantine tasks, alter machine-managed Issue #100, create a lease, or reset the global breaker based on this document.

## 1. Current mainline and version identity

- Current main HEAD: `dce81ed801c41bca9bc364e3d0f248244d88f88f` (merge of PR #409).
- Repository `VERSION` / `versions/manifest.json` overall: `0.3.137`.
- Agent Factory V2 A: `2.0.84`; GCAN Product B: `0.1.20`.
- PR #408 merged at `525055fbef0c023a542061239ba02b18cba16140`; it selectively integrated:
  - `docs/AGENT_FACTORY_AUTONOMY_CHARTER.md`
  - `docs/GCAN_B_LINE_LEAD_CHARTER.md`
  - `docs/GCAN_PRODUCT_NORTH_STAR.md`
  - corrected links in `PROJECT_COORDINATION.md` and `README.md`.
- PR #409 merged at `dce81ed801c41bca9bc364e3d0f248244d88f88f` and added the original operations intelligence brief. Its opening snapshot cites the immediately preceding main SHA and is superseded by this addendum.
- The three canonical charter paths above now exist on main. PR #376 is not their only source and remains a stale, non-mergeable candidate.

## 2. Exact-main CI and deployment evidence

- Main CI run [45054514027](https://github.com/X84657465/global-citizen-ai-network/actions/runs/45054514027) targets exact main SHA `dce81ed801c41bca9bc364e3d0f248244d88f88f`.
- Latest job query returned an empty job list. Disposition: **PENDING / NO JOB EVIDENCE**, not PASS.
- The empty job list does not establish Runner health, successful tests, or workflow completion.
- PR #408 exact-head run [45054416648](https://github.com/X84657465/global-citizen-ai-network/actions/runs/45054416648) and PR #409 exact-head run [45054440307](https://github.com/X84657465/global-citizen-ai-network/actions/runs/45054440307) were recorded by the GPT3 QA note as PENDING at candidate metadata resolution; no formal review submissions were returned at that check.
- PR #409 has a Vercel comment reporting the provider's daily deployment API limit. This is an external Preview/deployment limitation, not GitHub Actions CI evidence and not a passing Preview smoke test.

## 3. Independent A-wide audit — Issue #136

- The repository owner refreshed Issue #136's sole read-only audit baseline to exact main SHA `dce81ed801c41bca9bc364e3d0f248244d88f88f`.
- Version tuple recorded in that refresh: repository `0.3.137`, A `2.0.84`, B `0.1.20`.
- The refresh explicitly records main CI run `45054514027` as PENDING with no jobs.
- Original read-only restrictions remain: no source edits, commits, pushes, PR creation/merge, production access, database mutation, secret/permission changes, or state-changing tests.
- **Audit status: REQUESTED / NOT YET EVIDENCED.** A refreshed baseline is not an audit report, formal approval, or acceptance. GPT5 does not substitute for GPT3 or the separately designated independent reviewer.
- If main advances before the audit begins, follow Issue #136's stop-on-advance rule and obtain a fresh authorized baseline rather than silently switching SHA.

## 4. Operator recovery — Issue #352

### Integrated implementation evidence

- PR #404 introduced the operator-recovery controller mode and dedicated manual workflow.
- PR #405 moved to the unique `FACTORY_OPERATOR_RECOVERY_ENV_GUARD` name; the legacy generic guard is not an accepted fallback.
- PR #406 canonicalized HTTPS GitHub evidence URLs before deriving idempotency identity and added equivalent-URL replay plus ambiguous read-back failure/mismatch tests.
- PR #407 was reported merged as a redundant duplicate; comparison from PR #406's merge commit to the PR #407 merge commit reported no file-content delta.
- The controller/workflow/runbook require the guard to be Environment-scoped, with required reviewers and deployment branch restriction to `main`; the same secret name must not exist at repository or organization scope.

### Remaining operational gate

Repository content cannot prove that GitHub Environment `factory-operator-recovery` actually has required reviewers, main-only deployment restrictions, or that the guard secret exists only at that Environment scope. Those are administrative settings requiring authorized administrator verification.

**Issue #352 remains BLOCKED / NOT ACCEPTED / NOT OPERATIONAL.** Do not dispatch the recovery workflow or mutate Issue #100/task/lease/quarantine/breaker state until the Environment configuration, exact-head CI, negative-path checks and independent review are evidenced.

## 5. Other Factory findings

### Issue #354 — cross-job lease handoff

- The narrow defect is recorded as implemented and closed.
- PR #362 exports the exact lease ID from the trusted reserve step as a job output and passes it only to the downstream privileged state-writer jobs; the isolated publisher does not receive the lease.
- Exact-head run [45029877567](https://github.com/X84657465/global-citizen-ai-network/actions/runs/45029877567) is recorded as SUCCESS for PR #362's candidate head.
- This resolves the specific handoff defect; it does not establish whole-Factory acceptance.

### Issue #164 — candidate success vs global breaker

- Current-main source evidence records candidate success as task-scoped (`recordTaskSuccess`), with global system recovery isolated to the separate evidence-gated `system-health-success` path.
- Regression coverage for active breaker/quarantined-task preservation and duplicate idempotency is present.
- Issue #164 remains open. Source presence alone does not prove current-main test execution, independent review, or acceptance.

### Issue #188 — system-health recovery wiring

- The Preflight workflow still contains a post-publication step whose label says “Reset circuit breaker after successful task publication” while invoking legacy `AGENT_FACTORY_MODE: success`.
- The controller deliberately treats legacy `success` as non-mutating (`breaker_reset: false`, `ignored: true`). This is a misleading no-op, not evidence of an unsafe breaker reset.
- The separate system-health path requires evidence-bound successful same-repository PR CI and exact workflow run/attempt/SHA/job checks.
- Do not weaken those checks to make push events qualify. Any cleanup of the misleading step must follow the A owner and Issue #136 review/authorization gates.

## 6. Open-PR triage against current main

- **PR #259:** broad A/F–P candidate on an old base; diverged and non-mergeable. Do not merge, force-retarget, or transplant the broad diff.
- **PR #373:** P changelog/validator candidate on an old base; diverged and non-mergeable. Reconcile narrowly with GPT2/P owner after comparing current files.
- **PR #376:** stale documentation candidate; its canonical Factory/B documents were selectively integrated through PR #408. Do not merge #376 as-is.
- None of these is an immediate merge candidate on the evidence checked for this addendum.

## 7. Owner-routed next actions

1. **GPT1 / A owner:** continue Factory-first implementation only within existing authorization boundaries; keep the controller fencing and single-Runner serialization intact.
2. **Repository administrator:** verify Environment reviewers, main-only deployment restriction and Environment-only guard-secret scope; record evidence without exposing secret values.
3. **GPT3 / independent reviewer:** perform the Issue #136 read-only audit against the authorized exact SHA `dce81ed801c41bca9bc364e3d0f248244d88f88f`, provided main has not advanced before review starts.
4. **GPT2 / QA owner:** obtain complete exact-SHA CI evidence and report each required job's actual terminal status; do not treat no-job, skipped or pending results as PASS.
5. **GPT4 / B owner:** use the now-integrated canonical B charter and North Star for future product planning, but keep B Runtime inactive until A's acceptance gates are met.
6. **GPT5:** maintain source-backed operational intelligence and handoff records; do not declare acceptance or perform another workstream's implementation.

## 8. Evidence links

- [Current main commit dce81ed8](https://github.com/X84657465/global-citizen-ai-network/commit/dce81ed801c41bca9bc364e3d0f248244d88f88f)
- [PR #408 — Factory and B canonical documentation](https://github.com/X84657465/global-citizen-ai-network/pull/408)
- [PR #409 — original operations intelligence brief](https://github.com/X84657465/global-citizen-ai-network/pull/409)
- [Issue #136 — independent A-wide audit](https://github.com/X84657465/global-citizen-ai-network/issues/136)
- [Issue #352 — audited operator recovery](https://github.com/X84657465/global-citizen-ai-network/issues/352)
- [Issue #354 — lease propagation](https://github.com/X84657465/global-citizen-ai-network/issues/354)
- [Issue #164 — task/system breaker isolation](https://github.com/X84657465/global-citizen-ai-network/issues/164)
- [Issue #188 — system-health recovery wiring](https://github.com/X84657465/global-citizen-ai-network/issues/188)

---

**Disposition:** documentation correction only. This addendum does not authorize operator recovery, task dispatch, lease creation, breaker/quarantine changes, B Runtime activation, production deployment, secret/permission changes, or database mutation.
