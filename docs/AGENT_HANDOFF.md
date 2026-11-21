# Agent Handoff — GCAN / Agent Factory V2

> 本文件是下一輪開發的交接基準。只記錄已查證的 GitHub 狀態；每輪更新。CI 通過不等於獨立審查、合併或部署獲准。

**Last verified:** 2026-11-22 (Taiwan time)  
**Repository:** X84657465/global-citizen-ai-network  
**Default branch:** main  
**Main HEAD:** a1c1b58e4d1852f5a09a0e7c6c5cbeb38e1f9582  
**Authoritative release metadata:** root 0.3.124; Agent Factory V2 2.0.84; GCAN Product 0.1.19  
**Known metadata defect:** README still advertises root 0.3.121. Narrow correction is PR #265; do not describe it as integrated.

## 1. Highest-level strategy and authority

1. **A — Agent Factory V2 first:** stabilize task intake, task/lease state, isolated execution, patch integrity, exact-head CI, recovery, Runner serialization and operational continuity.
2. **B — GCAN Product second:** connect only to stable, versioned A contracts and accepted evidence. B must not gain Factory state mutation authority.
3. **F–P — support only:** repair concrete A/B handoff blockers; do not expand unrelated infrastructure or parallel roadmaps.
4. **Global ecosystem later:** production AI spend, payouts, federation and autonomous production remediation require separate security, cost, legal and release gates.

### A–P ownership map

| Line | Responsibility | Boundary |
|---|---|---|
| A | Agent Factory V2 — planning, task selection, durable state/lease, Runner, sandbox, patch generation, candidate CI and recovery | Highest priority; exact-SHA evidence and safe state transitions required |
| B | GCAN Product — user workspace, projects/conversations, product APIs, contribution and monetization foundations | Downstream of accepted A contracts; no Factory state authority |
| C | Predictive Coding | Prediction, observation, error measurement and calibration support; no authority over A/B |
| D | Deep Neural | Memory, reasoning, model architecture and evaluation support; no authority over A/B |
| E | Deep Research | Multi-source research, provenance, corroboration and counter-evidence |
| F | Security assurance | Security findings and control evidence; advisory absent verified enforcement |
| G | Integration / release quality | Exact-head compatibility and acceptance evidence; never grants merge/deploy authorization |
| H | Observability / operations | Correlation, health and cost signals; durable distributed sink remains a separate gate |
| I | External integrations | Versioned adapters; approved credentials and bounded writes only |
| J | Resilience / recovery | Diagnosis and repair proposals; production remediation remains operator-controlled |
| K | Knowledge / documentation | Runbooks, architecture, integration ledger and handoff accuracy |
| L | Federation / edge | Deferred; no node registration or distributed execution |
| M | Compliance / risk evidence | Engineering control evidence only; no legal certification claim |
| N | Product analytics / growth | Privacy-minimized product analytics; no unapproved user tracking |
| O | Lifecycle / deprecation | Version and retirement recommendations; no automatic retirement |
| P | Governance / trust | Ownership, approval and evidence requirements; executable policy needs separate validation |

## 2. Verified mainline and current candidates

### Main

- Current main SHA: a1c1b58e4d1852f5a09a0e7c6c5cbeb38e1f9582.
- Main push CI run [44931787907](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44931787907) completed **failure** on this exact SHA.
- Its Windows job passed dependency installation, Runner/Docker/Ollama checks, bounded Qwen3 8B inference and migration filename validation. It failed at Schema Safety Guard because the guard expected plan(15), while public_table_grants.test.sql declares plan(18). Audits, unit tests, typecheck, lint, build, database and local integration were skipped after the guard failure.
- Root VERSION, package.json, package-lock and versions/manifest.json are 0.3.124; A is 2.0.84 and B is 0.1.19. README's displayed overall version remains 0.3.121 until PR #265 is accepted.
- The mainline five-minute schedule is configured, but current continuous scheduled delivery/healthy task processing is not proven. A configured cron is not proof of an executed schedule or a healthy end-to-end factory. Verify exact schedule runs and owner/admin Actions settings.
- Machine-managed Issue #100 must never be edited manually. Latest read snapshot seen in this round was state version 141, updated 2026-11-21T18:29:34Z; this snapshot is stale and must not be treated as current runtime state.

### A P0 — PR #264: narrow Schema Guard repair

- PR: https://github.com/X84657465/global-citizen-ai-network/pull/264
- Exact HEAD: 635d3a8a8a8e09977f4fccd93bdfd655060f113a; base main a1c1b58e4d1852f5a09a0e7c6c5cbeb38e1f9582.
- Diff is exactly one file and one-line change in scripts/check-schema.mjs: plan(15) → plan(18). It matches Issue #249's explicit one-file allowlist.
- Exact-head run [44941251669](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44941251669): resolver succeeded; dependency install, Windows/Docker/Ollama, bounded inference, migration guard, schema guard, production audit and full audit all passed.
- The same run then failed at CI policy tests: 30/32 passed. Two pre-existing mainline consistency defects were found: README release label 0.3.121 vs authoritative 0.3.124, and stale runbook wording/V1 instructions in tests/ci-trigger-policy.test.mjs. Typecheck, lint and production build were skipped. Failure diagnostics were still pending at last status check.
- PR #264 has zero formal reviews and zero inline review threads. Keep Draft/unmerged. After the baseline fix is accepted into main, update/rebase this one-file candidate onto current main and rerun exact-head full CI.

### CI baseline repair — PR #265

- PR: https://github.com/X84657465/global-citizen-ai-network/pull/265
- Exact HEAD: 6ccaeeda5b4fd43c72f51792d814ab949d42ace0; base main a1c1b58e4d1852f5a09a0e7c6c5cbeb38e1f9582.
- Diff is limited to README.md and tests/ci-trigger-policy.test.mjs. It synchronizes the README release label to 0.3.124 and updates the policy test to match current mainline runbook language, removing obsolete V1 assertions.
- Exact-head run [44941725749](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44941725749): metadata resolver succeeded; Windows Runner quality gates are in progress at locked dependency installation. Docker/Ollama, migration/schema guards, audits, tests, typecheck, lint and production build remain pending. No full CI pass is claimed.
- Vercel reported the free daily deployment quota limit. This is not a successful Preview. Do not retry deployments repeatedly or bypass the quota.
- Formal reviews and inline threads: zero. Keep Draft/unmerged until exact-head CI and required review pass.

### Broad integration candidate — PR #259

- PR: https://github.com/X84657465/global-citizen-ai-network/pull/259
- Current exact HEAD: d439b56385cc5780913ae81d7af3ce52946a07b4; base main a1c1b58e4d1852f5a09a0e7c6c5cbeb38e1f9582.
- Current exact-head run [44942502660](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44942502660) is pending with zero jobs at latest inspection. Current source at HEAD d439b56385cc5780913ae81d7af3ce52946a07b4 confirms the strict UTC regex captures numeric components and regression tests reject impossible dates and out-of-range hours. Earlier exact-head runs are superseded; exact-head CI is not yet verified.
- Current diff contains 27 files across A state/controller changes, F–P host/governance/observability, repository-name validation, a PostgreSQL appeal-authorization migration, tests and release metadata. The H timestamp validator now rejects impossible UTC calendar dates and out-of-range time components; exact-head CI remains pending.
- **Stack overlap:** #259 also carries the README/version and CI-policy-test edits from #265, plus the schema-guard edit covered by #264. Do not merge these PRs sequentially as-is or assume they are independent. Preserve the narrow PRs as isolated review units; split/reconcile #259 or refresh the remaining candidates against whichever exact SHA is eventually accepted. It is materially broader than the P0 schema repair.
- Formal reviews and inline threads: zero. Keep Draft; do not merge merely because it includes the baseline fixes. Require a complete diff/scope review, exact-head CI including database/RLS and Ollama, independent review, and explicit dependency ordering.

### Other open Draft candidates

| PR | Scope | Exact HEAD | Current disposition |
|---|---|---|---|
| #261 | A negated risk-intent classification | 69eb7ad72c2130041359045441e36c2c20e73946 | Run 44940637761 failed at Schema Guard plan mismatch; revalidate only after #264 is integrated |
| #260 | A–P numeric version registry | b1cbee86e0d9d415750b0adbce5f50c5b7ff85d6 | Draft; no formal reviews |
| #262 | J advisory resilience diagnostics | bdb15df2e2c1d63292e09d01d4645748f96dc48c | Draft; no formal reviews |
| #257 | I approved external connector registry | c1ed2f8ba0b548038920fa82be580236f5df8fd6 | Draft; no formal reviews |
| #255 | F/G repository identity validation | 5c23035c6856fc5be586356eac6a8b40d8f09b01 | Draft; no formal reviews |
| #252 | P reviewer permission path validation / F–P handover | cd2494af08c847bb16430c6f64e98286a07dd682 | Draft; no formal reviews |
| #256 | H middleware correlation propagation tests | 60c163444909fb14e5f2534e9f03a8ee0beaa6ce | Draft; no formal reviews |

Do not advance unrelated F–P candidates ahead of A unless a concrete A/B integration dependency is demonstrated.

## 3. A — Agent Factory execution order

1. Resolve PR #265's two known mainline baseline inconsistencies; exact-head CI must pass.
2. Integrate the one-file PR #264 only after required checks and independent review; then refresh PR #261 and other A candidates against the new main SHA.
3. Re-run complete quality gates: schema/migration guards, both dependency audits, unit tests, TypeScript, lint, production build, Ollama/local execution, disposable Supabase/PostgreSQL/pgTAP and two-member RLS integration.
4. Verify the default-branch preflight with fresh scheduled-run evidence, not merely workflow configuration or a push-triggered run.
5. Verify real candidate publication, exact PR/SHA/run/attempt binding, task-scoped outcome persistence and explicit system-health recovery separately.
6. Complete a real 24-hour Runner soak plus restart/reconnect rehearsal before claiming unattended readiness.
7. Keep machine-managed Issue #100, leases, retries, quarantine, processed-event ledger and global breaker untouched except through the authorized controller.

### Independent review gate

Issue #136 requests a READ-ONLY adversarial audit of the integrated Agent Factory baseline. The comments currently visible are owner-authored status/cross-checks, not an independent reviewer report. No PR review approval is inferred from CI, self-review, comments by the PR author or a successful merge. Do not fabricate or self-submit independent approval.

## 4. F–P integration boundaries and B preparation

- Main's lib/fp/integration-contract.ts currently marks F–P contracts as specified; this is not proof that all workstreams are implemented, tested or accepted.
- PR #259 adds a broader host composition/governance/reviewer-permission/observability slice and a database migration. Keep those changes isolated until the full current-head CI and review gates complete.
- F–P should supply only concrete interfaces needed by A and B: governance approval/evidence, migration compatibility, workspace/message contract, correlation and audit signals, and security/permission checks.
- B remains at interface preparation only. Its current registered version is 0.1.19. Do not start broad B product work or claim an accepted A→B bridge until A is stable and its evidence is accepted.
- No live external connector writes, production AI spend, payout, federation, or production remediation is authorized by these candidate contracts.

## 5. Next actions for the next development round

1. Refresh exact current heads and Actions runs for #264, #265, #259 and #261 before acting.
2. Let the serialized Windows Runner queue proceed; do not dispatch duplicate runs or bypass concurrency.
3. Complete #265's exact-head CI; then obtain the required independent review before considering integration.
4. Rebase/update #264 onto the newly accepted main and rerun its exact one-file candidate CI.
5. Revalidate #261 only after the schema correction is present in its base.
6. Review #259 as a separate broad candidate; split or defer unrelated F–P work rather than accepting a large combined diff.
7. Prepare B only against the accepted A ancestor and record the contract version/compatibility evidence.
8. Refresh this file with the resulting exact SHA, run IDs, step outcomes, review state and blockers.

## 6. Verification and safety rules

- Always use the current PR HEAD SHA and current base SHA. Results from superseded heads are stale.
- Distinguish resolver success, individual step success, full CI success, independent review, merge and deployment. Never conflate them.
- A mergeable flag is not test success or approval.
- Never edit machine-managed Issue #100 or manually reset lease, retry, quarantine, cooldown or breaker state.
- Do not alter secrets, production data, database permissions, branch protection, Runner settings or workflow permissions without separate authorization.
- Do not retry Vercel deployments while the free daily quota is exhausted.
- Production migration, deployment, paid AI activation, payout and distributed execution remain separate release gates.

- **Current CI/deployment constraints (2026-11-22):** PR #266 run 44942490529 is pending with zero jobs created. Vercel commit status is `failure` for #259/#265/#266 due to the Vercel build-rate limit (`upgradeToPro=build-rate-limit`); do not repeatedly retry or claim Preview/deployment acceptance. GitHub branch-protection/ruleset endpoints return 403 to the connected integration, so required branch rules cannot be independently inspected here. Formal reviews remain zero on checked candidates.


## 7. Continuation delta — 2026-11-22 (fresh GitHub verification)

This section supersedes older candidate-head and CI snapshots above where they conflict. Main remains `a1c1b58e4d1852f5a09a0e7c6c5cbeb38e1f9582`.

### A integration candidate #259 — updated exact head

- Current PR #259 HEAD is `581af4e606ea65162435915139da9dac982d4333` on `fix/ci-schema-grant-test-count-20261122`; base remains main `a1c1b58e4d1852f5a09a0e7c6c5cbeb38e1f9582`.
- New exact-head Actions run [44942853489](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44942853489) is pending. At the latest inspection, only the exact-candidate metadata resolver job existed and was pending. No quality, unit, type, lint, build, Ollama, PostgreSQL, pgTAP or RLS pass is claimed for this SHA.
- The previous run [44942502660](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44942502660) targeted superseded HEAD `d439b56385cc5780913ae81d7af3ce52946a07b4`; its substantive jobs were skipped after the candidate head changed. It is not acceptance evidence for the current head.
- A focused source review found the shared repository-name helper still accepted dot-prefixed owner/repository segments (for example `.owner/repo` and `owner/.repo`), unlike the strict F/G validation contract. This was corrected on the #259 branch: both segments must start with an ASCII alphanumeric character, and controller/state-store regression cases now include dot-prefixed and double-dot-prefixed segments. Commits: `83a542beb63a5365a46d0deece4ea6117c1b24d2`, `181ff26fa432f93d245323cec59013cd1d603f65`, `581af4e606ea65162435915139da9dac982d4333`.
- This is a narrow A repository-identity hardening change. It has not yet been executed by exact-head CI. Keep #259 Draft/unmerged pending full current-head CI and independent review.

### Narrow baseline candidates — failure attribution

- PR #264 exact-head run [44941251669](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44941251669): Schema Guard passed, but CI policy unit tests failed 2 of 32. The failures are stale mainline assumptions: README expected 0.3.124 but main still says 0.3.121, and the test expects obsolete runbook text/V1 workflow instructions. Typecheck, lint and production build were skipped. The one-line schema-plan correction itself passed.
- PR #265 exact-head run [44941725749](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44941725749): Windows quality job failed at Schema Guard because it is based directly on main and does not include the plan-count correction. Do not interpret this as a failure of its README/runbook edits; those tests were not reached.
- PR #261 exact-head run [44940637761](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44940637761): Windows quality job failed at the same mainline Schema Guard mismatch; risk-classifier tests were not reached.
- These isolated candidates overlap with #259. Do not merge #264/#265 separately while #259 carries their combined corrections; first accept one coherent exact-head candidate, then refresh remaining work against the resulting main SHA. No candidate has formal review submissions or inline review threads.

### B handoff — current main tree check

- The B workspace metadata filtering functions are already present in current main's `lib/workspace/message-validation.ts` and are consumed by `app/workspace/workspace-client.tsx`.
- Current main's conversation message API uses the minimal `id,role,content,created_at` projection for both GET and POST; the unused `model` field is absent.
- Current main's B version is `0.1.19`, and `versions/manifest.json` also records B as `0.1.19`. Do not wholesale transplant PR #201 or the older #185→#187 branch chain; those branches are diverged/stale relative to current main and overlap shared metadata.
- B implementation source is therefore present in main, but this is not a claim of release acceptance. A current exact-head CI pass, disposable authenticated API smoke test, route-level behavior verification and independent cross-track review remain distinct evidence requirements. No production deployment or production database mutation is claimed.

### Current disposition

- A remains first priority. Continue to let the exact-head #259 run proceed; do not dispatch duplicate runs or merge around pending checks.
- B is in handoff/verification preparation only; do not start another parallel B feature branch or rewrite migrations/RLS.
- F–P remain support-only. #255's F/G-only work stays separate; #259 now contains the shared A repository identity validator but does not make unrelated F–P candidates eligible.
- No merge, deployment, production data mutation, secret/permission change, durable factory-state edit, retry/quarantine reset or circuit-breaker reset was performed in this continuation.


## 8. Fresh continuation — controller repair integrated; current A gate remains pending (2026-11-22)

### Controller lifecycle P0 — Issue #205 / PR #208

- Issue #205 is now closed and carries the `factory-control-plane-approved` authorization label.
- PR #208 is merged. Its exact HEAD was `c19f3136be61fc61811a9923d8a7247f4c7317fa`; merge commit `5f35019f7877edb5f5a661c14abdabf84915b30a`.
- Exact-head Actions run [44910780005](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44910780005) has terminal success for metadata resolution, Windows quality gates (unit tests/typecheck/lint/audit/build), Ollama/local execution, and disposable Supabase/PostgreSQL/RLS integration. Vercel exact-head status is success.
- Current main's `lib/agent-factory-controller.mjs` and `tests/agent-factory-controller.test.mjs` contain the two-step `patching → sandbox_testing → publishing` path and regression coverage. Main is 272 commits ahead of the #208 merge commit and 0 behind, confirming the merged controller repair is in current main ancestry.
- Formal independent review records on #208 are zero. Record the merge and technical CI evidence accurately; do not retrospectively describe this as independently reviewed. Do not reopen or duplicate the completed issue unless a new defect is evidenced.

### Current #259 exact-head state — authoritative refresh

- Live PR metadata currently reports HEAD `581af4e606ea65162435915139da9dac982d4333`, base main `a1c1b58e4d1852f5a09a0e7c6c5cbeb38e1f9582`, Draft/open, 27 changed files.
- Exact-head Actions run [44942853489](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44942853489) is pending; its metadata resolver job is queued. There are no completed substantive jobs, so no quality, type/lint/build, Ollama, PostgreSQL, pgTAP or RLS pass is claimed for this SHA.
- Current exact-head Vercel status is failure due to provider build-rate limiting. Do not retry repeatedly or call it a Preview success.
- Formal PR reviews and inline review threads: zero.
- The #259 branch adds shared repository-name validation and dot-prefixed segment regression tests; the helper is not present on current main. It also carries A lifecycle/retry/state changes, F–P host/observability/governance changes, a database migration and shared release/CI baseline edits. Treat it as a broad integration candidate, not a narrow isolated fix.
- Keep Draft. Do not merge #259 or sequentially merge overlapping #264/#265. Reconcile/split the diff against the accepted main ancestor, then require new exact-head full CI and the applicable independent review/release gates.

### Independent review and P2 recovery

- Issue #136 remains open. Its latest relevant material is owner-side source tracing explicitly labeled as not an independent audit; no independent adversarial report was found in the issue comments. Do not self-certify this gate.
- Issue #188's evidence-gated system-breaker recovery wiring remains dependent on completion of #136. No workflow/control-plane edit, manual breaker reset, lease/retry/quarantine mutation or production state change is authorized by this continuation.
- B remains preparation/verification only. Current main already contains Workspace metadata filters and minimal Message API projection, but this does not replace disposable authenticated API smoke testing and cross-track review. Do not wholesale transplant stale B branches.

### Actions taken in this continuation

- Read-only verification of PR #208 merge, exact-head CI, Vercel status, current-main ancestry and current PR #259 HEAD/Actions/review state.
- No runtime code, workflow, schema, production data, secrets, permissions, Runner settings or machine-managed factory state was changed in this continuation.


### Actions progression after the snapshot above

- A fresh poll of #259 run [44942853489](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44942853489) shows the exact-candidate metadata resolver completed successfully and the Windows Runner quality-gates job has started and is `in_progress`. This is progress only; terminal quality success and the separate Ollama/PostgreSQL/RLS jobs remain unverified.
- The log endpoint for the in-progress job returned BlobNotFound at this checkpoint; no step-level result is inferred.
- The handoff document update itself is now at commit `b8482c72280bdcf212834805151e7bed5e2dd3f0` on the documentation PR branch. No Actions run for this new documentation HEAD was observed at the time of the refresh; prior docs-head runs do not transfer.


### Final live-head correction — PR #259 advanced during verification

- A later fresh GitHub read reports PR #259 HEAD `e7bfe23dd624c4b9c3af64876ea6d8aadc85eba2`, superseding the previously observed `581af4e...`.
- No pull-request Actions run is currently returned for exact HEAD `e7bfe23...`. The in-progress Windows quality job observed on run `44942853489` belongs to the earlier `581af4e...` snapshot and must not be credited to the new head.
- Exact-head Vercel status remains failure due to the provider build-rate limit.
- PR #259 remains Draft with zero formal reviews and zero inline review threads. Keep it unmerged until a new exact-head run reaches terminal success across all required jobs and independent review/release gates are met.


### Subsequent exact-head poll

- PR #259 advanced again to `e52f22df3cd148ed0914550205656b367e915971`.
- Exact-head Actions run [44943147734](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44943147734) is pending. The immediately prior moving-head run [44943133760](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44943133760) for superseded SHA `e7bfe23...` is cancelled and cannot validate the current head.
- Current-head Vercel remains rate-limited; PR remains Draft, unmerged, with zero formal reviews. Recheck the live PR HEAD before accepting any later run result.


### H recorder strict timestamp call-path repair — 2026-11-22

- Static review of PR #259 found the strict UTC calendar helper `isStrictUtcTimestamp()` was present, and tests covered impossible dates/out-of-range hours, but `FPObservabilityRecorder.record()` did not call the helper; it only checked regex shape and `Date.parse()`, which can normalize invalid calendar dates.
- Fixed `lib/fp/observability.ts` on the #259 candidate branch at commit `b13376b33357749cd046ba5732923593b55b3e41`; `record()` now uses `isStrictUtcTimestamp(event.occurredAt)`.
- Existing regression cases cover `2026-02-31T12:00:00.000Z` and `2026-11-21T25:00:00Z`.
- Current exact-head Actions run was not yet visible at the time of this note; Vercel status was pending. This fix is not yet CI-verified. PR remains Draft, unmerged, with no formal independent reviews.


### P governance review timestamp validation — 2026-11-22

- Found the same parse-normalization weakness in `lib/fp/governance-review-source.ts`: regex shape plus `Date.parse()` could accept impossible dates such as February 31.
- Added component-level UTC validation at commit `9f7da2115644ac52c9d29c22f8a6546600644c9b`; added impossible-date/hour regression cases at `6853dedb7e6583d7dc3f2185bc0931cac422d5e6`.
- Current PR #259 exact HEAD is `6853dedb7e6583d7dc3f2185bc0931cac422d5e6`. No exact-head Actions run was visible at this checkpoint; Vercel is provider-rate-limited; formal reviews remain 0. Keep Draft/unmerged.


### Latest exact-head snapshot — 2026-11-22 (live recheck)

- PR #259 live HEAD advanced to `38e5e5f312a1d3eaeedec9117ae1d6b46d779691`; exact-head Actions run [44943280889](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44943280889) is pending with no jobs exposed.
- The current branch tip was directly checked to retain both timestamp call-path fixes: H recorder calls `isStrictUtcTimestamp()`; P governance review collector calls `isValidUtcTimestamp()`. Both corresponding impossible-date/hour regression cases are present.
- Current Vercel status is rate-limited; formal reviews and inline review threads are 0. PR remains Draft/unmerged. Do not transfer prior-SHA CI evidence to this SHA.


### Factory / B bridge refresh — 2026-11-22

#### A Factory — issue #204 / PR #261
- Controller lifecycle dependency #205 is satisfied through merged PR #208; do not replay the old controller fix.
- Current #204 candidate PR #261 is exact HEAD `69eb7ad72c2130041359045441e36c2c20e73946`, based on main `a1c1b58e4d1852f5a09a0e7c6c5cbeb38e1f9582`, and changes only the two issue-allowlisted paths: `lib/agent-neural-decision.mjs` and `tests/agent-neural-decision-negation.test.mjs`.
- The targeted Node-native regression suite was independently reproduced in an isolated harness: 9/9 passed. This is not the full offline unit suite.
- Exact-head Actions run `44940637761` failed at the repository-wide schema guard (`scripts/check-schema.mjs:590`), which requires least-privilege regression coverage for full table privileges, internal-table RLS, and public sequence grants. Later unit/type/lint/audit/build stages were skipped. This blocker is outside #204's two-path allowlist; do not modify unrelated schema/test/workflow files to bypass it. PR #261 remains Draft/unmerged.
- The Vercel rate limit is a separate Preview blocker and must not be bypassed.

#### B Product bridge
- PR #200 (A candidate) and PR #201 (B bridge candidate) now report merged in GitHub; #201 merge commit is `1b5ea0a3773d444929424c0110456ac9db6097a5`, with exact-head Actions runs `44920146290` and `44894406266` both successful.
- Mainline source inspection confirms the authenticated conversations API requires a Supabase authenticated client, validates bounded JSON/title/project UUID, checks project ownership and archive status, and returns a minimal conversation projection. Workspace message validation retains strict UUID/timestamp/type filtering.
- This source inspection does not establish a disposable authenticated API smoke test or production readiness. Keep B bridge acceptance pending that runtime test and its permission/RLS evidence.

#### Review / recovery gates
- Issue #136 remains open; no independent adversarial audit evidence has been established. Issue #188 remains blocked on that dependency. Do not alter workflow/controller recovery wiring or reset machine-managed breaker/lease/retry state without the required independent audit.
- PR #259 remains a separate broad Draft candidate with exact-head CI unresolved and Vercel rate-limited; do not merge it or transfer prior-SHA results.
