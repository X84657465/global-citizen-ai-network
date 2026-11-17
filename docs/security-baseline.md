# Security and Privacy Baseline

This document is a minimum design baseline, not a completed security audit or legal opinion.

## Identity and authorization

- Use secure, maintained authentication; require verified email for sensitive actions.
- Enforce server-side authorization on every resource access.
- Apply least privilege and role-based access control.
- Require MFA for administrators and privileged reviewers.
- Separate production, staging, and development credentials.

## Secrets and API spending

- Keep model, database, payment, and signing secrets server-side.
- Never commit real keys or put them in NEXT_PUBLIC variables.
- Rotate secrets and document incident procedures.
- Set per-user, per-IP, per-feature, and global quotas.
- Set provider billing alerts and hard platform spend limits where supported.
- Bound request size, output size, tool calls, retries, and execution time.
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
- Define retention periods and deletion workflows.
- Encrypt transport and use managed encryption at rest.
- Use private object storage and expiring signed download links.
- Prevent cross-user project, conversation, file, and ledger access.
- Log access to sensitive records without logging secrets or unnecessary content.
- Provide export and deletion request processes, subject to legal retention duties.

## Contribution integrity

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

Do not launch publicly until access isolation, upload scanning, rate limits, backups, recovery, logging, secret handling, and a security review have passed.