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
- Exact-head run [44941725749](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44941725749) was pending at metadata resolver; no job steps had started at last inspection.
- Vercel reported the free daily deployment quota limit. This is not a successful Preview. Do not retry deployments repeatedly or bypass the quota.
- Formal reviews and inline threads: zero. Keep Draft/unmerged until exact-head CI and required review pass.

### Broad integration candidate — PR #259

- PR: https://github.com/X84657465/global-citizen-ai-network/pull/259
- Current exact HEAD: afeae1c8c757a9cfb91317b0a271dde47ea9308e; base main a1c1b58e4d1852f5a09a0e7c6c5cbeb38e1f9582.
- Current exact-head run [44941626126](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44941626126) is pending with no job steps started at last inspection. Older run 44941213950 used superseded HEAD d265000684e0238934a90e77f41d5992a1cc1de9 and is not evidence for the current HEAD.
- Current diff contains 26 files across A state/controller changes, F–P host/governance/observability, repository-name validation, a PostgreSQL appeal-authorization migration, tests and release metadata. It is materially broader than the P0 schema repair.
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
