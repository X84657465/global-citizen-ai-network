# Agent Factory V2 — F0 Capability Inventory & Bottleneck Audit

**Snapshot date:** 2026-11-23 (UTC)  
**Inspected baseline:** `main` at `4225a244407f7a323262c4d6e17b2749193d6476`  
**Purpose:** Evidence-led F0 inventory of the existing Factory path and its current delivery bottlenecks.  
**Status:** OBSERVATION / NOT an acceptance, authorization, or deployment document.

## 1. Executive finding

The repository contains a substantial, connected Agent Factory V2 implementation: scheduled task intake, durable task state, lease and retry controls, bounded planning/patching, scratch validation, deterministic candidate publication, exact-head CI evidence, and a separate system-health recovery workflow.

The principal observed constraint is not an absence of workflow/code. It is the reliability of the end-to-end operating path and its evidence:

1. The latest inspected mainline AI Agent Task Preflight run, `45177079906`, failed at **Validate task and create a safe handoff bundle**. Planning, Ollama plan generation, patching, scratch tests, publishing, and Windows validation were skipped. The job log endpoint was unavailable during this audit, so the root cause is UNKNOWN.
2. A PR-triggered Linux offline scratch fixture run, `45171686357`, failed. Its downstream planning/publishing and Windows validation jobs were skipped. The available job record does not expose the failing assertion; root cause is UNKNOWN.
3. The Agent Factory System Health Recovery workflow has repeated FAILURE and SKIPPED outcomes on main SHA `4225a244...`. The latest observed run `45182606270` was SKIPPED. Two inspected failures (`45179448776`, `45178373545`) failed in the step **Verify completed CI provenance and reset global breaker**. Job logs were unavailable; the precise failing predicate is UNKNOWN.
4. Mainline commit status contains a Vercel FAILURE: `Deployment rate limited — retry in 24 hours`. This is an external deployment-provider limit, not evidence that application build or tests failed.
5. PR #475 has successful exact-head CI on `8f7a922e2c2b97b6d390b52015b76da202204b7c`, is no longer Draft, and is 2 commits ahead / 0 behind main; however, it has **zero review submissions**. It is not independently accepted and must not be self-approved.

No merge, deployment, state mutation, lease override, breaker reset, or permission change is performed by this inventory.

## 2. Existing capability inventory

| Capability | Existing implementation / evidence | Observed state | Gap / qualification |
|---|---|---|---|
| Task intake and schedule | `.github/workflows/agent-task-preflight.yml`; Issue opened/reopened, repository_dispatch, workflow_dispatch, cron `3-59/5 * * * *` | IMPLEMENTED in source | Configured triggers do not prove a live run or available Runner. |
| Task selection | `scripts/select-agent-task.mjs`; `lib/agent-task-queue.mjs`; dependency resolution, owner/planner marker, open/merged task PR checks | IMPLEMENTED in source | Current mainline preflight failed before planning; live queue throughput is BLOCKED/UNKNOWN. |
| Durable task state | `lib/agent-factory-state-store.mjs`; machine-managed state Issue; schema v2 | IMPLEMENTED in source | Current durable state contents, version and capacity were not read in this audit; runtime health UNKNOWN. |
| Task state machine | `lib/agent-factory-state-machine.mjs`; queued/reserved/preparing/planning/patching/sandbox_testing/publishing/draft_pr_created/awaiting_ci/completed plus retry/quarantine states | IMPLEMENTED in source | Runtime transition health needs fresh end-to-end evidence. |
| Lease and retry controls | `lib/agent-factory-state-machine.mjs`; default lease 90 min, task/system failure thresholds 3, system cooldown 15 min | IMPLEMENTED in source | No lease was manually changed; active lease state UNKNOWN. |
| Provider cooldown | `lib/agent-factory-policy.mjs`, `lib/agent-factory-api-cooldown.mjs`; provider cooldown bounded to 24 h | IMPLEMENTED in source | Current persisted provider deadline not read; Vercel deployment rate limit is a separate provider status. |
| Plan and patch generation | Preflight workflow jobs; `scripts/generate-agent-plan.mjs`, `scripts/generate-agent-patch.mjs` | IMPLEMENTED in source | Mainline run `45177079906` skipped these stages after handoff-bundle validation failed. |
| Scratch isolation and tests | `scripts/apply-agent-patch-to-scratch.mjs`; restricted container path; Linux offline fixture job in preflight workflow | PARTIAL / BLOCKED | PR run `45171686357` Linux fixture job FAILURE; actual assertion/log unavailable. |
| Candidate publication | `scripts/publish-agent-patch.mjs`; `lib/agent-publisher-branch.mjs`; deterministic branch validates exact tree and base commit | IMPLEMENTED in source | No new publication succeeded in the inspected mainline preflight run. |
| Candidate metadata/evidence | `scripts/resolve-agent-task-pr.mjs`; `lib/agent-factory-evidence.mjs`; exact SHA, PR number, CI run ID/attempt and terminal conclusion | IMPLEMENTED in source | System-health verifier is failing; provenance path requires root-cause diagnosis. |
| Quality / integration CI | `.github/workflows/ci.yml`; Windows quality, Ollama integration, isolated Supabase/PostgreSQL/RLS integration | IMPLEMENTED in source | CI uses one serialized Windows self-hosted execution lane; pending/queued runs do not prove capacity. |
| System breaker recovery | `.github/workflows/agent-factory-system-health.yml`; post-CI provenance-gated recovery on trusted main | IMPLEMENTED, runtime BLOCKED | Repeated recovery failures/skips; do not bypass the gate. |
| Operator quarantine recovery | `.github/workflows/agent-factory-operator-recovery.yml`; explicit workflow_dispatch, environment guard, exact state version, evidence URL and confirmation | IMPLEMENTED in source | Deliberately requires owner-controlled environment approval; not invoked. |
| Runner smoke test | `.github/workflows/self-hosted-runner-smoke.yml` | IMPLEMENTED in source | No fresh successful smoke result was established in this audit. |
| Independent review | Repository policy in `PROJECT_COORDINATION.md` and runbooks; PR review API | REQUIRED, not evidenced on #475 | #475 has zero review submissions; no self-approval. |

## 3. Runtime evidence observed in this snapshot

### Mainline

- Main HEAD: `4225a244407f7a323262c4d6e17b2749193d6476`.
- Branch protection API field: `protected=false`. This audit did not change repository protection settings.
- Combined commit status: Vercel `failure`, description `Deployment rate limited — retry in 24 hours.`
- Main CI run `45166790416`: `completed / failure`.
- AI Agent Task Preflight run `45177079906`: `completed / failure`; failed job `Validate task and generate a read-only AI plan`; failed step `Validate task and create a safe handoff bundle`; downstream steps/jobs SKIPPED.
- System Health Recovery run `45182606270`: `completed / skipped`.
- System Health Recovery runs `45179448776` and `45178373545`: `completed / failure`; failed step `Verify completed CI provenance and reset global breaker`.

### Pull requests

- 11 open PRs were observed.
- PR #475: HEAD `8f7a922e2c2b97b6d390b52015b76da202204b7c`; exact-head CI run `45174503526` SUCCESS; comparison to current main: 2 commits ahead, 0 behind, one file `docs/ai-agent-scheduler-operations.md`; review submissions: 0; Draft: false.
- PR #476: governance acceptance run `45180036135` FAILURE; exact-head general CI run `45180036170` PENDING at inspection.
- PR #472: preflight run `45171686357` FAILURE at Linux offline scratch fixture; exact-head CI run `45171686278` PENDING at inspection.
- PRs #478, #477, #474 and #473 had exact-head CI runs PENDING or IN_PROGRESS at inspection.
- PRs #417, #376, #373 and #259 target stale base SHAs and GitHub reported `mergeable=false / dirty`; do not bulk-rebase or merge without owner-scoped conflict review.

## 4. Cross-document consistency finding

The mainline workflow currently defines the preflight cron as `3-59/5 * * * *` in `.github/workflows/agent-task-preflight.yml`. The mainline `docs/ai-agent-scheduler-operations.md` also records that exact expression. However, `docs/agent-factory-operations-runbook.md` describes the scheduler as `*/5 * * * *`. These were not identical schedules. The runbook wording has now been corrected in this candidate branch to match the executable workflow expression and explicitly document its minute offsets. This is a documentation-only consistency repair; the workflow schedule itself was not changed.

## 5. Prioritized bottleneck queue

| Priority | Work item | Evidence / completion condition | Disposition |
|---|---|---|---|
| P0 | Diagnose handoff-bundle validation failure | Reproduce/inspect run `45177079906`; obtain real failing step output; classify task vs system failure; add a regression test if code defect | BLOCKED: job logs unavailable in this audit; do not guess root cause. |
| P0 | Restore observable Linux fixture validation | Re-run only after understanding failure in `45171686357`; require a terminal Linux job with test summary/artifact for exact candidate SHA | BLOCKED: failing assertion not exposed in available job record. |
| P0 | Repair system-health provenance verification | Inspect failed recovery run's exact source CI run, PR association, head/base refs, attempt and workflow path; fix only a proven predicate/contract defect; require successful recovery run | BLOCKED: job log unavailable; no manual breaker reset. |
| P0 | Establish current Runner availability | Obtain a fresh smoke/CI job with assigned runner and completed steps; distinguish queue wait, zero-job pending, and actual execution | UNKNOWN: no fresh successful smoke evidence established. |
| P1 | Reconcile scheduler documentation | Align `docs/agent-factory-operations-runbook.md` with executable cron `3-59/5 * * * *` after owner confirmation | Small, independent docs task; not changed in this PR. |
| P1 | Complete independent review of #475 | Independent reviewer checks the one-file diff and exact-head CI; approval must be from someone other than the author | BLOCKED: zero review submissions. |
| External | Vercel deployment rate limit | Provider says retry in 24 h; verify status after provider window, do not duplicate deploys to evade limit | BLOCKED by external quota. |

## 6. F0 disposition and next step

**F0 inventory:** DOCUMENTED in this candidate only; not yet merged or independently accepted.  
**Factory end-to-end runtime:** NOT VERIFIED.  
**Current critical path:** diagnose the preflight handoff-bundle failure and restore observable Linux fixture evidence, then repair exact-run system-health provenance using actual logs.  
**Parallel safe work:** reconcile the scheduler cron documentation and independently review PR #475.  
**Do not:** treat SKIPPED/PENDING/zero-job as PASS; repeatedly rerun without new evidence; manually clear durable state, lease, quarantine, cooldown or breaker; bypass the single Windows Runner concurrency group; claim deployment success during Vercel rate limiting.

This inventory is a time-bounded snapshot. Re-check main SHA, exact PR heads, CI run IDs/attempts, job assignments, reviews and provider status before using it for any merge or release decision.
