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


## 8. Source implementation cross-check — 2026-11-22 (read-only)

The proposal was compared against current main `061ccf621c228bae93b91cd8c53723c3fe08310a`:

- `lib/agent-factory-state-machine.mjs` declares the full private `TASK_STATES` set: `queued`, `reserved`, `preparing`, `planning`, `patching`, `sandbox_testing`, `publishing`, `draft_pr_created`, `awaiting_ci`, `completed`, `retry_wait`, `candidate_rejected`, `quarantined`, and `superseded`. The v1 mapping table above covers every current value; unknown future values must still fail closed.
- A's durable task record contains structured `head_sha`, `pull_request_number`, `ci_run_id`, and `ci_run_attempt` fields. The state machine validates their formats and requires all four to match when recording terminal candidate evidence. The controller also re-fetches the PR and workflow/job evidence against the exact SHA and run attempt.
- Internal `candidate_status` values are not public values. The proposal maps them to the bounded product vocabulary and must not serialize the internal strings.
- This is source-data and validation evidence only. No dedicated A-owned product projection endpoint or B runtime adapter was found/accepted in this cross-check.

### Remaining pre-implementation contract item

The DTO includes `failureCategory`, but a reviewed allowlist mapping from A error codes to the public categories is not yet implemented. Before B consumes it, define that mapping from concrete A error codes, default unknown/unrecognized codes to `unknown`, and never expose raw exception text, internal transition reasons, or arbitrary error objects.

B still owns authentication, workspace membership, tenant mapping, and RLS/IDOR enforcement. A's internal issue/lease/Runner state is not a product API. Do not implement or activate the adapter until A passes its acceptance gates.


## 9. Failure-category allowlist proposal — 2026-11-22

The DTO's `failureCategory` MUST be derived only from a reviewed allowlist of stable machine error codes. Never classify by matching free-form `last_error` text, exception messages, workflow log text, or task summaries.

| A persisted machine code | Product category | Evidence / limitation |
|---|---|---|
| `STALE_BASE` | `validation` | PR #303 writes this code for the two explicit default-branch-drift publisher guards, alongside task scope. It means the tested candidate base is stale and must not be treated as a repository-wide infrastructure fault. |
| `WORKER_LEASE_EXPIRED` | `infrastructure` | A state-machine recovery code after confirming the worker workflow is no longer running and the lease expired. |
| `WORKFLOW_FAILURE` | `unknown` | Controller fallback when the workflow does not supply a structured code. |
| `TASK_FAILURE` | `unknown` | State-machine fallback; too broad to imply validation or execution semantics. |
| `SYSTEM_FAILURE` | `unknown` | State-machine fallback; too broad to imply a specific infrastructure cause. |
| Missing or unrecognized code | `unknown` | Fail closed; never pass through the source value. |

Candidate CI failures are currently recorded through the candidate-evidence path without a dedicated stable failure code. They MUST remain `unknown` unless A later adds a structured, exact-SHA/run-attempt failure code and contract tests. Do not infer `validation` from a generic failed CI conclusion; a failed run can include infrastructure or provider failures.

### Exact implementation dependency

PR #303 HEAD `0b521e654de819098fb59e86eb024bd75cc56810` now writes both `AGENT_FACTORY_FAILURE_SCOPE=task` and `AGENT_FACTORY_ERROR_CODE=STALE_BASE` to GitHub Actions' environment file. The existing A controller consumes `AGENT_FACTORY_ERROR_CODE`, with `WORKFLOW_FAILURE` as its fallback. This source change is not accepted until its own exact-head CI and independent review pass.

The category table is a proposed public projection mapping, not a new A internal state enum. B receives only the public category; it must not receive raw machine codes, failure summaries, task/system scope, or internal transition details.


### End-to-end source propagation cross-check — 2026-11-22

A source-level trace on the #303 candidate branch confirms the complete propagation path:

1. Both explicit stale-default-branch guards in `scripts/publish-agent-patch.mjs` call the shared `fail(message, "task")` path.
2. That failure path calls `persistPublicationFailureScope("task")`; the helper appends both `AGENT_FACTORY_FAILURE_SCOPE=task` and `AGENT_FACTORY_ERROR_CODE=STALE_BASE` to GitHub Actions' `GITHUB_ENV`.
3. The preflight workflow's subsequent `failure()` classifier reads the persisted task scope and preserves it for the final failure-recording step.
4. The final failure-recording step runs `scripts/agent-factory-v2-controller.mjs`; its controller reads `AGENT_FACTORY_ERROR_CODE` and persists the stable code, falling back to `WORKFLOW_FAILURE` only when no code was supplied.

This verifies the source wiring, not a runtime pass. PR #303 exact-head run `44976387404` is still pending with zero allocated jobs, so the full chain remains unverified by an executed CI run. The proposed B projection continues to expose only the allowlisted public category, never the raw machine code or failure summary.


### Publisher call-site regression evidence — 2026-11-22

PR #303 HEAD is now `3dfb78df3a784d02f63b2378dff5f7a1af59ae24`. In addition to the helper's environment-file assertion, its regression suite now reads the publisher entrypoint and asserts that both explicit default-branch drift guards pass the task-scoped classification to the helper exactly once. This guards against a future edit silently removing the classification at either call site.

The test has been committed but has not run on this exact SHA. It is source/test coverage only; do not treat it as a passing validation result or as independent review.


### End-to-end stale-base classifier regression coverage — 2026-11-22

PR #303 HEAD `9b1097484e868d8c78b752c1372f6c6964a36ed3` adds a second source-level regression guard: it reads the workflow and controller to assert that the failure classifier preserves task scope and that the controller consumes `AGENT_FACTORY_ERROR_CODE` when recording the task failure. Together with the publisher-callsite and helper environment-file tests, the regression coverage now spans the publisher guards → workflow classifier → controller error-code argument.

This remains static regression coverage only. It has not executed on this exact HEAD, and it is not independent review or runtime acceptance.

## 10. Current-main handoff checkpoint — 2026-11-22

This section supersedes the older source-SHA snapshots above where they conflict. The authoritative mainline inspected for this checkpoint is `c4f46dbcc78b40cb3a4f31a6d3513f6e922aca79` (root release `0.3.125`; Agent Factory V2 `2.0.84`).

### A source-of-truth verification

- `lib/agent-factory-state-machine.mjs` stores candidate evidence as structured `head_sha`, `pull_request_number`, `ci_run_id`, and `ci_run_attempt` fields. Terminal candidate transitions require the evidence tuple to match the task's current candidate tuple; the controller re-fetches the PR and verifies repository, PR, branch, author, head SHA, workflow run and attempt before persisting success/failure evidence.
- `lib/agent-factory-evidence.mjs` still creates `EvidenceRecord v1.0.0` for C/D consumption. Its `command` field is descriptive text containing Issue/PR/run/attempt references; it is not a structured B API and MUST NOT be parsed to reconstruct security-sensitive evidence.
- The current `lib` tree contains the internal Factory state/controller/evidence modules but no dedicated A-owned Product read-projection module. The current `app/api` tree has Product project/conversation routes but no Factory projection route. Therefore the proposed A-owned projection remains **not implemented**.
- Existing B project/conversation routes use the authenticated Supabase client and owner-scoped queries. Those routes are not evidence that Factory task ownership has been mapped to a Product workspace; the adapter still needs an explicit trusted task-to-workspace mapping and cross-workspace tests.

### B stack and activation status

- The earlier governance/migration/B stack is not integrated into current `main`: PR #185 was closed unmerged; PR #186 merged only into the governance branch; PR #187 merged only into the migration branch. Their branch ancestry does not authorize transplanting the old stack or enabling B Runtime on current main.
- B remains a preparation-only consumer of the proposed v1 contract. Do not add a Factory route, Product table, connector, feature flag activation, billing path, or write API before A's projection and acceptance gates pass.
- The F–P `FPCapabilityEnvelope` contract remains a separate F–P workstream transport boundary. It does not implement or authorize the A-to-B Product read adapter.

### Current A gate

- Current A-line CI-policy candidate PR #331 is at head `d2fb71191826555346bddda96bcd85fd5b633e45`. Its exact-head Actions run [#45007242541](https://github.com/X84657465/global-citizen-ai-network/actions/runs/45007242541) was pending with no jobs allocated at this checkpoint; no pass is claimed for the current head.
- The previous #331 head `c19aec7195421dd74e2e244561e80b7495d8a07f` had four substantive CI jobs pass, but that result does not transfer to the current head. No formal PR review has been submitted.
- Issue #136's requested independent read-only adversarial review remains an outstanding A governance gate. A source-level inspection by the current assistant is not an independent reviewer sign-off.

### Required next implementation boundary

After A is accepted and integrated, implement the projection as an A-owned read-only server-side boundary. It must emit only the bounded public status mapping, sanitized candidate status, verified exact-SHA/run-ID/run-attempt result and allowlisted failure category. B must independently authenticate the caller, derive workspace from the authenticated session, enforce membership/RLS/IDOR protections, and resolve task ownership from a trusted server-side mapping. Unknown A states, stale/missing CI attempts, unrecognized failure codes, invalid workspace mappings, and unknown contract versions must fail closed.

Until then, this document remains a design handoff only. A Factory internals remain private, B Runtime remains disabled, and no Product-facing Factory data is exposed.

