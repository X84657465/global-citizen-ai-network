# GCAN F–P Integration Acceptance Ledger

**Baseline:** `main` at `a1c1b58e4d1852f5a09a0e7c6c5cbeb38e1f9582` (PR #259 base at the 2026-11-22 integration refresh)  
**Scope:** F–P shared-core integration only  
**Protected boundary:** A–E and Agent Factory V2 execution authority remain unchanged  
**Status:** Initial engineering ledger; no workstream is declared accepted by this document.

## 1. Operating rules

1. Every implementation change is isolated on a workstream/integration branch and reviewed through a Draft PR.
2. A passing result is valid only for the exact candidate HEAD SHA, workflow run ID, and run attempt.
3. CI success permits human review; it does not grant approval, merge, deployment, production-data, or credential authority.
4. Reuse the existing platform identity, database, middleware, CI, Runner and Agent Factory. Do not introduce parallel services without a separately approved architecture decision.
5. Keep evidence privacy-minimized. Never put secrets, raw user content, credentials, or host paths in shared event envelopes.
6. L federation and J autonomous repair remain disabled. I external side effects remain bounded and require explicit host approval.

## 2. Workstream implementation and acceptance matrix

| Line | Existing implementation evidence | Remaining acceptance work | Authority / guard |
|---|---|---|---|
| F — Security | Security assurance evaluator; RLS/privilege SQL tests (including transitive API-role membership); two-member RLS harness; security headers and route checks | Verify every registered control against exact-head database/quality job evidence; close threat-model and vulnerability-scan coverage gaps | Advisory only; no identity or RLS policy redesign |
| G — Release quality | Exact-head release evidence evaluator and required CI job contract; new F–G shared-run evaluator | Verify all required jobs against live Actions API evidence; add compatibility checks and documented rollback evidence; prove F and G bind to the same run ID and attempt | Advisory only; never merge/deploy |
| H — Observability | Request correlation middleware/helper; bounded process-local F–P outcome recorder; Runner snapshot contract | Prove end-to-end correlation across actual routes/jobs; distinguish local counters from persistent metrics/traces; add alert evidence only where a real sink exists | Advisory only; no telemetry vendor or secret-bearing payload |
| I — External integration | Bounded capability registry and host approval check | Define one approved connector at a time, credential reference contract, timeout/retry/idempotency and mock contract tests | Bounded; explicit approval required; no live credential or external write in this phase |
| J — Resilience | Advisory diagnosis/repair-proposal contract; existing Factory recovery controls remain owned by A | Add evidence-backed diagnosis and dry-run proposal tests; document operator confirmation and rollback | Advisory only; no autonomous production repair |
| K — Knowledge | Existing architecture, security and operations documents | Keep this ledger, interface catalogue, runbooks and handover synchronized with accepted implementation | Documentation only; no runtime authority |
| L — Federation | Contract placeholder only | Remain deferred until F, H, capacity, isolation and independent security gates pass | Disabled; no node registration or distributed execution |
| M — Compliance/risk | Governance evidence types and security/audit foundations | Build a scoped control map and risk register; distinguish engineering controls from legal certification | Advisory only; no compliance certification claim |
| N — Product analytics | Privacy-minimized event concepts only | Define approved aggregate events, retention and privacy review before collection or dashboards | No collection pipeline or user-level profiling enabled |
| O — Lifecycle | Numeric root/track version metadata and release evidence | Define support windows, deprecation notices, compatibility tests and migration rollback evidence | Advisory only; no automatic retirement |
| P — Governance/trust | Governance dossier evaluator plus exact-head GitHub PR/review collector and host permission-verification contract | Collector verifies current open same-repository PR head/base, reads complete paginated review history, binds reviews to commit SHA and asks the trusted host to verify reviewer permissions. Remaining: wire the existing host permission provider at the production entry point and verify exact-head CI/review | Advisory only; no policy mutation or automatic approval |

## 3. Five-stage execution ledger

| Stage | Deliverable | State | Exit evidence |
|---|---|---|---|
| 1. Planning and decision gate | Research plan and explicit user authorization | **Approved** | User authorization recorded in conversation |
| 2. Infrastructure confirmation | Confirm existing CI, test runner, correlation boundary, F–P contracts and protected A–E boundary | **In progress** | Repository-backed inventory and cross-file regression checks |
| 3. Workstream implementation | Implement missing F–P slices in dependency order; tests for each slice | **Started** | Exact-head CI plus focused unit/integration tests |
| 4. Integration acceptance | F–P acceptance matrix with exact SHA, run/attempt, job evidence, reviewer and rollback | **Pending** | All required evidence current and human review recorded |
| 5. Handover | Architecture map, interface catalogue, risk register, task ledger and Master Brief | **Pending** | Versioned handover bundle tied to accepted commit |

## 4. Dependency order

`F → G → H → P` establishes the security, release-evidence, observability and governance floor. I/J/M/N/O/K then integrate against those stable contracts. L remains deferred and is not on the activation critical path.

## 5. P governance review provenance and collection slice (2026-11-22)

- Governance policy v2 binds review records to the exact candidate SHA and stores opaque review, reviewer and host authorization references plus a UTC submission timestamp.
- The evaluator selects each reviewer's latest decision, rejects stale review evidence, flags conflicting decisions at the same timestamp and does not count unverified reviewer attestations as verified.
- Reviewer authentication remains the trusted host's responsibility. The evaluator does not fetch GitHub permissions or authenticate identities; an approved review remains descriptive and grants no governance, execution, merge or deployment authority.
- Regression tests cover stale approvals, unverified reviewers, latest-decision semantics, fractional timestamp ordering, conflicting decisions, unsafe/duplicate references and bounded input size.
- Added a host-facing GitHub review collector that verifies the live PR remains open on the exact same-repository SHA targeting main, paginates the complete review history (up to a safe bound), maps submitted decisions and delegates permission checks to a trusted-host callback. This reusable boundary is not yet wired into the production host entry point.

## 6. Latest F–G implementation slice (2026-11-22)

- Added `lib/fp/f-g-integration-assurance.ts` to evaluate F security controls and G required release jobs as one evidence bundle.
- The evaluator rejects mismatched repository/PR/candidate SHA and mismatched GitHub Actions run ID or attempt. Missing F evidence remains incomplete; failed registered F controls or required G jobs block the integrated result.
- Added focused regression tests for a shared exact run, mismatched run IDs/attempts, absent F evidence, failed G jobs and failed F controls; the mainline integration guard checks that the evaluator and test are present.
- The evaluator is advisory only. It explicitly returns `acceptanceGranted: false`, `mergeAuthorized: false` and `deploymentAuthorized: false`.
- Release metadata advanced to `0.3.120` (governance revision `1.4.16`). PR #229 merged this implementation at `ef543ebeecf56785dc752fdb8ac9305862bb269e`; it remains unaccepted pending exact-head CI and independent review.
- Exact PR run `44926059712` completed with overall `success`, but its resolver log explicitly reported `Stale or closed pull-request event ignored; current PR head differs from the event SHA/ref.` Quality, Ollama/build, database/RLS, diagnostics and persistence jobs were all skipped. This is not valid F–G acceptance evidence. Main push run `44926070210` was cancelled; no exact-head mainline quality evidence is available.

## 6. Latest H implementation slice (2026-11-22)

- Added `createCorrelationContext` to the existing request-context helper. It validates or generates one bounded correlation ID, forwards it to route handlers, and returns the same ID in a separate response-header collection.
- Updated the existing Next.js middleware to consume the paired context for both downstream request headers and response headers. Existing Supabase session refresh and cookie propagation remain intact.
- Expanded request-context regression tests for valid ID reuse, absent/malformed/oversized IDs, consistency between request and response, preservation of unrelated request headers, and isolation from header mutation.
- Extended the mainline F–P integration guard to verify that the middleware uses the paired contract. No route payload, identity, authorization, or secret is included in correlation metadata.
- Release metadata advanced to `0.3.122` (governance revision `1.4.18`). This slice is on an isolated branch and is not accepted until exact-head quality CI and independent review complete.
- PR #229 F–G implementation is merged at `ef543ebeecf56785dc752fdb8ac9305862bb269e`, but remains unaccepted: exact-head PR CI run `44926059712` completed overall success with all substantive quality/build/database/persistence jobs skipped; main push CI run `44926070210` was cancelled.
- Agent Factory V2 candidate revalidation is under development in PR #231 at exact HEAD `794bcd20df635580d80da512de12a59015041037`; exact-head CI run `44928183277` remains pending at the resolver job. Do not treat earlier cancelled runs as evidence for this HEAD.
- Runner queue isolation is proposed in PR #235 at exact HEAD `c0014d6a1267cf0569fb110c87288a3317597731`; CI run `44927965451` remains pending at the resolver job. The current mainline recovery workflow still has workflow-level concurrency, and multiple recovery workflow_run events remain pending; the fix is not yet on main.
- H correlation changes are proposed in this PR at exact HEAD `f409b829bbe9a57051261da88e75f751fbc275cc`; CI run `44926765076` remains pending at the resolver job. This branch is not accepted.

## 7. Current blockers and known limitations

- Recent Vercel status checks have reported provider `build-rate-limit` failures. This is an external deployment-status failure, not evidence that application tests failed.
- The mainline System Health Recovery workflow now places the shared Runner concurrency group at the guarded `reset-system-breaker` job and filters recovery to successful same-repository AI-task PR runs. This avoids reserving the shared queue for failed/cancelled/non-task `workflow_run` events. The earlier PR #235 proposal is closed and unmerged; its relevant behavior is present on `main` and must be validated against the current workflow source rather than treated as an outstanding patch. The current PR #259 exact-head run `44945792527` is pending with no jobs assigned, so the remaining blocker is runner scheduling/availability evidence; pending metadata alone does not prove the Runner is offline.
- No independent PR reviews have been recorded for #231, #233 or #235. The Windows self-hosted Runner is the execution dependency; do not infer that it is offline from pending workflow metadata alone.
- GitHub Actions results must be inspected per exact candidate SHA; a missing result or an empty workflow-run lookup is not a pass.
- The process-local F–P recorder is not a centralized persistent telemetry backend. Correlation propagation is now paired at the middleware edge, but end-to-end route/job logging and a durable telemetry sink remain unimplemented.
- The registry and host adapter do not themselves authenticate principals; the existing trusted host must supply authorization and approval decisions.
- No production database migration, secret change, branch-protection change, automatic merge, or deployment is authorized by this ledger.

## 8. Rollback

This initial slice is additive test and documentation work. Revert the integration PR to remove it. No schema, secret, runtime execution, or production deployment changes are included.

## 7. H observability metadata hardening (2026-11-22)

- Hardened the bounded process-local recorder at its runtime boundary: only registered F–P workstreams and known outcome values are accepted; timestamps must be explicit UTC ISO values; capability, correlation and optional error-code metadata are length/character bounded.
- Added regression coverage for invalid workstream IDs, unknown outcomes, offset timestamps and unsafe free-form error strings, while preserving valid bounded operational error codes.
- This prevents malformed or arbitrary runtime values from corrupting health counters and reduces the chance that raw error text or secret-bearing strings enter the telemetry buffer.
- This remains process-local operational evidence, not durable metrics/traces or a production alerting sink. Exact-head CI and independent review remain required.


## 8. Shared CI baseline and exact-head integration refresh (2026-11-22)

- PR #267 is the shared CI baseline candidate at exact HEAD `6baa233e30192d5b360617d7f0079d840c78821a`. It synchronizes the package-lock root metadata with `VERSION`, `package.json` and `versions/manifest.json` at `0.3.124`, without changing dependency ranges or resolved package artifacts. Exact-head Actions run `44944336578` (#3179) is still pending at candidate metadata resolution; no quality, database/RLS or Ollama gate is recorded as passed for this run.
- PR #259 is the Agent Factory V2 / F–P integration candidate at exact HEAD `b5713d42935a0fe8cb019cecbca5f1a6b1628bb1`. Its schema guard was synchronized with the exact shared-baseline implementation from #267: it checks that the declared pgTAP plan equals the actual `ok()` assertion count (minimum 15), while retaining the required table privilege, internal-table RLS and public-sequence assertions. The change does not relax database policies or runtime authorization.
- Exact-head Actions run `44944539621` for #259 is pending at candidate metadata resolution. The previous run `44944042121` targets the superseded pre-synchronization SHA and is not acceptance evidence for the current HEAD.
- #267 and #259 have no formal review submissions or inline review threads recorded at this refresh. Both remain Draft and unmerged. CI pending status, GitHub mergeability and source-level checks are not acceptance or approval.
- Integration order remains: establish and validate #267 shared CI baseline; then revalidate #259 on its exact current SHA; then integrate F/G/H/P and remaining F–P workstreams in the dependency order above. Do not merge or deploy until required exact-head gates and independent review are recorded.


## 7. GitHub collaborator permission API compatibility correction (2026-11-22)

- The P trusted-host permission adapter now consumes GitHub's collaborator API base permission values: `admin`, `write`, `read`, and `none`. GitHub maps the `maintain` role to `write` and the `triage` role to `read` in this response.
- Only `admin` and `write` count as verified review authority; `read` and `none` remain insufficient. Permission lookup failures remain unverified.
- Regression tests cover all four API base permission values and the end-to-end trusted-host composition. This is a compatibility correction, not a permission expansion or automatic approval.
- Exact-head CI and independent review are still required; this change does not grant governance approval, merge, execution, or deployment authority.


## 8. Strict governance review timestamp validation (2026-11-22)

- Hardened the P dossier evaluator to validate UTC timestamp calendar and clock components, not merely rely on `Date.parse` (which can normalize impossible dates such as February 30).
- Added regression coverage for impossible month/day combinations, hour 24, minute/second 60, and fractional precision beyond milliseconds.
- This mirrors the collector's strict timestamp validation and prevents malformed manually supplied review evidence from entering the latest-decision ordering logic.
- Exact-head CI remains the acceptance authority; no review or merge decision is inferred from these local source changes.
