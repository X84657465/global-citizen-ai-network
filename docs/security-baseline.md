# Security and Privacy Baseline

This document is a minimum design baseline, not a completed security audit or legal opinion.

## Identity and authorization

- Use secure, maintained authentication and verify the session server-side for every private request.
- Enforce server-side authorization on every resource access and apply least privilege.
- Privileged contribution and AI operations must verify an active admin/reviewer role before creating a service-role client or invoking privileged RPCs.
- Require MFA for administrators and privileged reviewers before public launch.
- Separate production, staging, and development credentials.

## Secrets and API spending

- Keep model, database, payment, and signing secrets server-side; never commit real keys or put them in NEXT_PUBLIC variables.
- Rotate secrets and document incident procedures.
- Set per-user, per-feature, and global quotas and provider billing alerts.
- Bound request size, provider response size, output size, retries, and execution time.
- Use a database-enforced reservation before any provider call; fail closed when controls are missing or disabled.
- Do not automatically retry uncertain provider outcomes. Preserve the idempotency key and reservation until provider-side evidence is checked.
- Keep internal cost estimates, provider-reported usage, and imported invoice charges distinct.
- Provide a kill switch and safe degraded mode.

## AI-specific threats

- Treat uploaded files, retrieved pages, tool results, and model output as untrusted.
- Defend against prompt injection and data exfiltration.
- Use explicit tool allowlists and least-privilege tool credentials.
- Do not let a model authorize payouts, access control, or destructive actions.
- Avoid sending personal or confidential data to providers without a disclosed lawful basis and appropriate controls.
- Evaluate model outputs for factuality and unsafe content according to product risk.

## User data

- Collect the minimum data required.
- Define retention periods and deletion workflows before public launch.
- Encrypt transport and use managed encryption at rest.
- Use private object storage and expiring signed download links.
- Prevent cross-user project, conversation, file, and ledger access through RLS and server-side ownership checks.
- Log access to sensitive records without logging secrets or unnecessary content.
- Provide export and deletion request processes, subject to legal retention duties.

## Contribution integrity

- Snapshot the reward amount and currency at submission time; never derive a historical reward from a task's current price.
- Publish task scope, source/data rights, acceptance criteria, review method, reward amount, and appeal process before work begins.
- Detect duplicates, plagiarism, collusion, automated farming, and suspicious account patterns.
- Use human sampling and independent review.
- Separate submitter and final reviewer for high-value work.
- Maintain immutable event history; correct errors with reversal entries.

## Distributed compute — deferred

Before public launch, require:
- Explicit opt-in and granular CPU/GPU, memory, bandwidth, power, temperature and schedule limits.
- Visible activity, pause/stop controls, uninstall path, and no hidden persistence.
- Signed workloads, sandboxing, restricted network egress, and no arbitrary code execution.
- No access to participant files, credentials, camera, microphone, or unrelated device data.
- Independent verification of results and node reputation.
- Security review, vulnerability disclosure process, and incident response plan.

## Incident response

Document owner, escalation path, severity levels, evidence preservation, user notification criteria, containment, recovery, and post-incident review before public launch.

## Release gates

Do not launch publicly until access isolation, upload scanning, rate limits, backups, recovery, logging, secret handling, data export/deletion, and an independent security review have passed.
