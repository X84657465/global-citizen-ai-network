# Agent Factory → GCAN Product read adapter (proposal)

**Status:** Proposed contract only — not implemented, not accepted, and not an authorization to activate B.  
**Owner boundary:** A owns task scheduling, durable state, leases, Runner/Sandbox execution and candidate publication. B owns product identity, workspace tenancy, product APIs and billing.  
**Activation gate:** A Factory V2 must first pass exact-head CI, database/RLS, local execution, Preview and independent review, then be integrated into main.

## 1. Purpose

Define the narrow, versioned, read-only seam through which GCAN Product may display Factory task progress and candidate evidence after A is accepted. This is a product projection, not a second Factory controller.

The existing `EvidenceRecord v1.0.0` is model-independent evidence intended for C/D consumption. Its fields include repository, deterministic task branch, candidate SHA, a descriptive command string, pass/fail result, CI run URL and timestamp. The durable A task state separately stores the candidate SHA, PR number, CI run ID and run attempt as structured fields; the EvidenceRecord itself does not expose a dedicated structured B API or tenant authorization. The A-owned projection must read the structured state tuple and must never parse the descriptive `command` string to reconstruct security-sensitive fields.

The F–P `FPCapabilityEnvelope` is a transport envelope for F–P events. Its opaque actor/resource references do not authenticate identities or grant permissions; it is not a substitute for B's product authorization boundary.

## 2. Proposed read model — version 1

The following is a logical schema proposal. Exact wire names and storage are subject to implementation review after A acceptance.

```ts
// Product-facing states are deliberately coarser than A's private state machine.
type FactoryTaskStatus =
  | "queued" | "in_progress" | "candidate_ready" | "verification_pending"
  | "completed" | "needs_attention" | "closed";

type CandidateStatus = "pending" | "passed" | "not_passed";
type CandidateCiState = "not_started" | "queued" | "in_progress" | "completed" | "unavailable";
type CandidateCiConclusion = "success" | "failure";
type FactoryFailureCategory =
  | "validation" | "execution" | "infrastructure" | "policy" | "unknown";

interface FactoryTaskReadModelV1 {
  contractVersion: "1";
  taskRef: string;
  workspaceRef: string; // B-owned tenancy binding; never trusted from A alone
  status: FactoryTaskStatus; // A-owned projection only; never exposes A internal enum values
  createdAt: string;        // RFC 3339 UTC; sourced by A's projection
  updatedAt: string;        // RFC 3339 UTC; sourced by A's projection
  candidate?: {
    candidateRef: string;   // opaque, A-issued projection reference
    commitSha: string;      // full 40-char SHA
    pullRequestNumber: number;
    candidateStatus: CandidateStatus;
    ci: {
      state: CandidateCiState;
      conclusion: CandidateCiConclusion | null; // non-null only for verified terminal exact-attempt evidence
      startedAt?: string;   // RFC 3339 UTC; absent until an attempt actually starts
      completedAt?: string; // present only for verified terminal candidate evidence
      evidenceRef?: string; // opaque reference; present only with verified terminal evidence
    };
  };
  failureCategory?: FactoryFailureCategory; // allowlisted enum only; no raw exception text
}
```



### Normative projection rules

The table below is the sole public mapping authority for v1. The TypeScript DTO above describes the public contract; it does not mirror or re-export A's private lifecycle enum. Implementations MUST reject unknown A states and MUST NOT fall back to serializing their raw value.

For candidate CI:
- Before any CI attempt exists, use `state: "not_started"`, `conclusion: null`, and omit `startedAt`, `completedAt`, and `evidenceRef`.
- For queued or running attempts, use `queued` or `in_progress`; keep `conclusion: null` and omit terminal timestamps/evidence.
- Use `completed` and a non-null conclusion only after the A-owned projection verifies the candidate SHA, PR number, CI run ID, and run attempt as one exact tuple.
- A completed failure may expose `conclusion: "failure"` and `candidateStatus: "not_passed"`. A success may expose `conclusion: "success"` and `candidateStatus: "passed"`.
- If the current attempt is unavailable, stale, cancelled, skipped, or cannot be verified, use `state: "unavailable"`, `conclusion: null`, and omit `evidenceRef`; never infer success from an earlier SHA or attempt.
- `startedAt` and `completedAt` are optional because a candidate can exist before a CI attempt starts. They must be sourced from the verified attempt, not synthesized from task timestamps.

### Source-of-truth alignment and privacy-preserving status projection

The product contract MUST NOT mirror A's private lifecycle enum. The A-owned projection maps internal states to this bounded public vocabulary:

| A internal state | Product-facing status |
|---|---|
| `queued` | `queued` |
| `reserved`, `preparing`, `planning`, `patching`, `sandbox_testing`, `publishing` | `in_progress` |
| `draft_pr_created` | `candidate_ready` |
| `awaiting_ci` | `verification_pending` |
| `completed` | `completed` |
| `retry_wait` | `queued` |
| `candidate_rejected`, `quarantined` | `needs_attention` |
| `superseded` | `closed` |

- The public DTO must never return internal enum values, lease/Runner/quarantine details, retry counters, cooldown state, or internal transition reasons. Unknown internal states fail closed rather than being passed through.
- A candidate has a separate product-facing `candidateStatus`: `pending`, `passed`, or `not_passed`. Internal retry states map to `pending`; raw internal candidate-state values are not serialized.
- A's durable state stores `head_sha`, `pull_request_number`, `ci_run_id`, and `ci_run_attempt` as structured fields. The A-owned projection MUST bind all four to one verified PR/run attempt before producing any terminal result. The CI run ID and attempt are server-side verification inputs, not public DTO fields; expose only the verified conclusion and opaque `evidenceRef`. Never reconstruct run identity from the EvidenceRecord's descriptive command text.

The adapter MUST NOT return raw Factory Issue bodies, worker prompts, patches, raw CI logs, secrets, access tokens, host paths, environment variables, arbitrary URLs, or unbounded exception text. A public run URL is optional and should be generated by a trusted server from validated repository/run identifiers, not accepted as an arbitrary client-supplied URL.

## 3. Authorization and tenancy

1. B authenticates the caller using the product identity system and derives the workspace from the authenticated session.
2. B authorizes workspace membership and role before calling the adapter. A caller-supplied `workspaceRef` is never an authorization credential.
3. A returns only a sanitized task projection after verifying the requesting product integration's server-side authorization. Opaque actor/resource references alone are not proof of identity.
4. Task-to-workspace ownership is established by a trusted server-side mapping created at task submission. Never infer ownership from Issue number, PR author, branch name or client payload.
5. Cross-workspace enumeration, reference substitution and IDOR attempts must fail closed and emit privacy-minimized audit events.

## 4. Consistency and evidence semantics

- Every candidate result binds to the exact full commit SHA, CI run ID and run attempt.
- A new commit invalidates any previous candidate CI evidence for the new head until a matching run completes.
- Non-terminal CI states are progress only, never pass evidence.
- A successful CI result means only that the configured checks passed for that exact attempt. It does not authorize merge, deployment, billing, workspace privilege changes or production actions.
- The adapter is read-only and idempotent. B cannot reserve tasks, change lifecycle status, renew/release leases, retry privileged execution, write Factory state or publish candidates.
- Timestamps must be UTC, bounded and validated. Failure categories must come from a small allowlist.

## 5. Versioning and compatibility

- Contract version is explicit and additive changes are permitted only when old consumers remain valid.
- Breaking field or semantic changes require a new major contract version and a documented compatibility window.
- Contract tests cover valid/invalid payloads, the explicit internal-to-public status mapping (including proof that private enum values never leak), unknown enum values, malformed SHA, timestamp validation, missing CI attempt, stale-head evidence, duplicate reads and cross-workspace authorization failures.
- Consumer tests must prove that unknown future fields are ignored safely while unknown contract versions fail closed.

## 6. Delivery sequence after A acceptance

1. Freeze the accepted A evidence/state interface and document its source-of-truth semantics.
2. Add an A-owned server-side projection that emits the sanitized read model; do not expose the internal GitHub Issue store as a public product API.
3. Add B-owned workspace authorization and tenant mapping; verify RLS and IDOR isolation with at least two workspaces.
4. Implement the read-only adapter and contract tests; no write methods in v1.
5. Integrate one B product surface behind a feature flag only after independent review.
6. Verify exact-head CI, database/RLS, audit events, Preview and rendered product behavior before enabling the surface.

## 7. Acceptance checklist

- [ ] A Factory is accepted and integrated into main.
- [ ] A-owned projection provides structured exact-SHA/run-ID/run-attempt evidence without parsing descriptive strings.
- [ ] B identity and workspace authorization are independently enforced.
- [ ] Two-workspace RLS/IDOR tests pass.
- [ ] Read model is bounded, versioned, privacy-minimized and read-only.
- [ ] Stale candidate evidence cannot be represented as current success.
- [ ] Independent security and product review completed.
- [ ] Exact-head CI and Preview acceptance completed.

Until all gates pass, this document is a design handoff only. No B runtime route, database table, connector, billing, public registration or Factory access is activated.
