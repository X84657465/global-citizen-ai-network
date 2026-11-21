# Agent Handoff — GCAN / Agent Factory V2

> Single source of truth for the next development session. Refresh after each development round. Record only verified GitHub state; never infer green CI, Runner availability, successful task execution, merge, or deployment.

**Last verified:** 2026-11-22 (Taiwan time)  
**Repository:** `X84657465/global-citizen-ai-network`  
**Default branch:** `main`  
**Main HEAD:** `4d3653b3da766ae3910aeef39bd840d2e6de30dd`

## 1. Highest-level strategy

1. **A — Agent Factory V2 first:** stabilize task intake, candidate trust, isolated execution, exact-head CI evidence, durable state, recovery, queue behavior and operations.
2. **B — GCAN Product second:** accept only mature A capabilities through stable, versioned contracts and evidence. B must not consume privileged Factory state mutation or treat Draft PR execution as product capability.
3. **F–P — integration support only:** repair concrete A/B handoff blockers; do not expand parallel infrastructure without a demonstrated dependency.
4. **Global ecosystem later:** production AI spend, payouts, federation and autonomous production remediation require separate security, cost, legal and release gates.

CI success permits review; it does not itself authorize merge, deployment, secret changes or production-data access.

## 2. Verified repository state

### Main and Actions

- Main HEAD is `4d3653b3da766ae3910aeef39bd840d2e6de30dd`.
- Main CI run [#44928069201](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44928069201) remains pending with no jobs assigned at last inspection.
- Main health recovery runs, including [#44928736338](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44928736338), remain pending with no job assignment observed.
- The new clean-base PR CI runs below are pending. Resolver jobs are visible but have no assigned Runner; none has completed the Windows quality/build, Supabase/PostgreSQL/RLS or Ollama jobs.
- An empty job list or a pending job with no runner name is queue/dispatch evidence only. It does not prove the Runner is offline, nor does it indicate a code test failure.
- Recent Vercel statuses have reported `Deployment rate limited — retry in 24 hours`. This blocks Preview evidence; it is not a Production failure and does not prove a Preview build.
- Do not manually edit the machine-managed Factory state Issue, dispatch duplicates to bypass leases/cooldowns/quarantine, or infer completion from partial workflow results.

### Active Draft PRs — all based directly on current main

| PR | Scope | Exact head SHA | CI run | Status |
|---|---|---|---|---|
| [#239](https://github.com/X84657465/global-citizen-ai-network/pull/239) | A: candidate start/outcome exact-head verification; all five required health jobs verified on the exact run attempt/SHA | `7a88e5cfb81c0adecc1367cb3d621c80f0538d0a` | [#44928656953](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44928656953) | Pending; resolver has no Runner assignment |
| [#240](https://github.com/X84657465/global-citizen-ai-network/pull/240) | A: move recovery concurrency to guarded job; queue only trusted AI-task branch events | `838a1c0d098bbb2d064a631d9090d4b0f7e456ab` | [#44928746415](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44928746415) | Pending; resolver has no Runner assignment |
| [#241](https://github.com/X84657465/global-citizen-ai-network/pull/241) | Account build repair: CSS module in Server Component | `83751b25c237542c2bdfe8f8b12352e9f5ebdd4c` | [#44928823906](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44928823906) | Pending; resolver has no Runner assignment |
| [#242](https://github.com/X84657465/global-citizen-ai-network/pull/242) | H: paired request/response correlation context at middleware edge | `a90cd0c979da561f1d5e0ca9548e7c7607755b73` | [#44928924642](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44928924642) | Pending; resolver has no Runner assignment |
| [#243](https://github.com/X84657465/global-citizen-ai-network/pull/243) | A: move read-only candidate metadata resolution to hosted Linux; reserve Windows for machine-dependent work | `37dc23f68cce0435ed2ad4a58fceb35126b416aa` | See live CI | Draft; validate hosted resolver before merge |
| [#238](https://github.com/X84657465/global-citizen-ai-network/pull/238) | K: current-main Factory handoff and operating runbook | See live PR head | Check live CI; the handoff does not self-certify its own CI |

All five PRs are Draft/open/unmerged. No exact-head CI acceptance or human review approval is recorded. Check each PR's live head and status before acting; this handoff snapshot does not self-certify its own CI.

### Superseded PRs closed without merge

- #231 → superseded by clean-base A implementation #239.
- #235 → superseded by clean-base queue correction #240.
- #234 → superseded by clean-base account build repair #241.
- #233 → superseded by clean-base H correlation implementation #242.
- #236 → duplicate recovery-job verification superseded by the stronger attempt-specific implementation in #239.
- #237 → stale-base documentation attempt superseded by #238.

The replacements were created from current main `4d3653b3...`; do not reopen the stale branches or merge their old commit histories.

## 3. A — Agent Factory V2 acceptance boundary

### Candidate trust and durable outcomes — PR #239

- Candidate start must re-fetch the current GitHub PR and require it to remain open, same-repository, based on main, authored by the trusted repository owner or GitHub Actions bot, carry the exact AI Task Issue marker, and match the supplied branch and HEAD SHA.
- Candidate success/failure must re-fetch the PR again immediately before durable state mutation. A moved SHA/branch, closed PR, wrong author/repository/base, missing marker, or unavailable GitHub verification fails closed.
- The health recovery path requires exactly one instance of each critical job:
  - `Resolve exact candidate PR metadata`
  - `Windows Runner quality gates — tests, types, lint, audit and production build`
  - `Windows Ollama and local execution integration`
  - `Windows Supabase migrations, PostgreSQL and RLS integration`
  - `Persist candidate success or reset system breaker`
- Every required job must be completed successfully on the same run ID, run attempt and candidate SHA. Missing, duplicated, skipped, failed, wrong-attempt or wrong-SHA jobs must not clear the breaker.
- The implementation uses the attempt-specific GitHub Jobs endpoint and checks that the current PR is still open on the exact candidate SHA.
- These protections are present in PR #239 but are not accepted until exact-head Windows CI and review pass.

### Resolver queue separation — PR #243

- On current main, `resolve-candidate` is a metadata-only job with repository contents/issues/pull-requests read permissions, but it still runs on the Windows self-hosted Runner and reserves the shared state-writer concurrency group.
- PR #243 proposes moving only this read-only Node resolver to `ubuntu-latest`, explicitly using Bash for the resolver step and removing its Windows concurrency reservation.
- Candidate PR/HEAD/ref/AI Task Issue validation and Factory state Issue read remain in the resolver. Its outputs still gate every machine-dependent Windows job.
- All quality, Ollama/local execution, database/RLS, candidate outcome persistence, breaker recovery and diagnostics jobs remain on the Windows self-hosted Runner with the shared serialized queue.
- This is a Draft proposal until exact-head policy tests and real hosted resolver runs pass. Hosted runner availability and billing must be confirmed from the actual run; do not assume the job started merely because the workflow was created.

### Recovery queue scope — PR #240

- Current main's `.github/workflows/agent-factory-system-health.yml` still places concurrency at workflow scope. This reserves the shared Windows queue before job-level `if` conditions can skip cancelled, failed or unrelated PR workflow_run events. The prior handoff incorrectly described this as already job-scoped; this correction supersedes that statement.
- PR #240 moves the same concurrency group under `jobs.reset-system-breaker`, after the job's eligibility conditions, while preserving `cancel-in-progress: false`, `queue: max`, Windows self-hosted execution, permissions and trusted-main checkout.
- The workflow additionally limits queue eligibility to successful same-repository pull_request runs whose branch begins `ai-task/issue-`.
- The branch naming contract was verified in `scripts/publish-agent-patch.mjs`: `ai-task/issue-${issueNumber}-${digest}`, where digest is 12 lowercase hex characters. The controller separately validates exact issue/branch/PR metadata.
- The shared state writer remains serialized. Do not remove the concurrency group or move state mutation to an untrusted runner.
- Existing queued runs are not retroactively changed by merging this fix. Validate new post-merge workflow_run behavior.

### Operational evidence

- A prior run [#44926059712](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44926059712) reported workflow conclusion `success` while quality, database/RLS, Ollama and candidate-success persistence jobs were skipped. This demonstrates why workflow-level conclusion alone cannot clear the breaker.
- A configured cron or workflow trigger is not proof that the Runner executed it. Inspect run, attempt, job assignment, runner, steps and final conclusion.
- The shared Windows state writer must remain serialized with every other durable-state writer.
- Do not claim the Runner is offline based only on empty job records. Do not claim a successful task from resolver-only or skipped downstream jobs.

## 4. B — Product handoff

- The factory page identifies PR #212 as the merged B workspace-metadata baseline.
- Product scope remains staged: account/profile/roles, AI workspace, saved projects/history, server-side provider adapters, quotas/spend caps/audit, contribution review and an auditable reward ledger.
- The production-readiness record identifies the AI provider as `mock`. Public registration and production AI activation remain gated by provider credentials, spend limits, billing verification, privacy/terms/support/retention/deletion/abuse controls and authenticated end-to-end tests.
- B may consume stable Factory APIs, versioned candidate evidence and accepted contracts only after A's exact-SHA acceptance.
- No cash payouts, public distributed-compute nodes or production AI spend until their separate legal, security, cost and operational gates pass.

## 5. F–P maturity and boundaries

The F–P registry is isolated under `lib/fp/`; A–E remain protected owners. The host adapter is an in-process registration/invocation boundary, not a new identity provider, queue, database or production integration.

| Line | Current capability | Remaining boundary |
|---|---|---|
| F — Security | Security assurance evaluator and RLS/security evidence catalogue | Bind controls to current exact-head CI/database evidence; advisory only |
| G — Release quality | Exact-head CI evaluator and F–G shared-run assessment | Validate live run/job evidence and rollback/compatibility proof; never grants merge/deploy |
| H — Observability | Correlation helper/middleware and bounded process-local outcome recorder; PR #242 | Prove end-to-end correlation on actual routes/jobs; no durable distributed telemetry sink yet |
| I — Integrations | Bounded capability registration and host-approval check | One approved adapter at a time; no live credential/external write without explicit approval and retry/idempotency contract |
| J — Resilience | Advisory diagnosis and repair-proposal contract | Dry-run and operator-confirmed remediation only; no autonomous production repair |
| K — Knowledge | Architecture, runbooks, ledger and handoff; PR #238 | Keep records current and evidence-linked |
| L — Federation | Contract placeholder | Deferred; no node registration or distributed execution |
| M — Compliance/risk | Control and risk evidence types | Engineering evidence only; no legal/compliance certification claim |
| N — Analytics/growth | Privacy-minimized event concepts | No user-level analytics collection pipeline enabled |
| O — Lifecycle | Version/deprecation evidence contract | Recommendations only; no automatic retirement |
| P — Governance/trust | Ownership, approval and evidence requirements | Advisory until executable policy enforcement is separately tested |

F–P `ready-for-review` is not acceptance, merge authorization or deployment authorization.

## 6. Current execution order

1. **A0:** validate #243 hosted read-only resolver on ordinary trusted PR and AI Task PR; confirm its outputs and read-only permission boundary.
2. **A1:** get #239 exact-head Windows CI running; inspect all five required jobs, their steps, run ID, attempt and SHA.
3. **A2:** validate #240 queue behavior on a newly triggered eligible and ineligible workflow_run event after merge; preserve serialized state writes.
4. **A3:** after A's exact-head acceptance, review #241 build repair and #242 H correlation contract on their exact heads.
5. **B integration:** bind B to accepted Factory contracts and usage/cost evidence; do not import Factory state mutation.
6. **K:** keep this handoff and the operations runbook aligned with verified GitHub evidence.

## 7. Verification rules

- Refresh main SHA, open PR heads, PR base SHAs, Actions run IDs/attempts/jobs, review threads and deployment statuses before acting.
- Compare every active PR against current main. A green result on an old head is stale; `mergeable` does not mean tests passed.
- Distinguish pending/no-job-assignment, skipped, cancelled, failed and successful.
- Never infer Runner online/offline from missing job records.
- Never claim Preview/Production deployment from a rate-limit status.
- Do not merge Draft PRs or bypass required checks. Merge only after exact-head acceptance, human review and safety gates.
- Do not change secrets, production data, migrations, permissions, branch protection or production deployment settings without separate authorization.
