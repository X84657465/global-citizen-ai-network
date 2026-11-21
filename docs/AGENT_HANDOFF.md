# Agent Handoff — GCAN / Agent Factory V2

> Single source of truth for the next development session. Refresh after each round. Record verified GitHub state only. A merged PR, a successful resolver, or a skipped job is not acceptance.

**Last verified:** 2026-11-22 (Taiwan time)  
**Repository:** `X84657465/global-citizen-ai-network`  
**Default branch:** `main`  
**Main HEAD:** `fc1933e669dd2d49300e45fa5d69bf63e906141f`  
**Authoritative release:** `VERSION` and `package.json` on main both report `0.3.125`. README release label requires separate verification before use.  
**A / B declared versions:** Agent Factory V2 `2.0.84`; GCAN Product `0.1.19` (README declaration; not a release-readiness claim).

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
- Current `main`: `fc1933e669dd2d49300e45fa5d69bf63e906141f`.
- `VERSION` and `package.json`: `0.3.125`.
- PR #273 is open, Draft, unmerged; exact HEAD `1230bdbab4971a80cac191c68d7978b9c1df9c5f`, base is current main. Exact-head Actions run #3267 (`44952319306`) is in progress. Metadata resolver passed; Windows quality gates are currently installing locked dependencies. Unit/type/lint/build, PostgreSQL/RLS and Ollama/local integration have not yet completed. Keep Draft and do not merge.
- Vercel exact-SHA status is `build-rate-limit`; no READY Preview or same-SHA smoke evidence.
- PR #273 has zero formal reviews. Issue #136 remains open; the independent read-only adversarial audit is outstanding.
- PR #259 remains open/unmerged and targets stale base `a1c1b58e4d1852f5a09a0e7c6c5cbeb38e1f9582`; its 40-file diff is diverged from current main. Do not merge, retarget, or transplant wholesale. Its P route source-text-only review finding remains unresolved in that candidate.
- PR #255 is closed without merge; do not treat its F/G repository validation as integrated into main. Reassess only after A acceptance and selectively port any still-needed changes.

### B / K preparation
- PR #275 is a documentation-only Draft from current main. It corrects the contradictory B DTO comment so `FactoryTaskReadModelV1.status` is the bounded public `FactoryTaskStatus`, mapped by A from private durable states. It does not implement or activate B.
- The B adapter remains proposal-only: versioned, read-only, workspace-authorized by B, with exact SHA/PR/run/attempt verification on A's side. No B runtime route, database table, billing or Factory permission is activated.
- The handoff must be refreshed from verified GitHub state after each meaningful merge or acceptance transition. Older checkpoints above are historical and are superseded by this live checkpoint.

### Next execution order
1. Keep A #273 first; finish exact-head Actions and resolve any real failures without weakening gates.
2. Obtain independent Issue #136 audit and triage its findings.
3. Resolve Vercel Preview quota through the normal provider cycle; do not bypass limits.
4. Reconcile only necessary F/G integration blockers after A acceptance.
5. After A is accepted and integrated, rebuild B from the accepted main and implement only the reviewed read-only projection plus B-owned tenant authorization.

**Safety:** no production deployment/data mutation, secret or permission changes, workflow-policy changes, or machine-managed Factory state edits are authorized by these documentation updates.
