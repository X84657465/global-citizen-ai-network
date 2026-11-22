# Deployment evidence runbook

## Authority boundary

This runbook records evidence for an independently authorized deployment. It does not grant deployment permission, approve a release, change environment protection or authorize production data operations. The designated release and service owners retain those decisions.

## Before any deployment

- Confirm the exact repository, target environment, release/PR and full candidate SHA.
- Confirm all required exact-head quality, security, database/RLS and integration gates are terminal and successful.
- Confirm independent formal review and receiving-owner compatibility where required.
- Confirm a READY artifact/Preview and smoke evidence when the release process requires them.
- Record unresolved risks, rollback/forward-fix plan, service owner and explicit deployment approver.
- Confirm the deployment method is already approved and protected; do not bypass provider limits or environment protection.

## Evidence record

- Candidate SHA and artifact identity
- Source workflow run ID/attempt and required job outcomes
- Security and independent review references
- Environment and approval record
- Smoke-test command, timestamp and result
- Rollback reference and accountable operator

## After deployment

Only the authorized operator records the resulting deployment identity, timestamp, smoke outcome and residual risks. A failed or rate-limited Preview is distinct from GitHub Actions CI and must be reported separately.

Never put secrets, access tokens, private user payloads or unredacted environment output in the record.
