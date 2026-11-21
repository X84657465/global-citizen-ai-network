# Agent Handoff — GCAN / Agent Factory V2

> Single source of truth for the next development session. Refresh after each round. Record verified GitHub state only. A merged PR is not automatically accepted when exact-head CI or independent review is missing.

**Last verified:** 2026-11-22 (Taiwan time)  
**Repository:** `X84657465/global-citizen-ai-network`  
**Default branch:** `main`  
**Main HEAD:** `402030c327c1302efe67b4985055bf329c1e7dac`  
**Mainline release metadata:** root `0.3.120`; Agent Factory V2 `2.0.84`

## 1. Highest-level strategy and authority

1. **A — Agent Factory V2 first:** stabilize task intake, candidate trust, isolated execution, exact-head CI evidence, durable state, recovery, Runner queue behavior and operational continuity.
2. **B — GCAN Product second:** connect only to stable, versioned A contracts and accepted evidence. B must not consume privileged Factory state mutation or treat Draft PR execution as a product capability.
3. **F–P — integration support only:** repair concrete A/B handoff blockers; do not expand parallel infrastructure without a demonstrated dependency.
4. **Global ecosystem later:** production AI spend, payouts, federation and autonomous production remediation require separate security, cost, legal and release gates.

CI success permits review; it does not itself authorize merge, deployment, secret changes or production-data access. A merge with pending CI or no independent review remains **merged but not accepted**.

### A–P ownership map

| Line | Responsibility | Current boundary |
|---|---|---|
| A | Agent Factory V2 — planner, task selector, durable state/lease, Runner, sandbox, patch generation, candidate CI, recovery and publisher | Highest priority; exact-head evidence and safe state transitions are mandatory |
| B | GCAN Product — user-facing workspace, conversations/projects, account, product APIs and monetization foundations | Wait for stable A contracts; no Factory state authority |
| C | Predictive Coding | Capability support only; no authority over A/B |
| D | Deep Neural | Model/architecture capability support; no authority over A/B |
| E | Deep Research | Research capability support; no authority over A/B |
| F | Cyber Security & Defense | Security assurance and control evidence; advisory unless bound to verified controls |
| G | Release / QA / Integration | Exact-head quality and integration evaluation; never grants merge/deploy authorization |
| H | Observability / Telemetry / Cost | Correlation and bounded telemetry contracts; durable distributed sink remains outstanding |
| I | Connectors / Workflow | Approved connector contracts; no unapproved external writes or credentials |
| J | Self-Healing / Continuity | Diagnosis and repair proposals; production remediation remains operator-controlled |
| K | Knowledge / Docs / Governance | Architecture, runbooks, integration ledger and handoff accuracy |
| L | Federation / Cluster | Deferred; no distributed node registration or execution |
| M | Compliance / Policy Audit | Engineering control evidence only; no legal certification claim |
| N | Productization / Analytics / Growth | Product and privacy-minimized analytics foundations; no unapproved user tracking |
| O | Lifecycle / Deprecation | Version and deprecation recommendations; no automatic retirement |
| P | Governance / Ethics / Trust | Ownership, approval, audit and trust boundaries; policy enforcement requires separate validation |

## 2. Verified repository and merge state

### Main

- Current main HEAD: `402030c327c1302efe67b4985055bf329c1e7dac`.
- The latest inspected main Agent Factory System Health Recovery run [#44929648294](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44929648294) completed as **skipped**. Its event was a push to `main`, not a successful AI-task PR CI completion; this is an ineligible recovery event, not a passing health-recovery test.
- The current main commit check lookup exposed that skipped recovery check only. A complete mainline Windows quality/build, database/RLS and Ollama result was **not verified in this inspection**.
- Main combined status reports Vercel **failure** with the provider's `build-rate-limit` URL. This is a Preview/deployment-provider quota issue, not GitHub CI evidence.
- Do not infer Windows Runner online/offline from pending jobs or missing runner assignment. Record the actual run, attempt, job, runner and step evidence.

### Recently merged PRs — merged does not mean accepted

| PR | Scope | Exact PR head | Merge state | Acceptance evidence |
|---|---|---|---|---|
| [#238](https://github.com/X84657465/global-citizen-ai-network/pull/238) | K: handoff/runbook refresh | `5a73e644e5adab132459787ab66d064f50837fda` | Merged | No check run or independent review returned in current inspection |
| [#239](https://github.com/X84657465/global-citizen-ai-network/pull/239) | A: candidate outcome and breaker recovery bound to exact evidence | `7a88e5cfb81c0adecc1367cb3d621c80f0538d0a` | Merged | Exact-head resolver job pending; no independent review |
| [#240](https://github.com/X84657465/global-citizen-ai-network/pull/240) | A: recovery queue concurrency moved to guarded job; restrict to trusted AI-task PR events | `838a1c0d098bbb2d064a631d9090d4b0f7e456ab` | Merged | Exact-head resolver job pending; no independent review |
| [#241](https://github.com/X84657465/global-citizen-ai-network/pull/241) | Account Server Component CSS-module build repair | `83751b25c237542c2bdfe8f8b12352e9f5ebdd4c` | Merged | Exact-head resolver job pending; no independent review |

The merge commits are on main by the current HEAD. Do not backfill missing CI or review evidence. The merged A changes require post-merge exact-main validation before Factory readiness is claimed.

### Current open PR

| PR | Scope | Exact head | Current evidence | Decision |
|---|---|---|---|---|
| [#242](https://github.com/X84657465/global-citizen-ai-network/pull/242) | H: paired request/response correlation context at middleware edge | `a90cd0c979da561f1d5e0ca9548e7c7607755b73` | Resolver check [#44928924642](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44928924642) pending; no review; PR currently reports mergeable=false | Leave unmerged; H is not an A blocker |

PR #242 is the only open PR found in the current repository search. It changes 12 files across H telemetry, README/version metadata, governance and integration ledger. It is not required to unblock A; do not prioritize it ahead of Factory evidence.

### Superseded or closed without merge

- #231: stale-base candidate outcome/recovery work; superseded by #239.
- #235: stale-base recovery queue correction; superseded by #240.
- #233: stale-base H correlation work; superseded by #242.
- #234: stale-base account CSS work; superseded by #241.
- #243: hosted resolver experiment closed without merge after its resolver job failed before any step ran; cause not established. Do not claim hosted-runner capacity was validated.
- Do not reopen or merge stale branches when their clean-base replacements are already merged.

## 3. A — Agent Factory V2 current baseline

### Candidate start and outcome trust

Main's `lib/agent-factory-controller.mjs` now:
- Re-fetches the candidate PR at the durable `candidate-start` boundary.
- Requires the same open PR, same repository, `main` base, trusted author, exact candidate HEAD SHA and branch, AI Task Issue marker and issue-specific task branch.
- Fails closed if the GitHub API client is unavailable; persisted PR metadata cannot substitute for a live verification.
- Re-fetches the PR immediately before candidate success/failure persistence, rejecting moved HEADs, closed PRs and mismatched task/branch/author/repository metadata.

### System health recovery

Main's `system-health-success` controller path:
- Requires live GitHub workflow-run and current-PR verification.
- Binds run ID, run attempt, workflow path, event type, PR number, current open PR and exact SHA.
- Fetches the exact run attempt's jobs and requires exactly one successful instance of each required CI job: candidate resolver, Windows quality, Ollama/local execution, database/RLS and candidate-result persistence.
- Rejects missing, duplicate, skipped, failed, wrong-attempt or wrong-SHA evidence before resetting the global breaker.

These protections are present in main after #239, but the merged PR's exact-head resolver check was still pending in the latest inspection. Code presence is not a passing end-to-end operational test.

### Recovery Runner queue

Main's `.github/workflows/agent-factory-system-health.yml` now:
- Places the shared `global-citizen-ai-network-self-hosted-runner` concurrency group under `jobs.reset-system-breaker.concurrency`, not at workflow scope.
- Preserves `cancel-in-progress: false` and `queue: max`.
- Allows only successful same-repository `pull_request` workflow_run events from branches beginning `ai-task/issue-` to enter the recovery job queue.
- Keeps the privileged state writer on the Windows self-hosted Runner and checks out trusted `main`; it never executes PR code.

This is confirmed in current main workflow and regression test content. Existing workflow runs queued under the old configuration are not retroactively changed. Verify newly triggered eligible and ineligible events after the merge.

### Remaining A blockers

1. Obtain exact-main CI evidence after the A merges: resolver, Windows tests/types/lint/audit/production build, isolated Supabase/PostgreSQL/RLS, Ollama/local inference and candidate persistence.
2. Confirm the Windows Runner actually receives the queued jobs; inspect job assignment and runner identity rather than assuming host failure.
3. Validate recovery with a real successful AI-task PR run and a real ineligible workflow_run event; confirm the ineligible event does not occupy the shared queue.
4. Complete unattended 24-hour Runner soak and restart/reconnect rehearsal; simulated time does not count as elapsed wall-clock time.
5. Verify branch protection, required checks, Actions permissions, secrets/environment protections with repository-owner access.
6. Split task preparation, publisher and state-writer token scopes only after artifact integrity, lease recovery, idempotency, cancellation and partial-write tests exist. Do not weaken the current serialized state-writer boundary.

Do not dispatch a duplicate task, edit the machine-managed state Issue, reset leases/quarantine/cooldowns, or change production settings to make a run appear healthy.

## 4. B — Product handoff

- B remains downstream of accepted A contracts and versioned candidate evidence.
- Product scope includes account/profile/roles, AI workspace, saved projects/history, server-side provider adapters, quotas/spend caps/audit, contribution review and an auditable reward ledger.
- The production-readiness record identifies the AI provider as `mock`; public registration and production AI activation remain gated by provider credentials, spend limits, billing verification, privacy/terms/support/retention/deletion/abuse controls and authenticated end-to-end tests.
- No cash payouts, public distributed-compute nodes or production AI spend until their separate legal, security, cost and operational gates pass.

## 5. F–P integration boundaries

| Line | Current capability | Remaining boundary |
|---|---|---|
| F | Security assurance evaluator and RLS/security evidence catalogue | Bind controls to current exact-head CI/database evidence; advisory only |
| G | Exact-head CI evaluator and F–G shared-run assessment | Validate live run/job evidence and rollback/compatibility proof; never grants merge/deploy |
| H | Correlation helper/middleware and bounded process-local outcome recorder; #242 | Actual route/job end-to-end proof and durable distributed telemetry sink remain outstanding |
| I | Bounded capability registration and host-approval check | One approved adapter at a time; no live credential/external write without explicit approval |
| J | Advisory diagnosis and repair-proposal contract | Dry-run/operator-confirmed remediation only |
| K | Architecture, runbooks, integration ledger and handoff | Keep records aligned with verified main and PR state |
| L | Federation contract placeholder | Deferred; no node registration or distributed execution |
| M | Control and risk evidence types | Engineering evidence only; no legal/compliance certification claim |
| N | Privacy-minimized event concepts | No user-level analytics pipeline without approval |
| O | Version/deprecation evidence contract | Recommendations only; no automatic retirement |
| P | Ownership, approval and evidence requirements | Advisory until executable policy enforcement is separately tested |

F–P `ready-for-review` is not acceptance, merge authorization or deployment authorization.

## 6. Next execution order

1. **A1 — post-merge exact-main validation:** inspect current main CI run and exact job attempts; record SHA, run ID, attempt, runner assignment and all five required job outcomes.
2. **A2 — queue behavior:** verify a newly triggered eligible AI-task PR recovery event enters the job-level queue and an ineligible event skips without reserving it.
3. **A3 — operational continuity:** confirm Runner status, then complete restart/reconnect and 24-hour soak evidence.
4. **A4 — B handoff:** only after A evidence is accepted, map stable A contracts and evidence into B without transferring Factory state authority.
5. **K — documentation:** keep this file and `docs/agent-factory-operations-runbook.md` synchronized with exact GitHub evidence.

## 7. Verification rules

- Refresh main SHA, open PR heads/base SHAs, Actions run IDs/attempts/jobs, reviews and deployment statuses before acting.
- A green result on an old head is stale. `mergeable` does not mean tests passed.
- Distinguish pending/no-runner-assignment, skipped, cancelled, failed and successful.
- A merged PR with pending exact-head CI or no independent review is merged but not accepted.
- Never infer Runner online/offline from missing job records.
- Never claim Preview/Production deployment from a Vercel rate-limit status.
- Do not change secrets, production data, migrations, permissions, branch protection or production deployment settings without separate authorization.
