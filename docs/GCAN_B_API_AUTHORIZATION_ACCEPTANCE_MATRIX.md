# GCAN B API Authorization & Acceptance Matrix

**Snapshot:** 2026-11-23  
**Source:** `main` at `93e7ac35bfd5b6a9c33ea3508b6b7c2f2b4bbe1e`  
**Scope:** static source inspection of all 20 `app/api/**/route.ts` files.  
**Status:** evidence inventory only. No endpoint was invoked, no test was executed, and no live role/RLS behavior is claimed as accepted.

## 1. Interpretation rules

- **Authenticated member** means the route calls `getAuthenticatedClient()` and rejects absent sessions. It does not, by itself, prove active-account enforcement or database RLS correctness.
- **Owner filter** means the route explicitly scopes a query/mutation to the authenticated user's ID. Database RLS must still independently enforce the same boundary.
- **Active admin/reviewer** means the route reads `profiles.role` and `profiles.account_status` and checks the required role and `active` status.
- **Service-role** means a server-only Supabase admin client is used. This is privileged access and requires database-side actor revalidation in SECURITY DEFINER RPCs; the HTTP route check is not sufficient alone.
- **Public** means no user session is required. Health/signup endpoints must not expose privileged state.
- A **source assertion** is not a passing test. Exact-SHA CI and disposable DB tests remain NOT RUN in this work session.

## 2. Route inventory

| Route / method | Authentication and authorization observed | Data boundary / privileged behavior | Relevant tests / acceptance | Status |
|---|---|---|---|---|
| `POST /api/auth/signup` | Public endpoint; server-side signup gate before Supabase Auth signup | Supabase Auth signup; dashboard-level public signup setting is a second required gate | Auth signup gate test and dashboard config evidence needed | PARTIAL; NOT RUN |
| `GET, POST /api/projects` | Authenticated member | GET lists caller's projects; POST sets `owner_id` from session | `project_conversation_security.test.sql`, `messages_owner_security.test.sql` adjacent ownership suite; API route tests not verified | PARTIAL; NOT RUN |
| `PATCH, DELETE /api/projects/[id]` | Authenticated member; UUID validation | Mutation query scoped to `id` and `owner_id` | Cross-owner mutation denial, invalid ID, archived/deleted semantics | PARTIAL; NOT RUN |
| `GET, POST /api/conversations` | Authenticated member | GET caller's conversations; POST validates referenced project belongs to caller and inserts caller owner ID | `project_conversation_security.test.sql`; route tests NOT RUN | PARTIAL; NOT RUN |
| `PATCH /api/conversations/[id]` | Authenticated member; UUID validation | Project reassignment checked against caller ownership; update scoped by conversation owner | Foreign project, foreign conversation and archived project denial | PARTIAL; NOT RUN |
| `GET, POST /api/conversations/[id]/messages` | Authenticated member; UUID validation | GET filters `owner_id`; POST inserts `role='user'` and owner from session | `messages_owner_security.test.sql` asserts cross-member and role boundary at DB layer | PARTIAL; NOT RUN |
| `POST /api/ai/chat` | Authenticated member | Verifies conversation/history ownership; uses server-only admin client and privileged atomic request/budget RPCs; provider request and reconciliation lifecycle | `ai_gateway.test.sql`, `ai_lifecycle_rpc_security.test.sql`; route-level provider mock/timeout/budget tests must be checked | PARTIAL; paid live use BLOCKED |
| `GET /api/ai/pending` | Authenticated member | Service-role reads are explicitly filtered by caller `owner_id`; returns only owner's pending request/idempotency/message context | AI lifecycle RPC security + route tests for owner filtering and no-store behavior | PARTIAL; NOT RUN |
| `GET, POST /api/contribution/tasks` | Authenticated member | Lists published/member-visible tasks; submission insert sets contributor ID from session and checks task visibility | `task_submission_uniqueness.test.sql`; dedicated two-member privacy test not identified | PARTIAL; NOT RUN |
| `GET /api/contribution/summary` | Authenticated member | Reads contribution ledger, reward ledger, own submissions and appeals through session client | Add/confirm two-member RLS coverage for all four resources | PARTIAL; NOT RUN |
| `POST /api/contribution/appeals` | Authenticated member | Pre-reads rejected submission filtered by contributor ID; inserts appellant ID from session; DB trigger repeats identity/ownership checks | `database_security.test.sql` plus migration-25 privacy behavior; dedicated missing-vs-foreign test not identified | PARTIAL; NOT RUN |
| `GET, POST, PATCH /api/admin/contribution/tasks` | GET/POST/PATCH share helper requiring active admin; reviewer is not sufficient for task management | Server-only admin client; mutations via `manage_contribution_task` RPC with actor ID | `contribution_task_admin.test.sql` checks service-role-only grants, actor status and atomic audit | PARTIAL; NOT RUN |
| `GET, POST /api/admin/contribution/reviews` | Active admin or reviewer | Server-only admin client; POST calls `review_task_submission` RPC with actor ID | `database_security.test.sql`; reviewer conflict and self-review tests need explicit coverage | PARTIAL; NOT RUN |
| `GET, POST /api/admin/contribution/appeals` | Active admin or reviewer | Server-only admin client; POST calls `review_task_appeal` RPC with actor ID | `database_security.test.sql`; appeal reviewer independence needs explicit coverage | PARTIAL; NOT RUN |
| `GET /api/admin/ai-costs` | Active admin only | Service-role reads internal AI cost ledger, requests and provider invoice imports; response aggregates estimated and billed amounts | `public_table_grants.test.sql`, `ai_reconciliation.test.sql`; verify currency separation and admin denial | PARTIAL; NOT RUN |
| `GET /api/admin/ai-operations` | Active admin only | Service-role invokes stale AI request listing RPC; operational metadata only | `ai_lifecycle_rpc_security.test.sql`; verify no raw secret/provider payload leakage | PARTIAL; NOT RUN |
| `GET /api/admin/ai-reconciliation` | Active admin only | Service-role invokes stale request listing RPC; exposes reconciliation queue to admin | `ai_reconciliation.test.sql`; route authorization and no-store acceptance | PARTIAL; NOT RUN |
| `POST /api/admin/ai-reconciliation/resolve` | Active admin route helper; validates input; DB RPC independently revalidates active admin | Server-only service client; `resolve_ai_reconciliation` records evidence/state transition | `ai_reconciliation.test.sql` asserts grants, actor checks, immutable evidence, idempotency and transitions | PARTIAL; NOT RUN |
| `GET /api/health` | Public | Reports service/configuration indicators; explicitly does not claim that credential presence means integration authentication succeeded | Public response must not expose secrets/host internals; health route tests | PARTIAL; NOT RUN |
| `GET /api/admin/fp/governance-reviews` | Active admin only | Delegates to shared governance review handler with authenticated client and active-admin profile check | Governance handler tests and F/P contract acceptance; not part of core B runtime acceptance | PARTIAL; NOT RUN |

## 3. Cross-cutting authorization controls

### 3.1 Session and ownership
The mainline routes consistently use the server-side authenticated Supabase client for member operations. Project, conversation and message handlers derive ownership from the authenticated user and/or include explicit owner filters. These controls are complementary to, not substitutes for, database RLS.

### 3.2 Privileged server access
Admin contribution and AI operations use a server-only service-role client after route-level role checks. Sensitive database mutations are delegated to narrowly scoped RPCs. The RPC must revalidate actor status and permissions in the transaction because route-level checks can become stale between check and mutation.

### 3.3 Input and error boundaries
Dynamic resource routes validate UUIDs. The AI route bounds/validates conversation context, idempotency and provider response, and treats uncertain provider outcomes as reconciliation-required rather than blindly retrying. Every route still needs explicit malformed body, oversized body, unexpected database error, no-store/cache and rate-limit acceptance appropriate to its sensitivity.

### 3.4 Signup and public surface
Signup is gated in server code, but the Supabase dashboard setting is external configuration and is not proven by source inspection. The health endpoint intentionally distinguishes configured credentials from a successful authenticated integration check.

## 4. Acceptance matrix — required adversarial tests

| ID | Test | Expected result | Evidence location | Status |
|---|---|---|---|---|
| API-AUTH-01 | Unauthenticated request to every member/admin route | 401; no data disclosure | Route tests for all 20 handlers | NOT RUN |
| API-AUTH-02 | Ordinary active member calls every admin route | 403; no privileged query/RPC side effect | Route tests + DB grant tests | NOT RUN |
| API-AUTH-03 | Reviewer calls admin-only task/cost/AI routes | 403 | Route tests | NOT RUN |
| API-AUTH-04 | Suspended/closed admin or reviewer calls admin route | 403 | Route tests + RPC actor revalidation | NOT RUN |
| API-OWN-01 | User A reads/updates/deletes User B project/conversation/message | No data; mutation denied; no existence oracle | Existing project/message SQL tests + API tests | PARTIAL source coverage; NOT RUN |
| API-OWN-02 | User A reads User B AI pending request or request idempotency state | No data; no cross-owner identifiers | New route test + RLS test | NOT RUN |
| API-OWN-03 | User A reads User B submission/review/appeal/contribution/reward records | No data; no existence oracle where privacy requires | Expand SQL two-member tests | NOT RUN |
| API-PRIV-01 | Browser role directly invokes privileged RPC/table operations | Permission denied | SQL grant/security tests | PARTIAL source coverage; NOT RUN |
| API-PRIV-02 | Active admin is demoted/suspended between HTTP precheck and RPC | RPC denies mutation | Transactional RPC tests | NOT RUN |
| API-PRIV-03 | Reviewer attempts self-review or conflicted review | Rejected or routed to independent reviewer | Review lifecycle tests | NOT RUN |
| API-AI-01 | Concurrent duplicate AI request with same idempotency key | One provider dispatch; stable replay | AI lifecycle SQL + route integration tests | PARTIAL source coverage; NOT RUN |
| API-AI-02 | Budget exhausted, reservation unavailable, provider timeout/unknown outcome | Fail closed or reconciliation-required; no duplicate billable dispatch | AI gateway/reconciliation tests | PARTIAL source coverage; NOT RUN |
| API-PUB-01 | Public health/signup requests | No secret, internal topology or privileged status disclosure | Public route tests + deployment config evidence | NOT RUN |

## 5. Missing evidence and implementation gaps

1. No comprehensive route-level integration test suite was established by this static inspection. SQL security tests do not exercise the Next.js HTTP handlers.
2. No dedicated two-member test was identified for every contribution, appeal, AI pending and ledger resource.
3. Reviewer independence/self-review/conflict-of-interest controls need explicit evidence.
4. Organization tenant membership/roles do not appear in the inspected route model; current owner-scoped personal data must not be marketed as organization multi-tenancy.
5. No fresh evidence for rate limiting across every sensitive endpoint, request-body limits, CSRF posture for cookie-authenticated mutations, or cache policy on every private response.
6. Production environment variables and Supabase dashboard settings are not verified by this repository inspection.
7. No test was run and no endpoint was called as part of preparing this document.

## 6. Recommended implementation sequence

**P0:** Add HTTP integration tests for authentication, active-role enforcement and cross-owner access; run all 20 route handlers against a disposable Supabase test environment.  
**P0:** Verify production migration parity read-only; do not apply the pending migration from this workflow.  
**P1:** Expand two-member SQL tests to AI pending/idempotency, submissions, reviews, appeals and both ledgers.  
**P1:** Add explicit reviewer independence and actor-revalidation tests for both review RPCs.  
**P1:** Define account export/deletion, retention and cache/no-store contracts before implementation.  
**P2:** Define organization tenant model and adversarial two-tenant RLS before adding organization workspace features.

## 7. Change boundary

This matrix is documentation-only. No API, application code, SQL migration, RLS policy, GitHub workflow, Factory private state, Lease, Runner, Sandbox, secret, production data, deployment or B Runtime was changed. Product/runtime activation remains subject to the Factory-first gate and formal authorization.
