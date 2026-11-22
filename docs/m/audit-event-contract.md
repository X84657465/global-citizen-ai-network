# M Audit Event Contract

**Status:** proposed record contract; not an implemented logging service.

## 1. Event envelope

An audit event should contain only the fields necessary to reconstruct who/what did what, to which target, under which policy, and with what outcome.

| Field | Required | Meaning |
|---|---:|---|
| `event_id` | Yes | Unique immutable event identifier |
| `occurred_at` | Yes | UTC timestamp in RFC 3339 format |
| `actor_type` | Yes | Controlled category such as human, service, workflow or system |
| `actor_ref` | Yes | Minimal stable reference; avoid names or personal data unless necessary |
| `action` | Yes | Controlled action verb/category |
| `target_type` | Yes | Controlled target category |
| `target_ref` | Yes | Stable target identifier; do not embed sensitive payloads |
| `result` | Yes | Controlled outcome: success, denied, failed, pending or unknown |
| `policy_id` | When applicable | Policy/control identifier evaluated |
| `policy_version` | When applicable | Exact policy version used |
| `reason_code` | When applicable | Bounded machine-readable reason; avoid free-form secrets |
| `correlation_id` | When applicable | Links related events without exposing request contents |
| `source_repo` | When applicable | Repository identity |
| `source_sha` | When applicable | Exact commit SHA for code/config decisions |
| `source_pr` | When applicable | Pull request number/URL |
| `ci_run_id` / `ci_attempt` | When applicable | Exact CI run and attempt evidence |
| `evidence_refs` | When applicable | Immutable or access-controlled references to supporting evidence |
| `integrity_ref` | Implementation-specific | Hash/signature/sequence reference if approved and implemented |

## 2. Validation

- Reject missing required fields, invalid timestamps, unbounded strings and unknown enum values.
- Treat external event content as untrusted; validate schema and authorization independently.
- Distinguish an action request from an action result. A request or generated plan is not proof that an action occurred.
- Do not infer success from an HTTP response alone when the operation's durable outcome is ambiguous.
- Duplicate delivery must be detectable through `event_id` and an implementation-defined idempotency strategy.
- Event ordering must not be inferred solely from client clocks; preserve server receipt time separately if needed.

## 3. Integrity and access

- The future persistence layer should prevent silent in-place rewriting and record correction events as new linked events.
- Access must be least-privilege and separated between event writers, auditors and retention administrators.
- Integrity controls (hash chaining, signatures, immutable storage or equivalent) require a threat model and F review before implementation.
- Failed writes must be visible as an audit pipeline health failure; never silently report complete coverage when records were dropped.
- No audit event may grant authority, change permissions or bypass human approval.

## 4. Privacy and retention

- Never store credentials, authentication headers, private keys, raw secrets, full prompts, full model responses or unrestricted user content.
- Prefer allowlisted structured fields and references to protected evidence over payload snapshots.
- Define purpose, access, retention and deletion/legal-hold behavior before production use.
- The data owner and qualified legal/privacy reviewer must approve retention periods; no default statutory duration is asserted here.
- Redact or pseudonymize actor and target references when identity is not necessary for the audit purpose.

## 5. Minimum test cases for implementation

1. Missing or malformed required field is rejected.
2. Unknown action/result enum is rejected.
3. Oversized field and unexpected nested payload are rejected or safely minimized.
4. Credential-like values are redacted or rejected before persistence.
5. Duplicate event delivery does not create ambiguous duplicate state.
6. Event correction creates a linked follow-up rather than silently rewriting history.
7. Unauthorized readers/writers are denied.
8. Failed persistence is surfaced and cannot be reported as complete audit coverage.
9. Source SHA and CI run/attempt mismatches are detected.
10. Retention expiry and legal-hold precedence follow approved data-owner policy.
