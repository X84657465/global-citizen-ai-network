# Agent Handoff — GCAN / Agent Factory V2

> Single source of truth for the next development session. Refresh after each round. Record verified GitHub state only. A merged PR, a successful resolver, or a skipped job is not acceptance.

**Last verified:** 2026-11-22 (Taiwan time)  
**Repository:** `X84657465/global-citizen-ai-network`  
**Default branch:** `main`  
**Main HEAD (superseded by the current snapshot below):** `584c0b778ebd6c4a5a2b61df60474c948924aa4f`  
**Authoritative release:** `VERSION` and `package.json` on main both report `0.3.125`. README release label requires separate verification before use.  
**A / B declared versions:** Agent Factory V2 `2.0.84`; GCAN Product `0.1.20` (`versions/manifest.json` and `versions/gcan-product/VERSION`; not a release-readiness claim).

## 1. Highest-level strategy and authority

1. **A — Agent Factory V2 first:** stabilize intake, task selection, durable state/lease, Runner, sandbox, patch generation, exact-head CI, recovery and publication.
2. **B — GCAN Product second:** connect only to stable, versioned A contracts and accepted evidence. B must not gain privileged Factory state authority.
3. **F–P — integration support only:** fix concrete A/B handoff blockers; do not expand parallel infrastructure or activate unrelated product scope.
4. **Global ecosystem later:** production AI spend, payouts, federation and autonomous production remediation require separate security, cost, legal and operational gates.

CI success permits review; it does not itself authorize merge, deployment, secret changes or production-data access. A merge with missing exact-head CI or independent review remains **merged but not accepted**.

## 2. A–P ownership map

| Line | Responsibility | Boundary |
|---|---|---|
| A | Agent Factory V2 — planner, task selector, durable state/lease, Runner, sandbox, patch generation, candidate CI, recovery and publisher | Highest priority; exact-head evidence and safe state transitions mandatory |
| B | GCAN Product — workspace, conversations/projects, accounts, product APIs and monetization foundations | Downstream of accepted A contracts; no Factory state authority |
| C | Predictive Coding | Capability support only; no A/B authority |
| D | Deep Neural | Model/architecture capability support; no A/B authority |
| E | Deep Research | Research capability support; no A/B authority |
| F | Cyber Security & Defense | Security assurance/control evidence; advisory unless tied to verified controls |
| G | Release / QA / Integration | Exact-head quality and integration evaluation; never grants merge/deploy authorization |
| H | Observability / Telemetry / Cost | Correlation and bounded telemetry; durable distributed sink remains outstanding |
| I | Connectors / Workflow | Approved connector contracts; no unapproved external writes or credentials |
| J | Self-Healing / Continuity | Diagnosis and repair proposals; production remediation remains operator-controlled |
| K | Knowledge / Docs / Governance | Architecture, runbooks, integration ledger and handoff accuracy |
| L | Federation / Cluster | Deferred; no distributed node registration or execution |
| M | Compliance / Policy Audit | Engineering control evidence only; no legal certification claim |
| N | Productization / Analytics / Growth | Product and privacy-minimized analytics foundations; no unapproved tracking |
| O | Lifecycle / Deprecation | Version/deprecation recommendations; no automatic retirement |
| P | Governance / Ethics / Trust | Ownership, approval and trust boundaries; policy enforcement requires separate validation |

F–P manifest registration or a “ready” label is not implementation acceptance or operational readiness.

## 2A. Current authoritative live snapshot — 2026-11-22 12:20 Taiwan

This section supersedes earlier snapshots. It records only states verified from GitHub during this checkpoint.

### Mainline and release identity

- **Verified main HEAD:** `60fe56e6937693ef1d59e6932a2d2b4d843b93f1` (merge commit for documentation-only PR #308).
- `VERSION` and `package.json` both report `0.3.125`.
- Agent Factory V2 declared version remains `2.0.84`; GCAN Product declared version remains `0.1.20`. These are version labels, not acceptance or release-readiness claims.
- PR #308 refreshed the handoff document but its embedded snapshot still referenced the prior main SHA `584c0b778ebd6c4a5a2b61df60474c948924aa4f`; this checkpoint corrects that documentation drift.

### Exact-SHA CI and deployment evidence

- Main exact-SHA CI run [#44984567177](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44984567177) targets `60fe56e6937693ef1d59e6932a2d2b4d843b93f1` and is **pending**. The latest jobs query returned no allocated jobs. No quality, test, build, Ollama, PostgreSQL or RLS pass is inferred.
- Main commit status reports Vercel deployment completed successfully for the same SHA. This is deployment status only; it does not substitute for CI or Preview/Smoke acceptance evidence.
- PR #311 exact-head run [#44982403354](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44982403354) for `21aefdd696a5266d0c0934e03f88d63766205e26` completed successfully. Metadata resolution, Windows quality gates, Windows Ollama/local execution, and Windows Supabase migrations/PostgreSQL/RLS jobs all succeeded. The failure-diagnostics and success-persistence jobs were skipped by their conditions; skipped is not an additional pass.
- PR #311 remains Draft/open, has no formal review submissions, and is based on the previous main SHA `584c0b778ebd6c4a5a2b61df60474c948924aa4f`. It is not merge-ready against current main.
- PR #307 exact-head run [#44982454149](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44982454149) remains pending; metadata resolution and Windows quality gates succeeded, while Ollama/local execution and PostgreSQL/RLS jobs remain pending.
- PR #309 exact-head run [#44982520103](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44982520103) remains pending with the same split: metadata and Windows quality gates succeeded; Ollama/local execution and PostgreSQL/RLS remain pending.
- PRs #307, #309 and #311 all target main from base SHA `584c0b778ebd6c4a5a2b61df60474c948924aa4f`; each is Draft and reports non-mergeable at this checkpoint. Do not merge or rebase blindly. Reconcile each narrow change against current main and require fresh exact-head CI.

### Acceptance, governance and B boundary

- A / Agent Factory V2 remains **not operationally accepted**. Current-main exact-SHA CI is pending; independent adversarial audit, cross-process race/ambiguous-write injection, natural scheduled Runner/lease progression, and required serialized Runner soak remain unverified.
- Issue #136 is explicitly **read-only** and its existing target SHA is historical. No independent audit report/sign-off against current main SHA `60fe56e6937693ef1d59e6932a2d2b4d843b93f1` is established. Do not alter the audit issue or claim implementation-owner inspection as independent approval.
- B Runtime remains inactive. Continue only contract/design preparation; B may consume accepted, versioned A projections and evidence, but must not gain Factory state authority.
- L Federation remains deferred and disabled.
- Preserve the 500-event processed-event ledger fail-closed behavior. Do not evict idempotency keys or introduce unreviewed compaction.
- Do not mutate machine-managed Factory state Issues, task leases, retry/cooldown/quarantine, scheduler selection, Runner concurrency, workflow permissions, secrets, production data, or deployment settings to manufacture passing evidence.

### Next execution order

1. Observe main exact-SHA CI run #44984567177; once jobs are allocated, inspect every required job and distinguish pending, skipped, cancelled, failed and successful.
2. Keep #307/#309/#311 Draft until each change is reconciled to current main and fresh exact-head CI plus independent review are available. Prefer small, isolated A-line slices; do not transplant unrelated stale #259 changes.
3. Obtain the independent Issue #136 audit through the authorized independent reviewer, explicitly targeting current main SHA `60fe56e6937693ef1d59e6932a2d2b4d843b93f1`; preserve the read-only boundary.
4. Verify cross-process races, ambiguous GitHub writes, rate-limit cooldown persistence, and natural scheduled Runner/lease progression without manually dispatching or mutating machine-managed state.
5. Keep B Runtime and L Federation inactive until A has passed every acceptance gate; then reconcile the bounded A→B read contract against the accepted A version.

## 2B. Historical snapshot — superseded by current section 2A (2026-11-22)

This is the newest verified repository snapshot. All later sections below are historical context unless independently re-verified.

### Mainline and merged integration

- **Verified `main` HEAD:** `061ccf621c228bae93b91cd8c53723c3fe08310a`, merge commit for documentation-only PR #301.
- Verified merged implementation PRs:
  - #292 — evidence-grounding instructions for generated AI patch claims; prompt-level guard, not a semantic fact-checker.
  - #293 — pins Preflight `validation-tests` and `prepare-task` to Node.js `22.13.0`.
  - #296 — privacy-safe observability event metadata.
  - #297 — governance authentication-provider failures fail closed.
  - #298 — canonical UTC security-evidence timestamp validation.
  - #300 — read-only durable-state capacity telemetry for the 500-event and 60,000-character limits; no eviction or automatic recovery.
- Documentation/handoff PRs #290, #291, #294, #299 and #301 are merged. #290/#291 are preparation/documentation only and do not activate B Runtime. #294/#299 are superseded historical checkpoints. PR #301 updates this handoff and the F–P ledger; it does not change runtime behavior.
- Merge status is integration evidence only, not operational acceptance.

### Exact-SHA validation

- Main push CI run [#44973274417](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44973274417) for `061ccf621c228bae93b91cd8c53723c3fe08310a` is **pending**; the latest job query returned no allocated jobs. No test, type, lint, build, Ollama, PostgreSQL or RLS pass is inferred.
- The latest observed scheduled Preflight run [#44972336349](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44972336349) targets older SHA `23fb747ae4041bc28783a1b9039660ec952c7e0d`; its read-only task-plan job is pending and its Windows validation job was skipped. The later push-triggered Preflight run [#44972991644](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44972991644) targets `aa63b74f9d23d2316ec7b59116632d686afb8fe1`; its Windows self-hosted validation job is pending and its task-plan job was skipped. Neither run validates current main SHA `061ccf621c228bae93b91cd8c53723c3fe08310a` or establishes scheduled task/lease progression.
- The current main combined status reports Vercel failure due provider `build-rate-limit`. No same-SHA READY Preview or Smoke evidence is established.
- PR #301 was merged as a documentation-only change. Its exact-head Actions run [#44973266726](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44973266726) was pending at the time of merge; that is not a test pass and does not confer A acceptance.

### Factory acceptance and authority boundaries

- Issue #136 remains an explicitly **read-only independent adversarial audit** request. It prohibits file changes, commits, pushes, PR creation/merge, production access and external-state mutation. No independent audit report/sign-off is established by this handoff update or prior implementation-author self-review.
- A / Agent Factory V2 remains integrated but **not operationally accepted**. Independent review, current-SHA CI, Preview/Smoke where applicable, cross-process race/ambiguous-write injection, and natural scheduled Runner/lease progression evidence remain outstanding.
- B Runtime remains inactive and downstream of A acceptance. L Federation remains deferred and disabled.
- Preserve A–E protected behavior. Do not mutate machine-managed Factory state Issues, leases, retry/cooldown/quarantine, scheduler selection, Runner concurrency, workflow permissions, secrets, production data or deployment configuration to manufacture passing evidence.
- The 500-event processed-event limit remains fail-closed. Do not evict idempotency keys or introduce compaction without a separately reviewed migration and recovery design.

### Next execution order

1. Wait for and inspect exact-main CI and a fresh scheduled Preflight run; distinguish pending, skipped, cancelled and successful jobs.
2. Keep the 500-event idempotency ledger fail-closed; no eviction or unreviewed compaction.
3. Obtain the independent Issue #136 audit against current main through the authorized independent reviewer; preserve its read-only boundary.
4. Verify scheduled/lease progression only through naturally occurring authorized runs; do not manually dispatch or mutate machine-managed state.
5. After A acceptance, reconcile the bounded B read contract; keep B Runtime and L Federation inactive until then.

## 3. Live mainline and active acceptance blockers

### Main

- Verified main HEAD: `a1c1b58e4d1852f5a09a0e7c6c5cbeb38e1f9582`.
- `VERSION` and `package.json` are `0.3.124`; README root release label is stale at `0.3.121`.
- Vercel status is failing with the provider's `api-deployments-free-per-day` / `build-rate-limit` quota. Treat this as an external Preview/deployment blocker, not a code-test result. Do not repeatedly trigger deployment attempts or bypass the quota.

### PR #259 — P0 A / F–P consolidated acceptance candidate

- Branch: `fix/ci-schema-grant-test-count-20261122`; base main SHA: `a1c1b58e4d1852f5a09a0e7c6c5cbeb38e1f9582`.
- **Current exact PR head: `3330cd04a77358cf0ff780940d09f938cab1dc3a`** (40 changed files; Draft/open/unmerged).
- Exact-head Actions run #3237 (`44949425719`) is pending with zero allocated jobs. The previous-head run #3236 (`44949068991`) on `557eb86c290d06345c6eed7d2dfea63cacebce48` was cancelled.
- Earlier run #3235 (`44948965775`) on `35d5811710079ddb980054a7ff96520832801e72` is not a complete pass: metadata resolution and Windows quality gates succeeded, but the Supabase/PostgreSQL/RLS integration job remains in progress (only setup was observed) and Ollama/local execution remains pending. Do not transfer those results to the current head.
- The latest commit adds P governance-route regression coverage for all private response branches. The consolidated candidate also contains A Factory lifecycle/state fixes, high-risk negation classifier tests, the schema guard alignment from `plan(15)` to the authoritative `plan(18)`, F–P integration work and selectively ported F/G repository-identity hardening. These remain candidate changes until validated on the current exact SHA.
- Current exact-head combined status reports Vercel failure with provider `build-rate-limit`. No READY Preview or smoke test is evidenced for the current SHA. Do not change billing or reuse an older-SHA Preview.
- Independent formal reviews: zero; inline review threads: zero.
- **Disposition:** keep Draft/unmerged. Require all exact-head CI jobs to finish successfully, current-SHA Preview and smoke evidence where applicable, and an independent formal review before acceptance or merge.

### PR #267 — shared CI baseline (closed as redundant)

- PR #267 is closed without merge after exact Git blob comparisons confirmed its shared package-lock/version changes are already included in consolidated PR #259.
- No unique code or dependency artifact was discarded. Do not reopen or merge it separately; validate the shared baseline only through #259's final exact SHA.

### PR #266 — superseded K handoff candidate

- Closed without merge as superseded by PR #268.
- It changed only `docs/AGENT_HANDOFF.md`; its older handoff snapshot and failed Schema Safety Guard CI are not current acceptance evidence. No runtime or accepted code was discarded.

## Factory runtime checkpoint — 2026-11-22

- Main `.github/workflows/agent-task-preflight.yml` declares `schedule: "*/5 * * * *"`, `issues: opened/reopened`, `repository_dispatch` and `workflow_dispatch`. This verifies configuration only, not recent cron delivery.
- The latest documented scheduled preflight remains run #44924441333 at `2026-11-21T16:24:52Z`. Its task selection and lease acquisition succeeded; it then failed at safe handoff-bundle validation because issue #204 contained an unsupported heading. Issue #202 records the diagnosis and states that the task description was corrected under the supported `## Confirmed evidence` section. No newer scheduled event has been verified in the available read-only records.
- A later successful push-triggered workflow or PR CI run is not proof of scheduled cron continuity. Do not claim the factory is fully operational until a fresh `event=schedule` run demonstrates normal selection and expected task progression.
- Machine-managed Issue #100 is strictly read-only. Do not edit its body, counters, leases, cooldowns or quarantine state. Do not dispatch tasks manually, duplicate queue events, alter Runner/workflow settings or bypass policy.
- PR #259 remains the A acceptance candidate, but its current exact-head run #3237 is pending with no jobs allocated; previous-head CI is not acceptance evidence.

## 4. Acceptance rules and operating safety

- Refresh main SHA, PR head/base SHAs, Actions run IDs/attempts/jobs, reviews and deployment statuses before acting.
- A green result on an old head is stale. A resolver pass does not mean tests passed.
- Distinguish pending, skipped, cancelled, failed and successful. Missing job records do not prove Runner offline.
- Require full exact-head Windows tests, type check, lint, security audits, production build, PostgreSQL/migrations/pgTAP/RLS, Ollama/local execution, candidate outcome persistence, required external checks and independent review as applicable.
- Never weaken or skip tests to obtain a green result.
- Do not edit machine-managed Factory state Issues, reset leases/quarantine/cooldowns, dispatch duplicate tasks, or change production settings to make a run appear healthy.
- Do not change secrets, production data, migrations, permissions, branch protection, Runner configuration or production deployment settings without explicit separate authorization.
- No merge or deployment is implied by this document.

## 5. B-line handoff plan

B remains preparation-only until A is fully accepted and integrated into main.

### A→B contract alignment checkpoint (2026-11-22)

- Compared `docs/architecture/agent-factory-product-read-adapter.md` against `lib/agent-factory-state-machine.mjs` on the current A candidate.
- The first proposal mirrored A's private lifecycle and candidate enums. A security review identified that this would expose internal operational states such as `quarantined` and `retry_wait` to B.
- Updated the product DTO to a bounded public status vocabulary: `queued`, `in_progress`, `candidate_ready`, `verification_pending`, `completed`, `needs_attention`, and `closed`; private A states map to these values and are never serialized directly.
- Candidate states are projected as `pending`, `passed`, or `not_passed`. The A projection verifies the structured `head_sha`, `pull_request_number`, `ci_run_id`, and `ci_run_attempt` tuple server-side; CI run IDs and attempts are not exposed in B's public DTO. The projection never parses EvidenceRecord's descriptive `command` string.
- This is documentation-only preparation. No B route, table, workspace mapping, runtime adapter or Factory access was activated.
 The current repository contracts do **not** yet expose a dedicated accepted A-to-B product API.

### Verified interface inventory

- A's `createFactoryCandidateEvidenceRecord` emits a model-independent `EvidenceRecord v1.0.0` intended for C/D consumption. It binds repository, deterministic task branch, candidate commit SHA, PR number, CI run ID/attempt, terminal conclusion and timestamp. It is not declared as a B product API.
- `FPCapabilityEnvelope` uses `contractVersion: "1"` for F–P capability events/results. Its actor/resource references are opaque; the envelope does not authenticate identities or grant permissions. Do not reuse it as a B authorization contract.
- A's controller, state machine and state store are Factory internals. The durable state currently resides behind the A-owned GitHub Issue store; B must not import these internals, edit that Issue, manage leases, or invoke privileged Runner/Sandbox operations.
- Current main has no verified B workspace/product service path at the candidate paths checked in this review. Do not assume a product API exists until its implementation and tests are located on the accepted base.

### B adapter contract to define after A acceptance

Create a separate, versioned, read-only adapter boundary for B. Its schema should be agreed and tested before implementation; it should expose only the minimum product-safe view needed by B:

1. Stable opaque task/candidate reference and lifecycle status.
2. Candidate SHA plus verified terminal conclusion and opaque evidence reference; CI run ID and attempt remain server-side verification inputs.
3. Bounded timestamps and allowlisted failure categories; never raw logs, secrets, token values, local paths or unrestricted Issue bodies.
4. Explicit ownership/authorization checks at B's product boundary; an opaque actor/resource reference is not proof of identity.
5. Idempotent read-only retrieval and compatibility/version tests. B cannot change A state or use returned evidence as merge/deploy authorization.

### Integration sequence

1. Rebase/rebuild B from the accepted A main SHA; do not wholesale merge stale/diverged branches.
2. Define and review the B adapter schema against the verified A evidence model; add contract tests before connecting product routes.
3. Selectively port B/product and only necessary governance work, reconciling README, package lock, manifests and release metadata.
4. Run exact-head unit/type/lint/audit/build/database/RLS and applicable integration checks, then current-SHA Preview and rendered-device acceptance.
5. Require independent review before merge. Product monetization, public registration, live AI spend and payouts retain separate security, privacy, legal and cost gates.

## 6. Next execution order

1. **A first:** #259 current HEAD is `3330cd04a77358cf0ff780940d09f938cab1dc3a`; exact-head run #3237 (`44949425719`) remains pending with zero jobs returned. The earlier #3231 success is stale. Keep #259 Draft until complete exact-head CI, same-SHA READY Preview/smoke and independent review all pass.
2. **A risk-intent integration:** the two files from #261 are now included in #259; #261 is closed as redundant. Do not use its old failed CI as evidence for the consolidated candidate.
3. **Shared baseline:** #267 is closed as redundant and its package-lock/version changes are carried by #259. No separate merge is required.
4. **K support:** keep #268's handoff aligned with verified PR/main state. Because this handoff is itself committed on #268, its exact head changes whenever this file is refreshed; always read the current SHA from PR #268 metadata and verify its matching Actions run before considering a merge. No independent review is recorded.
5. **F–P:** address only concrete A acceptance or B contract blockers; do not expand unrelated workstreams.
6. **B preparation:** retain the read-only, versioned adapter proposal. Do not activate B runtime/API/database access until A is accepted and integrated.

**Factory-first charter remains:** stabilize Agent Factory V2, then enable GCAN Product to create revenue, then expand the global AI ecosystem.

## B adapter design handoff (2026-11-22)

- Added [Agent Factory → GCAN Product read adapter proposal](architecture/agent-factory-product-read-adapter.md). This is a documentation-only design; no B runtime/API/database or Factory permissions were activated.
- Verified source contracts: A `EvidenceRecord v1.0.0` is currently model-independent C/D evidence, not a structured B API; F–P `FPCapabilityEnvelope` uses opaque actor/resource references and does not authenticate or authorize.
- The proposed B view is versioned, read-only, tenant-scoped by B's own identity/workspace authorization, and backed by server-side exact-SHA/run-ID/run-attempt verification. Public DTOs expose only the verified conclusion and opaque evidence reference, not internal run identifiers or private A lifecycle states.
- Do not implement or expose this adapter until A is accepted and integrated. A must provide a structured server-side projection; B must not parse the descriptive EvidenceRecord command string or access A's internal Issue state, lease or Runner controls.


## Current checkpoint — 2026-11-22 (latest verified)

### Main and A — factory first
- Main remains `a1c1b58e4d1852f5a09a0e7c6c5cbeb38e1f9582`; `VERSION` and `package.json` remain `0.3.124`.
- PR #259 current HEAD is `3330cd04a77358cf0ff780940d09f938cab1dc3a`; it is open, Draft, and unmerged. Its exact-head Actions run #3237 (`44949425719`) remains pending with zero jobs returned. Vercel status is failure `build-rate-limit`. Formal reviews and inline threads are zero.
- The schema guard fix on #259 changes the expected SQL test plan from 15 to 18, matching `supabase/tests/public_table_grants.test.sql`; the existing table privilege, internal-table RLS and public sequence assertions remain intact. This resolves the known deterministic guard mismatch in the candidate, but does not constitute CI acceptance.
- Earlier exact-head success on SHA `9da2369747cb9ea21c5b8bb65cefa2351f14790` is stale and cannot validate the current HEAD. Do not infer integration success from it.
- No current-SHA READY Preview/smoke evidence or independent review exists. Keep #259 Draft/unmerged.

### F–P dependent work
- PR #252 is 30 commits ahead and 10 commits behind main; it is stale and must not be merged or rebased onto an unaccepted A baseline.
- PRs #256, #257, #260 and #262 are not behind main, but their latest recorded exact-head CI runs all fail at the Windows `Schema safety guard` before database/Ollama integration jobs; no formal reviews exist. Their failures are consistent with the old main guard expecting plan(15) while SQL declares plan(18). Rebase/port only after A is accepted and integrated, then rerun each exact final SHA.
- These lines remain bounded integration support; no broad parallel expansion.

### B and K handoff
- PR #268 is documentation-only, open, Draft and unmerged. Its adapter proposal was updated in commit `7838618597e2ca36c2d0648e4d0fde44c9ef6b40` to prevent private A lifecycle states and internal CI run identifiers from leaking through the proposed product DTO.
- The product projection now maps internal A states into a bounded public status vocabulary and verifies SHA/PR/run/attempt server-side. It exposes only verified conclusions and opaque evidence references. This remains a proposal; no B runtime/API/database or Factory permission was activated.
- The latest handoff update itself changes #268's head. Verify PR metadata and exact-head Actions after this commit; no matching Actions run has yet been returned for the adapter-only commit. Vercel remains blocked by `build-rate-limit`; no formal review exists.
- #266 remains closed as superseded by #268.

### Acceptance and next execution order
1. Keep A #259 first. Wait for complete terminal success of every required exact-head CI job, including Windows quality, isolated Supabase/PostgreSQL/RLS and Ollama/local execution.
2. Require a READY Preview and smoke test for the same exact A SHA, plus independent formal review. Until then, no merge or A acceptance.
3. After A is integrated, rebase/rebuild dependent F–P lines selectively, resolve the shared schema guard baseline, and rerun each final SHA. Do not merge stale #252.
4. Rebase/rebuild B from accepted main; implement the A-owned sanitized projection and B-owned tenant authorization only after the contract and tests are independently reviewed.
5. Preserve the factory's scheduled queue/Runner path. Do not manually dispatch tasks, duplicate work, alter workflow settings, or mutate Issue #100 counters, leases, cooldowns or quarantine.

**Factory-first charter remains:** stabilize Agent Factory V2, then enable GCAN Product to create revenue, then expand the global AI ecosystem.


## Live checkpoint after PR #268 merge — 2026-11-22

### Main / K handoff
- Current `main` HEAD: `c7af9d1995ef4206203bcb498e2966558f035b23` (merge commit for documentation-only PR #268).
- PR #268 is closed/merged at `c7af9d1995ef4206203bcb498e2966558f035b23`. Its merge is **not acceptance**: exact-head Actions run #3243 (`44949837137`) for PR head `fbacb1e7e1de0b43f8471f5013a1da8df828b8cd` completed with **failure** in Windows quality gates. The exact failure is `scripts/check-schema.mjs:590`: the guard expects `select plan(15)` while `supabase/tests/public_table_grants.test.sql` declares `select plan(18)`. The Ollama and Supabase integration jobs were skipped after the quality-gate failure. Exact-head Vercel status remained `build-rate-limit`; no formal independent review was recorded. Do not claim CI or release acceptance for #268.
- The current handoff document was stale immediately after #268 merged; this section supersedes older main/PR state snapshots above. Refresh it after each new merge.

### A — Agent Factory V2
- PR #259 exact candidate HEAD: `3330cd04a77358cf0ff780940d09f938cab1dc3a`; exact-head Actions run #3239 (`44949425719`) completed with overall **success**. Metadata resolver, Windows Runner quality, Supabase/PostgreSQL/RLS integration, and Ollama/local execution integration all passed.
- The successful run validates that candidate SHA only. PR #259 remains Draft/open/unmerged and GitHub reports `mergeable=false`.
- The candidate's recorded base is stale at `a1c1b58e4d1852f5a09a0e7c6c5cbeb38e1f9582`. Comparing current main `c7af9d1995ef4206203bcb498e2966558f035b23` with candidate HEAD reports **diverged**: candidate ahead 111 commits / behind 140. Do not merge, force-retarget, or copy the 40-file diff wholesale.
- Required next step: compare each candidate change with current main and selectively transplant only still-needed A fixes onto a fresh branch from current main. Resolve overlaps explicitly, then run all required checks against the new exact SHA.
- Candidate's exact-SHA Vercel status is still `build-rate-limit`; no READY Preview/current-SHA smoke evidence.
- Independent formal approval reviews: 0. One COMMENTED review is not approval; it identifies that `tests/fp/governance-review-route.test.ts` uses source-text assertions instead of invoking the route handler and asserting response status/body/security headers. Add runtime tests or accurately narrow the claim before acceptance.

### Independent audit
- Issue #136 remains open and the required read-only adversarial audit is outstanding for current integrated main plus the current A candidate. The latest update records the terminal exact-head CI success and requests the audit under the original read-only restrictions.
- Owner-side inspection, green CI and COMMENTED feedback do not substitute for the independent report.

### B and F–P
- B remains preparation-only. No B runtime/API/database access or Factory permissions are activated. Rebuild B only from an accepted A baseline and a reviewed, versioned, read-only projection.
- F–P remain limited to concrete A/B integration blockers. Do not promote stale/diverged branches or port failed PRs wholesale.

### Immediate execution order
1. Selectively reconcile the A candidate changes against current main; do not merge #259 as-is.
2. Close the P governance route runtime-test evidence gap.
3. Obtain Issue #136 independent read-only audit and triage findings.
4. Re-run exact-head Actions and obtain same-SHA READY Preview/smoke evidence for the rebuilt candidate.
5. Only after independent review and all acceptance gates pass, integrate A and then rebuild B.

**Safety:** no production deployment, production-data mutation, secret/permission change, machine-managed Factory issue mutation, lease/retry/quarantine/cooldown reset, or Runner/workflow policy change is authorized by this handoff.


### Schema guard follow-up
- Verified current main contains the same deterministic mismatch: `scripts/check-schema.mjs` expects `select plan(15)`, while `supabase/tests/public_table_grants.test.sql` declares `select plan(18)` and contains 18 assertions.
- Opened PR #270 from current main with the minimal one-line guard alignment to `plan(18)`. It does not change or remove SQL assertions, runtime code, migrations, or production state.
- PR #270 exact HEAD: `2982d0a98289a1ce2f0dbc1c36e34bd2bf479c1b`; keep Draft until its exact-head CI and independent review are complete.


## Live checkpoint — 2026-11-22 (verified GitHub state)

### Main / Factory-first
- Current `main`: `23fb747ae4041bc28783a1b9039660ec952c7e0d`; release baseline `0.3.125`.
- Integrated A/G acceptance PR #279 is the sole active code candidate, Draft/open at exact HEAD `edf0b86c15d599c772f51f31dc4030874ea27d9b`, based on current main `23fb747ae4041bc28783a1b9039660ec952c7e0d`. It combines A Factory lifecycle/repository-validation changes with only the required G/FP test and integration repairs. Exact-head CI #3287 (`44954636255`) is pending; no test result is inferred yet.
- The earlier A-only #273, G-only #278 and test-repair #277 candidates are closed unmerged as superseded by #279. Their historical failures remain diagnostic evidence only; none is acceptance evidence for #279.
- #279 must pass full unit tests, typecheck, lint, audits, production build, PostgreSQL/RLS and Ollama integration on its exact SHA. Exact-SHA Vercel Preview and independent Issue #136 review remain separate required gates.
- Exact-SHA Vercel status for the current candidates remains build-rate-limited; no READY Preview or same-SHA smoke evidence is available.
- Issue #136 remains open. Its required independent, read-only adversarial audit is outstanding; owner-authored static traces and CI results are not independent approval.
- PR #259 remains open/unmerged and targets stale base `a1c1b58e4d1852f5a09a0e7c6c5cbeb38e1f9582`; its broad diff is diverged from current main. Do not merge, retarget, or transplant wholesale.

### B / K preparation
- PR #275 remains a documentation-only Draft from current main. It corrects the B DTO comment so `FactoryTaskReadModelV1.status` is the bounded public `FactoryTaskStatus`, mapped by A from private durable states.
- B remains proposal-only: versioned, read-only projection; workspace authorization is owned by B; A verifies exact SHA/PR/run/attempt. No B runtime route, database table, billing or Factory permission is activated.
- Do not merge #275 until A acceptance and a fresh exact-head revalidation against the resulting main. Its previous exact-head quality run failed the legacy CI runbook assertion because the A/G contract correction is not yet on main.

### Next execution order
1. Finish integrated A/G #279 exact-head CI and resolve only verified blockers without weakening policy or tests.
2. Obtain the independent Issue #136 read-only audit and triage findings; do not substitute owner review.
3. Resolve Vercel Preview quota through the normal provider cycle; no bypass, and obtain same-SHA READY Preview/smoke evidence.
4. Only after A/G acceptance and integration, refresh and revalidate B #275 against the resulting main.
5. Implement only the reviewed versioned read-only projection and B-owned workspace authorization; keep B Runtime inactive until accepted.

**Safety:** no production deployment/data mutation, secret or permission changes, workflow-policy changes, or machine-managed Factory state edits are authorized by these documentation updates.


## Superseding live checkpoint — 2026-11-22 (exact-head refresh)

This section supersedes earlier live-checkpoint statements in this handoff where candidate SHAs or CI run IDs differ. Older entries remain historical records, not current acceptance evidence.

### A / Agent Factory V2 — priority 0
- Current integrated `main`: `23fb747ae4041bc28783a1b9039660ec952c7e0d`.
- Sole active A/G integration candidate: PR #279, Draft/open, based on that main.
- Current exact PR HEAD: `99f67c6a1f6a4cbff3522de14bb1508f8d4c52a4`.
- The focused latest change corrects `tests/account-summary.test.ts` to inspect the actual CSS Module and assert both keyboard-focus selectors; no runtime behavior changed.
- Exact-head Actions run [#44955249084](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44955249084) is still pending and has no allocated jobs at the latest verification. It provides no pass/fail evidence yet.
- The exact-SHA Vercel status is `build-rate-limit`; this is provider quota state, not a code-test result. No READY Preview is available.
- Issue #136 has been updated to request an independent read-only audit of this exact SHA. No independent report or formal PR review has been received.
- Keep #279 Draft and unmerged until exact-head unit/type/lint/audit/build/PostgreSQL-RLS/Ollama evidence, same-SHA Preview/smoke evidence, and independent review are complete.

### B preparation — documentation only
- PR #275 remains Draft/open and documentation-only. Its current branch contains the bounded public read-adapter status clarification and this handoff refresh.
- The preceding B head `537c4031e1c3ba2236aa626e9e6b8cd603cb8c9e` had pending run [#44954680420](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44954680420); that run does not validate the updated documentation commit. Current B head `fbe288d0102ce34c7ca131bda7ca7eb2a9f48b47` has no associated PR Actions run/check at the latest verification and is not an acceptance result.
- Keep B runtime, routes, tables, billing, workspace permissions and Factory access inactive. Rebase/revalidate B only after A is accepted and integrated.

### Execution controls
1. Continue A/G #279 first; use only the current exact HEAD and its own CI evidence.
2. Preserve the single self-hosted Runner concurrency policy; do not cancel queued work or weaken gates to gain throughput.
3. Fix only reproduced failures. Do not alter machine-managed Factory state, production data, secrets, permissions or deployment configuration.
4. After A acceptance, refresh B #275 against the resulting main and validate the read-only projection contract before any B runtime work.


---

## Superseding post-merge acceptance checkpoint — 2026-11-22

This checkpoint is authoritative for the state observed after PR #283 merged. Older PR/CI snapshots above are historical and must not be reused as current release evidence.

### Mainline state
- Current main HEAD observed: `23fb747ae4041bc28783a1b9039660ec952c7e0d` (merge commit for PR #283).
- PR #275 was merged into main at `27dba5e6f32d74e803f1ac814cd964d0af88364f`; its change is documentation-only and bounds the B DTO status comment.
- PR #283 A/G candidate HEAD `abe983db3f2f6e657fbc39c2777fdb28e0bd2573` was merged into main by merge commit `23fb747ae4041bc28783a1b9039660ec952c7e0d`.
- Exact-head Actions run #3369 on PR HEAD `abe983...` completed successfully: resolver, Windows quality gates (tests/type/lint/audits/build), Ollama/local execution, and isolated Supabase migrations/PostgreSQL/pgTAP/two-member application RLS all passed.
- **Post-merge validation gap:** no Actions run for merge commit `23fb747...` is verified in the available connector evidence. The exact-head PR pass is not silently relabelled as a merge-commit pass.
- Combined status on merge commit reports Vercel `build-rate-limit`; no READY Preview or same-SHA Smoke evidence is established.

### A acceptance — merged, not accepted
- PR #283 had no formal review submissions and no inline review threads at the last verification before/around merge.
- Issue #136 still has no independent reviewer report. The audit target must now be the merged main commit `23fb747ae4041bc28783a1b9039660ec952c7e0d`, with the PR head `abe983db3f2f6e657fbc39c2777fdb28e0bd2573` retained as its source diff reference.
- Machine-managed Issue #100 remains read-only. Latest verified durable snapshot remains state version 144, no active task, 11 queued, 7 quarantined, and system consecutive failures 7; cooldown expired at `2026-11-21T21:51:20.864Z`.
- Latest verified scheduled preflight evidence remains run #314 / `44953122918`, before cooldown expiry; no post-cooldown task selection, lease reservation, or worker progression is established. The absence of evidence is not proof of a scheduler code defect.
- A real 24-hour Runner soak, lease fencing/recovery, duplicate-event idempotency and serialized Runner operation remain operational acceptance gates.

### B preparation
- PR #290's expanded read-only adapter contract was merged into the old A feature branch after PR #283 had already merged; its merge commit is not part of current main.
- This branch selectively carries that documentation contract onto current main. It adds only the bounded public CI state and failure-category vocabulary, fail-closed mapping rules, and exact PR/SHA/run-ID/attempt evidence requirements.
- B Runtime, product API/database access to Factory state, billing, privileged execution and Factory permissions remain inactive.
- Revalidate the contract against the accepted A public projection before implementing any B Runtime.

### Execution order
1. Validate the merged main tree on an exact merge-commit CI run; do not infer this from PR-head CI.
2. Complete the independent read-only audit of exact merge SHA `23fb747...`.
3. Obtain same-SHA Vercel Preview/Smoke when the provider quota permits.
4. Establish post-cooldown scheduled queue selection, lease/worker progression and a real 24-hour Runner soak without manual dispatch or state mutation.
5. Only after A acceptance, implement the A-owned sanitized projection and B-owned workspace authorization behind a reviewed, versioned read-only contract.

**Safety:** do not modify machine-managed Issue #100, reset retry/quarantine/cooldown, force-dispatch tasks, change workflow/Runner policy, alter secrets/permissions, deploy Production, or activate B Runtime to manufacture acceptance evidence.


### Vercel evidence correction — supersedes any quota-only interpretation above
- The latest concrete Vercel `main` deployment inspected was `dpl_CCYZPoBvWHT7rVVEAKXHxLy1g9D5`, built from pre-A-merge main SHA `27dba5e6f32d74e803f1ac814cd964d0af88364f`.
- That deployment ended `ERROR` with `errorCode: module_not_found`; build log: `lib/fp/governance-review-route-handler.ts` could not resolve `../github-repository-name.mjs`.
- PR #283 subsequently added `lib/github-repository-name.mjs` and the merge commit `23fb747ae4041bc28783a1b9039660ec952c7e0d` contains both the helper and the matching import. This is a code correction in the merged tree, not proof of a successful deployment.
- Vercel currently returns no deployment record for merge SHA `23fb747...` or documentation candidate SHA `20cf328...`. The combined status target string contains `build-rate-limit`, but the inspected concrete deployment failure is `module_not_found`; do not label the old failure as quota-only.
- No Production redeploy was triggered. Require a new same-SHA Preview/build and smoke result through the normal project flow before deployment acceptance.


## 2B. Live continuation checkpoint — 2026-11-22 09:47 Taiwan (supersedes earlier run/state snapshots)

**Verified main HEAD:** `aa63b74f9d23d2316ec7b59116632d686afb8fe1` (PR #293 merge). Release remains `0.3.125`.

### A — Factory priority
- PR #293 merged the Node.js `22.13.0` runtime alignment for Preflight validation/preparation jobs.
- PR #300 merged read-only durable-state capacity telemetry: processed-event ledger limit 500 and state-Issue body ceiling 60,000 characters, with warning/critical/blocked classifications. The ledger remains fail-closed; do not evict keys or compact without a separately reviewed design.
- Latest scheduled `AI Agent Task Preflight` run observed: #44972336349, created `2026-11-22T01:37:42Z`, checked out older main SHA `23fb747ae4041bc28783a1b9039660ec952c7e0d`. The task-plan job #137054627179 remains pending with no steps; the Windows validation job was skipped. This is a delivered scheduled event, not a successful selection/lease/progression cycle.
- Current-main push Preflight #44972991644 is pending at Windows self-hosted job #137056615492 with no allocated steps; its read-only task-plan job is skipped because the event is a push. Main CI #44972991698 is pending with no jobs returned.
- Machine-managed Issue #100 was read-only at state version 145, updated `2026-11-22T00:47:18.173Z`: no active task; system consecutive failures 8; recorded cooldown ended `2026-11-22T01:02:18.173Z`; last successful system run remains `2026-11-20T17:37:29.527Z`. Multiple tasks remain queued. Do not edit the issue, reset counters/cooldowns/leases/quarantine, or dispatch duplicates.
- A is integrated but **not operationally accepted**. Required gaps remain: current-main CI/Preflight completion, post-cooldown normal queue/lease progression, 24-hour serialized Runner soak, same-SHA Preview/Smoke, and independent read-only adversarial review in Issue #136.

### Candidate and review boundaries
- PR #301 is a Draft K documentation checkpoint based on `aa63b74...`; its exact-head CI run #44973118291 is pending at the candidate metadata resolver. No CI pass is claimed.
- PR #295 is based on older main `23fb747...` and is non-mergeable; do not merge or transplant wholesale.
- PR #259 is a 111-commit legacy A/F–P candidate based on `a1c1b58...`, diverged from current main; do not merge or copy its diff wholesale.
- Issue #136 remains a separate read-only audit requirement. Owner-authored review and CI are not substitutes for an independent reviewer.

### B — preparation only
- Keep B Runtime inactive. The versioned read-only A→B projection remains a proposal, not a public API.
- After A acceptance, A must expose a structured server-side projection binding full candidate SHA, PR number, CI run ID and attempt. B owns authenticated workspace/tenant authorization and RLS/IDOR isolation.
- B must not import A controller/state-store internals, read or mutate Issue #100, manage leases, call Runner/Sandbox, or expose internal lifecycle enums, run identifiers, raw Issue bodies or logs.

### Next execution order
1. Observe the pending scheduled and main-push runs; inspect exact run/attempt/job logs and a fresh read-back of Issue #100 only after normal execution.
2. Diagnose only evidence-backed Windows queue/Runner or CI blockers. Do not alter Runner/concurrency/workflow permissions or cancel queued work.
3. Complete Issue #136's independent read-only audit and remediate concrete findings through isolated A PRs with exact-head tests.
4. Require current-SHA CI, same-SHA READY Preview/Smoke, post-cooldown queue progression and the serialized 24-hour soak before A acceptance.
5. Only then rebase and validate the B read-only adapter against the accepted A contract; do not activate B runtime early.

**Authority boundary:** this checkpoint records read-only observations and integration contracts only. It changes no Factory state, task issue, Runner policy, workflow permission, secrets, production database, or deployment configuration.


---

## Superseding live checkpoint — 2026-11-22 02:05 UTC (10:05 Taiwan)

This checkpoint supersedes the earlier 09:47 Taiwan snapshot for the Factory run and task state below. The run was triggered from an older checked-out main SHA; do not treat it as current-main validation.

### A — Factory execution and publication

- Scheduled Preflight run [#44972336349](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44972336349), job #137054627179, checked out base SHA `23fb747ae4041bc28783a1b9039660ec952c7e0d`, not current main `061ccf621c228bae93b91cd8c53723c3fe08310a`.
- Queue selection, cooldown check, lease reservation, safe handoff, read-only planning, bounded patch proposal, scratch application, restricted dependency installation, and offline candidate validation completed successfully.
- The uploaded offline test artifact reports **602/602 unit tests passed**, TypeScript passed, and ESLint completed with zero errors and one existing unused-import warning. These are generic repository checks; they do not establish dependency-audit remediation.
- The generated Issue #17 patch contains only `docs/security/dependency-audit-remediation.md`; it does not add the required `tests/security/dependency-audit.test.mjs`. The workflow ran unit tests, TypeScript and lint only; it did not run `npm audit` or a fresh production/full dependency audit.
- The generated document proposes Next.js `13.5.6` and ESLint `8.55.0`, while main `package.json` specifies Next.js `15.5.29` and ESLint `^9.30.1`. This is an excluded major-version downgrade. The other proposed package versions were not substantiated by fresh audit/registry evidence. **Do not publish, merge, or accept this candidate.**
- The draft-PR publication step failed. The job-log endpoint returned BlobNotFound, so the exact runtime API error is unavailable. Static inspection confirms the workflow grants only `contents: read` and `issues: read`, while `scripts/publish-agent-patch.mjs` attempts Git blob/tree/commit/ref writes, draft PR creation and repository dispatch using that token. This is a confirmed least-privilege permission mismatch; the precise failure response remains unverified.
- The failure handler released the active lease. Machine-managed Issue #100 was read-only at state version 152, updated `2026-11-22T02:04:40.421Z`: no active task; Issue #17 is queued; system consecutive failures 9; cooldown through `2026-11-22T02:19:40.421Z`. No manual retry, state mutation, cooldown reset, quarantine change or workflow rerun was performed.
- A read-only evidence note was added to Issue #136 (comment #7072665996) with the exact test scope, candidate quality rejection, static publisher-permission blocker and evidence limitations.

### Current acceptance and candidate boundaries

- Current main remains `061ccf621c228bae93b91cd8c53723c3fe08310a`. Main CI run #44973274417 remains pending with no allocated jobs; its combined status reports Vercel `build-rate-limit`.
- PR #302 remains Draft/open, head `74d50d3b7197aa4ff96b827cae80344f7148e7b4`, with no formal reviews and exact-head run #44973451004 pending without allocated jobs. This handoff update itself must receive fresh exact-head validation; it is not an acceptance result.
- PR #259 remains open and non-mergeable, based on a divergent historical base. Do not merge, retarget or transplant it wholesale.
- Issue #136 remains the independent read-only adversarial audit gate. The new evidence note is not independent sign-off.
- A remains integrated but **not operationally accepted**. Current-main CI, same-SHA Preview/Smoke, independent review, post-cooldown natural queue/lease progression, and serialized 24-hour Runner soak remain outstanding.

### B — preparation only

- GCAN Product version is `0.1.20` per `versions/manifest.json` and `versions/gcan-product/VERSION`.
- Keep B Runtime, product API/database access to Factory state, billing and privileged execution inactive.
- After A acceptance, rebase/revalidate the versioned read-only A→B projection against accepted main. A owns the sanitized evidence projection; B owns workspace/tenant authorization and RLS/IDOR isolation. B must not access Issue #100, A controller/state-store internals, leases, Runner/Sandbox, raw logs or private lifecycle enums.

### Next execution order

1. Do not retry Issue #17 unchanged. Preserve the normal cooldown/queue behavior; correct the evidence-backed candidate-quality and publisher-permission defects through the approved control-plane review path.
2. Keep publisher credentials least-privileged and isolated to a dedicated publishing job; do not broaden the whole workflow token without review.
3. Add semantic task-specific validation: reject excluded major downgrades, require evidence-backed package versions, require fresh audit evidence, and require the task-specific security test artifact before publication.
4. Continue observing current-main CI and normal scheduled Factory progression; do not force-dispatch, reset machine state or cancel queued work.
5. Complete independent Issue #136 review and all A operational gates before implementing or activating B Runtime.

**Safety:** no workflow permission, secret, Runner policy, machine-managed state, production data, deployment or B Runtime was changed by this checkpoint.


---

## Follow-up observation — 2026-11-22 02:10 UTC

### Current exact-head and Factory observations

- Main/base SHA remains `061ccf621c228bae93b91cd8c53723c3fe08310a` for PR #302.
- Main CI run `44973274417` has only the metadata-resolver job allocated and it is still pending; no downstream validation result is available.
- PR #302 currently points to `e9a444bf2bb4d07130ad64bf25e7879a7128cb3e`, remains Draft/open, has no formal review, and exact-head run `44973451004` still has no allocated jobs. Keep it Draft; do not merge.
- Factory run `44972336349` is completed/failure. The bounded patch, scratch application, restricted dependency install and generic offline checks succeeded; the publisher step failed. The Windows self-hosted validation job was skipped by schedule policy.
- Issue #100 remains at state version 152 (updated `2026-11-22T02:04:40.421Z`): no active task, task #17 queued, system cooldown through `2026-11-22T02:19:40.421Z`, 9 consecutive system failures. Task metadata still contains the historical `lease_id`/run reference; do not infer a new active lease from that historical field. Do not edit the machine-managed Issue or manually retry during cooldown.
- No available evidence justifies merging PR #302 or PR #259. PR #259 remains divergent and non-mergeable.

### Safe next actions

1. Preserve the Factory queue and cooldown; observe the native scheduler after cooldown rather than force-dispatching or resetting state.
2. Fix the publisher design in a dedicated, separately reviewed code change. Keep the workflow's default token read-only; move only the publication operation to a narrowly scoped job/token with explicit contents and pull-request write access, and confirm the repository-dispatch permission/event semantics. Do not grant write access to the entire planning/testing job.
3. Before publication, add task-specific semantic validation: reject prohibited major-version downgrades, require current audit/registry evidence, and require the requested security regression test artifact. General unit tests alone are insufficient.
4. Require exact-head CI, same-SHA Preview/Smoke, independent Issue #136 review, and the serialized Runner soak before declaring A operationally accepted.
5. Keep B Runtime inactive. Prepare only the sanitized, versioned, read-only A→B projection until A passes every acceptance gate.

This is an observation and sequencing checkpoint, not an acceptance, merge, deployment, Factory-state mutation, or B activation.


---

## Superseding continuation checkpoint — 2026-11-22 (A Factory / B contract)

This checkpoint supersedes earlier live-status statements in this document where exact SHAs, run IDs, or failure diagnoses differ. It is based on read-only GitHub evidence observed for current main `061ccf621c228bae93b91cd8c53723c3fe08310a`.

### A — Factory candidate work

- **PR #303 — stale-base failure classification:** HEAD `aec814f93c60fdda501c158cbd622377625a5c61`; exact-head Actions run `44975519823` is pending with no jobs allocated. It preserves both stale-base guards and marks only the two explicit default-branch-drift publication rejections as task-scoped. It does not rebase, retry, publish, or weaken the SHA checks.
- **PR #305 — task-declared patch output contracts:** HEAD `2a2d35114c88ba0cce6d8478a72d908a8b277985`; exact-head Actions run `44976078839` is pending with no jobs allocated. It parses required output paths and forbidden literal content, enforces allowlist containment and aggregate manifest validation, and now rejects empty/invalid batch scopes or any batch expansion beyond the validated task allowlist.
- Both PRs remain Draft/open, GitHub reports mergeable, neither has a formal review submission or review thread, and neither has exact-head CI success. Their combined statuses report Vercel `build-rate-limit`; no same-SHA READY Preview/Smoke is established. Mergeability is not acceptance.
- Run `44972336349` / job `137054627179` established the stale-base incident: scratch application and generic offline validation passed, then publication correctly rejected the stale candidate because main had advanced after tests. The classifier treated that known task-level race as system-scoped. PR #303 addresses that narrow misclassification.
- **Evidence correction:** Issue #136's latest correction records effective job-token permissions as Contents: write, Issues: write and PullRequests: write, and explicitly withdraws the earlier read-only-token mismatch diagnosis. Do not repeat the old permission-mismatch claim as a confirmed cause. The observed publisher failure was the stale-base rejection.
- Issue #100 remains machine-managed and was not modified: state version 152 at `2026-11-22T02:04:40.421Z`, no active task, 9 consecutive system failures, cooldown through `02:19:40.421Z` (elapsed), Issue #17 queued, and 7 quarantined tasks. The historical lease/run fields on task #17 are not a live lease. No manual retry, state reset, or forced dispatch is authorized by this checkpoint.
- Issue #17's previous candidate was not publishable: it omitted the required security regression test, proposed excluded Next.js/ESLint major downgrades, and lacked fresh dependency-audit evidence. Do not retry the unchanged task. After #305 is merged and validated, add its required test path and literal prohibitions to #17; the contract alone does not replace fresh audit/registry evidence or task-specific validation.

### Independent A acceptance

- Issue #136 remains a read-only audit gate. Its latest comments contain owner-authored evidence and corrections, but no independent adversarial audit report or formal sign-off was found. CI, code inspection, and implementation-owner notes are not substitutes.
- Keep #303 and #305 Draft until their own exact-head CI, independent review, and applicable Preview evidence are complete. Merge only after those gates pass.
- Do not edit Issue #100, reset failure/cooldown/quarantine/lease state, broaden workflow permissions, change Runner/concurrency policy, or bypass the normal scheduler.

### B — contract preparation only

- Current main's `lib/agent-factory-state-machine.mjs` already stores structured `head_sha`, `pull_request_number`, `ci_run_id`, and `ci_run_attempt` fields and validates the exact tuple for candidate evidence. The current B proposal's public-state mapping covers every declared `TASK_STATES` value.
- This confirms a usable source-data foundation, **not** a dedicated A-owned product projection or public API. The B read adapter remains a proposal; B Runtime, product routes/tables, billing, and Factory access stay inactive.
- Before implementation, freeze the A projection contract after A acceptance, explicitly map failure categories from an allowlist (default unknown; never expose raw exception text), and implement B-owned workspace authorization plus two-workspace RLS/IDOR tests. B must not read Issue #100 or import A controller/state-store internals.

### Next execution order

1. Complete exact-head Actions and independent review for #303 and #305; do not treat pending/unallocated jobs as passing.
2. After #305 acceptance, amend Issue #17 with the required test output and prohibited recommendation literals, then allow the normal scheduler to process it against current main.
3. Complete Issue #136's independent read-only audit and the remaining A operational gates, including same-SHA Preview/Smoke and natural queue/lease progression.
4. Only after A acceptance, implement the A-owned sanitized projection and B-owned workspace boundary under the versioned read-only contract.

**Authority boundary:** this checkpoint is documentation-only. It changes no runtime, Factory state, task issue, lease, retry/cooldown/quarantine, Runner/workflow policy, secret, permission, production database, deployment, or B Runtime behavior.


---

## A→B failure-code projection cross-check — 2026-11-22

- PR #303 latest HEAD is `0b521e654de819098fb59e86eb024bd75cc56810`. Both stale-default-branch publisher guards now persist `AGENT_FACTORY_FAILURE_SCOPE=task` and `AGENT_FACTORY_ERROR_CODE=STALE_BASE` to `GITHUB_ENV`; the regression test asserts both values. Exact-head CI is pending/not yet observed as passing; PR remains Draft.
- This closes a narrow evidence gap for the proposed B projection: the controller reads `AGENT_FACTORY_ERROR_CODE`, otherwise defaults workflow failures to `WORKFLOW_FAILURE`. Without the explicit code, stale candidate drift would be indistinguishable from generic workflow failure in durable state.
- Proposed public mapping (subject to independent contract review): `STALE_BASE` → `validation`; `WORKER_LEASE_EXPIRED` → `infrastructure`; generic `WORKFLOW_FAILURE`, `TASK_FAILURE`, and `SYSTEM_FAILURE` → `unknown`. Candidate CI failure currently has no distinct persisted error code and therefore remains `unknown` until A supplies a structured, exact-attempt code.
- Never derive public categories from free-form `last_error` summaries. Unknown codes map to `unknown`; raw summaries, internal codes, and scope details are not exposed to B.


## Live continuation checkpoint — 2026-11-22 10:36 Taiwan

**Verified main HEAD:** `061ccf621c228bae93b91cd8c53723c3fe08310a` (PR #301 merge). Release remains `0.3.125`; this checkpoint does not change release readiness.

### A — Factory-first execution evidence
- Machine-managed Issue #100 was read-only at state version 152 (updated `2026-11-22T02:04:40.421Z`): no active task; system consecutive failures 9; recorded cooldown ended `2026-11-22T02:19:40.421Z`; task #17 is queued. Historical lease/run fields in the task record are not evidence of an active lease. Do not edit the Issue, reset counters/cooldowns/leases/quarantine, or dispatch duplicate work.
- Scheduled run #44972336349 / Windows job #137054627179 completed its disposable scratch validation. Logs show 602/602 unit tests, TypeScript and ESLint completed successfully; this is candidate offline validation, not a full audit/dependency-audit result.
- The same task then failed closed at publication because the default branch advanced after candidate tests. No PR was published. This confirms the narrow stale-base classification defect addressed by PR #303; it does not establish a token-permission failure. PR #303's exact-head CI run #44976773308 is pending with no allocated jobs.
- Current-main Preflight #44972991644 completed successfully against the prior main SHA `aa63b74f9d23d2316ec7b59116632d686afb8fe1`. Its Windows synthetic validation, Ollama plan/patch smoke, disposable-container checks, offline tests, typecheck and lint passed; the task-transition step and read-only planning job were skipped. This is not proof of real queue/lease/worker progression and does not validate the newer main SHA `061ccf...`.
- Main CI #44972991698 for `aa63b74...` is cancelled. Do not count it as passing. No exact-main CI pass is established for `061ccf...`.

### Current candidate gates
- PR #302 documentation HEAD `2d93e14fd46e7eeaa788ff2f0095df702d95636b`, run #44976783109: pending, no allocated jobs.
- PR #303 stale-base scope/error-code HEAD `9b1097484e868d8c78b752c1372f6c6964a36ed3`, run #44976773308: pending, no allocated jobs.
- PR #305 task-declared patch contract HEAD `2a2d35114c88ba0cce6d8478a72d908a8b277985`, run #44976078839: pending, no allocated jobs.
- All three remain Draft/open. PR #303 and #305 have no formal review submissions. Keep all unmerged until exact-head CI, required independent review and applicable Preview evidence are available.

### B preparation and independent audit
- Keep B Runtime inactive. Continue only the versioned, read-only A→B contract preparation; no Factory state, lease, Runner/Sandbox or raw Issue/log access from B.
- Issue #136 remains a read-only independent adversarial audit request; no independent audit report/sign-off is present in the latest inspected comment history. Do not mutate that issue or treat implementation-author inspection as independent approval.
- A remains integrated but not operationally accepted. Outstanding gates include exact-current-main CI, natural post-cooldown queue/lease/worker progression, serialized 24-hour Runner soak, same-SHA READY Preview/Smoke and independent audit.

**Authority boundary:** this checkpoint records observed evidence only. It changes no runtime, machine-managed Factory state, task issue, lease, retry/cooldown/quarantine, Runner/workflow policy, secret, permission, production database, deployment or B Runtime behavior.

---

## Exact-head validation correction — 2026-11-22 (Runner queue / PR #306)

This checkpoint supersedes the earlier statement that PR #306 run 44977771018 was pending. A fresh read of the exact run and job records shows it has **completed with failure**.

### Current exact-head evidence

| PR | Exact HEAD | Actions run | Observed result |
|---|---|---:|---|
| #302 — handoff / acceptance ledger | `07e5826522631275c902d9d10f5ffa61e97f378e` | `44977000732` | Resolver passed; Windows quality job pending. |
| #303 — stale-base scope / error code | `9b1097484e868d8c78b752c1372f6c6964a36ed3` | `44976773308` | Resolver pending; no downstream jobs allocated. |
| #305 — task output contract | `97f2051161a6c5a9c24bc93a144d6c045bc183b5` | `44977858601` | Run pending; zero jobs allocated. |
| #306 — hosted metadata / diagnostics | `ed735cfff51e080df841fb8b991966a1d00914f0` | `44977771018` | **Completed / failure.** Resolver and hosted diagnostics both failed; Windows quality, PostgreSQL/RLS and Ollama jobs were skipped. |

### PR #306 failure diagnosis boundary

- The hosted resolver and hosted diagnostics jobs both completed as failed on exact HEAD `ed735cfff51e080df841fb8b991966a1d00914f0`.
- GitHub reports the expected downstream Windows validation jobs as skipped because their prerequisite resolver did not succeed.
- Fetching the failed job logs returned GitHub storage `BlobNotFound` for every job; the run has no downloadable diagnostic artifact. The underlying resolver and diagnostics error messages therefore remain **unverified**.
- Do not claim the hosted-runner change is validated, and do not infer that the resolver failure is caused by Bash, token permissions, API rate limiting, or application code without the missing logs.
- The PR remains Draft/open, has no formal review submission, and its combined status reports the Vercel daily deployment rate limit. No same-SHA READY Preview/Smoke evidence exists.

### Required next actions

1. Recover trustworthy exact-run diagnostics through GitHub's available run/check evidence or a fresh naturally triggered exact-head run; do not fabricate or infer missing logs.
2. Identify and fix the actual resolver and diagnostics failure before changing the runner design further.
3. Require exact-head success for Windows quality, PostgreSQL/RLS and Ollama/local execution before treating #306 as accepted.
4. Continue #302/#303/#305 only against their exact current HEADs; pending or unallocated jobs are not passing.
5. Obtain independent formal review and the separate read-only Issue #136 audit. No implementation-owner note substitutes for it.

**Authority boundary:** evidence/documentation only. No Factory state, task, lease, retry/cooldown/quarantine, Runner settings, workflow permissions, secrets, production data, deployment or B Runtime state was changed.


---

## Live continuation checkpoint — 2026-11-22 (verified against current GitHub state)

This checkpoint supersedes earlier live-status snapshots above. It is an evidence refresh, not a runtime acceptance or release authorization.

### Mainline and merged changes
- Verified `main` HEAD: `0d3c90e6dff36a458ceb38b51a3b80611b1988a2`.
- Main HEAD is the merge commit for PR #309, which classifies CI syntax and policy regressions as task failures.
- Recent integrated PRs include #311 (Factory provider rate-limit cooldown), #316 (Factory rate-limit and repository-safety hardening), and #309. Their merged state does not by itself establish current-main operational acceptance.

### Current-main CI and Preflight
- Main CI run [#3518](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44986529515) targets exact SHA `0d3c90e6dff36a458ceb38b51a3b80611b1988a2` and remains **pending**. The latest Jobs query returned no allocated jobs. No tests, typecheck, lint, build, PostgreSQL/RLS or Ollama pass is inferred.
- Preflight run [#324](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44986477890) is still **in progress**, but targets older SHA `5fd3ff873bb9f541c46f0cc7654420c12c67e488` (the PR #316 merge-era main), not current main `0d3c90e6dff36a458ceb38b51a3b80611b1988a2`.
- Its Windows self-hosted validation job has passed toolchain verification, local Ollama plan/patch smoke tests, disposable-container isolation, and applying the validated patch to a disposable scratch workspace. The active step at the latest refresh is **Install candidate dependencies inside restricted container**. Offline candidate tests, publisher dry-run, full unit tests, TypeScript and ESLint remain pending. The task-transition and read-only planning steps were skipped; skipped is not a pass.
- Do not use Preflight #324 as exact-current-main validation. Do not bypass the serialized self-hosted Runner queue, cancel the active run, or dispatch duplicate work to manufacture a green result.

### Open candidates and independent audit
- PR #259 is the only open PR found in the latest open-PR query. It remains Draft/open, based on old base SHA `a1c1b58e4d1852f5a09a0e7c6c5cbeb38e1f9582`, head `3330cd04a77358cf0ff780940d09f938cab1dc3a`, and GitHub reports `mergeable=false`. Its 111-commit / 41-file scope is stale and must not be merged wholesale or force-retargeted.
- Issue #136 remains open. Its scope is an independent, read-only adversarial review. No independent final audit report or approval was found in the latest inspected history. Internal source inspection and CI are not substitutes.
- Machine-managed Factory Issue #100 remains outside manual-write scope. Do not edit its encoded state, counters, leases, cooldowns, retries or quarantine records; allow the Factory controller to own those transitions.

### B-line preparation
- `docs/architecture/agent-factory-product-read-adapter.md` remains a **proposed, unimplemented, unaccepted** contract. It defines a versioned, read-only product projection and requires exact candidate SHA / PR / CI run / run-attempt verification.
- Keep B Runtime inactive. Continue only contract/schema and compatibility preparation. B must not read or mutate Factory Issue state, leases, Runner/Sandbox internals, raw logs, patches, secrets or privileged execution controls.
- The A acceptance gates remain incomplete: exact-current-main CI, natural queue/lease/worker progression, required local/database integration evidence, same-SHA Preview/Smoke where applicable, and independent Issue #136 review.

### Next actions
1. Let the existing serialized Runner job finish or reach its configured timeout; inspect its actual result and preserved diagnostics.
2. Obtain current-main CI jobs for exact SHA `0d3c90e6dff36a458ceb38b51a3b80611b1988a2`; do not infer success from a pending run with no jobs.
3. If the active preflight finishes, record its tested SHA and all step conclusions separately from current-main evidence.
4. Repair only reproducible Factory defects, with isolated regression tests and exact-head validation.
5. Keep B at the read-only adapter contract until A's acceptance gates are met.

**Authority boundary:** this checkpoint changes documentation only. It does not change Factory runtime, machine-managed Issue state, task state, leases, retries, cooldowns, quarantine, Runner/workflow policy, secrets, permissions, production data, deployments or B Runtime behavior.


---

## Live continuation checkpoint — 2026-11-22 (subsequent Actions refresh)

This section supersedes the earlier in-progress descriptions of Preflight #324 and PR #311 in the preceding checkpoint. It records observed job state only; it does not authorize runtime activation or release.

### Verified progress
- Preflight run [#324](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44986477890) is now **completed**. Its Windows self-hosted validation job concluded **success** on SHA `5fd3ff873bb9f541c46f0cc7654420c12c67e488`, which is older than current main `0d3c90e6dff36a458ceb38b51a3b80611b1988a2`. Toolchain/isolation, local Ollama plan/patch smoke tests, scratch patch application, offline candidate tests, publisher dry-run, locked dependency installation, full unit tests, TypeScript, ESLint and cleanup passed. The read-only task-plan job was **skipped**. This is not exact-current-main acceptance.
- PR #311 is merged at exact candidate SHA `c1444cb74b0c5db2b546cdc37f578a44d4b95260`. Its exact-head run [#44985592683](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44985592683) now shows the Windows quality-gates job **success** and the PostgreSQL/migrations/RLS integration job **success**, including isolated Supabase migration application, pgTAP, and two-member application RLS tests.
- The same PR #311 exact-head run still has **Windows Ollama and local execution integration in progress**. The latest observed active step is **Verify bounded local Ollama inference**. Do not declare the full candidate acceptance complete until this job reaches a terminal result.
- Current main remains `0d3c90e6dff36a458ceb38b51a3b80611b1988a2`. Main push CI [#44986529515](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44986529515) remains pending at the exact main SHA; its only allocated job is the exact candidate metadata resolver, still pending with no steps exposed. No current-main test/type/lint/build/database/Ollama pass is established.
- PR #317 remains Draft/open. Its exact-head run [#44988396529](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44988396529) has only a pending metadata resolver and no completed validation or formal review. Keep it unmerged.

### Acceptance and authority boundaries
- Treat the merged PR #311 code and its partial post-merge integration evidence separately: quality and PostgreSQL/RLS have passed; Ollama/local execution remains pending.
- Do not rerun, dispatch, cancel or bypass the serialized Windows self-hosted Runner queue to manufacture green evidence.
- Issue #136 remains a separate read-only independent adversarial audit; implementation-owner notes and CI do not substitute for its report.
- Issue #202's five-minute scheduled delivery still requires owner/admin inspection of repository Actions settings and policy. A completed push-triggered Preflight run does not prove cron delivery.
- Keep machine-managed Issue #100 untouched and B Runtime inactive. Continue only the proposed versioned read-only A→B adapter preparation until A acceptance gates are complete.

**Authority boundary:** this checkpoint updates evidence documentation only. It does not alter Factory runtime/state, tasks, leases, retries, cooldowns, quarantine, Runner or workflow policy, secrets, permissions, production data, deployments, or B Runtime behavior.


---

## Superseding live continuation checkpoint — 2026-11-22 (verified current-main refresh)

This checkpoint supersedes earlier live snapshots above wherever their branch tips, run IDs, or conclusions differ. It records read-only evidence observed during this refresh; it is not a runtime acceptance or release authorization.

### Mainline and integrated A baseline
- Verified default branch `main` HEAD: `ef7769239ac328ba18ec256718fe7fd269b5a8c5`.
- The current main tree contains the durable Factory state capacity inspector and its regression tests (`inspectFactoryStateCapacity`, `MAX_PROCESSED_EVENTS`, and the shared state-Issue encoder). This is source-presence evidence only; do not infer an operational capacity warning or successful long-running soak from it.
- Recent merged work includes PRs #309, #311, #316 and #317. Their merge status does not establish exact-current-main CI or full A operational acceptance.

### Current CI and candidate status
- Main push CI run `44989681054` targets exact current main SHA `ef7769239ac328ba18ec256718fe7fd269b5a8c5`; latest observation is **pending** with no jobs allocated. No current-main test, typecheck, lint, audit, build, database/RLS, or Ollama pass is established.
- CI run `44989538934` targets older SHA `401d5192d84bcc574020541c68d545c26483a360`; it is not evidence for current main. Latest observation is pending with no jobs allocated.
- PR #259 is the only open PR returned by the latest open-PR query. It remains open/non-draft, based on stale base SHA `a1c1b58e4d1852f5a09a0e7c6c5cbeb38e1f9582`, head `3330cd04a77358cf0ff780940d09f938cab1dc3a`, and GitHub reports `mergeable=false`. Its broad historical diff must not be force-merged, wholesale transplanted, or treated as an accepted integration candidate.
- The current combined commit status reports Vercel failure with `build-rate-limit`. No same-SHA READY Preview/Smoke or production deployment evidence is established.

### Independent review and machine-managed state
- Issue #136 remains an independent, read-only adversarial audit gate. The latest inspected comments contain implementation-owner evidence/corrections, but no independent final audit report or formal sign-off was found. Do not substitute source inspection, CI, or owner-authored notes for independent review.
- Factory Issue #100 remains machine-managed and outside manual-write scope. It was read only during this refresh; do not edit its encoded payload, task records, counters, lease, retry, cooldown, or quarantine state. Allow the controller/scheduler to own state transitions.
- Do not dispatch or rerun workflows, reset cooldown/failure/quarantine state, bypass the serialized Windows Runner queue, change workflow permissions/secrets, or touch production data to manufacture green evidence.

### A acceptance and B boundary
- A remains integrated but **not operationally accepted**. Required evidence still includes exact-current-main CI, natural queue/lease/worker progression, the serialized Runner soak, same-SHA Preview/Smoke where applicable, and the independent Issue #136 audit.
- Keep B Runtime inactive. Continue only the versioned, sanitized, read-only A→B projection contract. B must not access Factory Issue state, A controller/state-store internals, Runner/Sandbox controls, raw logs, patches, secrets, or privileged execution paths.

### Next execution order
1. Observe the existing exact-main CI and serialized Runner queue; record actual terminal job results against their exact SHAs.
2. Fix only reproducible A defects with narrow code changes and regression tests; do not transplant the stale PR #259 diff.
3. Obtain the independent read-only Issue #136 report and applicable same-SHA Preview/Smoke evidence.
4. Complete natural scheduler/lease progression and the operational soak before A acceptance.
5. Only after A acceptance, implement the A-owned sanitized projection and B-owned workspace authorization/RLS boundary.

**Authority boundary:** this checkpoint is documentation-only. It changes no Factory runtime/state, task, lease, retry/cooldown/quarantine, Runner/workflow policy, secret, permission, production data, deployment, or B Runtime behavior.


---

## Superseding live continuation checkpoint — 2026-11-22 15:40 Taiwan

This checkpoint supersedes earlier live snapshots above wherever their main SHA, run IDs, PR states, or conclusions differ. It is a verified repository/evidence snapshot, not an acceptance or release authorization.

### Current mainline and A factory priority
- Verified default branch `main` HEAD: `9b43e2a87a7c791a10333d4b0a9ec51b15e6ab45` (merge commit for PR #322).
- Current root release metadata: GCAN `0.3.125`; Agent Factory V2 `2.0.84`; GCAN Product `0.1.20`. These are declared versions, not operational acceptance.
- Recent factory changes integrated into main include PR #322 (secondary API rate-limit cooldown regression coverage), #323 (task preparation routed through the shared GitHub API client), #324 (transient GitHub response-body retry), and #325 (publisher write-permission separation). Their merge status is not evidence of current-main CI success or end-to-end factory operation.
- Exact-current-main CI run [#44995876495](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44995876495) targets `9b43e2a87a7c791a10333d4b0a9ec51b15e6ab45` and remains `pending`; the queried Jobs API returned no allocated jobs. No current-main unit, type, lint, audit, build, PostgreSQL/RLS, or Ollama integration result is established.
- Preflight push run [#44995857680](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44995857680) targets PR #323 merge commit `a2b06ba9eac789cbc9971f55bdf497c6c50f6d41` and remains pending. It is not evidence of successful task selection, lease acquisition, candidate execution, or publication on the latest main SHA.

### A candidate and independent review
- PR #259 is the only open PR returned by the latest open-PR query. It is open, non-draft, but GitHub reports `mergeable=false`; it targets stale base `a1c1b58e4d1852f5a09a0e7c6c5cbeb38e1f9582` and head `3330cd04a77358cf0ff780940d09f938cab1dc3a`. Its historical exact-head CI run [#44949425719](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44949425719) succeeded on that old candidate SHA only. Do not merge, retarget, or transplant its broad diff wholesale.
- PR #259 combined status still reports Vercel deployment rate limiting; no current-main or current-candidate same-SHA READY Preview/Smoke acceptance is established.
- Issue #136 remains open for the independent read-only adversarial audit. The latest inspected issue body still targets the integrated A baseline and explicitly prohibits writes; no independent final audit report or formal sign-off was found in the inspected comments. Owner-authored static inspection and green historical CI are not substitutes.
- Do not modify machine-managed Issue #100, task records, retry counters, lease, cooldown, or quarantine. Do not manually dispatch/rerun the scheduler, bypass Runner serialization, change Actions permissions/secrets, or manufacture green evidence.

### B product handoff status
- The mainline B workspace route exists at `app/workspace/page.tsx`, is force-dynamic, checks Supabase configuration, obtains the authenticated user with `auth.getUser()`, and redirects unauthenticated users to login.
- The workspace client currently loads conversations, pending-AI recovery state, and projects through product APIs. This proves the authenticated B workspace shell exists; it does not prove a stable, accepted A→B capability adapter or production AI-provider readiness.
- B must consume only a versioned, sanitized, read-only projection from accepted A contracts. It must not access Factory Issue state, A controller/state-store internals, Runner/Sandbox controls, raw logs, patches, secrets, leases, or privileged execution paths. Keep B Runtime activation behind A acceptance.

### Integration/documentation drift identified
- Root README still contains a historical five-track snapshot and legacy PR/branch links, while its later architecture section describes A–O plus P. The README itself labels the five-track snapshot historical, but its navigation and current-state pointers still require a later evidence-driven cleanup.
- `app/factory/page.tsx` still contains older static references to PR #200/#217/#212/#218 and prior CI/Preview checkpoints. These must not be read as live current-main status. Refresh this A control-center evidence view only after obtaining the current run/deployment facts; do not replace dynamic evidence with guessed status.
- PR #207 remains closed unmerged and is not a safe B homepage integration source. Recover its A–O + P architecture selectively only after A acceptance; rebuild on the then-current main baseline, not from the stale branch.

### Next execution order
1. Observe exact-current-main CI #44995876495 and the serialized Windows Runner/preflight path; record terminal results only against their exact SHAs.
2. Resolve only reproducible A factory defects with narrow tests and changes. Preserve publisher privilege separation and shared GitHub API retry policy.
3. Obtain the independent read-only Issue #136 report, then triage findings and complete any required exact-SHA Preview/Smoke and natural scheduler/lease progression.
4. After A acceptance, build the versioned read-only A→B adapter and verify B workspace authorization/RLS and product API boundaries.
5. Rebuild B homepage/architecture integration selectively from current main; refresh README and factory evidence links as a separately testable documentation/UI change.

**Authority boundary:** this checkpoint is documentation-only. It changes no Factory runtime/state, task, lease, retry/cooldown/quarantine, Runner/workflow policy, secret, permission, production data, deployment, or B Runtime behavior.


## 2026-11-22 Runner isolation blocker — exact Preflight evidence

This checkpoint supersedes earlier assumptions that the Docker diagnostic alone was the complete blocker.

- Main remains `9b43e2a87a7c791a10333d4b0a9ec51b15e6ab45` at inspection time.
- Preflight run `44995857680` completed **failure** on exact main-derived commit `a2b06ba9eac789cbc9971f55bdf497c6c50f6d41`.
- The Windows 11 Pro self-hosted Runner has Node `22.13.0`, WSL installed (Ubuntu, WSL 2), Ollama `0.40.17`, local API available, and models `qwen3:8b` / `qwen3.6:latest`.
- Docker CLI `29.9.3` exists, but Docker Engine is unavailable: named pipe `//./pipe/dockerDesktopLinuxEngine` does not exist. The Windows Sandbox feature query also requires elevation.
- The failure occurred in the diagnostic inventory step before Ollama plan/patch smoke tests. PR #327 makes this inventory diagnostic-only, but does **not** claim that sandbox isolation works.
- The dedicated pinned-image disposable-container test still requires a working Docker Engine and remains a hard gate. It uses a non-root user, read-only root and input mounts, no network, dropped capabilities, no-new-privileges, process/memory/CPU limits, and a dedicated output mount. Do not replace it with direct host execution or treat WSL presence alone as isolation evidence.
- PR #327 exact head `df228022fed7ac18cbc3f8accf18bf71ca00a8b1` remains Draft; exact-head CI run `44999696562` is pending with no job allocated at this checkpoint. An earlier intermediate head run is also pending and must not be treated as latest-head evidence.
- Main CI `44995876495` is likewise pending with only its resolver job queued. The CI workflow also has a separate hard Docker Engine requirement; a diagnostic-only change in the Preflight workflow does not repair that main CI prerequisite.
- The shared self-hosted Runner concurrency group serializes CI jobs. Do not dispatch duplicate runs or alter concurrency to force throughput.

### Required next action

Restore Docker Desktop Linux Engine availability on the Windows Runner host (including its named pipe) under the authorized host administrator, then let the existing exact-head queue progress. Re-run the pinned disposable-container test and full main CI on their exact current SHAs. If Docker cannot be made available, stop at the isolation gate and record the environment blocker; do not weaken the sandbox or run candidate code on the host.

No task state, Issue #100, lease, cooldown, quarantine, scheduler dispatch, Runner concurrency, workflow permissions, secrets, production data, or deployment was modified by this checkpoint.


### Handoff metadata refresh after this checkpoint

- The handoff update itself advanced PR #326 to exact head `56ca1554027b58c3061203782deaf85932f2a24b`; the previously observed run `44999527039` targets the superseded head `f3510966bc2ba3bd08c5bc8e2064ca79aaf577a3` and is not valid evidence for this latest documentation revision.
- PR #327 remains Draft at exact head `df228022fed7ac18cbc3f8accf18bf71ca00a8b1`, base main `9b43e2a87a7c791a10333d4b0a9ec51b15e6ab45`. GitHub reports mergeable/clean, but exact-head CI run `44999696562` remains pending with no allocated job and no formal review; mergeability is not acceptance.
- Main CI run `44995876495` remains pending with no final result. Do not use historical PR-head CI or the preflight failure on a different SHA as a substitute for exact-head acceptance.


## Superseding live continuation checkpoint — 2026-11-22 15:55 Taiwan

This checkpoint supersedes every earlier live snapshot above wherever the main SHA, workflow run, PR state, or conclusion differs. It is evidence documentation only, not A acceptance or release authorization.

### Verified mainline and recent integrations
- Verified `main` HEAD: `c0e54f52b04c77b52a9b82f7b82ba971cd117b4f`.
- PR #326 (handoff evidence refresh) and PR #327 (nonfatal Docker diagnostic inventory) are merged into this mainline. PR #327's exact source-head CI run #44999696562 succeeded on `df228022fed7ac18cbc3f8accf18bf71ca00a8b1`; that source-head CI result is not a substitute for current-main CI, sandbox validation, or independent review.
- Root release declarations remain GCAN `0.3.125`, Agent Factory V2 `2.0.84`, and GCAN Product `0.1.20`. These are version declarations only.

### Current exact-SHA CI and Preflight evidence
- Main push CI run [#44999879910](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44999879910) targets exact current main SHA `c0e54f52b04c77b52a9b82f7b82ba971cd117b4f`. Latest query: **pending**, with no allocated jobs. Do not infer tests, types, lint, audits, build, Ollama, PostgreSQL, or RLS success.
- Main CI run [#44995876495](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44995876495) targets the older SHA `9b43e2a87a7c791a10333d4b0a9ec51b15e6ab45`, not current main, and has now completed **failure**. Locked dependency installation succeeded, but the Windows quality-gates job stopped at `docker info` because Docker Desktop Linux Engine's named pipe `//./pipe/dockerDesktopLinuxEngine` was missing; Ollama verification and all migration/schema/audit/script-policy/unit/type/lint/build checks were skipped. This older-SHA failure is not current-main evidence.
- Preflight run [#44999879809](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44999879809) targets exact current main SHA `c0e54f52b04c77b52a9b82f7b82ba971cd117b4f` and completed **failure**. Toolchain verification, local Ollama synthetic plan generation, and Ollama patch proposal succeeded. Disposable-container isolation failed; all sandbox patch application, restricted dependency installation, offline candidate tests, publisher dry-run, and host-independent full quality checks were skipped.
- The Preflight isolation failure is an environment blocker: Docker CLI exists, but Docker Desktop Linux Engine's named pipe `//./pipe/dockerDesktopLinuxEngine` is unavailable. PR #327 makes diagnostic inventory nonfatal; it does not repair Docker Engine or waive the mandatory disposable-container gate.
- Do not execute candidate code directly on the Windows host, treat WSL presence as isolation, or weaken pinned-image/no-network/non-root/read-only/capability/resource restrictions.

### PR and independent-review status
- PR #259 is the only open PR returned by the latest open-PR query. It is based on stale main SHA `a1c1b58e4d1852f5a09a0e7c6c5cbeb38e1f9582`, head `3330cd04a77358cf0ff780940d09f938cab1dc3a`, and GitHub reports `mergeable=false`. Do not merge or transplant its broad historical diff.
- Issue #136 remains open and strictly read-only. The latest inspected comments do not contain an independent final audit report or sign-off. Owner-authored notes and CI are not independent review.
- Do not alter machine-managed Issue #100, task state, lease, retry/cooldown/quarantine, scheduler dispatch, Runner concurrency, workflow permissions, secrets, production data, or deployments.

### B handoff boundary
- `docs/architecture/agent-factory-product-read-adapter.md` remains a **proposed, unimplemented, unaccepted** contract. Its versioned read model and exact SHA/PR/run/attempt binding are design requirements, not a live API.
- B Runtime remains inactive. Do not expose Factory state Issues, controller/state-store internals, leases, Runner/Sandbox controls, raw logs, patches, secrets, or privileged execution to B.
- After A acceptance only: implement an A-owned sanitized projection, B-owned workspace authorization and tenant mapping, and two-workspace RLS/IDOR tests. Keep the failure-category mapping allowlisted and fail closed.

### Next execution order
1. Restore Docker Desktop Linux Engine on the authorized Windows Runner host and verify the named pipe; then allow the existing serialized queue to run the mandatory isolation test.
2. Observe Main CI run #44999879910 against the exact SHA above and record each terminal job result. Do not dispatch duplicate work or bypass Runner serialization.
3. Obtain the independent read-only Issue #136 report against the current integrated mainline.
4. Complete current-main quality, isolation, natural scheduler/lease progression, Preview/Smoke where applicable, and operational soak before declaring A accepted.
5. Only then implement and activate the bounded A→B projection and B tenancy enforcement.

**Authority boundary:** this checkpoint changes documentation only. It does not modify Factory runtime/state, task/lease/retry/cooldown/quarantine, scheduler or Runner policy, workflow permissions, secrets, production data, deployments, or B Runtime behavior.


### Superseding PR #328 validation update — 2026-11-22 16:05 Taiwan
- Re-inspected Main CI run #44995876495 job logs: it is **completed failure**, not in progress. The failure is precisely the missing Docker Desktop Linux Engine named pipe; downstream quality checks were skipped. This correction supersedes the earlier status sentence above.
- Current-main CI run #44999879910 still reports pending with no allocated jobs.
- PR #328 exact-head run #45000178867 is pending at resolver metadata stage. Commit status currently reports Vercel **failure** with target URL indicating a build-rate-limit/plan restriction; this is external deployment status, not a passing CI result or a source-code diagnosis. PR #328 has no submitted reviews and no inline review threads at this inspection.
- No acceptance or merge is authorized by these observations. Keep PR #328 Draft until its exact-head checks and required review are resolved.


### Superseding exact-main CI terminal result — 2026-11-22 (Taiwan)
- Main push CI run [#44999879910](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44999879910) has now completed **failure** on exact main SHA `c0e54f52b04c77b52a9b82f7b82ba971cd117b4f`; the earlier statement that it was pending is superseded.
- Exact run jobs: candidate metadata resolution **success**; Windows Runner quality gates **failure**; diagnostics and failure-state persistence **success**; Ollama/local execution, PostgreSQL/RLS, and success persistence **skipped**.
- The failing quality-gates log confirms Docker CLI is installed but Docker Engine is unreachable: named pipe `//./pipe/dockerDesktopLinuxEngine` does not exist. The workflow stopped before Ollama verification, migration/schema guards, dependency audits, script policy, unit tests, TypeScript, lint, and production build. These checks are **not validated**, not passed.
- Main Preflight run [#44999879809](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44999879809) also completed **failure** on the same SHA. Toolchain checks and local Ollama plan/patch generation succeeded; disposable-container isolation failed because the pinned sandbox image could not be pulled / Docker Engine was unavailable. Candidate patch application, offline tests, publisher dry-run, and downstream quality checks were skipped.
- This is an execution-environment blocker, not evidence of a source-code regression. Do not weaken the sandbox boundary, run candidate code on the Windows host, bypass the shared Runner queue, or treat skipped jobs as passes.
- Recovery gate: restore Docker Desktop Linux Engine on the authorized Windows Runner host; verify `docker info` and the pinned sandbox image pull; then inspect the next naturally triggered exact-SHA CI/Preflight runs. Do not create duplicate dispatches or mutate machine-managed state to force progress.


---

## Superseding live continuation checkpoint — 2026-11-22

This checkpoint supersedes earlier snapshots above wherever their main SHA, PR state, run IDs, or conclusions differ. It records a read-only verification plus a docs-branch handoff update; it is not A acceptance, B activation, or deployment authorization.

### Current repository and Factory PR state
- Verified `main` HEAD: `c0e54f52b04c77b52a9b82f7b82ba971cd117b4f`.
- PR #329 proposed the narrow A-core provider cooldown propagation fix across `prepare-task`, `begin-publication`, `publish-task`, and the durable publication-failure callback, with a workflow-contract regression test. Exact head: `2cabf35d0faf6d0e5f682ec42aa5f8a81b261cdd`.
- PR #329 was subsequently **closed unmerged by repository owner `X84657465`** at 2026-11-22 08:07:53 UTC. Do not reopen or recreate this candidate automatically; preserve the closure decision. Its exact-head CI run #45001181741 later completed **failure**: metadata resolution passed, but Windows Runner quality gates stopped at `docker info` because the Docker Desktop Linux Engine named pipe `//./pipe/dockerDesktopLinuxEngine` was unavailable. Unit/type/lint/build/audit, Ollama execution, and PostgreSQL/RLS jobs were skipped. The new workflow-contract test was therefore not reached by this CI run. No formal review was observed; the branch change is not accepted or merged.
- PR #328 remains Draft/open, docs-only, exact head at the time of this checkpoint `070c15c67fa08581b9c054d5f322fd4a61c665a9`, base main `c0e54f52b04c77b52a9b82f7b82ba971cd117b4f`. Its exact-head CI run #45001420085 was pending when queried; the earlier run #45001414083 targeted a superseded intermediate commit and was cancelled. This handoff update advances the branch again, so neither run is acceptance evidence for the resulting new head; verify the fresh exact-head run after this update. No review sign-off was found.
- PR #259 remains stale/non-mergeable and is not a candidate for transplant or merge.

### Exact-main execution blockers
- Main CI run #44999879910 completed **failure** because the Windows Runner had Docker CLI but no available Docker Desktop Linux Engine (named pipe `//./pipe/dockerDesktopLinuxEngine` unavailable). Downstream isolated execution and database/RLS validation did not run; do not infer those gates passed.
- Preflight run #44999879809 completed **failure** at disposable-container isolation for the same Docker Engine/sandbox availability blocker. Ollama synthetic plan generation and patch proposal completed, but candidate patch application, offline tests, publisher dry-run, and downstream quality validation were skipped.
- Vercel reported a per-day deployment rate limit; this is a deployment-provider quota issue, not evidence of a source-code failure or successful deployment.
- Restore Docker Desktop Linux Engine on the authorized Windows Runner host and verify `docker info` plus the pinned sandbox image. Do not bypass container isolation, execute candidate code directly on the host, change Runner concurrency, or force duplicate workflow dispatches.

### Independent review and B handoff
- Issue #136 remains open and strictly READ-ONLY. Its latest inspected comments contain earlier supplemental static inspection, not the requested independent Claude adversarial audit report or sign-off. Do not edit the issue or treat self-review as independent approval.
- B's workspace shell and authenticated product APIs exist, but `docs/architecture/agent-factory-product-read-adapter.md` remains a **proposal only**. It defines the future versioned, sanitized, read-only projection; no accepted A→B runtime adapter is established.
- Keep B Runtime inactive until A has exact-head CI, Docker-isolated execution, PostgreSQL/RLS, Preview/Smoke, natural scheduler/lease progression, and independent review acceptance. Then implement only the A-owned projection and B-owned tenant authorization/RLS boundary.

### Next execution order
1. Respect PR #329's owner-initiated closure; do not reopen it without a new explicit direction. Preserve its proposed fix as unaccepted historical work until a future authorized candidate is created.
2. Restore Docker Desktop Linux Engine on the Windows Runner host; allow the existing serialized exact-SHA queue to complete naturally.
3. Re-run/verify current-main CI and disposable-container Preflight on exact current SHAs; inspect actual terminal job results, PostgreSQL/RLS and Ollama outcomes.
4. Obtain the independent read-only Issue #136 report, then triage any confirmed findings with narrow A-core changes and regression tests.
5. Accept A only after all required runtime, isolation, database, review, and operational soak evidence passes. Then connect B through the documented read-only adapter; no privileged Factory state access from B.

**Authority boundary:** this checkpoint changes documentation on the PR #328 branch only. It does not modify Factory runtime/state, machine-managed Issue #100, tasks, leases, retry/cooldown/quarantine records, Runner/workflow policy, secrets, permissions, production data, deployments, or B Runtime behavior.
