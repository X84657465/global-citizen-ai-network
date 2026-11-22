# GCAN F–P Integration Acceptance Ledger

**Baseline:** `main` at `4bf472881ea4afabd9f29c4d58365c3ae6c3d2af`  
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
- At the current main baseline `4d3653b3da766ae3910aeef39bd840d2e6de30dd`, the CI push run `44928069201` remains pending. The mainline System Health Recovery workflow still declares the shared Runner concurrency group at workflow scope; multiple `workflow_run` events are pending without jobs. PR #235 moves the lock to the guarded job and filters to AI Task branches, but that change has not passed exact-head CI or merged.
- No independent PR reviews have been recorded for #231, #233 or #235. The Windows self-hosted Runner is the execution dependency; do not infer that it is offline from pending workflow metadata alone.
- GitHub Actions results must be inspected per exact candidate SHA; a missing result or an empty workflow-run lookup is not a pass.
- The process-local F–P recorder is not a centralized persistent telemetry backend. Correlation propagation is now paired at the middleware edge, but end-to-end route/job logging and a durable telemetry sink remain unimplemented.
- The registry and host adapter do not themselves authenticate principals; the existing trusted host must supply authorization and approval decisions.
- No production database migration, secret change, branch-protection change, automatic merge, or deployment is authorized by this ledger.

## 8. Rollback

This initial slice is additive test and documentation work. Revert the integration PR to remove it. No schema, secret, runtime execution, or production deployment changes are included.


## 9. Mainline reconciliation checkpoint (2026-11-22, authoritative SHA `23fb747ae4041bc28783a1b9039660ec952c7e0d`)

This section supersedes historical branch/PR status statements above where they conflict with the current mainline. Earlier entries are retained as historical evidence, not current acceptance claims.

### Current implementation inventory

- **F — Security:** the current mainline contains the security-assurance evaluator, member-isolation and database-privilege regression tests, transitive API-role membership checks, security-header checks and route-authorization checks. These are implementation/test artifacts, not proof that the required database and quality jobs passed on the current candidate SHA.
- **G — Release assurance:** the exact-head release evaluator and required CI-job contract are present. The F–G integration evaluator binds security and release evidence to the same repository, PR, candidate SHA, workflow run ID and attempt. It remains advisory and cannot authorize merge or deployment.
- **H — Observability:** request correlation is paired through the existing middleware edge. The outcome recorder remains process-local; no durable central telemetry backend or end-to-end route/job trace coverage is established by that fact alone.
- **P — Governance:** the read-only governance-review endpoint is now present on mainline and uses authenticated active-admin access plus a configured read-only GitHub token. Review evidence is tied to the live same-repository PR head and trusted-host reviewer-permission checks. The endpoint explicitly does not grant governance approval, merge authority or deployment authority. Route/test presence is not equivalent to current-SHA CI acceptance.
- **I/J/M/N/O/K:** retain their bounded/advisory/documentation-only authority contracts. No live external side effects, autonomous production repair, user-level analytics collection, automatic lifecycle retirement or compliance certification is authorized.
- **L:** remains deferred and disabled.

### Exact current acceptance blockers

1. Mainline is `23fb747ae4041bc28783a1b9039660ec952c7e0d`. The latest inspected push Preflight run #315 (`44967397478`) failed after the isolated Docker test run reported 602 unit tests passing; host-side validation then used unsupported system Node `v26.13.0` with `--experimental-transform-types`. The subsequent host TypeScript/ESLint steps were skipped. This is not a passing mainline quality gate. The Node 22.13.0 pin proposal is Draft PR #293 and must pass its own exact-head CI before acceptance.
2. The latest inspected combined status for this mainline SHA reports Vercel `Deployment rate limited — retry in 24 hours`. No same-SHA READY Preview or Smoke evidence was established in this checkpoint.
3. Independent adversarial review Issue #136 remains open and explicitly read-only. No internal inspection, merged code, or CI run substitutes for that independent review of Agent Factory V2. A remains unaccepted; dependent activation stays blocked.
4. PR #259 is a stale integration candidate based on an older mainline. Its earlier exact-head CI cannot validate `23fb747ae4041bc28783a1b9039660ec952c7e0d`; do not merge it, retarget it, or transplant its full diff. Reconcile only individually justified changes against current main.
5. No F–P workstream is declared accepted by this checkpoint. Acceptance requires current exact-SHA evidence for each required job, complete non-stale review evidence, and explicit human review. Missing, pending, skipped, stale or provider-rate-limited evidence is not a pass.

### Next execution order

1. Preserve the current mainline and all existing local staged/untracked work.
2. Resolve the supported Node runtime mismatch in isolated Draft PR #293; require exact-head CI and independent review.
3. Re-run and capture the complete F/G security + quality evidence bundle on one exact candidate SHA, run ID and attempt.
4. Verify H correlation end-to-end; keep process-local counters clearly distinguished from durable telemetry.
5. Verify P runtime response branches and security headers on the exact candidate SHA; keep the endpoint read-only.
6. Update this ledger only from observed current-SHA evidence. Keep I/J/M/N/O/K bounded; keep L deferred.

**Authority boundary:** this checkpoint is documentation-only. It changes no runtime, database, migration, secret, permission, workflow policy, Factory state, Runner state or deployment behavior.
