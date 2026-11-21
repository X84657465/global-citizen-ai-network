# I — Approved External Connector Registry

**Baseline:** `main` at `a1c1b58e4d1852f5a09a0e7c6c5cbeb38e1f9582`  
**Status:** Initial implementation candidate; not accepted.  
**Authority:** Bounded only through the existing `FPHostAdapter`; no provider is enabled by default.

## Implemented in this candidate

- A local allowlist registry for explicitly registered connector IDs, semantic versions, and operation names.
- A typed operation boundary that classifies each operation as `read` or `write`.
- Opaque credential references resolved only at invocation time through an injected resolver. Credential material is passed in memory to the registered adapter and is never included in audit events.
- Explicit idempotency keys are mandatory for operations classified as writes.
- Per-invocation timeout and abort signal; adapters are contractually required to honor cancellation.
- A metadata-only audit sink that records connector/version/operation, outcome, correlation ID, timestamp, duration, and sanitized error code. It does not record payloads, credential references, credential material, or raw exception messages.
- Registration of `I:execute` on the existing `FPHostAdapter`. The executor exposes no public direct-execution method; the shared host enforces authorization and explicit approval before the private execution handler runs.

## Deliberate non-goals and safety boundaries

- No arbitrary URL, dynamic module, plugin download, or caller-supplied transport is accepted.
- No built-in network client, token store, retry loop, persistent queue, or external provider is included.
- No live external connector is registered or enabled by this candidate.
- Write operations are not retried automatically. Idempotency is forwarded to the provider adapter.
- Timeout cancellation is cooperative: each adapter must honor the supplied `AbortSignal`; adapters that cannot guarantee cancellation must not be used for non-idempotent side effects.
- The existing host remains the source of identity, authorization, and explicit approval. The registry does not infer policy from request payloads.
- Audit sink failure is best-effort and cannot change connector execution behavior; durable audit storage requires a separate reviewed integration.

## Required acceptance evidence

- Full exact-head Node 22 unit tests, TypeScript check, lint, dependency audit, and production build.
- Tests for authorization denial before credential resolution, approval requirement, unknown connector/operation, malformed credential references, write idempotency, timeout cancellation, sanitized audit, and audit sink failure.
- Independent review of credential handling, adapter trust boundary, cancellation semantics, and write idempotency.
- No production credential, live provider, schema, deployment, or external write is part of this PR.

## Highest-core integration

This workstream is hosted by the existing F–P contract and host adapter. Agent Factory V2 remains the highest execution core and is not modified. A–E remain protected. This PR does not create a second identity system, scheduler, task runner, or execution authority.
