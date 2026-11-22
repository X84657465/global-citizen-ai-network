# GCAN B Product Baseline Report

> **Snapshot date:** 2026-11-23 (Asia/Taipei)  
> **Repository:** `X84657465/global-citizen-ai-network`  
> **Baseline source:** `main` at `93e7ac35bfd5b6a9c33ea3508b6b7c2f2b4bbe1e`  
> **B track:** `0.1.20` (`active` in `versions/manifest.json`)  
> **Overall release:** `0.3.136`  
> **Report type:** GitHub source / metadata inspection. No local checkout, local working-tree inspection, runtime test, database connection, production access or deployment was performed in this report.

## 1. Executive summary

GCAN B has a meaningful source-code foundation: account/authentication pages and routes, projects and conversations, an AI chat gateway with budget/idempotency/reconciliation controls, contribution task/submission/review/appeal flows, personal reward/contribution views, and administrative cost/reconciliation surfaces are present on the inspected mainline.

This is **not evidence that B is production-ready or accepted**. The architecture documentation explicitly says the repository is an early MVP and not production-ready. Authentication documentation says real-user end-to-end authentication has not been tested. AI controls default to disabled with zero budgets and no provider configured by default. No current-main Actions run was returned for the inspected SHA; the combined status query returned only a Vercel `build-rate-limit` failure. No test suite was executed during this inspection.

**B Runtime disposition: BLOCKED / PREPARATION ONLY.** The A→B read adapter remains a proposal, not an implemented or accepted interface. Factory-wide acceptance remains open, including the independent read-only audit requested in Issue #136 and the natural scheduler/lease progression plus operational-soak evidence. Issue #354's bounded cross-job lease-ID handoff defect is CLOSED by PR #362; that fix does not establish full Factory acceptance. GPT 4 must continue B baseline, product planning, contract preparation and dependency analysis; it must not activate B Runtime, paid AI traffic, production migrations or deployment.

## 2. Repository and Git snapshot

| Item | Observed value | Status |
|---|---|---|
| Repository | `X84657465/global-citizen-ai-network` (private) | PASS — repository identified |
| Default branch | `main` | PASS — repository metadata |
| Main HEAD | `93e7ac35bfd5b6a9c33ea3508b6b7c2f2b4bbe1` | PASS — branch ref read |
| Overall version | `0.3.136` | PASS — manifest/package metadata |
| B version | `0.1.20` | PASS — manifest |
| Main branch protection | GitHub branch API reported `protected=false`, protection disabled | UNKNOWN — owner should confirm intended policy |
| Local working tree / index | Not observable through the GitHub API used for this report | UNKNOWN — no claim that a local working tree is clean |
| Current-main Actions runs | No run returned for this exact main SHA in the queried Actions API result | UNKNOWN — no current-main CI pass established |
| Main combined status | Vercel `failure`, target reports `build-rate-limit` | FAIL for Preview-provider status only; not a code-test result |

The historical B branch `feat/gcan-product-homepage` currently compares to main as **diverged: 129 commits ahead / 1,681 behind**. It must not be merged, force-retargeted or used as a fresh development base. New B work must start from the current mainline after checking the exact base SHA and owner conflicts.

## 3. A–P track registry snapshot

The following is copied from the current-main `versions/manifest.json` state. These are registry statuses, not runtime acceptance or independent verification of capability maturity.

| Track | Version | Manifest status | Responsibility summary |
|---|---:|---|---|
| A | 2.0.84 | active | Agent Factory V2 |
| B | 0.1.20 | active | GCAN Product |
| C | 0.3.9 | implementation-candidate | Predictive Coding |
| D | 0.3.10 | implementation-candidate | Deep Neural |
| E | 0.1.11 | implementation-candidate | Deep Research |
| F | 0.1.2 | planned | Cyber Security & Defense |
| G | 0.1.2 | planned | Release, QA & Integration |
| H | 0.1.4 | planned | Observability, Telemetry & Cost/Quota |
| I | 0.1.0 | planned | Connectors & Workflow Automation |
| J | 0.1.1 | planned | Self-Healing, Chaos & Continuity |
| K | 0.1.1 | planned | Knowledge, Docs & Governance Playbooks |
| L | 0.1.0 | planned | Multi-Node, Federation & Cluster |
| M | 0.1.1 | planned | Compliance, Policy Audit & Risk |
| N | 0.1.0 | planned | Productization, Analytics & Growth |
| O | 0.1.0 | planned | Lifecycle, Deprecation & Legacy Retirement |
| P | 0.1.4 | implementation-candidate | Governance, Ethics & Trust |

## 4. B feature map — source presence versus acceptance

Status vocabulary in this report:
- **PASS (source inspection):** the referenced source/document/test asset exists on the inspected main SHA. This is not runtime acceptance.
- **UNKNOWN:** implementation or operational behavior has not been demonstrated by current, reproducible evidence.
- **BLOCKED:** a required dependency or safety gate prevents activation.
- **NOT FOUND IN INSPECTED ROUTES:** no corresponding B-facing route/page was identified in the complete inspected route inventory; this is not a claim that no design document exists.

| B capability | Source evidence on main | Current assessment |
|---|---|---|
| Public entry / product shell | `app/page.tsx`, `app/layout.tsx`, `tests/gcan-homepage.test.mjs`, `README.md` | PASS (source present); visual, accessibility and deployed smoke acceptance UNKNOWN |
| Account / identity | `app/login/page.tsx`, `app/account/page.tsx`, `app/auth/callback/route.ts`, `app/api/auth/signup/route.ts`, `docs/authentication.md` | PASS (source present); signup is closed by default; real-user E2E is explicitly unverified in docs; acceptance UNKNOWN |
| Workspace / projects / conversations | `app/workspace/`, `app/projects/`, `app/api/projects/`, `app/api/conversations/`, `app/api/conversations/[id]/`, `supabase/migrations/20261118003142_conversation_project_ownership.sql`, `...03146_conversation_project_locking.sql` | PASS (source present); SQL and unit tests exist; cross-user / concurrent behavior not executed in this audit; acceptance UNKNOWN |
| AI Service Center / Gateway | `app/api/ai/chat/route.ts`, `app/api/ai/pending/route.ts`, `lib/ai/`, `docs/ai-gateway-implementation.md`, `supabase/tests/ai_gateway.test.sql` | PASS (source present); live use BLOCKED by default controls and missing default provider configuration; production acceptance UNKNOWN |
| Contribution task discovery / submission | `app/contribute/`, `app/api/contribution/tasks/route.ts`, `lib/contribution-tasks/validation.ts`, `supabase/migrations/20261118060607_single_active_task_submission.sql`, `...20261118061217_dedupe_active_submission_index.sql` | PASS (source present); end-to-end lifecycle acceptance UNKNOWN |
| Review / appeal | `app/admin/contributions/`, `app/admin/appeals/`, `app/api/admin/contribution/reviews/route.ts`, `app/api/admin/contribution/appeals/route.ts`, `app/api/contribution/appeals/route.ts`, atomic review/appeal migrations and SQL tests | PASS (source present); reviewer/admin permission, atomicity and appeal lifecycle tests exist but were not executed here; acceptance UNKNOWN |
| Personal contribution / reward ledger | `app/contributions/`, `app/api/contribution/summary/route.ts`, initial schema and immutable reward snapshot migration | PASS (source present); UI explicitly distinguishes pending/confirmed rewards from cash withdrawal; actual payout is not enabled/verified |
| Cost / provider invoice / admin operations | `app/admin/ai-costs/`, `app/admin/ai-operations/`, `app/api/admin/ai-costs/route.ts`, `app/api/admin/ai-reconciliation/`, `docs/data-model.md` | PASS (source present); actual provider invoice ingestion, reconciliation operations and live cost accuracy UNKNOWN; no live provider billing is enabled by default |
| Knowledge / research asset management | `docs/data-model.md` describes document and knowledge entities; no dedicated B-facing knowledge-management page/API was found in the inspected app route inventory | UNKNOWN / NOT FOUND IN INSPECTED ROUTES |
| Developer portal / external partner APIs / webhooks | No dedicated B-facing developer portal, OAuth, webhook or API-key management route was found in the inspected app route inventory; `docs/api.md` documents current application APIs | UNKNOWN / NOT FOUND IN INSPECTED ROUTES |
| Globalization / accessibility | Profile language defaults to `zh-TW`; no complete locale/accessibility acceptance evidence was established in this inspection | UNKNOWN |
| Opt-in distributed compute | `docs/product-scope.md` treats it as a later opt-in research phase; no B node runtime/client route was found in the inspected route inventory | NOT IMPLEMENTED IN INSPECTED RUNTIME; future phase only |

### 4.1 Database and security inventory

- The current main tree contains **25 Supabase migration files** and **10 SQL test files**.
- The SQL test inventory includes AI gateway, AI lifecycle RPC security, AI reconciliation, contribution task admin, database security, messages owner security, performance indexes/policies, project/conversation security, public grants, and task submission uniqueness.
- `supabase/tests/database_security.test.sql` asserts RLS is enabled on all 16 initial public tables and on every public ordinary/partitioned table; this is a test assertion, not a test result from this audit.
- `supabase/tests/project_conversation_security.test.sql` covers cross-owner and archived-project associations.
- `supabase/tests/ai_gateway.test.sql` covers atomic completion, known-failure release and uncertain-outcome reconciliation.
- `docs/authentication.md` says 17 migrations had been applied to a database project, while the inspected main tree now contains 25 migration files. The applied database migration state was not queried in this audit; the documentation's count is therefore **STALE / requires live migration-status verification**.

### 4.2 Test inventory and execution evidence

- The current tree contains **72 unit-test files** matching the test runner's `.test.(mjs|js|ts)` discovery pattern.
- `scripts/run-unit-tests.mjs` discovers these tests and defers `tests/security/two-member-rls.test.mjs` to the isolated Supabase CI job.
- The package scripts expose `test:unit`, `lint`, and `build`; the `test:unit` script first validates workstream versions and then runs discovered unit tests.
- This report did not execute local tests, lint, build, Supabase migrations, RLS integration, browser E2E or Preview smoke checks.
- No Actions run was returned for exact main SHA `93e7ac35bfd5b6a9c33ea3508b6b7c2f2b4bbe1` by the queried API endpoint. The Vercel build-rate-limit status is not a test pass or fail.

## 5. Product roadmap Phase 0–6

The current-main `docs/product-scope.md` describes Phases 0–4. A more complete Phase 0–6 North Star is present on the open documentation PR #376 branch, not yet on main at this snapshot. The roadmap is a plan, not a maturity claim.

| Phase | Intended scope | Baseline assessment |
|---|---|---|
| 0 — foundation / baseline | Product principles, repository, threat model, data model, cost accounting, responsive prototype and evidence-based feature map | PARTIAL source/document foundation; complete inventory and operational proof still required |
| 1 — safe closed MVP | Account, profile, workspace, AI workspace, quotas, contribution/review/appeal, personal ledger, admin and audit | Source features exist in part; real-user E2E, tenant isolation, full workflow and operational acceptance UNKNOWN |
| 2 — AI Service Center / paid service | Provider adapters, real billing, spend limits, subscriptions and paid pilots | BLOCKED for live usage until provider, billing, quota, reconciliation and human approval gates are proven |
| 3 — Global Contribution Center / marketplace | External task funding, contributor workflows, review standards, appeal and quality operations | Source lifecycle foundations exist; external marketplace and end-to-end operating process UNKNOWN |
| 4 — transparent ledger / sustainability | Invoice reconciliation, internal cost, rewards, settlement and operating model | Ledger foundations exist; actual invoices, settlement and payout operations not verified; no cash payout claim |
| 5 — global ecosystem / developer partnerships | External APIs, partner integration, localization and ecosystem operations | Roadmap only in PR #376 North Star; not established as implemented on main |
| 6 — opt-in distributed compute | Voluntary, isolated, consent-based global compute nodes | Long-term research only; no runtime activation or launch authorization |

## 6. A→B dependency and acceptance gates

The current-main `docs/architecture/agent-factory-product-read-adapter.md` is explicitly marked **proposal only — not implemented, not accepted, and not an authorization to activate B**.

Before implementation, the contract still needs closure for:
1. Server-to-server authentication: issuer, audience, scope, rotation/revocation, replay protection and cryptographic workspace/task binding.
2. Reference lifecycle: task/candidate/evidence lookup, revocation/retention, pagination and consistent not-found/forbidden behavior to prevent cross-tenant enumeration.
3. Freshness: projection revision/observed time, maximum staleness and cache semantics; old success must never survive a changed candidate SHA or run attempt.
4. Failure mapping: closed, reviewed allowlist from A machine error codes to public categories; unknown codes must map to `unknown`, never raw error text.

Current A acceptance dependencies verified from live GitHub issue reads:
- [Issue #136 — independent adversarial audit](https://github.com/X84657465/global-citizen-ai-network/issues/136) remains **OPEN**. It requires a read-only independent audit and report against a freshly confirmed main SHA. No B work may substitute self-review for this gate.
- [Issue #354 — propagate reserved worker lease](https://github.com/X84657465/global-citizen-ai-network/issues/354) is **CLOSED** as completed by [PR #362](https://github.com/X84657465/global-citizen-ai-network/pull/362), merged at `388b25f354ea887727f7cfe54dd7081d4f8eb6a2`. The bounded lease-ID handoff fix passed exact-head run `45029877567` (attempt 1). This resolves that specific cross-job handoff defect only; it does not close the separate Factory-wide acceptance gates, including Issue #136, natural scheduler/lease progression and operational soak. GPT 4 must not modify the A-owned Factory control-plane workflow.
- The current-main A acceptance state is not PASS. B Runtime remains **BLOCKED / PREPARATION ONLY** until the A charter's full acceptance gates and human approval are satisfied.

## 7. Cross-GPT documentation conflict and coordination

At this snapshot:
- Main `PROJECT_COORDINATION.md` still has the legacy three-GPT role model.
- PR #376 updates the coordination file to four GPT roles and adds the GPT 4 B-line charter and Product North Star. This report and the expanded governance addendum are being prepared on that PR branch.
- PR #383 also modifies `PROJECT_COORDINATION.md`, but its branch still labels GPT 4's role UNKNOWN. That conflicts with the GPT 4 B-line appointment in the uploaded formal appointment and the B-line charter on PR #376.
- Both PRs are based on main SHA `93e7ac35bfd5b6a9c33ea3508b6b7c2f2b4bbe1` and modify the same coordination file. They must be reconciled before either is merged; do not merge both unchanged or treat one branch as already on main.
- PR #376's prior exact-head Actions run succeeded on its earlier SHA `6cae34bbe195352d34e4122d04b71adf7c6a6d98`; this report and governance addendum add a later commit, so that earlier CI evidence is **STALE for the new head**. A new exact-head run has not yet appeared in the queried run list.

## 8. Highest-priority GPT 4 next actions

1. Keep B Runtime inactive; do not create a second Runner, scheduler, task store or privileged A execution path.
2. Reconcile PR #376 and #383 so there is one canonical four-GPT `PROJECT_COORDINATION.md` with GPT 4 = B Product Lead, GPT 3 = A–P global independent supervisor, and no duplicated role ownership.
3. Complete and maintain the B feature map, backlog and risk register from current main; refresh all SHA/PR/CI evidence whenever main advances.
4. Close B-side A→B contract requirements with GPT 1; do not implement an A-owned projection or touch Factory private state.
5. Request GPT 2 support for B's security, privacy, tenant isolation and governance reviews.
6. Request GPT 3 independent architecture and acceptance review; do not self-approve B changes.
7. Only after A acceptance, plan a minimal B integration slice with exact contract tests, RLS/IDOR tests, CI, Preview smoke checks and rollback/forward-fix evidence.

## 9. Evidence and limitations

Evidence sources inspected:
- `versions/manifest.json`, `package.json`, `README.md`
- `docs/architecture.md`, `docs/api.md`, `docs/database.md`, `docs/authentication.md`, `docs/product-scope.md`, `docs/data-model.md`, `docs/ai-gateway-implementation.md`
- B-facing `app/` routes and pages, selected `lib/` modules, Supabase migrations and SQL tests, unit test inventory
- `docs/architecture/agent-factory-product-read-adapter.md`
- GitHub main ref, branch comparison, PR #376, PR #383, Issues #136 and #354, Actions run lookup and combined commit status

Limitations:
- No local repository checkout was available to inspect local `git status`, untracked files or uncommitted changes.
- No local test commands, database queries, authenticated browser flows, production credentials, provider calls, deployment or Preview smoke tests were run.
- Source presence is not proof of runtime connectivity, correct live configuration, migration application, security acceptance or production readiness.
- Any SHA-bound evidence becomes STALE when its source SHA or relevant environment changes.

**Overall B baseline status: UNKNOWN for end-to-end acceptance; BLOCKED for runtime activation.** This report records a source-inspection baseline only.

## 10. Live status correction — 2026-11-23 (supersedes stale issue references above)

This addendum preserves the original source-inspection snapshot and corrects issue/PR status using fresh GitHub records. It does not claim new runtime acceptance.

### A Factory dependency status

- Issue #354, `[P0 Factory] Propagate the reserved worker lease across publication jobs`, is **CLOSED**.
- The bounded lease handoff was integrated by PR #362 (merge commit `388b25f354ea887727f7cfe54dd7081d4f8eb6a2`).
- PR #362 exact candidate head `fe2b16e66e47cfddfd135387a954600655903ade`, Actions run `45029877567`, attempt 1: the metadata resolver, Windows quality gates, Ollama/local execution integration, and Supabase/PostgreSQL/RLS integration all reported SUCCESS.
- Current-main static inspection at `93e7ac35bfd5b6a9c33ea3508b6b7c2f2b4bbe1` confirms the reserved lease output is propagated to both publication state-writer jobs and remains excluded from the isolated publisher.
- The issue's own completion note explicitly limits this result to the cross-job lease-ID handoff defect. It does **not** establish complete Factory acceptance or live publication-flow/operational-soak acceptance.
- Therefore, remove Issue #354 from the list of currently open A acceptance dependencies. Keep all other A acceptance gates, including Issue #136, separate and open until their own evidence is accepted.

### Coordination PR status

- PR #383 is **CLOSED**; it is no longer an open competing PR. This status alone does not establish that its changes were merged.
- PR #376 remains the candidate carrying the four-GPT coordination update and B Product charter. The default-branch `PROJECT_COORDINATION.md` fetched for this update still contains the legacy three-GPT text, so the four-GPT governance is not yet on main.
- PR #376's latest known exact-head Actions run `45047970308` was **IN_PROGRESS** at the time of this refresh. The prior run `45044869836` is not evidence for a later head. Re-query the actual PR head and exact-SHA CI before any acceptance decision.

### Current B disposition

- B remains **PREPARATION ONLY / BLOCKED** for Runtime activation.
- A→B Read Adapter remains proposal-only; authentication, reference lifecycle/anti-enumeration, freshness/cache semantics and closed failure-code mapping still require design closure before implementation.
- No B Runtime, paid AI traffic, production migration, merge or deployment is authorized by this report update.

### Evidence boundary

This addendum is a GitHub metadata and source-status correction only. No local tests, browser/device acceptance, live database query, production operation or deployment was performed. The original baseline snapshot and its limitations remain intact; revalidate all SHA-bound evidence whenever main or the candidate branch advances.


## 11. B Product delivery map refresh — 2026-11-23

This section converts the North Star into a delivery-oriented map. It supplements the source-inspection inventory above; it does not replace the pinned mainline snapshot or turn roadmap items into accepted features.

### 11.1 Evidence anchors and current candidate status

- Source baseline: main `93e7ac35bfd5b6a9c33ea3508b6b7c2f2b4bbe1e`, the current main SHA confirmed at the start of this work cycle.
- Four-GPT / Product North Star documentation candidate: PR #376, branch `docs/agent-factory-autonomy-core-20261123`, last verified head before this addendum `1912539b22f7d0bb315caec135ffd8a1b5a1f2a3`. This is open and unmerged; its exact-head Actions run `45050003548` was PENDING. This earlier run cannot validate a later commit.
- Workspace navigation candidate: PR #391, last reported head `d252439e0b03d8ea155b8d483b8bec7a60aa1e77`, limited to the Issue #72 allowlist. Exact-head Actions run `45049125831` was PENDING; no exact-head PASS or browser/device visual acceptance is established. PR #391 remains Draft and unmerged.
- Issue #354 is CLOSED by PR #362; the lease-ID handoff fix is integrated, but that bounded fix is not full Factory acceptance.
- Issue #136 remains OPEN. Its recorded audit target predates the currently confirmed main SHA; under its stop-on-baseline-change rule, its independent audit owner must refresh/confirm the target before treating any audit as current.
- A→B Read Adapter remains proposal-only. Authentication, audience/scope, rotation/revocation, replay protection, resource binding, anti-enumeration, reference lifecycle, freshness/cache semantics and closed failure mapping remain pre-implementation design requirements.
- B Runtime remains BLOCKED / PREPARATION ONLY. No paid AI traffic, production migration, deployment or new execution path is enabled.

### 11.2 Product capability delivery matrix

| Product capability | Current source / candidate evidence | Delivery status | Next acceptance proof |
|---|---|---|---|
| Public product entry and navigation | Main: `app/page.tsx`, `app/layout.tsx`, homepage test | Source present; visual/accessibility/deployed smoke acceptance UNKNOWN | Current-SHA browser smoke, mobile layout, keyboard/accessibility checks |
| Identity, account and profile | Main: login/account/auth callback/signup routes and authentication docs | Source present; signup closed by default; real-user E2E UNKNOWN | Authenticated signup/login/recovery E2E, role boundary and account lifecycle checks |
| Workspace, projects and conversations | Main: workspace/project/conversation routes, ownership/locking migrations and tests; PR #391 adds project navigation and failure/empty states | Base source present; PR enhancement PENDING | Exact-head CI, browser/device tests, project/conversation navigation, empty/error states, cross-owner and concurrency tests |
| AI Service Center / Gateway | Main: `app/api/ai/chat/route.ts`, pending route, `lib/ai/`, gateway docs and SQL tests | Source present; live provider use BLOCKED by default controls/configuration; no paid traffic authorized | Contract tests with a non-production approved provider only after explicit authorization; budget, idempotency, uncertain-outcome and fail-closed verification |
| Contribution task discovery and submission | Main: contribute routes, task API, validation, active-submission migrations | Lifecycle foundations present; end-to-end acceptance UNKNOWN | Contributor-to-task-to-submission E2E, duplicate/concurrent submission and permission tests |
| Review, appeal and moderation | Main: admin contribution/appeal routes, review/appeal APIs, atomic migrations and SQL tests | Source present; lifecycle, authorization and atomicity NOT RUN in this baseline | Reviewer/admin authorization matrix, atomic transition tests, appeal and audit-history E2E |
| Personal contribution / reward ledger | Main: contributions page, summary API, reward snapshot schema | Read-only/personal record foundations present; actual payout NOT ENABLED / NOT VERIFIED | Reconcile source events to ledger snapshots; prove pending/confirmed/reversed semantics; legal/finance approval before any payout |
| Cost, provider invoices and admin operations | Main: AI costs/operations pages, admin cost and reconciliation APIs | Source present; real invoice ingestion, cost accuracy and reconciliation operations UNKNOWN | Test imported invoice provenance, usage-to-invoice reconciliation, duplicate handling and budget alerts in non-production |
| Knowledge and research assets | Data model documentation describes entities; no dedicated B-facing management page/API was found in inspected route inventory | NOT FOUND IN INSPECTED ROUTES / roadmap | Define ownership, consent, provenance, versioning, search, correction and deletion before implementation |
| Developer portal and partner integrations | Current API documentation exists; dedicated portal/OAuth/webhook/API-key management routes not found in inspected route inventory | NOT FOUND IN INSPECTED ROUTES / roadmap | Versioned API contract, scoped credentials, webhook signature/replay protection, quota and revocation design |
| Globalization and accessibility | Profile language default is zh-TW; complete locale/accessibility evidence not established | PARTIAL / UNKNOWN | Locale inventory, translation fallback, timezone/currency rules, WCAG-oriented keyboard and screen-reader checks |
| Voluntary distributed compute | Product-scope docs describe later opt-in research; no B node runtime/client route found | NOT IMPLEMENTED; long-term research only | Separate threat model, informed consent, isolation, resource caps, independent security/legal review and explicit owner authorization |

### 11.3 Prioritized B delivery backlog and dependencies

| Priority | Work package | Owner / dependency | Exit evidence |
|---|---|---|---|
| P0 | Keep the A acceptance gate current; refresh Issue #136's target to the confirmed main SHA and obtain the assigned independent read-only audit | GPT 1 / independent auditor; GPT 3 tracks acceptance evidence | Current-SHA audit report, findings disposition and A charter gates; GPT4 must not substitute self-review |
| P1 | Close A→B Read Adapter design before any implementation | GPT 1 owns A-side contract; GPT4 defines B consumer needs; GPT3 reviews | Approved auth/audience/scope, reference lifecycle, anti-enumeration, freshness, failure mapping and contract tests |
| P1 | Finish Workspace navigation candidate | GPT4 / Issue #72 and PR #391 | Exact-head Actions PASS, focused tests, browser/mobile visual acceptance, no out-of-allowlist files |
| P1 | Prove account, tenant and workspace isolation | B engineering with GPT2 security review; depends on disposable test environment and existing RLS policy | Anonymous/member/cross-user/cross-tenant/admin matrix, RLS integration and API IDOR tests |
| P1 | Verify AI Gateway safety without enabling paid production traffic | B engineering; depends on provider contract and spend-control review | Budget/fail-closed/idempotency/reconciliation tests using authorized non-production fixtures |
| P2 | Validate contribution lifecycle end to end | B engineering; depends on task state machine, reviewer permissions and appeal contract | Submission → review → revision/appeal → decision → ledger event trace |
| P2 | Reconcile cost and contribution ledger semantics | B engineering / finance-policy owner; depends on verified source events and invoice provenance | Reproducible usage/invoice reconciliation, duplicate protection, immutable audit trail; no payout claim |
| P3 | Specify Knowledge & Research Assets | B product/design; depends on consent, provenance, retention and search requirements | Approved domain model, privacy classification and user correction/deletion journey |
| P3 | Specify developer portal and ecosystem APIs | B product/API owner; depends on identity, scoped credentials and governance | Versioned API and webhook threat model, scope matrix, revocation and quota policy |
| P3 | Complete localization and accessibility baseline | B product/design; cross-cutting | Supported locale matrix, mobile/keyboard/screen-reader evidence and localized formatting tests |
| P4 | Research voluntary distributed compute | Separate future authorization; depends on security, legal, economics and consent gates | Research-only threat model and feasibility report; no node runtime or task execution |

### 11.4 Delivery rules

1. A source file, route, migration or test fixture proves source presence only. It does not prove that a feature is connected, correctly configured, secure in a live environment or accepted.
2. Every implementation slice must name the user journey, exact allowed paths, owner, upstream dependency, failure states, test plan and rollback/forward-fix plan before coding.
3. Keep PR #391 within Issue #72's three allowed paths. Version metadata, changelog and manifest changes must be coordinated separately; do not silently expand its allowlist.
4. Do not start paid AI, real reward settlement, public knowledge ingestion, external partner credentials or distributed compute without the relevant explicit product, security, legal and operational approvals.
5. Reconfirm main SHA, candidate head, exact-head CI, review state and preview/browser evidence before every acceptance decision.

**B delivery disposition:** Phase 0 remains IN PROGRESS. Phase 1 has partial source foundations but is NOT ACCEPTED. Phase 2 live AI service is BLOCKED. Phases 3–5 have partial foundations or roadmap-only components and remain NOT ACCEPTED. Phase 6 remains research-only. B Runtime remains BLOCKED / PREPARATION ONLY.


## 12. Workspace → AI Service Center source-flow review — 2026-11-23

This is a read-only source inspection of the current integrated main baseline `93e7ac35bfd5b6a9c33ea3508b6b7c2f2b4bbe1`. Blob SHAs below identify the exact files inspected. This section records code paths and test obligations; it is not a runtime, security, billing, or production acceptance.

### 12.1 Inspected source anchors

| File | Main blob SHA | Observed responsibility |
|---|---|---|
| `app/workspace/workspace-client.tsx` | `f4b82bca816a26a52b8c04660fa7eae1ea8a0389` | Loads conversations, pending AI recovery and projects; stores pending idempotency material in session storage; opens conversations and handles project assignment |
| `app/api/ai/chat/route.ts` | `d01ca919d783d56bdf4ea937ed4919794ae77337` | Authenticated chat POST, conversation lookup, history assembly, idempotency claim, cost preflight, provider call, completion or reconciliation |
| `app/api/ai/pending/route.ts` | `d66b5b6266e0a462ebfbd7f17709a366c795f972` | Authenticated owner-only pending request recovery |
| `app/api/projects/route.ts` | `e815e043ad49874863cc3e2ca344d1acad8c717f` | Authenticated project list/create; create explicitly writes authenticated owner ID |
| `app/api/conversations/route.ts` | `b477659118437d6aea5bea53a5a3f2965227fcf7` | Authenticated conversation list/create; create validates project ownership and writes authenticated owner ID |
| `lib/ai/config.ts` | `be503a72c534f8af9b09a0dbae1df609fea7c2e9` | Server-side provider configuration and cost-rate requirements |
| `lib/ai/pending-recovery.ts` | `75c2f4e9e62f59b9b622751078a770da1eb9fc82` | SHA-256 prompt/conversation matching and timing-safe comparison for pending-message recovery |
| `lib/ai/provider-response.ts` | `459623acf8c7ea7c8e3a8c602e40d1b4ed0bcc4e` | Bounded provider response parsing and conservative token-usage fallback |

### 12.2 Current user journey and trust boundaries

1. Workspace bootstrap requests `/api/conversations`, `/api/ai/pending`, and `/api/projects` independently in one client-side `Promise.all`.
2. Conversation/project APIs require an authenticated session and use the authenticated Supabase client. Conversation creation checks that a selected project belongs to the authenticated user and is not archived; both create paths set `owner_id` from the authenticated user rather than trusting the request body.
3. Project and conversation list queries do not add an explicit `owner_id` predicate in the route source inspected here; their isolation therefore depends on the corresponding database RLS policies. This source review does not establish that the deployed policies are correct or currently active.
4. Pending recovery uses the server-side admin client, but each inspected request/idempotency/message query is explicitly constrained by the authenticated `owner_id`. The idempotency key is returned only in the authenticated owner's pending response; prompt reconstruction requires a matching request hash and bounded user message.
5. Chat POST requires an authenticated user, validates conversation ID/content and reads the conversation through the authenticated client before reading history. It then requires server-side service-role configuration, a syntactically valid idempotency key, and an atomic `claim_ai_request` result before a new provider request can proceed.
6. Provider configuration is accepted only for the configured OpenAI-compatible mode, a valid HTTPS endpoint (or loopback HTTP for local development), server-side key/model and positive cost rates. The route estimates worst-case cost before claiming a new billable request.
7. The route records the authenticated conversation's trusted `project_id` onto the AI request; it does not accept a client-supplied project ID for that association. Provider uncertainty, timeout, malformed response or finalization failure is sent to reconciliation rather than being treated as a confirmed billable success or safe retry.
8. The returned cost label explicitly describes an internal estimate based on configured token rates, not a supplier invoice amount.

### 12.3 Confirmed UX gap on current main

The current main Workspace bootstrap converts any non-OK `/api/projects` response into `{ projects: [] }`, then passes the empty list through the normal project filter. Therefore, a project API outage or authorization/configuration failure can appear indistinguishable from a genuine empty project list in this code path.

PR #391 is the bounded candidate intended to separate project loading/error state from a genuine empty state and preserve conversation/pending initialization. Its Issue #72 allowlist remains authoritative; do not add version metadata or unrelated files to that PR. The current PR #391 body identifies head `d252439e0b03d8ea155b8d483b8bec7a60aa1e77`; this inspection did not establish exact-head terminal CI or browser/device acceptance. Keep it Draft/unmerged pending those gates.

### 12.4 Required verification before calling the journey accepted

| Boundary | Required proof |
|---|---|
| Project/conversation RLS | Anonymous denial; member sees only own rows; cross-owner ID access denied; archived project cannot be newly assigned; database integration tests on exact candidate SHA |
| Pending recovery | Owner-only key disclosure; cross-owner request/hash/message cannot be reconstructed; malformed/missing hash remains unresolved and fails closed; duplicate pending requests do not permit a second provider call |
| AI idempotency | Same key + same request safely replays; same key + different prompt conflicts; concurrent duplicate claims produce one provider call; uncertain outcome preserves the same key |
| Budget/provider gate | Missing/invalid config, zero/malformed pricing, disabled platform and cost-limit overflow produce no provider request; verify redirect rejection, timeout and bounded response body |
| Completion/reconciliation | Provider success + database finalize failure remains reconciliation-required; unknown HTTP/provider outcome is not released as a known non-billable rejection; duplicate completion cannot double-book cost |
| Workspace UX | Project loading failure is visibly distinct from a true empty list; conversation and pending recovery remain usable when project list fails; mobile and desktop navigation verified in a browser |
| Operational billing truth | Internal estimated cost remains visibly distinct from provider invoice/cash settlement; no payout or supplier invoice reconciliation is implied by the chat route |

### 12.5 B delivery disposition

- Workspace, conversation and AI chat source paths are present on main; source presence is not end-to-end acceptance.
- The chat route contains meaningful authentication, idempotency, cost-preflight and uncertain-outcome reconciliation controls in source. Their effective security and transactional behavior still require exact-SHA automated/integration evidence.
- RLS correctness for list paths and the full owner/cross-owner matrix remain NOT VERIFIED in this read-only pass.
- Current main has a concrete project-load error/empty-state UX conflation; PR #391 is the focused candidate, not yet accepted.
- No A Factory projection is consumed by these routes. No A→B Read Adapter, Factory task display, new Product table, paid provider call, runtime activation, migration, merge or deployment was introduced by this review.


## 13. A→B Read Adapter — B consumer contract review — 2026-11-23

This section records B-side consumer requirements and unresolved contract decisions for handoff to the A contract owner. It does not modify the canonical adapter proposal, implement an endpoint, authorize Factory access, or activate B Runtime. The canonical proposal remains in `docs/architecture/agent-factory-product-read-adapter.md` and is still marked proposal-only.

### 13.1 Contract boundary and ownership

| Concern | Owner | B-side requirement |
|---|---|---|
| Factory task lifecycle, candidate state and CI tuple | A | A is the source of truth; B consumes only the sanitized projection |
| Product identity and workspace membership | B | Authenticate the member and derive workspace from the session; never accept client-supplied workspace as authority |
| Task-to-workspace association | B-owned trusted mapping, established at authorized task submission | Resolve the opaque task reference through a server-side mapping; do not infer ownership from Issue, PR author, branch, repository name or client payload |
| Service-to-service authorization | A + B contract owners | Authenticate the calling service independently of member authentication; actor/resource reference strings are not credentials |
| Product display, audit and access denial | B | Re-check membership on every read; deny revoked membership and unknown/unmapped references without leaking cross-tenant existence |

**Important DTO clarification:** the current proposal includes `workspaceRef` in `FactoryTaskReadModelV1`, while also stating that workspace binding is B-owned and must not be trusted from A alone. Treat this as an unresolved schema ambiguity. Preferred B-side shape is an A-owned task projection without an authoritative workspace claim, wrapped/enriched by B after resolving its own trusted task-to-workspace mapping. If the field remains for correlation, it must be explicitly non-authoritative and must match B's mapping or fail closed; it must never create or change that mapping.

### 13.2 Required service authentication decisions

The canonical proposal identifies server-side authorization but does not yet freeze a wire-level mechanism. Before implementation, A/B owners must specify and test:

- Service identity and key/certificate ownership; issuer, audience and narrowly scoped read permission.
- Credential issuance, secure storage, rotation overlap, emergency revocation and expiry.
- Replay resistance and bounded clock skew; credentials must not be accepted as member session tokens.
- Which service identity may read which task references, and how authorization is checked against B's trusted mapping.
- Secret-free audit fields: caller service ID, action, opaque task reference, decision, timestamp and correlation ID; never log bearer tokens or raw Factory state.

No authentication mechanism is selected or implemented by this B review. A short-lived, audience-bound service credential is a design direction for owner review, not an authorization to create secrets or change permissions.

### 13.3 Resource lifecycle, freshness and bounded reads

The current proposal needs explicit answers for these consumer-visible cases:

1. **Reference lifecycle:** define reference creation, expiry, revocation, retention and deletion behavior. A revoked, expired, unmapped or wrong-tenant reference must not fall back to an Issue/PR lookup.
2. **Not-found semantics:** external responses for unknown and unauthorized references should avoid cross-tenant enumeration; internal audit may retain the distinct denial reason without disclosing it to the caller.
3. **Freshness:** add a monotonic projection revision and source observation timestamp (for example `projectionRevision` and `observedAt`), define a maximum acceptable staleness, and state whether stale reads are returned with an explicit stale marker or rejected. A stale success must never remain current after a candidate SHA/run attempt changes.
4. **Candidate identity:** every terminal CI result must continue to bind the full SHA, PR number, run ID and attempt. A new SHA or run attempt invalidates prior terminal evidence for the current candidate.
5. **Pagination and limits:** if task lists are supported later, define stable cursor semantics, maximum page size, bounded response size and per-service rate limits. Do not add list-all or unbounded query behavior to v1; a single-reference read is the safer initial surface.
6. **Deletion/retention:** define what B displays when the source task or evidence reference is deleted or retained only for audit. Do not reconstruct deleted content from raw Issues, logs or descriptive evidence strings.

### 13.4 Error and status semantics

| Condition | Required consumer behavior |
|---|---|
| Unknown contract version / malformed DTO | Fail closed; do not partially render privileged status |
| Unknown A lifecycle state | Reject projection; never display raw enum |
| Missing, stale, skipped, cancelled or mismatched CI attempt | No terminal success; represent unavailable/pending according to the frozen mapping |
| Unknown failure code/category | Display only `unknown`; never parse free-form error text |
| Unauthorized / unmapped / revoked reference | Deny without cross-workspace existence disclosure |
| A service unavailable / timeout | Show temporary unavailable state; do not convert to empty task list or failed task |
| Stale projection revision | Do not overwrite a newer B-observed revision with older data |
| Candidate CI failure | `not_passed` only when exact attempt is verified; failure category remains `unknown` unless a stable allowlisted code exists |

The current failure-category proposal has a deliberately small mapping: `STALE_BASE → validation`, `WORKER_LEASE_EXPIRED → infrastructure`, and `WORKFLOW_FAILURE`, `TASK_FAILURE`, `SYSTEM_FAILURE`, missing or unrecognized codes → `unknown`. Generic CI failure is not enough to infer validation or execution. Keep this mapping provisional until A owner confirms the producer's stable codes and exact propagation evidence.

The public `completed` task status must not be interpreted as merged, deployed, billed, paid or production-approved. Candidate CI `passed` means only that the configured checks passed for the exact verified candidate tuple.

### 13.5 Minimal v1 consumer acceptance suite

Before B displays Factory task data, the joint contract test suite must demonstrate:

- Valid authenticated service read for an authorized mapped task.
- Missing, expired, wrong-audience, wrong-scope and revoked service credential denial.
- Member A cannot read Member B's task through guessed, copied or substituted references.
- A revoked workspace membership immediately blocks subsequent reads.
- A-side workspace claim cannot override or create B's trusted mapping.
- Unknown task/state/contract version fails closed without leaking raw fields.
- Stale SHA, stale run ID, wrong attempt, skipped/cancelled run and missing evidence cannot produce terminal success.
- Unknown machine error code and free-form exception text map to `unknown`.
- Reference revocation/deletion and source unavailability have deterministic consumer behavior.
- A stale projection revision cannot overwrite a newer observed candidate.
- Response size, list/page bounds (if list support is ever added), timeout and rate-limit behavior are bounded.

### 13.6 Handoff and current disposition

- B-side contract review is documented; A owner decisions and independent GPT3 security review are still required.
- The canonical adapter proposal remains unchanged and proposal-only. No endpoint, credential, database mapping, Product route, feature flag, migration or Factory integration was created.
- A-wide acceptance remains BLOCKED by its independent audit baseline gate and remaining exact-main operational evidence. The current Issue #136 audit target is stale relative to current main and must be explicitly refreshed by the project owner before GPT3/independent reviewer begins.
- B Runtime remains BLOCKED / PREPARATION ONLY. This review is not a security approval, product acceptance, or activation authorization.
