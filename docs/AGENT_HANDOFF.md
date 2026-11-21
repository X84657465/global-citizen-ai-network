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

### PR #259 — P0 A / F–P shared acceptance candidate

- Branch: `fix/ci-schema-grant-test-count-20261122`.
- **Current exact PR head verified from GitHub PR metadata: `14f7a87347713863afb6fb74cc962d67f1972be9`.**
- Prior exact-head run [44943280889](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44943280889) targeted superseded SHA `38e5e5f312a1d3eaeedec9117ae1d6b46d779691`; its 543/549 unit result is historical only.
- Corrective review timestamp validation and stable historical test fixtures were committed in `2b4b1edf6b19c5c3e058f2aca1bb0ced8cd569df` and `d9073d51155de384be18e660c03923b0b0f424d0`.
- Intermediate commit `f718499241fd905a12688498373a467cd3538ce1` had run [44942456757](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44942456757) cancelled; it is not the branch head and is not acceptance evidence.
- Previous run [44944625272](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44944625272) targeted superseded SHA `968d14256ce9a53b8e72ca5145722042619d9d4d`; its Windows job had started but is now stale after the fixture correction.
- Current head `14f7a87347713863afb6fb74cc962d67f1972be9` has exact-head run [44945158137](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44945158137) pending at latest check; no jobs have appeared yet. No quality/test/type/lint/build/PostgreSQL/RLS/Ollama pass is claimed.
- Run [44944042121](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44944042121) targeted the superseded `d9073d5...` SHA. Its resolver log confirms the PR head had advanced and the stale event was intentionally ignored; all substantive jobs were skipped. This is not a Runner failure.
- No independent review is recorded. Keep Draft/unmerged until all exact-head gates and independent review pass.
- The PR changes shared files including README, `scripts/check-schema.mjs` and `tests/ci-trigger-policy.test.mjs`; reconcile overlap with PR #267 before any merge.

### PR #267 — shared CI acceptance baseline

- Current exact branch HEAD verified from GitHub: `6baa233e30192d5b360617d7f0079d840c78821a`.
- Previous exact-head run [44943780150](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44943780150) passed dependency install, Windows/Docker/Ollama preflight, bounded Ollama inference, migration/schema guards and both dependency audits, then failed the CI trigger/Runner policy test. Unit tests, typecheck, lint, production build and database/RLS were skipped after that failure.
- Root cause identified by checking the exact tested tree: `package-lock.json` still advertised root/package version `0.3.121` while `VERSION`, `package.json`, manifest and README were `0.3.124`. The CI policy test explicitly checks lockfile version parity.
- Corrective commit `6baa233e30192d5b360617d7f0079d840c78821a` changes only the two package-lock root version fields to `0.3.124`; dependency graph and resolved package entries are unchanged.
- New exact-head Actions run [44944336578](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44944336578) targets corrected SHA `6baa233e30192d5b360617d7f0079d840c78821a`; it remains pending and latest jobs query returned no jobs. No acceptance is claimed for the corrected SHA.
- No independent review is recorded. Keep Draft/unmerged.
- #259 and #267 both touch README, schema guard and CI policy test. Do not merge them sequentially as-is. Reconcile overlapping files and rerun every required gate against the final exact SHA.

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

1. **A first:** monitor #259 current-head run `44944625272` for SHA `968d14256ce9a53b8e72ca5145722042619d9d4d`; earlier run `44944042121` was correctly ignored as stale after the PR head advanced.
2. **Shared baseline:** #267 run `44944336578` failed at 14 unit tests on base main. Its four changed file blobs are identical to #259, so it is fully content-subsumed; do not merge it independently. After #259 is accepted/merged, close #267 as redundant.
3. **K support:** keep this handoff synchronized with verified main/PR state. PR #268 is documentation-only; its exact current head and run are tracked in the PR body because each handoff update necessarily changes its own SHA. Prior docs-head run [44944676236](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44944676236) applies only to superseded SHA `abeb8ff82d06065c3bb490036027e15d4b1b4c46`.
4. **F–P:** address only demonstrated blockers to A acceptance or B contracts.
5. **B preparation:** prepare a selective-port contract map without activating B as the development priority. B must consume only versioned, explicitly exposed A interfaces; no direct Factory DB/state/lease/Runner access.

**Factory-first charter remains:** stabilize Agent Factory V2, then enable GCAN Product to create revenue, then expand the global AI ecosystem.

## B adapter design handoff (2026-11-22)

- Added [Agent Factory → GCAN Product read adapter proposal](architecture/agent-factory-product-read-adapter.md). This is a documentation-only design; no B runtime/API/database or Factory permissions were activated.
- Verified source contracts: A `EvidenceRecord v1.0.0` is currently model-independent C/D evidence, not a structured B API; F–P `FPCapabilityEnvelope` uses opaque actor/resource references and does not authenticate or authorize.
- The proposed B view is versioned, read-only, exact-SHA/run-ID/run-attempt bound, tenant-scoped by B's own identity/workspace authorization, and excludes raw Issue bodies, prompts, patches, logs, secrets and host paths.
- Do not implement or expose this adapter until A is accepted and integrated. A must provide a structured server-side projection; B must not parse the descriptive EvidenceRecord command string or access A's internal Issue state, lease or Runner controls.


## Current checkpoint — 2026-11-22 (latest verified)

- A integration PR #259 current exact head: `6eaa40bfe3eb7ab349709b4d8035f7c3a3d4c075`. Exact-head CI run [44945534338](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44945534338), run #3203, is pending; latest jobs query returned no jobs. Do not interpret this as Runner failure or acceptance.
- Recent focused P fixes: GitHub collaborator permission evidence uses the documented legacy base roles `admin`, `write`, `read`, `none`; `maintain` maps to `write`, `triage` maps to `read`, and only admin/write satisfy the review-authority check. The P dossier evaluator also now rejects impossible UTC calendar/clock components (including normalized invalid dates); regression tests were added.
- Earlier A candidate heads and their pending/cancelled runs were superseded as the branch advanced. Only the exact final candidate SHA and its terminal checks can count as acceptance.
- PR #264, #265 and #267 are closed as redundant after exact Git blob comparisons proved all their changed file contents are present in #259: #264 schema guard; #265 README and CI policy; #267 shared files plus package-lock root metadata. No unique code was discarded. #259 is the sole consolidated A/F–P candidate.
- PR #259 remains Draft/open/unmerged. No independent review submissions or inline review threads are recorded. Vercel status remains blocked by provider `build-rate-limit`; do not repeatedly trigger Preview builds or bypass the quota.
- PR #268 is documentation-only; B adapter remains a proposal, not an active runtime/API. B stays blocked until A exact-head CI, DB/RLS, local integration, Preview and independent review are accepted.
- Merge policy unchanged: require terminal success for every required check on the final exact SHA, plus independent review and current Preview. Pending, cancelled, skipped, stale-SHA success and resolver-only success are not acceptance.
