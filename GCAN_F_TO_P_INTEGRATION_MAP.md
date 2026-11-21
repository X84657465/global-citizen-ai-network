# GCAN F–P Integration Map

**Baseline:** main `a1c1b58e4d1852f5a09a0e7c6c5cbeb38e1f9582`  
**Boundary:** F–P are hosted by the existing GCAN platform. A–E and Agent Factory V2 remain protected.

## 1. Logical integration

```text
Existing GCAN platform (A–E)
  ├─ existing identity / session / authorization
  ├─ existing Next.js middleware and API routes
  ├─ existing database and RLS policies
  ├─ existing CI, Windows Runner and Agent Factory V2
  └─ trusted host context
          │
          ▼
   F–P shared capability contract
          │
          ├─ F  security assurance / controls
          ├─ G  release quality / exact-head CI evidence
          ├─ H  correlation / operational outcome evidence
          ├─ I  bounded external connector registry
          ├─ J  advisory diagnosis / repair proposal
          ├─ K  versioned knowledge / runbooks
          ├─ L  deferred federation contract
          ├─ M  compliance and risk evidence
          ├─ N  privacy-minimized aggregate analytics concepts
          ├─ O  lifecycle and compatibility evidence
          └─ P  governance dossier / review provenance
```

F–P is not a parallel application, database, identity provider, task runner, queue or deployment system.

## 2. Existing integration surfaces

| Surface | Code / location | Role | Limitation |
|---|---|---|---|
| F–P contract | `lib/fp/integration-contract.ts` | Typed workstream and capability definitions | Contract only; not a message bus |
| Host adapter | `lib/fp/host-adapter.ts` | In-process capability registration/invocation | Host must supply authenticated actor/resource context and authorization |
| Observability | `lib/fp/observability.ts` | Bounded outcome recorder and health snapshot | Process-local; no durable sink |
| F assurance | `lib/fp/security-assurance.ts` | Exact-candidate security evidence assessment | Does not execute or authenticate tests |
| G assurance | `lib/fp/release-assurance.ts` | Exact-head CI job evidence assessment | Requires trusted Actions API evidence |
| F–G combined assurance | `lib/fp/f-g-integration-assurance.ts` | Requires F and G to share run identity | Advisory only |
| H correlation | `lib/observability/request-context.ts`, `middleware.ts` | Paired request/response correlation ID | Route/job end-to-end proof still required |
| P dossier | `lib/fp/governance-assurance.ts` | Completeness and review provenance | Does not grant approval or authority |
| P review collector | `lib/fp/governance-review-source.ts` | Exact-head PR check and paginated submitted-review collection | Trusted-host permission callback must be supplied |
| P permission provider | PR #251: `lib/fp/github-review-permission.ts` | Read-only collaborator permission adapter using existing authenticated API client | Merged, but exact-head CI was pending at merge; follow-up path-validation fix and handover docs are on the isolated follow-up branch; not wired to a production route |

## 3. Dependency and call order

1. F defines the security evidence and real test/job mapping.
2. G verifies exact candidate CI and binds its run ID/attempt to F.
3. H carries correlation across the existing middleware edge and capability outcomes.
4. P collects exact-head review provenance and asks the trusted host to verify reviewer permissions.
5. I/J/M/N/O/K consume stable contracts and remain within their stated authority limits.
6. L remains deferred.

## 4. Trust and authority flow

- Existing host authenticates the user/session and determines whether the caller may invoke a capability.
- F–P receives opaque actor/resource references and a host authorization decision; it does not infer identity from those references.
- The P review collector verifies the current PR and review history through the existing GitHub API client.
- The P permission provider candidate reads the collaborator permission endpoint. The caller must inject an authenticated client and an independently authenticated host context.
- Permission lookup failure is unverified, never implicitly approved.
- A review marked approved is descriptive evidence only. P cannot authorize merge, execution or deployment.
- I side effects require explicit host approval. J remains dry-run/advisory. L remains disabled.

## 5. Data flow constraints

- Shared event envelopes contain contract version, workstream/capability, event ID, timestamp, correlation ID, opaque actor/resource references, optional idempotency key and a versioned payload.
- Never include credentials, tokens, raw user content, private host paths or unnecessary personal data.
- No new queue, persistent event store, analytics collection pipeline or telemetry vendor is implied by these contracts.
- Existing database and RLS remain the source of truth; no schema migration is part of this integration slice.

## 6. Protected integration boundary

No F–P change may modify:
- A–E runtime ownership or Agent Factory V2 lifecycle, lease, retry, quarantine, patch-integrity, sandbox, CI or publication authority;
- production authentication/session policy or database/RLS schema;
- GitHub/Vercel secrets, workflow permissions, branch protection or deployment settings;
- external connector credentials, production writes or federation execution.

All future changes must be isolated, reviewed and verified against their exact candidate SHA.
