# Agent Handoff — GCAN / Agent Factory V2

> Single source of truth for the next development session. Refresh this file after every development round, PR update, scheduler change, or Runner change. Record only verified GitHub state; never infer green CI, an online Runner, successful task execution, merge, or deployment.

**Last verified:** 2026-11-22 (Taiwan time)  
**Repository:** `X84657465/global-citizen-ai-network`  
**Default branch:** `main`  
**Current main commit:** `0cdec289fb967e478ca871212af318d1c5c233d7`

## 1. Highest-level execution strategy

1. **A — Agent Factory V2 first:** stabilize candidate selection, exact-head evidence, isolated execution, durable state, recovery, queue behavior, and observable operations.
2. **B — GCAN Product second:** accept only capabilities and delivery contracts that have passed A's exact-SHA acceptance gates. B must not treat a Draft PR, skipped CI job, preview quota failure, or advisory F–P assessment as accepted functionality.
3. **F–P — integration support only:** repair concrete handoff blockers; do not build parallel infrastructure or expand workstreams without a dependency on A stability or B integration.
4. **Public product / global ecosystem later:** no production activation, paid AI, payouts, federation, or autonomous production remediation without their own controls and explicit release approval.

No automatic merge or production deployment is authorized by CI success alone. Exact-head CI permits review; it does not grant merge, deployment, secrets, or production-data authority.

## 2. Verified live repository state

### Main and Actions

- Main HEAD: `0cdec289fb967e478ca871212af318d1c5c233d7`.
- Latest main CI run observed: [#44927985312](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44927985312), exact SHA above, conclusion **cancelled**, with no jobs returned. This is not a pass or code failure.
- Several older `Agent Factory System Health Recovery` workflow_run events remain pending; recent events #44927990475 and #44927991471 completed as **skipped**.
- PR CI runs listed below are still pending. Some have no jobs assigned; #236 has only `Resolve exact candidate PR metadata` pending. No exact-head Windows quality/database/Ollama run has been verified green for these candidates.
- Do not infer Runner online/offline from an empty jobs list. It means no job assignment is visible for that run.
- Vercel has reported `Deployment rate limited — retry in 24 hours` on recent PR statuses. This is a Preview/deployment quota blocker, not a substitute for GitHub CI evidence. Do not claim a Preview build or Production deployment from that status.

### Active Draft PRs

| PR | Scope | Exact head SHA | Latest CI evidence | Integration note |
|---|---|---|---|---|
| [#231](https://github.com/X84657465/global-citizen-ai-network/pull/231) | A: candidate outcome and health recovery exact-head verification | `33d772a72505cdcc40c320363b74329b3b28858b` | Run #44927531225 pending; jobs empty | A-critical. Touches `lib/agent-factory-controller.mjs` and its tests. |
| [#233](https://github.com/X84657465/global-citizen-ai-network/pull/233) | H: request/response correlation context and integration ledger | `f409b829bbe9a57051261da88e75f751fbc275cc` | Run #44926765076 pending; jobs empty | Necessary H handoff, but not a release gate by itself. |
| [#234](https://github.com/X84657465/global-citizen-ai-network/pull/234) | Account Server Component CSS module build fix | `ded0087abee322586b886d735c3e05717b8832d6` | Run #44927536106 pending; resolver job pending | Narrow build repair; validate exact-head Windows quality/build before merge. |
| [#235](https://github.com/X84657465/global-citizen-ai-network/pull/235) | A: scope health-recovery concurrency to eligible job and restrict it to trusted AI-task PR branches | `c0014d6a1267cf0569fb110c87288a3317597731` | Run #44927965451 pending; jobs empty | Main already has job-level concurrency. This PR additionally adds `ai-task/issue-` branch filtering so ordinary PRs do not consume the state-writer queue. Keep serialized state writes. |
| [#236](https://github.com/X84657465/global-citizen-ai-network/pull/236) | A: require all critical exact-run CI jobs before system-breaker recovery | `9ecf758dcb5314c5405ca50fcfc6838440d2c92a` | Run #44927962267 pending; resolver job pending | Overlaps #231 in controller/tests; based on older main and is 2 commits behind current main. Integrate/rebase only after reviewing #231 to avoid losing its exact-head safeguards. |

No submitted reviews or inline review threads were present on PRs #231, #233, #234, #235, or #236 at the last check. All remain Draft/open/unmerged.

### Important mainline correction

Main commit `0cdec289` is titled `revert: restore main CI policy tests pending PR review`. Its change is limited to `tests/ci-trigger-policy.test.mjs`: it restores the test expectations for job-level queue scoping while removing the PR #235-specific AI-task branch filter expectation. The main workflow itself already places concurrency under `jobs.reset-system-breaker`, not at workflow scope. Therefore PR #235's remaining functional delta is the AI-task branch filter, not the job-level concurrency move alone.

## 3. A — Agent Factory V2 operating constraints

- CI workflow critical jobs currently include:
  - `Resolve exact candidate PR metadata`
  - `Windows Runner quality gates — tests, types, lint, audit and production build`
  - `Windows Supabase migrations, PostgreSQL and RLS integration`
  - `Windows Ollama and local execution integration`
  - `Persist candidate success or reset system breaker`
- A completed workflow with conclusion `success` is not sufficient if required jobs were skipped, missing, duplicated, failed, or executed against another run/attempt/SHA.
- A real run #44926059712 at SHA `67daff6e07ab65f440410eea877021827b6c1971` reported workflow conclusion `success` while the quality, database/RLS, Ollama, and candidate-success persistence jobs were all `skipped`. This exposed the need for per-job recovery evidence.
- PR #236 implements fail-closed verification of all five critical jobs against the same run ID, attempt, and HEAD SHA, and requires the current PR to remain open on that SHA. Its regression test asserts a skipped required job cannot clear the breaker or mutate durable state. This remains unverified until exact-head CI runs.
- The shared Windows state-writer queue must remain serialized. Do not move state mutation to an untrusted runner, remove concurrency, or bypass durable leases/cooldowns/quarantine.
- Do not manually edit the machine-managed factory state Issue, dispatch duplicate tasks to clear a queue, or claim a task completed from partial checks.

## 4. B — Product handoff boundary

- The factory page identifies PR #212 as the merged B workspace-metadata baseline.
- Product scope remains a staged MVP: account/profile/roles, AI workspace, saved projects/history, server-side provider adapters, quotas/spend caps/audit, contribution review and an auditable reward ledger.
- The production-readiness record says the AI provider is still `mock`; public registration and production AI activation remain gated by provider credentials, spend limits, billing verification, privacy/terms/support/retention/deletion/abuse controls and authenticated end-to-end tests.
- B may consume stable factory APIs, versioned evidence, and accepted contracts; it must not import privileged Factory state mutation or treat candidate PR execution as product functionality.
- No cash payouts, public distributed-compute nodes, or production AI spend until their separate legal, security, cost, and operational gates are met.

## 5. F–P maturity and boundary

The F–P registry is isolated under `lib/fp/`; A–E remain protected owners. The host adapter is an in-process registration/invocation boundary, not a new identity provider, queue, database, or production integration.

| Line | Current capability | Remaining boundary |
|---|---|---|
| F — Security | Security assurance evaluator and RLS/security evidence catalogue | Bind every control to current exact-head CI/database evidence; advisory only |
| G — Release quality | Exact-head CI evaluator and F–G shared-run assessment | Validate live run/job evidence and rollback/compatibility proof; never grants merge/deploy |
| H — Observability | Correlation helper/middleware and bounded process-local outcome recorder | Prove end-to-end correlation on actual routes/jobs; no durable distributed telemetry sink yet; PR #233 pending |
| I — Integrations | Bounded capability registration and host-approval check | One approved adapter at a time; no live credential or external write without explicit approval and retry/idempotency contract |
| J — Resilience | Advisory diagnosis and repair-proposal contract | Dry-run and operator-confirmed remediation only; no autonomous production repair |
| K — Knowledge | Architecture, runbooks, ledger and handoff | Keep records current and evidence-linked |
| L — Federation | Contract placeholder | Deferred; no node registration or distributed execution |
| M — Compliance/risk | Control and risk evidence types | Engineering evidence only; no legal/compliance certification claim |
| N — Analytics/growth | Privacy-minimized event concepts | No user-level analytics collection pipeline enabled |
| O — Lifecycle | Version/deprecation evidence contract | Recommendations only; no automatic retirement |
| P — Governance/trust | Ownership, approval and evidence requirements | Advisory until executable policy enforcement is separately tested |

The F–P hosting contract explicitly keeps A–E runtime ownership unchanged. F–P `ready-for-review` is not acceptance, merge authorization, or deployment authorization.

## 6. Current development order

1. **A1:** get exact-head Windows CI to execute for #231/#235/#236; inspect actual job assignments, all steps, and exact SHA. Resolve queue starvation without weakening state-writer serialization.
2. **A2:** review #231 and #236 together because both touch the Factory controller and tests. Preserve candidate start/outcome exact-head checks and per-job health recovery checks in one coherent final diff.
3. **A3:** verify #235's AI-task branch restriction against the real task branch naming contract and workflow event shape; keep the default branch's current job-level concurrency behavior.
4. **A4:** accept only green exact-head Windows quality, database/RLS and Ollama gates; verify the recovery workflow itself uses trusted mainline controller code and cannot clear the breaker from skipped jobs.
5. **Build handoff:** review #234 as a separate narrow build repair after CI capacity returns.
6. **H handoff:** review #233's middleware/header changes and correlation tests; ensure Supabase Session Refresh and unrelated response headers remain intact.
7. **B integration:** only after A acceptance, bind B to stable capability contracts and usage/cost evidence. Do not expand F–P beyond actual integration blockers.
8. **K handoff:** refresh this file after each state-changing round and keep version/acceptance ledgers aligned.

## 7. Verification rules

- Always refresh main SHA, open PR heads, PR base SHAs, Actions run IDs/attempts, job states, review threads, and deployment statuses before acting.
- Compare every active PR against the latest main. A green result on an old head is stale; a mergeable flag does not mean tests passed.
- Distinguish pending/no-job-assignment, skipped, cancelled, failed, and successful.
- Never infer Runner online/offline from missing job records.
- Never claim Preview/Production deployment from a rate-limit status.
- Do not merge Draft PRs or bypass required checks. Merge only after exact-head acceptance, review, and safety gates are satisfied.
- Do not change secrets, production data, migrations, permissions, branch protection, or production deployment settings without separate authorization.
