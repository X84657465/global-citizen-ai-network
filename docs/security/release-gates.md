# GCAN Security Review and Release Gates

These gates are additive to normal build, test, type-check, lint and database verification. A generic CI success does not waive a security gate.

## Gate 0 — Change classification

Every PR declares:
- assets and data classes touched;
- trust boundaries crossed;
- authentication, authorization, privilege, secret, network and dependency changes;
- whether untrusted content or code is processed;
- AI tools/actions and write capabilities involved;
- test evidence and rollback/disable plan.

If the PR changes a privileged boundary, F review is mandatory.

## Gate 1 — Automated checks

Run applicable checks on the exact candidate SHA:
- production dependency audit and full dependency audit;
- secret scanning (including history where supported) and credential-pattern regression checks;
- static analysis and lint;
- unit tests and integration tests for allow and deny paths;
- schema/migration checks and isolated PostgreSQL/RLS tests;
- workflow permission and action pinning review;
- artifact provenance and dependency lockfile verification.

A scanner result is evidence only for the scanner, version, scope and exact SHA recorded. Findings must be triaged; suppressions require rationale, owner and expiry.

## Gate 2 — Authorization and isolation

For any member, tenant, admin or service-role change:
- test an authorized request succeeds;
- test an unauthorized and cross-tenant request fails;
- test missing, malformed, expired and replayed credentials fail safely;
- verify service-role access is server-only and preceded by explicit authorization;
- verify audit events do not leak credentials or unnecessary personal data.

## Gate 3 — AI and agent controls

For any prompt, retrieval, memory or tool change:
- include adversarial untrusted-content fixtures;
- prove retrieved instructions cannot override system/developer policy;
- prove model output cannot independently grant permissions;
- prove tool schemas and arguments are bounded and allowlisted;
- prove write actions are checked outside the model and high-impact actions require human approval;
- prove secrets are not added to prompts, traces or generated artifacts.

## Gate 4 — Runner and supply chain

For any CI, Runner, patch-generation or dependency workflow change:
- verify the exact PR head SHA and event/branch/PR association;
- reject stale or mismatched events;
- use least-privilege, short-lived tokens and read-only permissions by default;
- keep untrusted code away from persistent hosts holding production credentials;
- isolate candidate execution, restrict network and mounts, enforce resource/time limits and clean up;
- pin third-party actions to immutable commit SHAs where practical;
- verify package lockfiles and artifact provenance.

## Gate 5 — Human approval and release

- No automatic self-approval or self-merge by an AI agent.
- No production deployment, destructive action or production data migration without explicit human authorization.
- Critical/high unresolved findings block the affected release unless the affected capability is disabled and an authorized risk owner documents the exception.
- Exact SHA, test output, CI run, reviewer decision, residual risk and rollback steps must be recorded.
- Security-sensitive changes require F plus affected-track owner review.

## Emergency exception

An emergency may disable or roll back a vulnerable capability before the full review is complete. It may not silently waive authorization, erase evidence or grant broader permissions. Record the approver, reason, scope, duration and follow-up review.
