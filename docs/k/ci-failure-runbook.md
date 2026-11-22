# CI failure and evidence runbook

## Purpose

Diagnose a candidate's CI result without confusing partial, stale or skipped evidence with acceptance.

## Required identity

Record repository, PR number, source branch, base SHA, exact head SHA, workflow run ID and attempt, event type, and UTC observation time. Re-fetch the PR head before drawing conclusions.

## Triage

1. Confirm the workflow run's `head_sha` equals the current PR head. If not, classify it as historical evidence.
2. Inspect every job and required step. A workflow-level `success` with substantive jobs skipped is not a passed quality gate.
3. Classify each required job as success, failure, cancelled, skipped, queued or in progress. Only terminal success is a pass; pending, skipped, absent and cancelled are not pass.
4. Separate GitHub Actions from Preview/deployment-provider status. Rate limits and deployment failures must be reported separately, not silently converted into CI success or failure.
5. For failures, capture the failing step, bounded redacted log excerpt, test name and reproducible command. Never copy tokens, credentials, private payloads or environment dumps.
6. Check whether a rerun is safe and permitted. Do not dispatch duplicate workflows repeatedly to overcome queue delays or provider limits.
7. Record the cause as code, test, dependency, environment, infrastructure, provider quota or unknown. Assign an owner and next action.

## Acceptance record

- Exact current head SHA: [full SHA]
- All required jobs terminal: [yes/no]
- Required jobs successful: [yes/no]
- Skipped jobs and technical rationale: [list]
- Independent review: [review URL/outcome]
- Preview requirement: [pass/fail/not required with reason]
- Blocking findings: [list]
- Acceptance owner: [role and timestamp]

Do not describe resolver-only success, partial green checks or another SHA's run as full CI acceptance.
