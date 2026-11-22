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

**B Runtime disposition: BLOCKED / PREPARATION ONLY.** The A→B read adapter remains a proposal, not an implemented or accepted interface. A Factory acceptance gates remain open, including the independent read-only audit requested in Issue #136 and the P0 lease propagation issue #354. GPT 4 must continue B baseline, product planning, contract preparation and dependency analysis; it must not activate B Runtime, paid AI traffic, production migrations or deployment.

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
- [Issue #354 — propagate reserved worker lease](https://github.com/X84657465/global-citizen-ai-network/issues/354) remains **OPEN**, priority P0, and currently carries the `factory-control-plane-approved` label. It concerns the A-owned preflight workflow's cross-job lease handoff. GPT 4 must not modify this Factory control-plane workflow; GPT 1 owns A-side implementation, with GPT 3 independent review.
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
