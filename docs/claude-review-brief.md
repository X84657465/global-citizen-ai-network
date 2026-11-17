# Independent Claude Review Brief — Global Citizen AI Network

Repository: \`X84657465/global-citizen-ai-network\`
Branch: \`main\`
Review date: 2026-11-17

## Your role

Act as an independent senior application-security engineer and PostgreSQL/Supabase reviewer. Do not make direct commits or modify files. Return findings with severity, exact file/line, exploit or failure scenario, and a minimal remediation. Do not assume that a passing CI proves the design is safe.

## Product constraints

- This is a global citizen AI and contribution platform, not a speculative token or gambling product.
- No real Supabase production project, provider key, payment processor, public deployment, or cash payout is currently enabled.
- AI provider calls must fail closed until keys, explicit budget limits, and runtime controls are configured.
- Rewards are ledger entries only; pending/confirmed balances are not cash and there is no withdrawal workflow.
- Never introduce silent device compute, automatic resource sharing, or guaranteed returns.

## Highest-priority review scope

1. \`supabase/migrations/0001_initial_schema.sql\` through \`0009_atomic_appeal_review.sql\`
2. \`supabase/tests/database_security.test.sql\`
3. \`app/api/admin/contribution/reviews/route.ts\`
4. \`app/api/admin/contribution/appeals/route.ts\`
5. \`app/api/admin/contribution/tasks/route.ts\`
6. \`app/api/contribution/tasks/route.ts\`
7. \`app/api/contribution/appeals/route.ts\`
8. \`app/api/contribution/summary/route.ts\`
9. \`app/admin/contributions/review-client.tsx\`
10. \`app/admin/appeals/appeal-review-client.tsx\`
11. \`app/admin/contribution-tasks/tasks-client.tsx\`
12. \`app/workspace/workspace-client.tsx\` and \`app/api/ai/chat/route.ts\`

## Specific questions

### Database and RLS
- Are all SECURITY DEFINER functions pinned to an empty search_path, schema-qualified, and executable only by the intended role?
- Can a normal authenticated member create, update, delete, or infer another member's tasks, submissions, appeals, reward rows, or audit records?
- Do FK cascades conflict with append-only ledgers or audit retention?
- Can task status/deadline change between API validation and submission, and is the database the final authority?
- Does appeal adjudication correctly lock all relevant rows and prevent two reviewers racing?
- Can a reward be accrued twice across original acceptance and appeal overturn, or via retries using a different idempotency key?
- Is the reward amount snapshotted at submission/review, or can an admin edit task reward before approval and change the contributor's promised amount?
- Can an appeal be created twice or after task/submission state changes through direct Supabase access?

### API and browser security
- Check authentication, authorization, CSRF assumptions, request-size limits, schema validation, rate limits, cache headers, PII exposure, and error leakage.
- Verify all admin/reviewer APIs derive actor identity from the authenticated session, never from request JSON.
- Check that service-role credentials never reach client bundles.
- Check idempotency key reuse, key scope, payload-hash consistency, and retry behavior after provider success / DB failure.
- Check task creation/publishing lifecycle and whether task rewards are financially authorized before publication.

### AI gateway and accounting
- Check preflight estimates, global/member caps, concurrency races, provider timeouts, usage accounting, retries, failure reconciliation, and cost currency normalization.
- Clearly distinguish configured internal estimates from provider invoices.
- Check whether stale reservations or idempotency rows can become permanently stuck or leak response text.
- Verify global AI kill switch and signup defaults remain fail-closed.

### Tests and delivery
- Identify missing adversarial tests and propose concrete pgTAP / API test cases.
- Check dependency audit and build pipeline reproducibility; no lockfile currently means dependency resolution may drift.
- Do not claim deployment or live provider integration.

## Required output format

1. Executive verdict (blocker / high / medium / low).
2. Findings sorted by severity; each with file, lines, impact, reproducible scenario, remediation.
3. Missing tests, with suggested SQL/API test assertions.
4. Positive controls that should not be weakened.
5. A short prioritized remediation plan.

If no findings exist in a category, say so explicitly. Do not invent vulnerabilities or infer production configuration that is not in the repository.
