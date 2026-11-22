# M Policy Exception Record Template

An exception is a narrow, temporary deviation from a named policy. It is not a waiver of law, a general security bypass, or permission to exceed the approver's authority.

## Required record

| Field | Value |
|---|---|
| Exception ID | `EXC-YYYY-NNN` |
| Policy/control ID and version | |
| Requesting track / owner | |
| Scope (systems, actions, data, environment) | |
| Explicit exclusions | |
| Business/operational rationale | |
| Evidence and risk references | |
| Threat / failure scenario | |
| Compensating controls | |
| Residual risk | |
| Requested start (UTC) | |
| Expiry (UTC) | **Mandatory; no indefinite exceptions** |
| Review cadence / next review (UTC) | |
| Rollback / remediation plan | |
| Requester | |
| Authorized approver and authority reference | |
| Decision | Approved / Rejected / Withdrawn / Expired |
| Decision timestamp (UTC) | |
| Closure evidence | |

## Mandatory rules

1. Every exception names one accountable owner and a concrete scope.
2. Expiry is mandatory and must be enforced by the future operating process; expired exceptions are not silently renewed.
3. Approval must come from the authority defined by the policy owner and P approval matrix, not from the requester or an automated model.
4. An exception cannot waive legal obligations, least-privilege requirements, tenant isolation, secret handling, or mandatory security controls unless the actual policy owner and authorized governance process explicitly permit the specific deviation.
5. F security controls remain authoritative; M records the exception and evidence but cannot weaken F.
6. Compensating controls, monitoring and a rollback/remediation plan are required.
7. Material scope changes require a new review and decision.
8. Rejection, expiry or withdrawal must remain visible in the audit history.
9. No exception is valid merely because a PR, workflow or automated evaluator labels it approved.

## Renewal / closure

- Renewal requires a new justification, fresh risk assessment, updated evidence and a new authorized decision before expiry.
- Closure records remediation evidence, the final status and the actor/time that closed the exception.
