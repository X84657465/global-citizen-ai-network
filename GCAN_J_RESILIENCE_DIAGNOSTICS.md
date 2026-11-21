# GCAN J — Advisory Resilience Diagnostics

## Purpose

J consumes sanitized runtime failure evidence and produces deterministic recovery proposals. It is advisory-only and is registered on the existing F–P `FPHostAdapter`; it does not create another execution core.

## Host and policy boundary

- The host must authenticate and authorize the caller before the J handler runs.
- J obtains the policy decision from an injected trusted P policy provider. A policy decision is never accepted from the request payload.
- The policy provider receives the validated evidence and the host-issued principal, allowing policy evaluation to bind the decision to actor/resource scope.
- A denied policy decision returns no proposal.
- No proposal is executed, retried, scheduled, or persisted by this module.

## Evidence contract

Only bounded structured metadata is accepted:
- schema version `1`
- source: provider, database, queue, or runtime
- allowlisted failure code
- opaque evidence and component references
- UTC timestamp
- bounded attempt count

Free-form exception messages, stack traces, credentials, URLs, request payloads, and user-generated content are rejected as unsupported fields and are never echoed.

## Proposal contract

The deterministic classifier emits a bounded severity, fixed recommendation, fixed suggested checks, policy version, correlation ID, and evidence references. Every proposal explicitly carries:
- `manualApprovalRequired: true`
- `executionPerformed: false`

The proposal is evidence for an operator, not an instruction to an automation runner. Retry, rollback, configuration mutation, provider calls, and remediation execution remain outside J.

## Current implementation status

Implemented in:
- `lib/fp/resilience.ts`
- `tests/fp/resilience.test.ts`

Coverage includes trusted P policy lookup, host authorization ordering, policy denial, strict evidence validation, bounded output, and absence of free-form message propagation.

The capability is not wired to a production route. A real P policy provider and trusted evidence source must be supplied by the owning host before any deployment integration. Full repository CI and independent review remain required before acceptance.
