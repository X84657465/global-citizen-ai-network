# Agent Factory — Operations Intelligence Brief

> 查閱日期：2026-11-23（Taipei）；GitHub run timestamps below are UTC.  
> Repository: `X84657465/global-citizen-ai-network`  
> Baseline checked: `main = 9f1e56a81a79b9fa3f6a2207a9ee979275db46c8`  
> Purpose: GPT5 operational intelligence / handoff support. This is not GPT3 independent acceptance, GPT1 implementation sign-off, or an operational authorization.

## Executive assessment

**Agent Factory remains NOT ACCEPTED for operational recovery.** The quarantine-recovery implementation and follow-up hardening are present on main, but the exact-main CI run is pending without allocated jobs, the latest observed Preflight Windows validation is still pending on an older SHA, the independent A-wide audit is stopped on a stale locked baseline, and GitHub Environment protection/secret scope cannot be verified from the available repository read interface.

Do not dispatch operator recovery, unquarantine Task #17 or #71, alter machine-managed Issue #100, create a lease, or reset the global breaker based on this brief.

## 1. Mainline and version identity

- Current main at final recheck: `9f1e56a81a79b9fa3f6a2207a9ee979275db46c8`.
- Commit message: merge of PR #407, “fix(factory): canonicalize recovery evidence after environment guard”.
- Repository `VERSION` and `package.json`: `0.3.137`.
- `versions/manifest.json`: overall `0.3.137`; A / Agent Factory V2 `2.0.84`; B / GCAN Product `0.1.20`.
- Comparing `434680b7ea29651102f0df2458d782f7a3160f35` to current main reports 3 commits ahead and **zero changed files**. PR #407's merge adds no file-content delta after PR #406's integration.

## 2. Quarantine recovery — Issue #352

### Integrated code evidence

- PR #404 introduced the trusted `operator-recovery` controller mode and dedicated manual workflow; it was merged but its exact-head CI and independent review were not established.
- PR #405 changed the guard to the unique `FACTORY_OPERATOR_RECOVERY_ENV_GUARD` name in controller, workflow, tests and runbook. The legacy generic `FACTORY_OPERATOR_RECOVERY_GUARD` is not accepted as a fallback.
- PR #406 canonicalized the HTTPS GitHub evidence URL before hashing and persisting it, and added tests for equivalent-URL idempotent replay plus fail-closed ambiguous-write read-back failures/mismatches.
- PR #407 is now reported merged at `9f1e56a81a79b9fa3f6a2207a9ee979275db46c8`, although its body says it was superseded/closed as redundant. The compare API reports no file delta from PR #406's merge commit. Treat it as a duplicate merge event, not new implementation evidence.
- The current controller still requires owner identity, `workflow_dispatch`, `refs/heads/main`, exact repository identity, the environment-specific guard, explicit confirmation, exact task issue, expected state version/status and HTTPS GitHub evidence. It canonicalizes evidence before deriving the idempotency identity.
- The dedicated workflow uses the `factory-operator-recovery` Environment and the environment-scoped secret name. The runbook requires required reviewers, main-only deployment restrictions, and prohibits defining the same secret name at repository or organization scope.

### Validation and blockers

- PR #405 exact-head Actions run [45053864235](https://github.com/X84657465/global-citizen-ai-network/actions/runs/45053864235): last observed **pending** at metadata resolver.
- PR #406 exact-head Actions run [45053887831](https://github.com/X84657465/global-citizen-ai-network/actions/runs/45053887831): last observed **pending** at metadata resolver.
- PR #405 and #406 formal review lists: no submitted reviews returned.
- PR #407 formal review list: no submitted reviews returned.
- Current main CI [45054123210](https://github.com/X84657465/global-citizen-ai-network/actions/runs/45054123210) for exact SHA `9f1e56a81a79b9fa3f6a2207a9ee979275db46c8`: **pending**, no jobs returned at the last query.
- Current main system-health workflow-run [45054127630](https://github.com/X84657465/global-citizen-ai-network/actions/runs/45054127630): **skipped**.
- Latest observed Preflight run [45053986828](https://github.com/X84657465/global-citizen-ai-network/actions/runs/45053986828) targets the prior SHA `434680b7ea29651102f0df2458d782f7a3160f35`: Windows self-hosted validation **pending**; planning, publication and dispatch jobs **skipped**. It is not exact-current-main validation.
- Vercel reports failure on current main. This is an external deployment status, not a GitHub Actions test result.

**Operational gate:** GitHub Environment required reviewers, main-only deployment branch restrictions, and actual secret scope are not visible through the available repository content/status endpoints. A workflow's `environment:` declaration and a non-empty environment-variable check do not prove these administrative settings are configured. An authorized administrator must record evidence before recovery is enabled.

## 3. Durable Factory state — read-only, stale snapshot

Machine-managed Issue #100 was read without modification. Its embedded state snapshot reports:

- State version: `203`.
- Snapshot timestamp: `2026-11-22T17:14:34.521Z`.
- Task #17: `quarantined`, 4 attempts, 3 failures.
- Task #71: `quarantined`, 4 attempts, 3 failures.
- No active task lease at that snapshot.
- Global system consecutive failures: `18`; recorded cooldown deadline: `2026-11-22T12:55:08.922Z`.

This snapshot predates the current main commit and may be stale. It is not a current-state read and must not be used as the expected version for a recovery request. Re-read through the trusted controller immediately before any future authorized operation. Do not edit Issue #100 manually.

## 4. Independent review and ownership boundaries

- Issue #136 remains open and locks its audit baseline to `1330cec486e5d4c264800935b878cd8016965e93`. Current main has advanced to `9f1e56a81a79b9fa3f6a2207a9ee979275db46c8`; the issue's own stop-on-advance rule means GPT3's A-wide audit is **STOPPED / NOT STARTED against current main** until the authorized owner updates the exact SHA and version tuple.
- Current version tuple for a future explicitly authorized audit: repository `0.3.137`; A `2.0.84`; B `0.1.20`.
- GPT5 does not substitute for GPT3 and does not issue PASS/FAIL acceptance.
- GPT1 owns A/Factory implementation. GPT2 owns F–P. GPT3 is the independent reviewer. GPT4 owns B product. GPT5 supplies research, evidence and operational handoff only.

## 5. Other Factory findings

### Issue #354 — cross-job lease handoff

The specific defect is recorded as implemented and closed:
- PR #362 exports the exact lease ID returned by the trusted reserve step as a job output and passes it to both privileged downstream state-writer jobs.
- The isolated publisher does not receive the lease.
- Controller/state-machine lease fencing remains unchanged.
- Exact-head run [45029877567](https://github.com/X84657465/global-citizen-ai-network/actions/runs/45029877567) is recorded as SUCCESS for PR #362's exact candidate head.
- This resolves that narrow handoff defect; it does not establish whole-Factory acceptance.

### Issue #164 — candidate success vs global breaker

Current controller source keeps candidate CI success task-scoped (`recordTaskSuccess`) and preserves the separate evidence-gated `system-health-success` path for global breaker reset. The legacy `success` mode is deliberately non-mutating. Regression coverage is present. Issue #164 remains open pending owner reconciliation/version/CI/formal review; source-presence is not independent A-wide acceptance.

### Issue #188 — system-health wiring

Current `.github/workflows/agent-factory-system-health.yml` invokes `system-health-success` only for successful same-repository `pull_request` workflow runs with task-branch metadata. The Preflight workflow still has a post-publication step named “Reset circuit breaker after successful task publication” invoking legacy `AGENT_FACTORY_MODE: success`, which the controller deliberately treats as a no-op. This does not reset the breaker, but the step name is misleading and should be reconciled by GPT1 after the Issue #136 review gate. Do not weaken evidence requirements to make push events qualify.

## 6. Open PR triage

The currently open PR search returned #259, #373 and #376:

- #259: broad consolidated A/F–P branch; base is historical and GitHub reports non-mergeable. Do not merge or transplant its broad diff.
- #373: P changelog branch based on an older main SHA; GitHub reports non-mergeable. Reconcile narrowly with GPT2/P owner.
- #376: B product north-star documentation branch based on an older main SHA; GitHub reports non-mergeable. Reconcile with GPT4/B owner.
- None is an A-line immediate merge candidate based on the evidence inspected here.

## 7. Next actions by owner

1. **GPT1 / A owner:** continue Factory-first work, but do not change protected control-plane workflows or perform recovery until their authorization gates are satisfied. Reconcile #352 against current main and provide a precise implementation/operational handoff.
2. **Repository administrator / owner:** verify the `factory-operator-recovery` Environment has required reviewers and deployment restricted to `main`; verify `FACTORY_OPERATOR_RECOVERY_ENV_GUARD` exists only at that Environment scope. Record auditable evidence without exposing the secret value.
3. **GPT3:** after the authorized baseline refresh on Issue #136, perform the independent read-only A-wide audit against one exact SHA.
4. **GPT2 / QA owner:** obtain complete exact-current-main CI and natural Preflight/Runner evidence; distinguish pending, skipped, cancelled and successful jobs.
5. **GPT5:** keep this evidence brief current and route source-backed findings to the responsible owner; do not modify A–P core code or declare acceptance.

## 8. Evidence links

- [Main commit 9f1e56a](https://github.com/X84657465/global-citizen-ai-network/commit/9f1e56a81a79b9fa3f6a2207a9ee979275db46c8)
- [PR #405 — Environment-scoped recovery guard](https://github.com/X84657465/global-citizen-ai-network/pull/405)
- [PR #406 — canonical evidence / ambiguous-write tests](https://github.com/X84657465/global-citizen-ai-network/pull/406)
- [PR #407 — duplicate/redundant follow-up merge](https://github.com/X84657465/global-citizen-ai-network/pull/407)
- [Issue #352 — audited operator recovery](https://github.com/X84657465/global-citizen-ai-network/issues/352)
- [Issue #136 — independent adversarial audit](https://github.com/X84657465/global-citizen-ai-network/issues/136)
- [Issue #354 — lease propagation](https://github.com/X84657465/global-citizen-ai-network/issues/354)
- [Issue #164 — task/system breaker isolation](https://github.com/X84657465/global-citizen-ai-network/issues/164)
- [Issue #188 — system-health recovery wiring](https://github.com/X84657465/global-citizen-ai-network/issues/188)

---

**Disposition:** documentation / operations intelligence only. No source code, workflow, permission, Environment, secret, Runner, production data, Issue #100, task, lease, quarantine, retry, cooldown, or breaker state was changed by this brief.
