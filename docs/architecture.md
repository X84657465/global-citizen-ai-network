# Architecture

## Proposed MVP stack

- Next.js App Router + TypeScript for the web application.
- PostgreSQL for durable application data.
- A managed authentication/database service may be evaluated for the pilot, but access controls and exportability must be verified before selection.
- Server-only model provider adapters; never expose provider API keys to the browser.
- Background jobs for review queues, usage aggregation, and reconciliation.
- Object storage for user documents, with private access and short-lived signed URLs.
- Deployment provider selected after region, privacy, budget, and backup requirements are compared.

This is a proposed baseline, not a claim that these services are already provisioned.

## Logical components

1. Web UI: AI workspace, projects, contribution center, personal ledger.
2. Application API: authentication, authorization, validation, quotas, business rules.
3. Model gateway: provider routing, prompt templates, timeouts, retries, token usage.
4. Cost ledger: supplier charges, estimated marginal costs, tools, review and infra allocation.
5. Budget guard: platform kill switch, per-request ceiling, per-user daily/monthly quotas, and monthly hard spend cap.
5. Contribution engine: task lifecycle, submissions, quality checks, human review, appeal.
6. Admin console: spend limits, fraud signals, moderation, audit trail.
7. Data layer: PostgreSQL, private object storage, backups.

## AI request lifecycle

1. Authenticate user and verify role, account status, quota, and policy.
2. Read the platform AI kill switch and per-user budget policy; reject by default when disabled.
3. Estimate maximum request cost and reserve budget where supported.
4. Reject or downgrade requests that exceed per-user or platform budget limits.
5. Call a server-side provider adapter with timeout and bounded retries.
6. Capture provider-reported usage, model identifier, request ID, and invoice data when available.
7. Write request and cost events; distinguish actual provider bill from internal estimate.
8. Return response and show usage status to the user.
9. Reconcile provider invoices against request-level estimates periodically.

If exact supplier cost is not available per request, store the allocation method and mark it estimated. Never label estimates as invoices.

## Contribution lifecycle

Draft task → published task → submission → automated checks → human review/sample audit → accepted or rejected → appeal/re-review → ledger event → settlement eligibility.

An AI evaluator can assist triage but cannot be the sole authority for high-impact reward decisions.

## Trust boundaries

- Browser clients are untrusted.
- User-uploaded documents and retrieved web content are untrusted inputs.
- Model outputs are untrusted until validated.
- Contribution submissions and volunteer node outputs are untrusted until verified.
- Admin and service credentials are privileged secrets.

## Deployment principle

Start with a single-region, small, observable deployment. Add queues, replicas, and regional infrastructure only when measured demand justifies them. Do not build a global microservice architecture before there is a product-market signal.