# GCAN F–P Mainline Hosting Contract

**Status:** Specified; not yet accepted as a runtime integration  
**Scope:** F–P only  
**Protected boundary:** A–E remain externally owned and unchanged  
**Contract version:** 1

## Purpose

Provide one stable hosting boundary through which F–P workstreams can be attached to the existing GCAN mainline. This is a capability contract and registry, not a new application, database, identity provider, task runner, or deployment.

The implementation is intentionally isolated under `lib/fp/`. It does not import, modify, or assume control of A–E runtime modules.

## Hosting model

- The existing platform remains the host and source of truth.
- A–E retain their existing identity, product, intelligence, research, and execution responsibilities.
- F–P publish typed capability/event contracts through the registry.
- The host supplies authenticated actor/resource references and request correlation context.
- F–P must not infer identity or authorization from an envelope. The trusted host and existing policy boundary make those decisions.
- Any future asynchronous transport must define delivery guarantees, retries, idempotency, dead-letter handling, retention, and operational ownership before adoption.

## Workstream boundaries

| Track | Hosted responsibility | Authority in this contract |
|---|---|---|
| F | Security findings, control results, incident evidence | Advisory |
| G | Compatibility, QA, release acceptance evidence | Advisory |
| H | Structured operational events, health and alerts | Advisory |
| I | Approved external API adapters | Bounded; approval and credential handling stay at trusted boundaries |
| J | Diagnosis and repair proposals | Advisory; no autonomous production repair |
| K | Versioned documentation and handover | None |
| L | Federation/edge contract only | None; deferred until F/H/operations gates pass |
| M | Compliance controls, risk and evidence | Advisory |
| N | Privacy-minimized analytics and growth insights | None |
| O | Version/deprecation lifecycle recommendations | Advisory |
| P | Governance decisions and approval evidence | Advisory; policy enforcement requires separately tested controls |

## Event envelope

Every F–P capability event uses `FPCapabilityEnvelope<TPayload>`:

- `contractVersion`: explicit schema version.
- `workstream` and `capability`: stable producer identity.
- `eventId`: unique event identity.
- `occurredAt`: ISO-8601 timestamp.
- `correlationId`: joins the event to the originating request/task.
- `actorRef` and `resourceRef`: opaque references only; never proof of identity or permission.
- `idempotencyKey`: optional retry deduplication key.
- `payload`: capability-specific, versioned data.

Do not put credentials, raw secrets, unnecessary personal data, or unredacted user content in the envelope.

## Integration gates

1. Contract review by the relevant F–P owners.
2. Exact-SHA unit/type/build checks.
3. Host adapter tests proving authorization is enforced by the existing trusted boundary.
4. Contract compatibility tests for producers and consumers.
5. G acceptance evidence and P approval record before enabling a capability.
6. No production side effects until the owning line explicitly approves its execution mode.

## Current maturity

All entries are marked `specified`, not implemented/accepted. The registry does not claim that queues, distributed tracing, connectors, remediation, federation, compliance certification, or policy enforcement already exist. It provides the common shape needed to integrate those capabilities without creating a parallel platform.

## Non-goals

- No changes to A–E.
- No changes to Agent Factory V2 lifecycle, leases, patch isolation, checks, or publication authority.
- No new authentication or authorization implementation.
- No database migration, new queue, telemetry vendor, external connector credential, or deployment.
- No activation of L federation or autonomous J remediation.
