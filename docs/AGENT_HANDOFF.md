# Agent Handoff — GCAN / Agent Factory V2

> Single source of truth for the next development session. Refresh after each round. Record verified GitHub state only. A merged PR, a successful resolver, or a skipped job is not acceptance.

**Last verified:** 2026-11-22 (Taiwan time)  
**Repository:** `X84657465/global-citizen-ai-network`  
**Default branch:** `main`  
**Main HEAD:** `a1c1b58e4d1852f5a09a0e7c6c5cbeb38e1f9582`  
**Authoritative release:** `VERSION` and `package.json` both report `0.3.124`. README still advertises `0.3.121`; PR #267 proposes the metadata correction but is not merged.  
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
- **Current exact PR head: `352cd5530bb25a9a8e9ebe440aae6a3bf7c7bfc6`** (31 changed files; Draft/open/unmerged).
- Exact-head Actions run [44945855587](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44945855587), run #3206, is pending. Latest jobs lookup shows only `Resolve exact candidate PR metadata` pending; no quality/test job has started. This is not a Runner failure and not acceptance evidence.
- This round selectively ported A's deterministic negated/high-risk plan-intent classifier and its regression suite from PR #261 into this consolidated candidate. Exact file blobs match the source PR's two files.
- PR #261 is closed as redundant; no feature was discarded. Its old run [44940637761](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44940637761) failed at the pre-existing schema-guard/pgTAP-plan synchronization assertion on its older main-based branch. The ported changes must be validated only on #259's new exact SHA.
- The candidate also contains the corrected RLS fixtures, appeal authorization SQLSTATE handling, strict UTC timestamp validation, GitHub repository-name validation, F–P host/observability fixes, and release metadata synchronization.
- Vercel Preview for the current #259 SHA `352cd5530bb25a9a8e9ebe440aae6a3bf7c7bfc6` is READY (deployment `dpl_AL3xTHq8xxNsTmxqriFEChHLADYN`). Root, `/factory`, `/workspace` and `/login` returned HTTP 200. This is Preview smoke evidence only, not full authenticated E2E or production acceptance.
- No independent formal review submissions or inline review threads are recorded.
- Keep Draft/unmerged until exact-head Windows quality gates, unit tests, typecheck, lint, security audits, production build, PostgreSQL/migrations/pgTAP/RLS, Ollama/local execution, current-SHA Preview and independent review are all verified. Do not infer success from resolver-only completion.

### PR #267 — shared CI baseline (closed as redundant)

- PR #267 is closed without merge after exact Git blob comparisons confirmed its shared package-lock/version changes are already included in consolidated PR #259.
- No unique code or dependency artifact was discarded. Do not reopen or merge it separately; validate the shared baseline only through #259's final exact SHA.

### PR #266 — K handoff refresh candidate

- Branch `docs/reconcile-fg-mainline-acceptance-20261122`, head `a571b33c43b0f5654401885cc98e1185d2be2149`.
- Compared with current main: diverged, 2 commits ahead and 83 behind. Do not merge this stale branch wholesale.
- Its exact-head run [44926244085](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44926244085) had resolver success but all substantive jobs skipped. Vercel quota failure remains. This is not acceptance evidence.
- This handoff refresh is based on current main and current exact-head observations; selectively port documentation only if needed.

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

B remains preparation-only until A is fully accepted and integrated into main. The current repository contracts do **not** yet expose a dedicated accepted A-to-B product API.

### Verified interface inventory

- A's `createFactoryCandidateEvidenceRecord` emits a model-independent `EvidenceRecord v1.0.0` intended for C/D consumption. It binds repository, deterministic task branch, candidate commit SHA, PR number, CI run ID/attempt, terminal conclusion and timestamp. It is not declared as a B product API.
- `FPCapabilityEnvelope` uses `contractVersion: "1"` for F–P capability events/results. Its actor/resource references are opaque; the envelope does not authenticate identities or grant permissions. Do not reuse it as a B authorization contract.
- A's controller, state machine and state store are Factory internals. The durable state currently resides behind the A-owned GitHub Issue store; B must not import these internals, edit that Issue, manage leases, or invoke privileged Runner/Sandbox operations.
- Current main has no verified B workspace/product service path at the candidate paths checked in this review. Do not assume a product API exists until its implementation and tests are located on the accepted base.

### B adapter contract to define after A acceptance

Create a separate, versioned, read-only adapter boundary for B. Its schema should be agreed and tested before implementation; it should expose only the minimum product-safe view needed by B:

1. Stable opaque task/candidate reference and lifecycle status.
2. Candidate SHA plus terminal CI run ID, attempt, conclusion and evidence reference.
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

1. **A first:** validate #259 exact head `352cd5530bb25a9a8e9ebe440aae6a3bf7c7bfc6` on run [44945855587](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44945855587). Resolver metadata is pending; substantive jobs have not started.
2. **A risk-intent integration:** the two files from #261 are now included in #259; #261 is closed as redundant. Do not use its old failed CI as evidence for the consolidated candidate.
3. **Shared baseline:** #267 is closed as redundant and its package-lock/version changes are carried by #259. No separate merge is required.
4. **K support:** keep #268's handoff aligned with verified PR/main state. Its current head remains `127de3547edebedd1265bee7082959dd804d8ded`; docs CI run [44945572523](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44945572523) is pending with no jobs returned. No independent review is recorded.
5. **F–P:** address only concrete A acceptance or B contract blockers; do not expand unrelated workstreams.
6. **B preparation:** retain the read-only, versioned adapter proposal. Do not activate B runtime/API/database access until A is accepted and integrated.

**Factory-first charter remains:** stabilize Agent Factory V2, then enable GCAN Product to create revenue, then expand the global AI ecosystem.

## B adapter design handoff (2026-11-22)

- Added [Agent Factory → GCAN Product read adapter proposal](architecture/agent-factory-product-read-adapter.md). This is a documentation-only design; no B runtime/API/database or Factory permissions were activated.
- Verified source contracts: A `EvidenceRecord v1.0.0` is currently model-independent C/D evidence, not a structured B API; F–P `FPCapabilityEnvelope` uses opaque actor/resource references and does not authenticate or authorize.
- The proposed B view is versioned, read-only, exact-SHA/run-ID/run-attempt bound, tenant-scoped by B's own identity/workspace authorization, and excludes raw Issue bodies, prompts, patches, logs, secrets and host paths.
- Do not implement or expose this adapter until A is accepted and integrated. A must provide a structured server-side projection; B must not parse the descriptive EvidenceRecord command string or access A's internal Issue state, lease or Runner controls.


## Current checkpoint — 2026-11-22 (latest verified)

- Main remains at base SHA `a1c1b58e4d1852f5a09a0e7c6c5cbeb38e1f9582`; `VERSION` and `package.json` are `0.3.124`. README's mainline label remains `0.3.121`; PR #259 carries the correction.
- PR #259 exact head is `352cd5530bb25a9a8e9ebe440aae6a3bf7c7bfc6`; run [44945855587](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44945855587) is pending at candidate resolver metadata. No substantive CI result is available yet.
- A risk-intent classification and regression tests were ported exactly from PR #261 into #259. PR #261 is now closed as redundant; its prior schema-guard failure is not evidence against the new consolidated SHA.
- PR #267 is closed as redundant; its shared metadata changes are carried in #259.
- PR #259 has no independent formal reviews or inline review threads. Its current exact-SHA Preview is READY and the root plus `/factory`, `/workspace` and `/login` routes returned HTTP 200; authenticated end-to-end and production acceptance remain unverified.
- PR #268 remains documentation-only and Draft. Its exact head is `127de3547edebedd1265bee7082959dd804d8ded`; run [44945572523](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44945572523) is pending with no jobs returned.
- PR #266 remains a separate Draft documentation candidate; do not merge stale or overlapping documentation branches wholesale.
- B adapter remains proposal-only. B cannot access Factory state, leases, Runner or privileged execution.
- Acceptance rule unchanged: terminal success for all required checks on the final exact SHA, current Preview, and independent review. Pending, cancelled, skipped, stale-SHA success, resolver-only success and mergeability are not acceptance.
