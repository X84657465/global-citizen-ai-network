# G — Required Checks Matrix

Use this matrix for each candidate. Select gates by changed paths, dependencies, and risk; do not mark an inapplicable gate as passed. Record why a gate is not applicable.

| Gate | Applicability trigger | Required evidence | PASS condition |
|---|---|---|---|
| Candidate identity resolver | Every PR candidate | Repository, PR, base SHA, head SHA, run ID and attempt | All identifiers resolve to the intended same-repository PR and exact current head |
| Unit/regression tests | Every code/test change | Test command, result, environment, exact SHA | Exit success; expected suite completed |
| Type check | TypeScript changes or shared contracts | Command and exact-SHA result | Exit success |
| Lint | Every code change | Command and exact-SHA result | Exit success; no suppressed new findings |
| Production build | Application/runtime changes | Build command and exact-SHA result | Build completes successfully |
| Dependency/security audits | Dependency or release changes; repository-required gates | Audit output and exact SHA | All required audit policies pass |
| Migration/schema safety | Migration or schema-related paths | Guard output and migration diff | Guards pass; no unapproved destructive change |
| PostgreSQL/RLS integration | Database, authorization, or tenant-isolation changes; repository-required gates | Isolated database test output and exact SHA | Migrations, pgTAP and relevant multi-member RLS tests pass |
| Runner/Ollama integration | Runner, local execution, or repository-required gates | Environment preflight and bounded inference result | Required services healthy and bounded test passes |
| F security review | Security-sensitive input, auth, secret, isolation, or trust-boundary changes | F review record linked to exact diff/head | No unresolved blocking security finding |
| Receiving-owner compatibility | Cross-track contract or shared path change | Owner, contract versions, compatibility result | Every affected owner confirms compatibility |
| Independent review | Every merge candidate under repository policy | Formal review state and reviewer's exact-head SHA | Authorized approval; COMMENT is insufficient |
| Preview/smoke evidence | When preview is required by repository policy or changed behavior | Preview deployment identity and smoke result | READY preview and smoke test for the same head |

## Exact-SHA binding rules

Each evidence row must identify:

- Repository full name.
- PR number and head branch.
- Base SHA and candidate head SHA.
- Workflow run ID and run attempt.
- Job/check name and terminal conclusion.
- Timestamp and evidence URL or durable artifact reference.

A new commit changes the candidate head. Results from the previous SHA cannot be carried forward as proof for the new head. A rerun of the same SHA must record its new run attempt; it does not erase the prior failure history.

## Gate aggregation

1. Any applicable FAIL makes the candidate FAIL until corrected and revalidated.
2. Any applicable PENDING keeps the candidate PENDING.
3. Missing required evidence, unresolved ownership, unavailable required environment, or missing authorized review makes the candidate BLOCKED.
4. NOT RUN is never PASS.
5. Overall PASS requires all applicable checks to be terminal-success for the same exact current head, all required reviews to be approved, and no unresolved blocking review thread.
6. A workflow-level success is not sufficient if a required job was skipped or excluded from the workflow's required gate set.

## Failure classification

Distinguish candidate defects from system/environment failures using the workflow's recorded classification and job evidence. Do not weaken a test, bypass a Runner check, or change application code to hide an infrastructure outage. Route infrastructure remediation to its authorized owner, then rerun the applicable gate against the exact current candidate head.
