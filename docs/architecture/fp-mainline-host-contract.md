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


## Host adapter implementation

`lib/fp/host-adapter.ts` provides the first executable attachment point:

- F–P owners register capability handlers by workstream and capability name.
- The existing host supplies actor/resource references, correlation ID, authorization decision, and explicit approval state.
- The adapter rejects unauthorized requests, rejects malformed context, blocks workstreams with `executionAuthority: "none"`, and requires explicit approval for `bounded` capabilities.
- Successful results are returned in the versioned envelope, preserving correlation and opaque host references.
- Duplicate capability registrations are rejected.

The adapter deliberately does not authenticate users, resolve permissions, persist state, deduplicate idempotency keys, dispatch queues, or perform retries. Those are host/platform responsibilities and require their own contracts and evidence before implementation.

### Current executable scope

The adapter is an in-process registration/invocation boundary only. It does not yet connect to A–E runtime services or enable production capabilities. The host must call it only after making its normal authorization decision. Capability handlers must remain side-effect-free unless their owning workstream has an approved bounded execution design.

Unit tests cover successful advisory invocation, denied authorization, bounded approval, disabled execution, duplicate registration, and malformed host context.


## H observability implementation

`lib/fp/observability.ts` adds a bounded, process-local recorder for capability outcome metadata and health snapshots. It records only workstream, capability, correlation ID, outcome, timestamp, duration, and an optional controlled error code. It does not retain request/response payloads, actor references, credentials, or user-generated content.

The host adapter accepts an optional `FPObservabilitySink`. When supplied, it emits success, denial, rejection, or handler-failure outcomes. Sink failures are isolated and never change capability execution results. The default remains no sink; no global telemetry destination or persistence is configured.

The recorder has a bounded retention capacity (default 250, maximum 10000), immutable event copies, and per-workstream outcome counters. This is local operational evidence only: it is not distributed tracing, durable monitoring, alert delivery, or production health certification.

H's recorder and adapter integration are covered by tests for bounded retention, counters, invalid event rejection, payload exclusion, and non-blocking sink failure.


## F security evidence implementation

`lib/fp/security-assurance.ts` evaluates the existing mainline security evidence against one exact candidate commit SHA. The initial control catalogue references the repository's two-member RLS isolation harness, database security regression suite, security-header tests, and server-route query/ownership tests.

Assessment states are deliberately conservative:

- `blocked`: at least one control has failed.
- `stale`: evidence was produced for a different commit SHA.
- `incomplete`: one or more controls are missing or not run.
- `ready-for-review`: all required controls have passing evidence for the exact candidate SHA.

`ready-for-review` is not acceptance, integration, or deployment. The evaluator does not execute tests, connect to a database, inspect production, grant privileges, or alter existing RLS policies/migrations. It prevents parent-commit or stale-branch evidence from being silently treated as proof for a new candidate.

### F baseline evidence caveat

The merged RLS hardening PR #209's final head was `e1ec407c2df92404fc2fe710ba2ef95eb7a335fc`. Its surfaced workflow run completed with a successful resolver job, but the resolver explicitly identified the event as stale/closed and skipped the quality, database, and RLS jobs. This is not a passing exact-head test result. F therefore remains implemented/integrated where the merged code exists, but its exact-head test/acceptance evidence is unresolved.


## G exact-head integration and release-quality evidence

`lib/fp/release-assurance.ts` evaluates the existing `.github/workflows/ci.yml` result for one exact pull-request candidate. It requires all four current mainline CI jobs:

- `resolve-candidate`: exact candidate and PR metadata resolution.
- `quality`: locked install, unit tests, type checking, lint, audits, and production build.
- `build`: Windows runner, Docker, and bounded local Ollama integration.
- `database`: isolated Supabase migrations, PostgreSQL, and RLS integration.

The evaluator binds the evidence to the candidate repository, head repository, PR number, exact 40-character head SHA, `pull_request` event, `main` base branch, canonical CI workflow path, run ID/attempt, and run/job URLs. A skipped, cancelled, missing, pending, stale, foreign-repository, or mismatched-PR result cannot be treated as a pass.

G assessment states are `blocked`, `stale`, `incomplete`, and `ready-for-review`. The last state means only that the four required exact-head CI jobs passed and the candidate may proceed to independent review. It never authorizes merge or deployment.

This is a pure evaluator: it does not call GitHub, run tests, modify branch protection, change CI workflows, grant approvals, merge, or deploy. The caller must obtain run/job metadata from the trusted GitHub Actions API; untrusted user-supplied evidence must not be passed as authoritative CI evidence.

Tests cover exact-head success, missing jobs, failed/skipped/cancelled jobs, stale SHA, foreign repositories, wrong PR number, untrusted workflow/event/base branch, pending jobs, duplicate job evidence, and forged run/job URLs.


## P advisory governance dossier

`lib/fp/governance-assurance.ts` adds a versioned, read-only governance dossier evaluator for all eleven F–P workstreams. It requires an opaque accountable-owner reference and exactly one registered evidence category per workstream, with evidence bound to the exact candidate SHA.

The policy catalogue requires security assurance (F), exact-head CI (G), observability tests (H), bounded-integration approval evidence (I), advisory-only review (J), documentation provenance (K), a federation deferral record (L), compliance/risk review (M), privacy/analytics review (N), lifecycle/compatibility review (O), and governance review (P).

The evaluator distinguishes missing, stale, not-run, failed, and complete evidence. L is rejected if its lifecycle is anything other than deferred. Records for A–E, duplicate workstreams, unknown policy versions, unregistered evidence kinds, unsafe references, and malformed owner references are rejected.

A `ready-for-human-review` dossier is only a completeness result. P does not grant governance approval, user permission, execution authority, merge authorization, deployment authorization, or federation activation. Owner references and evidence references are opaque metadata supplied by the trusted host; this evaluator does not authenticate their source or independently verify the referenced artifacts.


## F exact-run security evidence binding

The F evaluator now maps each registered control to the existing CI job that actually runs it:

- `member-isolation` and `database-privileges` require the `database` job, which starts an isolated local Supabase instance, applies migrations, runs `supabase test db`, and runs the two-member application RLS harness.
- `security-headers` and `route-authorization` require the `quality` job, which runs the repository's unit-test suite.

Each evidence record must identify the same repository, PR number, candidate head SHA, `pull_request` event, `main` base, canonical CI workflow, run ID/attempt, and run URL. The job URL must belong to that run, and the control must reference its registered job category. All four controls must refer to one shared run and attempt. Skipped, cancelled, failed, or otherwise non-success CI jobs cannot support a passing F control.

This tightens evidence traceability; it still does not execute tests or authenticate the evidence source. The caller must obtain metadata from the trusted GitHub Actions API and must not accept caller-authored evidence as authoritative.
