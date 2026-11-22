# GCAN B Product Baseline Report

**Snapshot date:** 2026-11-23 (Asia/Taipei; refreshed against main after PR #414, #415, #416, #418 and #419 merges)  
**Repository:** `X84657465/global-citizen-ai-network`  
**Default branch:** `main`  
**Baseline main SHA:** `10fabef703ee3865d208196f46ee71ddd1b7e149`  
**Overall release:** `0.3.137`  
**B / GCAN Product:** `0.1.20`  
**Status:** BASELINE DOCUMENTED — NOT PRODUCT ACCEPTANCE

> This report records repository evidence observed at the stated SHA. Source presence, documentation, a green historical CI run, or a declared version does not prove production readiness or end-to-end acceptance. Refresh all live GitHub states before using this report for a later release decision.

## 1. Executive summary

> **Live-state refresh:** This report is refreshed against main `10fabef703ee3865d208196f46ee71ddd1b7e149`. PR #414, #415, #416, #418 and #419 are merged. The current main combined status reports Vercel `build-rate-limit` failure; this is a deployment-provider quota status, not a GitHub test result. The available commit-workflow query is PR-triggered-only and returned no runs for this main SHA, so main Actions CI is UNKNOWN / NOT VERIFIED (not PASS). Issue #136 still targets `dce81ed801c41bca9bc364e3d0f248244d88f88f`; Factory-wide independent acceptance remains BLOCKED.

- `main` is `10fabef703ee3865d208196f46ee71ddd1b7e149`; `VERSION` and `versions/manifest.json` agree on overall `0.3.137`, with Agent Factory A at `2.0.84` and B at `0.1.20`. PR #414 (B baseline refresh), #415 (operations handoff), #416 (B contribution filters), #418 (Master Charter) and #419 (Factory handoff refresh) are merged into main.
- B has source-level foundations for member accounts, projects, conversations, AI workspace, contribution tasks/submissions, member contribution summaries/appeals, admin review, and AI cost/reconciliation views.
- The repository architecture describes an early MVP, not a production-ready service. Live provider billing, payouts, and distributed compute are not enabled by default. AI calls remain gated by server-side provider configuration and budget controls.
- B Runtime remains **PREPARATION ONLY / BLOCKED** because the Factory-wide independent audit/acceptance gate is not complete. Issue #136 remains open but still targets `dce81ed801c41bca9bc364e3d0f248244d88f88f`; its immutable audit baseline is stale after main advanced to `10fabef703ee3865d208196f46ee71ddd1b7e149`. Do not silently retarget it; obtain owner authorization for a new exact-main audit target. Main Actions CI is UNKNOWN / NOT VERIFIED from the available PR-only run query; the Vercel status is a separate failure.
- No B application code, database schema, RLS, workflow, Runner, secret, permission, production data, or deployment changes are made by this report.

## 2. Exact mainline and CI evidence

| Item | Observed value | Disposition |
|---|---|---|
| Default branch | `main` | VERIFIED |
| Main HEAD | `10fabef703ee3865d208196f46ee71ddd1b7e149` | VERIFIED |
| Overall version | `0.3.137` | VERIFIED |
| B version | `0.1.20` | VERIFIED |
| Main CI run | No current main-triggered run ID verified | UNKNOWN / NOT VERIFIED; available PR-only commit workflow query returned no records for this main SHA |
| Main combined status | Vercel `build-rate-limit` failure status | BLOCKED for Preview evidence; not a code-test conclusion or GitHub CI result |
| Main PR-triggered workflow query | No PR-triggered runs returned for this SHA | NOT evidence of scheduler health or CI pass |

`docs/AGENT_HANDOFF.md` still names an older main SHA (`25d5ed51…`) in its latest snapshot. Treat it as stale; this report uses live `main` and files fetched at `10fabef…`.

## 3. Current B implementation inventory

The following items were observed in the repository tree and selected source files at the baseline SHA. They are **source-presence observations**, not end-to-end acceptance.

| Product area | Observed source / capability | Acceptance status |
|---|---|---|
| Account | `app/account/page.tsx`, account summary component, active-role-gated admin navigation | SOURCE PRESENT; focused component tests exist; live auth lifecycle not fully verified |
| Projects | `app/projects/*`, `app/api/projects/*`; create, update, archive/restore and member-scoped listing paths | SOURCE PRESENT; runtime / RLS acceptance not independently confirmed here |
| Workspace | `app/workspace/*`, conversation APIs, pending-AI recovery API | SOURCE PRESENT; provider activation remains gated |
| AI gateway | `app/api/ai/chat/route.ts`, `lib/ai/*`; idempotency, prompt validation, budget claim, bounded provider response and uncertain-outcome handling | SOURCE PRESENT; no live provider/billing acceptance claimed |
| Contribution tasks | `app/contribute/*`, `app/api/contribution/tasks/route.ts` | SOURCE PRESENT; end-to-end contributor journey not confirmed |
| Contribution history / appeals | `app/contributions/*`, summary and appeals APIs | SOURCE PRESENT; independent workflow acceptance not confirmed |
| Admin operations | AI costs, AI reconciliation, contribution review/appeal/task admin routes | SOURCE PRESENT; privileged operational readiness not confirmed |
| Data / RLS | Supabase migrations for identity, projects/conversations, AI budgets/idempotency, contribution review/appeals/reward snapshots, least-privilege grants and policy/index hardening | MIGRATIONS PRESENT; only CI-backed isolated database evidence counts as validation |
| Tests | Focused tests exist for account summary, homepage, AI idempotency/pending recovery, contribution task input validation, and other modules | TEST FILES PRESENT; this report did not execute tests |

### Mainline B-relevant migration inventory

The current tree includes migrations covering initial schema and member-status RLS; atomic AI budget reservations, hard stops, idempotency, rate limits and retention; atomic contribution review and appeal review; immutable reward snapshots; submission/appeal lifecycle hardening; AI completion/reconciliation; single unresolved AI request per member; audited reconciliation resolution; conversation/project ownership and locking; least-privilege grants; foreign-key indexes/policy split; atomic admin task lifecycle; providerless completed replay; single active task submission; active-submission deduplication; and appeal-existence privacy.

A migration filename or source definition is not proof that a production database has applied it. Production database operations are outside this report.

## 4. Product readiness and constraints

- The architecture documents Next.js App Router + TypeScript, Supabase Auth/PostgreSQL/RLS, server-only provider credentials, PostgreSQL RPCs for atomic budget/idempotency/review operations, and append-only cost/reward ledgers.
- AI usage must fail closed when provider configuration, member/platform budget controls, or spend authorization are absent. Provider estimates, provider-reported usage, and invoice amounts must remain distinct.
- Contribution lifecycle is modeled as task publication → submission → human review → acceptance/rejection → appeal/re-review → immutable ledger event → settlement eligibility. AI may assist triage but cannot be sole authority for high-impact reward decisions.
- Payouts, subscriptions, paid marketplace activation, and distributed compute remain gated future phases. Pending rewards are not cash balances and no guaranteed compensation may be implied.
- The product scope lists data export/deletion, backup/restore drills, MFA enforcement, automated reconciliation, streaming/multi-provider routing, and production incident response as remaining pre-launch gaps.

## 5. B backlog and open work observed

| Issue | Title / scope | Status at inspection | Owner / phase note |
|---|---|---|---|
| [#74](https://github.com/X84657465/global-citizen-ai-network/issues/74) | Contribution task category / member submission-status filters | OPEN | PR #416 merged; B-owned type-preservation fix PR #428 remains Draft after exact-head unit-test failure; owner scope confirmation and GPT3 static review are recorded |
| [#84](https://github.com/X84657465/global-citizen-ai-network/issues/84) | Production AI provider adapter and budget-control integration tests | OPEN | B AI; keep live billable calls disabled until gates pass |
| [#86](https://github.com/X84657465/global-citizen-ai-network/issues/86) | End-to-end authentication and account security verification | OPEN | B closed-MVP release gate; signup remains disabled by default |
| [#87](https://github.com/X84657465/global-citizen-ai-network/issues/87) | Recurring AI workspace use cases and paid-pilot economics | OPEN | Phase 2 commercial validation; not a Phase 1 runtime prerequisite to improvise |

This list is a focused B backlog sample, not a claim that no other B-related issues exist.

## 6. A → B dependency and hard blockers

### Factory acceptance

- [Issue #136](https://github.com/X84657465/global-citizen-ai-network/issues/136) remains OPEN, but its immutable audit target is now stale: it still names the prior baseline `dce81ed801c41bca9bc364e3d0f248244d88f88f`, while current main is `10fabef703ee3865d208196f46ee71ddd1b7e149`. Its stop condition requires a fresh owner-authorized audit baseline; do not silently switch the target.
- [Issue #164](https://github.com/X84657465/global-citizen-ai-network/issues/164) is an open P0 Factory task/system circuit-breaker isolation finding (GPT1/Factory owner); [Issue #188](https://github.com/X84657465/global-citizen-ai-network/issues/188) is an open P2 recovery-wiring follow-up explicitly blocked on Issue #136 independent review. Neither is a B-owned implementation task.
- PR #427 is open/Draft; exact-head run [#45061403391](https://github.com/X84657465/global-citizen-ai-network/actions/runs/45061403391) failed with 746 unit tests passed / 1 failed at `tests/agent-factory-controller.test.mjs:1917` (`Missing expected rejection`); typecheck, lint and build were skipped.
- PR #429 is open/Draft and fixes that Factory test fixture. Its exact-head run [#45062245405](https://github.com/X84657465/global-citizen-ai-network/actions/runs/45062245405) passed all 747 unit tests, but TypeScript failed in unchanged `app/contribute/contribution-client.tsx` because the filter return type omits API fields (`acceptance_criteria`, `title`, `description`, `reward_amount`, `reward_currency`, `closes_at`) and callback types. Lint/build and integration gates were skipped.
- PR #428 is the B-owned generic type-preservation fix for Issue #74. Its exact-head run [#45062174946](https://github.com/X84657465/global-citizen-ai-network/actions/runs/45062174946) failed at unit tests (747 passed / 1 failed) on the same Factory fixture at `tests/agent-factory-controller.test.mjs:1917`; typecheck/lint/build and integration gates were skipped. GPT3 static review and B owner scope confirmation are recorded, but this does not make the failed run pass.
- The two narrow fixes expose a cross-PR integration dependency: #428 addresses the TypeScript failure seen on #429, while #429 addresses the unit failure seen on #428. Neither isolated PR has a green complete run. Coordinate a same-head integration candidate with the relevant Factory/B owners; do not merge either by treating the other PR's unmerged changes as present.
- PR #430's own exact-head run [#45062704981](https://github.com/X84657465/global-citizen-ai-network/actions/runs/45062704981) was still in progress at this snapshot (metadata resolver only). Main Actions CI remains UNKNOWN / NOT VERIFIED from the available PR-only workflow query; Vercel `build-rate-limit` is a separate deployment status, not a code-test result.
- [Issue #354](https://github.com/X84657465/global-citizen-ai-network/issues/354) is CLOSED. Do not carry its former lease-handoff defect forward as an open blocker without fresh evidence.
- [PR #259](https://github.com/X84657465/global-citizen-ai-network/pull/259) is an old, divergent, non-mergeable broad candidate. Its historical CI is not evidence for current main; do not merge, force-retarget, or transplant the full diff.

### B charter / North Star availability

- `docs/GCAN_B_LINE_LEAD_CHARTER.md` and `docs/GCAN_PRODUCT_NORTH_STAR.md` are present on main. PR #376 remains an old, diverged candidate; do not merge it wholesale or treat its historical review/CI as current evidence.
- [PR #376](https://github.com/X84657465/global-citizen-ai-network/pull/376) remains open and non-mergeable, based on old main SHA `93e7ac35bfd5b6a9c33ea3508b6b7c2f2b4bbe1`, with head `d10e6dd6d428d9ce35dbd14778e01c628f909742`. Its branch is stale/diverged; retain only as source material for selective owner-reviewed reconciliation.
- Its exact-head review thread still contains an unresolved P2 release-metadata/changelog finding. Reviews observed are COMMENTED, not formal APPROVED.
- CI run [45047970308](https://github.com/X84657465/global-citizen-ai-network/actions/runs/45047970308) completed successfully for earlier SHA `24212ce8f6fb1f95b93996d4f2593751465e5ae8`, not current PR head `d10e6dd6d428d9ce35dbd14778e01c628f909742`. It is not exact-head CI evidence for the current PR head.
- The A→B read-adapter proposal has open design questions recorded in PR #376 review discussion: service-to-service authentication/audience/scope and rotation/revocation; reference lifecycle and anti-enumeration; projection freshness/cache semantics; and closed, versioned failure-code mapping. These are design follow-ups, not proof of a deployed vulnerability or an implemented adapter.

**B Runtime disposition: BLOCKED / PREPARATION ONLY.** Do not activate runtime, paid AI traffic, production migrations, public signup, payout, or distributed compute from this baseline.

## 7. Verification status

| Check | Status | Evidence / limitation |
|---|---|---|
| Repository / main SHA / versions | PASS (metadata only) | Live Git ref and files at exact main SHA |
| B source inventory | DOCUMENTED | Tree and selected source files inspected |
| Focused B test files | PRESENT; NOT RUN in this report | No local test command executed by this report |
| Main exact-SHA CI | UNKNOWN / NOT VERIFIED | No current main-triggered run ID returned by available PR-only workflow query |
| A independent audit | BLOCKED | Issue #136 still targets stale SHA `dce81ed…`; owner-authorized exact-main retarget required |
| B end-to-end auth / live provider / operational readiness | NOT VERIFIED | Issues #84 and #86 remain open; architecture lists pre-launch gaps |
| B Issue #74 follow-up PR #428 | BLOCKED | Exact-head Actions #45062174946 failed at unit tests (747 passed / 1 failed); typecheck/lint/build/integration skipped; GPT3 static review and B scope confirmation recorded |
| PR #376 exact-head CI / formal review | NOT PASS | Run observed is for an older SHA; formal approval not observed |
| Production deployment / production DB | NOT RUN | No deployment or production database action performed |

## 8. Next actions (Factory-first)

1. GPT1 / project owner: obtain explicit authorization to refresh Issue #136's immutable audit target from `dce81ed…` to current main `10fabef703ee3865d208196f46ee71ddd1b7e149`; the independent auditor must re-fetch main before starting.
2. GPT1 / Factory: resolve P0 Issue #164 and dependent Issue #188 only through their owner-approved workflow and independent review.
3. GPT1 / Factory + GPT4 / B: coordinate the cross-PR integration dependency. #429's fixture fix clears the unit regression but its isolated branch fails TypeScript; #428's generic typing fix clears that type contract but its isolated branch still fails the Factory fixture. Validate both together on one exact candidate SHA with all required gates; preserve each owner's path boundaries and do not merge a partial fix.
4. GPT4 / B: keep PR #428 Draft; after the authorized combined candidate is available, re-run unit, typecheck, lint, production build and repository-required integration gates, then obtain GPT3 independent review on that exact SHA.
5. GPT4 / B: continue B-only product preparation; do not start B Runtime while A acceptance and A→B gates remain blocked.
6. GPT4 / B + GPT1: close A→B read-contract authentication, reference lifecycle, freshness and failure-mapping design before adapter implementation.
7. GPT2 / relevant F–P owners: review B security / governance needs within their ownership; GPT3 remains the independent architecture and QA reviewer.
8. After A acceptance, refresh main, B branch, issues, PRs, exact-SHA CI, RLS/Tenant evidence and then propose a B Runtime readiness plan for human approval.

## 9. Evidence boundaries

This report is a documentation snapshot, not a formal security audit, GPT3 acceptance, production readiness certification, legal review, or release authorization. All unknown or unexecuted checks remain UNKNOWN / NOT RUN / PENDING / BLOCKED. The report does not modify application code, workflows, database schema/RLS, secrets, permissions, Runner state, production data, or deployment.
