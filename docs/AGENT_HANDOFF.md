# Agent Handoff — GCAN / Agent Factory V2

> Single source of truth for the next development session. Refresh after each round. Record verified GitHub state only. A merged PR, a successful resolver, or a skipped job is not acceptance.

**Last verified:** 2026-11-22 (Taiwan time)  
**Repository:** `X84657465/global-citizen-ai-network`  
**Default branch:** `main`  
**Main HEAD:** `a1c1b58e4d1852f5a09a0e7c6c5cbeb38e1f9582`  
**Authoritative release:** `VERSION` and `package.json` both report `0.3.124`. README still advertises `0.3.121`; PR #267 proposes the metadata correction but is not merged.  
**A / B declared versions:** Agent Factory V2 `2.0.84`; GCAN Product `0.1.19` (README declaration; not a release-readiness claim).

## 1. Highest-level strategy and authority

1. **A — Agent Factory V2 first:** stabilize intake, task selection, durable state/lease, Runner, sandbox, patch generation, exact-head CI, recovery and publication.
2. **B — GCAN Product second:** connect only to stable, versioned A contracts and accepted evidence. B must not gain privileged Factory state authority.
3. **F–P — integration support only:** fix concrete A/B handoff blockers; do not expand parallel infrastructure or activate unrelated product scope.
4. **Global ecosystem later:** production AI spend, payouts, federation and autonomous production remediation require separate security, cost, legal and operational gates.

CI success permits review; it does not itself authorize merge, deployment, secret changes or production-data access. A merge with missing exact-head CI or independent review remains **merged but not accepted**.

## 2. A–P ownership map

| Line | Responsibility | Boundary |
|---|---|---|
| A | Agent Factory V2 — planner, task selector, durable state/lease, Runner, sandbox, patch generation, candidate CI, recovery and publisher | Highest priority; exact-head evidence and safe state transitions mandatory |
| B | GCAN Product — workspace, conversations/projects, accounts, product APIs and monetization foundations | Downstream of accepted A contracts; no Factory state authority |
| C | Predictive Coding | Capability support only; no A/B authority |
| D | Deep Neural | Model/architecture capability support; no A/B authority |
| E | Deep Research | Research capability support; no A/B authority |
| F | Cyber Security & Defense | Security assurance/control evidence; advisory unless tied to verified controls |
| G | Release / QA / Integration | Exact-head quality and integration evaluation; never grants merge/deploy authorization |
| H | Observability / Telemetry / Cost | Correlation and bounded telemetry; durable distributed sink remains outstanding |
| I | Connectors / Workflow | Approved connector contracts; no unapproved external writes or credentials |
| J | Self-Healing / Continuity | Diagnosis and repair proposals; production remediation remains operator-controlled |
| K | Knowledge / Docs / Governance | Architecture, runbooks, integration ledger and handoff accuracy |
| L | Federation / Cluster | Deferred; no distributed node registration or execution |
| M | Compliance / Policy Audit | Engineering control evidence only; no legal certification claim |
| N | Productization / Analytics / Growth | Product and privacy-minimized analytics foundations; no unapproved tracking |
| O | Lifecycle / Deprecation | Version/deprecation recommendations; no automatic retirement |
| P | Governance / Ethics / Trust | Ownership, approval and trust boundaries; policy enforcement requires separate validation |

F–P manifest registration or a “ready” label is not implementation acceptance or operational readiness.

## 3. Live mainline and active acceptance blockers

### Main

- Verified main HEAD: `a1c1b58e4d1852f5a09a0e7c6c5cbeb38e1f9582`.
- `VERSION` and `package.json` are `0.3.124`; README root release label is stale at `0.3.121`.
- Vercel status is failing with the provider's `api-deployments-free-per-day` / `build-rate-limit` quota. Treat this as an external Preview/deployment blocker, not a code-test result. Do not repeatedly trigger deployment attempts or bypass the quota.

### PR #259 — P0 A / F–P shared acceptance candidate

- Branch: `fix/ci-schema-grant-test-count-20261122`.
- **Current exact PR head verified from GitHub PR metadata: `968d14256ce9a53b8e72ca5145722042619d9d4d`.**
- Prior exact-head run [44943280889](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44943280889) targeted superseded SHA `38e5e5f312a1d3eaeedec9117ae1d6b46d779691`; its 543/549 unit result is historical only.
- Corrective review timestamp validation and stable historical test fixtures were committed in `2b4b1edf6b19c5c3e058f2aca1bb0ced8cd569df` and `d9073d51155de384be18e660c03923b0b0f424d0`.
- Intermediate commit `f718499241fd905a12688498373a467cd3538ce1` had run [44942456757](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44942456757) cancelled; it is not the branch head and is not acceptance evidence.
- Current-head run [44944625272](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44944625272) targets `968d14256ce9a53b8e72ca5145722042619d9d4d`; only the metadata resolver is pending at latest check. No quality, unit, type, lint, build, PostgreSQL/RLS or Ollama result is claimed.
- Run [44944042121](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44944042121) targeted the superseded `d9073d5...` SHA. Its resolver log confirms the PR head had advanced and the stale event was intentionally ignored; all substantive jobs were skipped. This is not a Runner failure.
- No independent review is recorded. Keep Draft/unmerged until all exact-head gates and independent review pass.
- The PR changes shared files including README, `scripts/check-schema.mjs` and `tests/ci-trigger-policy.test.mjs`; reconcile overlap with PR #267 before any merge.

### PR #267 — shared CI acceptance baseline

- Current exact branch HEAD verified from GitHub: `6baa233e30192d5b360617d7f0079d840c78821a`.
- Previous exact-head run [44943780150](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44943780150) passed dependency install, Windows/Docker/Ollama preflight, bounded Ollama inference, migration/schema guards and both dependency audits, then failed the CI trigger/Runner policy test. Unit tests, typecheck, lint, production build and database/RLS were skipped after that failure.
- Root cause identified by checking the exact tested tree: `package-lock.json` still advertised root/package version `0.3.121` while `VERSION`, `package.json`, manifest and README were `0.3.124`. The CI policy test explicitly checks lockfile version parity.
- Corrective commit `6baa233e30192d5b360617d7f0079d840c78821a` changes only the two package-lock root version fields to `0.3.124`; dependency graph and resolved package entries are unchanged.
- New exact-head Actions run [44944336578](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44944336578) targets corrected SHA `6baa233e30192d5b360617d7f0079d840c78821a`; it remains pending and latest jobs query returned no jobs. No acceptance is claimed for the corrected SHA.
- No independent review is recorded. Keep Draft/unmerged.
- #259 and #267 both touch README, schema guard and CI policy test. Do not merge them sequentially as-is. Reconcile overlapping files and rerun every required gate against the final exact SHA.

### PR #266 — K handoff refresh candidate

- Branch `docs/reconcile-fg-mainline-acceptance-20261122`, head `a571b33c43b0f5654401885cc98e1185d2be2149`.
- Compared with current main: diverged, 2 commits ahead and 83 behind. Do not merge this stale branch wholesale.
- Its exact-head run [44926244085](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44926244085) had resolver success but all substantive jobs skipped. Vercel quota failure remains. This is not acceptance evidence.
- This handoff refresh is based on current main and current exact-head observations; selectively port documentation only if needed.

## 4. Acceptance rules and operating safety

- Refresh main SHA, PR head/base SHAs, Actions run IDs/attempts/jobs, reviews and deployment statuses before acting.
- A green result on an old head is stale. A resolver pass does not mean tests passed.
- Distinguish pending, skipped, cancelled, failed and successful. Missing job records do not prove Runner offline.
- Require full exact-head Windows tests, type check, lint, security audits, production build, PostgreSQL/migrations/pgTAP/RLS, Ollama/local execution, candidate outcome persistence, required external checks and independent review as applicable.
- Never weaken or skip tests to obtain a green result.
- Do not edit machine-managed Factory state Issues, reset leases/quarantine/cooldowns, dispatch duplicate tasks, or change production settings to make a run appear healthy.
- Do not change secrets, production data, migrations, permissions, branch protection, Runner configuration or production deployment settings without explicit separate authorization.
- No merge or deployment is implied by this document.

## 5. B-line handoff plan

Only after A is fully accepted and integrated into main:

1. Rebase/rebuild B candidate from the resulting accepted main SHA; do not wholesale merge stale/diverged branches.
2. Map stable A contracts and evidence interfaces needed by B; keep Factory state mutation and privileged Runner authority private to A.
3. Selectively port B/product and necessary governance work, reconciling README, package lock, manifests and release metadata.
4. Run exact-head unit/type/lint/audit/build/database/RLS and applicable integration checks, then current-SHA Preview and rendered-device acceptance.
5. Require independent review before merge. Product monetization, public registration, live AI spend and payouts retain separate security, privacy, legal and cost gates.

## 6. Next execution order

1. **A first:** monitor #259 current-head run `44944625272` for SHA `968d14256ce9a53b8e72ca5145722042619d9d4d`; earlier run `44944042121` was correctly ignored as stale after the PR head advanced.
2. **Shared baseline:** monitor #267 corrected-head run `44944336578` for SHA `6baa233e30192d5b360617d7f0079d840c78821a`; jobs have not appeared yet. Reconcile shared files with #259 before any merge.
3. **K support:** keep this handoff synchronized with verified main/PR state; this docs branch currently has 10 commits and remains Draft. Latest docs-head run [44944676236](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44944676236) is pending at metadata resolution.
4. **F–P:** address only demonstrated blockers to A acceptance or B contracts.
5. **B preparation:** prepare a selective-port contract map without activating B as the development priority. B must consume only versioned, explicitly exposed A interfaces; no direct Factory DB/state/lease/Runner access.

**Factory-first charter remains:** stabilize Agent Factory V2, then enable GCAN Product to create revenue, then expand the global AI ecosystem.
