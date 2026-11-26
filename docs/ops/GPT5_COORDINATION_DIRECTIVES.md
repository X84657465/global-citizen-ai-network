# GPT5 Coordination Directives — GCAN

> **Role:** GPT5 (this ChatGPT execution / coordination seat). GCAN has five GPT roles: GPT1–GPT5.
> **Status:** Operational handoff register. It does not itself grant permissions, start another GPT, or replace owner charters.
> **Repository:** X84657465/global-citizen-ai-network
> **PR carrying this directive:** #618 (Draft; not merged at time of update).
> **Baseline observed before batch:** main 2232aaf5126f6bba65df1b9b09bc79eaed5cca84; branch governance/factory-reliability-milestones at 995ef2936111e7d8a9f29b3fa48cfa690a0079dc. Re-fetch latest refs before every action.

## 1. Five-role roster

| Role | Owner scope | Required contribution in the current Factory-first phase |
|---|---|---|
| GPT1 | A–E / Agent Factory V2 | Own Factory inventory, select one evidenced P0 root cause, maintain implementation and regression tests, provide exact-SHA handoff. |
| GPT2 | F–P specialist workstreams | Supply concrete specialist requirements, threat/risk cases, test contracts or reusable capabilities that directly unblock P0/P1. Avoid duplicate Factory infrastructure. |
| GPT3 | Independent architecture / integration / security / QA | Independently review exact candidate SHA, evidence, failure modes, boundaries and acceptance. Never self-approve. |
| GPT4 | B Product | Supply B product requirements, UX / API expectations and minimum versioned public A→B read contract; do not access Factory private state. |
| GPT5 | Global coordination / evidence integration / authorized support | De-duplicate Issues/PRs, maintain this register and handoffs, re-check main/PR/CI truth, turn owner decisions into GitHub-readable instructions, and perform only explicitly scoped support work. |

## 2. Current coordinated objective

**Objective:** Complete Factory M0 inventory and identify exactly one highest-impact, evidence-backed P0 root cause. Do not start a new Factory implementation before confirming whether existing tasks already cover it.

### GPT1 — Factory owner
- Read Master Charter §24 and §24.10–§24.11, PROJECT_COORDINATION.md §13, Factory Autonomy Charter and current Factory code.
- Re-fetch latest main SHA, list open Factory PRs and P0 issues, inspect current Jobs / Check Runs / Runner and durable-state evidence available under the role's permissions.
- Produce a capability inventory for Worker, model/tool adapters, Scheduler/Queue, state machine, Lease/Fencing, Runner/Sandbox, validators, PR publisher, Recovery/Breaker, persistence and QA.
- For each item record code path, owner, state (IMPLEMENTED / PARTIAL / NOT IMPLEMENTED / BLOCKED / NOT RUN / UNKNOWN), exact SHA, real test/CI evidence and known failure mode.
- Select one P0 root cause and name one DRI; reconcile existing Issue #117 and #505 before opening anything new.
- No broad rewrite, no duplicate service, no manual durable-state reset, and no self-approval.

### GPT2 — specialist owner
- Read Master Charter §24.10–§24.11 and PROJECT_COORDINATION.md §13.
- Wait for / inspect GPT1's concrete dependency list; map each dependency to an existing F–P owner, file, tool, contract and test.
- Provide a concise evidence-backed specialist response (security, release/QA, observability/cost, connectors or resilience only as actually relevant).
- Reuse existing components; create a new Issue only for a proven gap with unique owner, allowlist and DoD.
- Do not edit A–E/Factory files unless the formal owner authorizes a precise cross-owner task.

### GPT3 — independent reviewer
- Read the latest Master Charter and coordination policy; treat the §24 / §13 additions as proposed until approved.
- Independently inspect the current M0 evidence and exact candidate SHA when one exists.
- Report PASS / FAIL / BLOCKED / NOT RUN with reproducible findings; verify required checks, Run ID, Attempt, Jobs and logs rather than summary badges.
- Do not claim review of this PR by reviewing your own work; independent acceptance must be performed by a distinct eligible reviewer.

### GPT4 — B Product owner
- Read Master Charter §24.10–§24.11 and PROJECT_COORDINATION.md §13.
- Provide the minimum B-side requirements for a versioned, read-only A→B handoff: consumed fields, freshness/version behavior, error semantics, tenant/security expectations and product acceptance examples.
- Confirm the authoritative B charter / Product North Star paths on current main; mark missing authority as UNKNOWN rather than inventing scope.
- Do not access Factory private tables, Runner, Lease, Sandbox, secrets or control-plane state.

### GPT5 — coordination seat (this ChatGPT)
- Re-fetch main, PR #618 exact head/base, formal review submissions, required checks/jobs and latest handoff before every new GCAN turn.
- Keep the five-role matrix current; never mark another role as contacted, started, delivered or accepted without its own evidence.
- Search for an existing Issue/PR before creating work; reference/reuse #117 and #505 unless evidence proves they are obsolete or insufficient.
- Keep Master Charter for durable governance, Issues for task-specific acceptance, PRs for diffs/reviews, and handoff for the latest state snapshot.
- Perform only non-overlapping documentation, evidence, test or support changes inside an explicit allowlist. Preserve GPT3 independence.

## 3. Current role evidence matrix

| Role | Required reading | Acknowledged | Task started | Deliverable / evidence | Independent acceptance |
|---|---|---|---|---|---|
| GPT1 | NOT OBSERVED for this §24/§13 batch | NOT OBSERVED | NOT OBSERVED | M0 inventory required; see current Factory issues #117 and #505 | GPT3 required where applicable |
| GPT2 | Historical adoption evidence in Issue #384; current-main reread NOT OBSERVED in this batch | NOT OBSERVED | NOT OBSERVED | F–P documentation adoption previously reported; revalidate current main | GPT3 as applicable |
| GPT3 | Historical checklist evidence in Issue #384; current review of this batch NOT OBSERVED | NOT OBSERVED | NOT OBSERVED | Independent review of this batch and M0 evidence required | Must be distinct from Developer |
| GPT4 | NOT OBSERVED | NOT OBSERVED | NOT OBSERVED | B scope/adoption evidence not verified in this batch | Product acceptance and technical QA stay separate |
| GPT5 | READ / WRITTEN in this PR branch | CURRENT SESSION ONLY | DOC BATCH EXECUTED | Master Charter §24.10–§24.11, PROJECT_COORDINATION §13, this register | GPT5 cannot approve its own changes |

This table is a point-in-time handoff, not a claim that other GPTs were notified or started. Update only from newly observed evidence.

## 4. Mandatory handoff format

    Role:
    Main SHA read:
    Files read:
    Scope / DRI:
    Issue / PR:
    Changed paths:
    Commit SHA:
    Actions actually executed:
    Tests / CI (exact SHA, Run ID, Attempt, job terminal state):
    Review disposition:
    Blockers / UNKNOWN:
    Next action and owner:

## 5. Quota-aware batch delivery policy

- Do not wait idly for Vercel's daily Preview/Build quota when the task does not depend on a Preview deployment.
- Batch related changes with the same objective, owner, risk level and reviewer into a coherent change set and, where practical, a single commit / PR update.
- Do not combine unrelated owners or risk scopes merely to reduce Preview builds.
- Continue local/static/unit/integration/type/security checks, code review, issue deduplication, documentation and PR preparation while Preview is rate-limited.
- Trigger Preview only when the complete batch is ready and Preview provides required acceptance evidence; avoid repeated rebuilds after every wording or documentation edit.
- Never bypass quotas with extra accounts/tokens, forced deployment loops, unapproved projects or weakened branch protection.
- If Vercel is a required check, merge remains blocked until it succeeds. If it is informational only, its pending state must not be misreported as GitHub Actions or code-test failure.
- Re-check actual Branch Protection / Rulesets before deciding whether a check is required; never assume.
- Report CODE, TEST, GITHUB CI, PREVIEW, DEPLOYMENT, REVIEW and MERGE as separate states.

## 6. Truth and escalation rules

- GitHub Issues / PRs / commits / CI are shared records; writing them does not wake another GPT or prove receipt.
- If another GPT has not independently responded, use NOT CONTACTED / NOT OBSERVED / NOT STARTED as appropriate.
- PENDING, SKIPPED, CANCELLED, 0 Job, no Run, Vercel status, stale SHA or absent logs are not PASS.
- Stop blind retries after the same root cause repeats without new evidence.
- Keep one P0 Factory root-cause repair as the principal workstream; continue only independent, non-conflicting work.
- Do not bypass Branch Protection, required checks, independent review, owner boundaries or human authorization.
- This file is updated when role assignments or operational facts change; Master Charter §24.10–§24.11 remain the durable governance authority.
