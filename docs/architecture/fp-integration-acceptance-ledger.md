# GCAN F–P Integration Acceptance Ledger

**Baseline:** `main` at `23fb747ae4041bc28783a1b9039660ec952c7e0d` (2026-11-22 post-PR #283)  
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


## 9. Post-merge engineering refresh (2026-11-22)

**Verified main baseline:** `23fb747ae4041bc28783a1b9039660ec952c7e0d` (merge commit for PR #283).  
**Protected boundary:** This ledger authorizes F–P integration work only. A–E, Agent Factory V2 runtime state, task leases, Runner policy and production controls remain outside this workstream.

### Current implementation evidence

- **F / G:** The integrated baseline includes the shared security/release assurance work and exact-run identity checks. Acceptance still requires current, same-HEAD evidence for every required quality and database/RLS job; evaluators remain advisory and cannot grant merge or deployment authority.
- **H:** Request correlation is propagated through the existing middleware contract. The bounded outcome recorder is process-local, not a durable telemetry service. End-to-end route/job correlation and a real persistent sink remain unverified/not implemented.
- **P:** The production GET route is now wired to the trusted-host collector. The route handler has runtime tests for authentication, active-admin authorization, input validation, private response headers, stale candidates and provider failures. The collector checks the current open same-repository PR head, paginates review history and delegates reviewer-permission verification to the trusted host. This is implementation evidence, not independent approval or governance authorization.
- **I / J / M / N / O:** Keep capabilities bounded/advisory. No live external writes, autonomous production repair, compliance certification, user-level analytics collection or automatic lifecycle retirement is enabled.
- **K:** Keep this ledger and handover evidence synchronized with the actual mainline; documentation is not acceptance evidence.
- **L:** Remains deferred and disabled.

### Mainline and acceptance reconciliation

- PR #283 is merged at the baseline above. Its PR-head Actions run #3369 passed the four substantive Windows quality, Ollama/local execution and Supabase/PostgreSQL/RLS jobs on PR HEAD `abe983db3f2f6e657fbc39c2777fdb28e0bd2573`. This result is bound to that PR HEAD; it is not post-merge CI evidence for merge commit `23fb747ae4041bc28783a1b9039660ec952c7e0d`.
- The merge commit's combined status currently reports a Vercel failure with provider `build-rate-limit`; no READY Preview or same-SHA smoke result is established.
- The independent read-only adversarial audit in Issue #136 remains outstanding against the integrated A baseline. Post-cooldown scheduled task/worker progression and a real 24-hour Runner soak are also not established. Therefore A is integrated but not operationally accepted, and B Runtime remains inactive.
- The previous consolidated PR #259 is stale/diverged from current main and must not be merged or wholesale transplanted. Reconcile only demonstrably missing F–P changes against the current baseline.
- Machine-managed Factory state (Issue #100), leases, retry counters, quarantine, cooldowns, Actions settings, workflow permissions, secrets and production data are not to be edited as part of this F–P work.

### Next F–P implementation order

1. **F/G:** Build a current-main, exact-SHA acceptance bundle proving repository/PR/SHA/run-ID/run-attempt identity and all required security/database jobs; retain fail-closed behavior when evidence is missing.
2. **H:** Add tests for correlation continuity across real route boundaries and explicitly label process-local metrics as non-durable. Do not claim distributed tracing or persistent telemetry without a configured sink.
3. **P:** Preserve the now-wired read-only route; close any remaining review/permission edge cases with runtime tests and independent review. The route must never grant approval, merge or deployment authority.
4. **I/J/M/N/O/K:** Advance one bounded capability at a time with contract tests, privacy minimization and owner-controlled side effects.
5. **L:** No implementation or activation until its security, isolation, capacity and independent-review gates are satisfied.

### Acceptance status

No F–P workstream is promoted to L4/L5 by this refresh. Each remains subject to exact-HEAD CI, focused runtime/integration evidence, independent review where required, and an auditable handover. A passing PR-head run, a merged commit, or this document alone does not satisfy acceptance.


### 2026-11-22 post-merge P0 remediation evidence

Two narrowly scoped remediation candidates have been opened against the verified main baseline; neither is accepted yet:

- **PR #292 — evidence-grounded patch generation:** the independent audit finding in Issue #136 documented unsupported factual claims in synthetic Preflight #315 output (encryption/anonymization, real-time monitoring and automated approval). The proposed prompt-contract guard limits factual claims to the task goal, acceptance criteria and supplied source files, with a regression assertion. This is not a semantic fact-checker; exact-head CI and independent review remain mandatory.
- **PR #293 — pinned Preflight Node runtime:** the same Preflight #315 logs confirmed host Node `v26.13.0` rejected `--experimental-transform-types`, while the isolated pinned-Node test completed 602 tests. The proposed correction pins both `validation-tests` and `prepare-task` to Node `22.13.0`, matching CI, and asserts parity in `tests/ci-trigger-policy.test.mjs`. It does not change scheduler or durable-state policy.

Both PRs remain Draft/unmerged with no recorded independent review. The Vercel deployment provider has reported the account's daily deployment limit (`api-deployments-free-per-day`); this is a provider quota limitation, not evidence of a successful Preview or a code build failure. Do not retry deployment or infer Preview readiness until the quota window clears and a same-SHA deployment plus smoke test are observed.

**Immediate acceptance gate:** obtain exact-head Actions results and independent review for PR #292 and #293; verify the scheduled preflight and synthetic validation after the Node pin; separately complete the read-only adversarial audit requested by Issue #136. Until then, keep A operational acceptance and B Runtime activation blocked.


### 2026-11-22 Agent Factory audit finding reconciliation

The historical Issue #136 report dated 2026-11-21 reviewed retired branch HEAD `cd9f732fc101cc20b27700b6b97ec10b59d6abc3`, not the currently integrated main SHA. Its Medium finding that candidate-task success also reset the global system breaker must not be carried forward as a confirmed defect on current main without revalidation.

Read-only inspection of current main `23fb747ae4041bc28783a1b9039660ec952c7e0d` establishes the following implementation separation:

- Candidate CI success in `lib/agent-factory-controller.mjs` calls `recordTaskSuccess` and persists that task transition; this branch does not call `recordSystemSuccess`.
- The separate `system-health` controller mode validates the required exact-SHA CI job set and current open same-repository PR head before calling `recordSystemSuccess`.
- `lib/agent-factory-state-machine.mjs` keeps `recordTaskSuccess` scoped to the target task and does not mutate `state.system`.
- The state-machine regression suite includes distinct tests for “task success clears only that task retry record” and “system success clears system cooldown without erasing task failures”.

**Disposition:** the historical coupling finding appears corrected in the current integrated tree and is not presently a confirmed current-main defect. This is a code-path reconciliation, not a substitute for the still-required independent read-only audit of current main, and not proof of operational acceptance. Issue #136 must be completed against the exact integrated SHA; preserve its read-only restrictions. A remains not operationally accepted and B Runtime remains inactive.


## 10. Live candidate status snapshot (2026-11-22; verified main `23fb747ae4041bc28783a1b9039660ec952c7e0d`)

This snapshot supersedes earlier candidate SHA/run status statements where they differ. Status is bound to the exact HEAD shown; no evidence transfers between commits or runs.

| PR | Exact HEAD | Latest observed Actions evidence | Review / disposition |
|---|---|---|---|
| #292 — evidence-grounded patch claims | `2ed61e76b2045832d769dfd893b02ee6753de70c` | Run `44967914868` completed; resolver, Windows quality gates, Ollama/local execution, and Supabase/PostgreSQL/RLS jobs succeeded. | No formal review submissions or threads. Ready for review, not merge-approved. Vercel status is failure; no same-SHA Preview/Smoke. |
| #293 — Preflight Node 22.13.0 pin | `85555594c4bd167489bddd64f07b69e2a0a8e094` | Run `44970303726` is pending; only resolver job is allocated and pending. No substantive quality/integration result yet. | Draft; no formal review. |
| #294 — authoritative handoff | `c704dbbdbe580a984f306cc7f82a659a2dafc284` | Run `44970329125` pending. | Draft; no formal review. |
| #295 — earlier F–P ledger reconciliation | `4cfa4b31cd9a9b0d3735c8351d8395b49160b7a8` | Run `44970333841` pending. Its ledger candidate snapshot contains superseded PR #293 and other run details; do not treat those historical entries as current evidence. | Draft; no formal review. |
| #296 — privacy-safe H event metadata | `e4c3cb3fa68f12400fb3da00d40fc087768d55ca` | Run `44969692123` pending; no jobs allocated at last inspection. | Draft; no formal review. |
| #297 — P auth-provider fail-closed handling | `858d1ae886a95b9fec41076287d4c4466d2a46cb` | Run `44969394408` pending; no substantive job result at last inspection. | Draft; no formal review. |
| #298 — canonical UTC security evidence timestamps | `e35ad0bb955f2a04c6375e4989f2fbbea7ba3086` | Run `44969187760` pending; no substantive job result established. | Draft; no formal review. |
| #299 — this ledger refresh | Latest head is recorded in the PR description; exact-head run `44970935043` is pending with zero jobs allocated at last inspection. | No formal review; documentation-only. Keep Draft until exact-head CI and review evidence exist. |

PR #295 and #299 both touch this ledger. Their branches are distinct and their text is not identical; use this PR's latest mainline reconciliation and candidate evidence as the current proposed update, while preserving any unique historical context only when it remains accurate. Do not merge either documentation PR solely because its content is non-runtime.

### Current cross-cutting blockers

1. No candidate PR above has a formal independent review submission in the latest review check.
2. Issue #136 remains a strictly read-only independent adversarial audit request; current-main code inspection by the implementation author does not satisfy it.
3. Vercel combined status continues to report `build-rate-limit`; no READY same-SHA Preview and Smoke evidence is established.
4. Post-cooldown scheduled task selection, durable lease/worker progression, and a real 24-hour Runner soak remain unverified.
5. The self-hosted Windows Runner queue is serialized. Pending or unallocated jobs are unknown, not passing, and do not justify changing concurrency or dispatching ad hoc runs.

**Authority boundary:** this status refresh is documentation-only. It does not authorize merge, deployment, Factory-state mutation, lease/retry/cooldown/quarantine changes, workflow or Runner-policy changes, secrets/permissions changes, A operational acceptance, or B Runtime activation.

## 11. Live mainline checkpoint after PR #293 merge (2026-11-22)

**Verified main SHA:** `aa63b74f9d23d2316ec7b59116632d686afb8fe1` (merge commit for PR #293). This checkpoint supersedes earlier SHA-specific candidate status above; historical sections are retained as historical evidence only.

### Verified integration state

- PR #299 merged: prior F–P acceptance-ledger reconciliation; this PR #301 checkpoint supersedes its older SHA-specific status snapshot.
- PR #294 merged: authoritative mainline/handoff correction; this checkpoint uses the subsequently verified main SHA below.
- PR #300 merged: read-only durable-state capacity telemetry (500 processed-event limit and 60,000-character state-Issue body ceiling), with warning/critical/blocked classification. Merge commit: `7fedccfe940db5bdd1c117dc6563e87cfbd284da`.
- PR #298 merged: canonical UTC security-evidence timestamp validation.
- PR #297 merged: governance authentication-provider failures remain fail-closed.
- PR #296 merged: privacy-safe observability event metadata.
- PR #293 merged: Preflight `validation-tests` and `prepare-task` use Node.js `22.13.0`, matching the CI quality runtime. Main merge commit: `aa63b74f9d23d2316ec7b59116632d686afb8fe1`.

### Exact-main validation observed

- Main push CI run `44972991698` is **pending**; the latest job inspection returned no allocated jobs. No quality, type, lint, build, Ollama, or database/RLS pass is inferred.
- Main push Preflight run `44972991644` is **pending**. The Windows self-hosted project-validation job `137056615492` is pending; the read-only task-plan validation job was skipped. No Preflight pass is inferred.
- The combined commit status for `aa63b74f9d23d2316ec7b59116632d686afb8fe1` reports Vercel failure with provider `build-rate-limit`. No READY Preview or same-SHA Smoke evidence is established.
- These statuses are exact to `aa63b74f9d23d2316ec7b59116632d686afb8fe1`; results from earlier PR heads or merge parents do not transfer.

### Outstanding boundaries

- PR #295 is an older documentation candidate based on `23fb747ae4041bc28783a1b9039660ec952c7e0d`; its base is stale and GitHub currently reports it non-mergeable. Do not merge or wholesale transplant it. This checkpoint is prepared directly from the verified current mainline instead.
- Issue #136 remains open and explicitly read-only. Its independent adversarial audit is not replaced by implementation-author inspection, merged code, or CI status. Do not modify the Issue, Factory state, leases, Runner settings, secrets, permissions, or production data as part of that audit.
- A remains integrated but not operationally accepted. B Runtime remains inactive. L remains deferred and disabled.
- F/G/H/P and the remaining F–P workstreams are implementation-present to varying degrees; none is promoted to accepted solely by these merges. Acceptance still requires complete current-SHA evidence, independent review where required, and the documented authority checks.

### Next execution order

1. Let the current-main CI and Preflight jobs complete; inspect their exact run IDs, attempts, job conclusions, and logs.
2. Reconcile any actual test failures on a fresh branch from the then-current main SHA; do not infer a Runner outage from pending jobs.
3. Keep the 500-event idempotency ledger fail-closed. Do not evict processed-event keys or introduce unreviewed compaction.
4. Complete the independent read-only Factory audit against the current integrated tree through its authorized reviewer; preserve the Issue's no-write boundary.
5. Refresh this ledger only from observed evidence. Keep A–E protected, B inactive, and L deferred.

**Authority boundary:** this is a K documentation checkpoint only. It changes no runtime, database, migration, Factory state, lease, retry/cooldown/quarantine, Runner policy, secret, permission, or deployment behavior.

## 12. Post-PR #301 live mainline checkpoint (2026-11-22)

**Verified main SHA:** `061ccf621c228bae93b91cd8c53723c3fe08310a` (merge commit for PR #301).

### Integrated state
- PR #301 merged: documentation-only refresh of `docs/AGENT_HANDOFF.md` and this F–P ledger. It records merged implementation PRs #292, #293, #296, #297, #298 and #300 without promoting them to operational acceptance.
- The handoff and ledger now explicitly distinguish the current main SHA from earlier snapshots, and distinguish merged changes from accepted/operational behavior.
- No runtime, schema, database, migration, Factory state, lease, Runner, secrets, permissions or deployment behavior changed in PR #301.

### Current exact-SHA evidence
- Main push CI run `44973274417` for `061ccf621c228bae93b91cd8c53723c3fe08310a` is pending and has no allocated jobs in the latest query. No test pass is inferred.
- Scheduled Preflight run `44972336349` targets older SHA `23fb747ae4041bc28783a1b9039660ec952c7e0d`; its read-only task-plan job is pending and Windows validation was skipped. Later push-triggered Preflight `44972991644` targets `aa63b74f9d23d2316ec7b59116632d686afb8fe1`; Windows validation is pending and task-plan validation was skipped. Neither is evidence for current main `061ccf621c228bae93b91cd8c53723c3fe08310a` or successful scheduled progression.
- Combined status for `061ccf621c228bae93b91cd8c53723c3fe08310a` reports Vercel `build-rate-limit` failure; no same-SHA Preview/Smoke evidence is established.
- PR #301 exact-head run `44973266726` was pending at merge; no CI pass is claimed.

### Outstanding gates
- Issue #136 remains read-only and requires an independent adversarial audit. No independent sign-off is recorded.
- A remains integrated but not operationally accepted; B Runtime remains inactive; L remains deferred.
- Keep Factory state and all production/runtime safety boundaries unchanged.

**Authority boundary:** documentation-only K checkpoint; not an A/B acceptance or deployment authorization.


## 13. A Factory continuation and B contract cross-check (2026-11-22)

**Main baseline:** `061ccf621c228bae93b91cd8c53723c3fe08310a`.

| Candidate | Exact HEAD | Exact-head Actions | Review / disposition |
|---|---|---|---|
| #303 — stale-base failure scope | `aec814f93c60fdda501c158cbd622377625a5c61` | Run `44975519823` pending; no jobs allocated. | Draft; no formal review or threads; Vercel build-rate limit; no same-SHA Preview. |
| #305 — task output contract | `2a2d35114c88ba0cce6d8478a72d908a8b277985` | Run `44976078839` pending; no jobs allocated. | Draft; no formal review or threads; Vercel build-rate limit; no same-SHA Preview. |

### Verified A-side details

- #303 preserves stale-base guards and narrows task-scoped classification to the explicit default-branch-drift rejection branches. The triggering Preflight run `44972336349` failed publication only after scratch/offline checks; it is not evidence that candidate code tests failed.
- #305 validates task-declared required patch paths and forbidden literal strings, including final aggregate validation. Its latest batch-scoping helper rejects empty/invalid batch lists and any path outside the validated task allowlist.
- Issue #100 is still machine-managed, state version 152 (`2026-11-22T02:04:40.421Z`): no active task, 9 system failures, elapsed cooldown, Issue #17 queued, 7 quarantined. No state mutation or forced dispatch was performed.
- The earlier publisher-token permission mismatch diagnosis was explicitly withdrawn in Issue #136 after logs confirmed effective Contents/Issues/PullRequests write permissions. The stale-base rejection is the verified publisher failure for run `44972336349`.
- Issue #136 has no independent audit report/sign-off in the latest comment history. Its read-only boundary remains in force.

### B contract source cross-check

- Current main's A state machine stores and validates the structured candidate evidence tuple: full `head_sha`, `pull_request_number`, `ci_run_id`, and `ci_run_attempt`.
- The proposal's public status mapping covers every current A task state, but no A-owned product projection/API has been implemented or accepted.
- The remaining contract item before B implementation is an explicit allowlisted `failureCategory` mapping; unknown codes must map to `unknown`, and raw exception text must never cross the boundary.
- B remains inactive. No B runtime/API/database, billing, Factory permission, or cross-workspace access was enabled.

### Required sequence

1. Pass exact-head CI and independent review for #303/#305.
2. After #305 acceptance, add the required security test path and literal prohibitions to Issue #17; preserve fresh audit evidence and no-major-downgrade acceptance criteria.
3. Complete the independent read-only audit and A operational acceptance.
4. Implement the A-owned projection and B-owned workspace authorization only after A acceptance.

This section is a documentation checkpoint, not A acceptance, B activation, deployment authorization, or permission to mutate machine-managed Factory state.
