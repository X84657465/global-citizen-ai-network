# AI Factory Collaboration Charter

> Status: Binding operating policy for all AI agents working in this repository  
> Effective: Immediately upon adoption by the project controller  
> Scope: All implementation, testing, security, review, CI, release, and documentation work performed by the five collaborating GPT agents

## 1. Mission and governing rule

The objective is not to maximize the number of PRs, commits, agent messages, or green-looking dashboards. The objective is to deliver one verified, reviewable change at a time into `main`, with reproducible evidence and no hidden failures.

**One Active PR at a time.** No agent may start, publish, or advance a second independent PR while the Active PR has not completed its full acceptance and Main-regression closure. Other work must remain queued, not become parallel PRs.

The project controller owns the single source of truth: the task queue, Active PR, authorized scope, acceptance evidence, and final delivery report.

## 2. Five-agent responsibility model

| Agent | Role | Accountabilities | Authority limits |
|---|---|---|---|
| GPT-1 | Controller / Delivery Owner | Owns queue, selects one Active task, records baseline Main SHA, defines scope and acceptance criteria, coordinates handoffs, verifies merge and Main regression, closes the task | Sole owner of task sequencing and delivery declaration; must not invent evidence or self-certify independent review |
| GPT-2 | Implementer | Makes the smallest complete code/documentation change within the authorized scope; supplies changed-file list, commit SHA, rationale, and local validation | Must not expand scope, open another PR, or merge without authorization |
| GPT-3 | Test / CI Owner | Defines and runs applicable tests; verifies exact-head workflow runs, jobs, logs, artifacts, and regression coverage | Must report exact states; cannot call pending/skipped/missing jobs PASS |
| GPT-4 | Security / Architecture Owner | Reviews threat model, data boundaries, permissions, migrations, dependency impact, architecture and rollback risk | Must distinguish verified findings from assumptions; cannot waive required controls |
| GPT-5 | Independent Quality Reviewer | Reviews the final diff and evidence against acceptance criteria; records defects and formal review outcome | Must be independent of implementation; a chat response or self-review is not a GitHub APPROVED review |

One agent may help another investigate, but role ownership and approval boundaries remain unchanged. GPT-1 is accountable for ensuring every handoff has a named owner and a concrete output.

## 3. Single-PR execution lifecycle

Every task follows this sequence. Do not skip or reorder stages to create the appearance of progress.

1. **Baseline:** GPT-1 reads the latest `main` SHA, open PR inventory, branch heads, check runs, workflow runs, and current blockers. Record the timestamp and exact identifiers.
2. **Select:** GPT-1 selects exactly one task and marks exactly one PR as `ACTIVE`. All other tasks are `QUEUED`, `BLOCKED`, `DUPLICATE`, or `COMPLETED`.
3. **Specify:** Record objective, in-scope files, out-of-scope files, acceptance criteria, test plan, security considerations, rollback plan, and expected evidence before implementation.
4. **Implement:** GPT-2 works only within the authorized scope. If scope must change, stop and obtain GPT-1's explicit decision before adding files or behavior.
5. **Validate:** GPT-3 runs the applicable checks against the exact candidate HEAD. Record workflow run IDs, job IDs, attempt numbers, exact SHA, terminal conclusions, and relevant log evidence.
6. **Review:** GPT-4 performs security/architecture review. GPT-5 independently reviews the final diff and acceptance evidence. Findings must be resolved or explicitly recorded as blocking; no silent waiver.
7. **Acceptance:** GPT-1 checks every required criterion and every required check against the same exact candidate HEAD. A successful subset is not full acceptance.
8. **Merge readiness:** Only after all required checks are terminal-successful, required approvals exist, review threads are resolved, the PR is non-Draft when required, and mergeability is confirmed may GPT-1 authorize merge.
9. **Merge and Main regression:** After merge, record merge commit SHA and new Main SHA. Run/inspect Main CI and required integration checks. Confirm the merged behavior on Main, not merely on the PR branch.
10. **Closeout:** Mark the task COMPLETED only after Main regression succeeds. Publish a concise evidence report and only then promote the next queued task to ACTIVE.

## 4. PR state machine and concurrency control

Use these states consistently:

- `ACTIVE`: the only PR currently allowed to receive implementation or acceptance work.
- `QUEUED`: approved task waiting for the Active PR to close; no parallel implementation PR.
- `BLOCKED`: work cannot proceed because of a named external or technical dependency. Include owner, evidence, next action, and retry condition.
- `DUPLICATE`: overlaps an existing task; identify the canonical task and stop duplicate work.
- `COMPLETED`: merged and verified on the latest Main SHA with required regression evidence.

Rules:

- Maintain no more than one Active PR.
- Do not open a PR merely because a task is ready while another PR is Active.
- Do not split one logical task into several PRs to bypass the queue.
- Do not let agents independently choose competing tasks.
- If multiple existing PRs are already open, freeze new PR creation, inventory all of them, select one Active PR based on dependency/order/risk, and queue or explicitly block the rest. Do not mass-close or merge PRs without reviewing their diffs and dependencies.
- A queued branch may be prepared only when it does not modify Main or interfere with the Active PR; it must not be presented as an active delivery.

## 5. Exact evidence and truthful status rules

Every status statement must refer to a specific commit SHA and, where relevant, a specific workflow run and attempt.

The following are **not PASS**:

- `PENDING`, `IN_PROGRESS`, `QUEUED`, `WAITING`, `REQUESTED`, `EXPECTED`, or unknown states.
- `SKIPPED`, `CANCELLED`, `NEUTRAL`, missing jobs, zero jobs, or a workflow that never ran.
- A successful workflow whose required jobs did not run.
- A green run for an older SHA when the PR head has since changed.
- A preflight or acceptance result associated with the wrong PR, branch, SHA, run, or workflow identity.
- A provider deployment notification that does not prove the required application checks.
- An agent's own assertion without inspectable GitHub evidence.

Use the exact GitHub conclusion/status values. Do not translate partial success into “all green.” If a workflow is still running, say which jobs are running and which dependent jobs have not yet been created; do not prematurely classify not-yet-created dependent jobs as failures.

A change to the candidate HEAD invalidates prior exact-head evidence unless the workflow explicitly proves that the evidence applies to the new SHA. Re-run affected checks.

## 6. Blocker protocol

When work encounters a hang, PENDING state, zero jobs, SKIPPED checks, rate limit, missing token, permission denial, unavailable runner, provider outage, merge conflict, or failed acceptance gate:

1. Stop repeated blind retries and stop creating additional PRs.
2. Capture the exact resource, SHA, run/job ID, state, timestamp, error text, and relevant log excerpt.
3. Classify the blocker as code defect, workflow defect, configuration/credential issue, permission issue, provider limit/outage, dependency issue, or review/approval issue.
4. Assign one owner and one next action. State whether the action is safe and authorized.
5. Retry only when the documented retry condition is met; use bounded retries and respect provider rate limits.
6. If a credential or permission is missing, request the required owner action. Never fabricate credentials, bypass access controls, or report the blocked check as passed.
7. Keep the PR blocked until the required evidence exists. A workaround must be documented, scoped, tested, and approved; it must not silently weaken acceptance criteria.

## 7. Scope and change control

Before implementation, GPT-1 records the authorized file and behavior scope. Any additional file, workflow trigger, policy, migration, dependency, or runtime behavior is a scope change and must be called out before proceeding.

Each PR must have:

- One clear purpose and a bounded diff.
- An accurate title and body reflecting the current head SHA and actual changed files.
- Tests proportionate to the change.
- Security and rollback notes when applicable.
- No unrelated formatting, cleanup, generated churn, or opportunistic refactoring.

If the actual diff differs from the PR description, stop acceptance and reconcile the discrepancy before review. Never claim “docs only,” “test only,” or “no production impact” without checking the complete diff.

## 8. Required handoff and reporting format

Every agent handoff must use this structure:

```text
ROLE:
TASK / PR:
STATE: ACTIVE | QUEUED | BLOCKED | DUPLICATE | COMPLETED
BASE MAIN SHA:
CURRENT HEAD SHA:
AUTHORIZED SCOPE:
FILES CHANGED:
WORKFLOW RUNS / ATTEMPTS:
JOB RESULTS (exact conclusions):
TEST EVIDENCE:
SECURITY / REVIEW FINDINGS:
BLOCKERS (exact error + owner):
NEXT ACTION:
```

GPT-1's delivery report must additionally state:

- Old Main SHA and new Main SHA.
- PR number, merge commit SHA, and merge timestamp.
- Required checks and their exact terminal conclusions at the merged SHA.
- Independent approval identity and review state.
- Main regression workflow/job IDs and results.
- Any remaining external status that is informational rather than a required gate.

## 9. Definition of Done

A task is DONE only when all applicable conditions are true:

- The authorized scope is fully implemented and the final diff matches the PR description.
- Every required CI, test, type, lint, build, security, migration, RLS, and integration gate is terminal-successful for the exact final candidate HEAD.
- No required check is pending, skipped, missing, cancelled, neutral, or waived without an explicitly approved policy exception.
- Required independent formal GitHub approval exists on the final HEAD; self-review and chat acknowledgements do not count.
- Required review threads are resolved and mergeability is confirmed.
- The PR is merged through the authorized process.
- The resulting Main SHA is recorded.
- Required Main CI and regression checks pass against that Main state.
- The final report links the evidence and identifies any non-blocking external provider status without misrepresenting it.

If any critical condition is false or unknown, the task is NOT DONE. Applicable non-critical checks may be explicitly waived under Section 12; a waiver must remain visible in the final report and must never be described as PASS.

## 10. Immediate adoption order

On adoption, GPT-1 must:

1. Freeze creation of new PRs.
2. Inventory every currently open PR, including #659, #660, #661, #664 and any newer PRs; verify each live state and exact head rather than relying on stale reports.
3. Select exactly one Active PR based on dependencies, risk, and readiness. Record the reason.
4. Mark all other open work QUEUED, BLOCKED, or DUPLICATE and stop parallel implementation.
5. Complete the Active PR through merge and Main-regression closeout before promoting the next task.
6. Publish this charter's path and adoption status in the project coordination channel/document used by all five agents.

All five agents must acknowledge the charter by reporting their assigned role, current task, whether they have uncommitted or unpushed work, current PR/branch, and blockers. An acknowledgement is not a substitute for following the rules.

## 11. Non-negotiable prohibitions

- No parallel Active PRs.
- No false PASS, false green, or premature DONE.
- No merging based only on partial CI or self-review.
- No changing acceptance criteria after a failure merely to obtain a green result.
- No weakening tests, security controls, RLS, permissions, or workflow gates to make a PR pass.
- No unreported scope expansion or stale PR metadata.
- No unbounded retries or repeated actions that worsen rate limits.
- No declaring that another agent, reviewer, or external service has acted unless the GitHub evidence confirms it.

**Final principle:** Finish the current change completely, prove it on Main, then start the next one. Delivery closure outranks parallel activity.


## 12. Risk-based acceptance: non-critical checks may be waived

The purpose of acceptance is to control material delivery risk, not to force every informational or low-value check to block a safe change. Acceptance requirements must therefore be classified **before implementation** by GPT-1, with GPT-3 and GPT-4 consulted.

### 12.1 Critical gates — never bypass for convenience

The following remain mandatory whenever applicable to the changed scope:

- The change is syntactically valid and the application can build or package successfully where a build is applicable.
- Tests covering the changed behavior pass; no known regression or data-loss defect remains.
- Security-sensitive changes receive the required security review. Authentication, authorization, secrets, privacy, payment, RLS, database migration, and externally exposed API changes cannot waive their relevant security/integration checks.
- No unresolved critical/high severity security issue, destructive migration risk, permission escalation, or known production-breaking defect.
- The exact candidate HEAD is identified, the diff is reviewed, and mergeability is confirmed.
- Any check explicitly required by repository policy or branch protection remains mandatory unless the repository owner formally changes that policy.

A critical gate that is pending, failed, skipped, missing, or unverified blocks merge. Do not relabel a critical gate as non-critical after it fails.

### 12.2 Non-critical checks — may be skipped or waived with a record

Examples that may be classified as non-critical depending on the actual change:

- Informational documentation link checks or spelling/style checks unrelated to executable behavior.
- Optional preview deployments, non-production visual previews, or provider status checks that are not part of the required release path.
- Redundant test suites that duplicate stronger coverage already passing for the same changed behavior.
- Optional benchmarks, advisory scans, or non-blocking reports with no relevant finding.
- Unrelated platform-specific checks when the change demonstrably does not touch that platform or its shared code.

GPT-1 may authorize a non-critical check to be skipped or waived and proceed to merge readiness **without waiting for that check**, provided all conditions below are recorded:

1. The check is explicitly named and marked `NON_CRITICAL`; never hide it as PASS.
2. The reason it is non-critical is specific to the files and behavior changed.
3. GPT-3 records what equivalent or stronger evidence covers the risk, or explains why no additional evidence is needed.
4. GPT-4 confirms that the waiver does not create a security, privacy, data integrity, compliance, or architectural risk.
5. GPT-1 records the waiver decision, approver, date, and any follow-up action.
6. The PR description and final delivery report disclose the skipped/waived check.

A non-critical waiver is not a failed check being converted to green. Report it as `WAIVED_NON_CRITICAL` or `SKIPPED_NON_CRITICAL`, with the reason.

### 12.3 Fast path for low-risk changes

For documentation-only, comment-only, typo, or similarly low-risk changes, GPT-1 may use a streamlined path:

1. Verify the diff contains only the claimed low-risk changes.
2. Run a lightweight validation appropriate to the change (for example Markdown rendering/link checks when relevant).
3. Obtain one independent review when required by repository policy; otherwise record the review decision.
4. Confirm no critical gate applies and no required branch protection check is being bypassed.
5. Merge when the required conditions are met; do not wait for unrelated optional checks.

This fast path does not apply merely because a PR is small. Scope and impact, not line count or labels, determine risk.

### 12.4 Required acceptance classification

Every task must include this compact matrix before implementation:

| Check / gate | Classification | Why it applies or does not apply | Evidence / waiver owner |
|---|---|---|---|
| Build / syntax | CRITICAL or N/A | Scope-based reason | Run/job or reason |
| Changed-behavior tests | CRITICAL or N/A | Scope-based reason | Run/job or reason |
| Security / privacy / data integrity | CRITICAL or N/A | Scope-based reason | Review/evidence |
| Integration / migration / RLS | CRITICAL or N/A | Scope-based reason | Run/job or reason |
| Optional quality / preview checks | NON_CRITICAL or N/A | Scope-based reason | Evidence or waiver |

**Decision rule:** Critical gates must pass. Applicable non-critical gates may pass, be skipped, or be waived with an explicit record. The PR may merge once all critical gates and repository-mandated requirements are satisfied; it does not need to wait for unrelated non-critical checks.
