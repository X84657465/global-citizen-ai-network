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
2. The `/api/ai/chat` route authenticates the member, verifies conversation ownership, checks server-only provider configuration, and bounds request size/history.
3. Call the service-role-only `reserve_ai_budget` database function; it locks the global control row, checks the AI enable switch, active member status, per-request cap, platform monthly cap, member daily/monthly request quotas, and member monthly spend cap.
4. The reservation and `ai_requests` row are inserted atomically. Reject by default when any control or member limit is missing, disabled, zero, or exceeded.
5. Apply a conservative prompt-size cost preflight, then call the OpenAI-compatible endpoint server-side with a hard timeout and no automatic retries.
6. Capture provider usage and request ID when available. If usage is missing, use a conservative character-count fallback and label the result as an internal estimate.
7. Call `finalize_ai_budget` to record normalized TWD cost, or `release_ai_budget` for a failed request. Provider invoice amounts remain null until verified supplier billing data is imported. Actual charges above the estimate must still be recorded and surfaced as an overrun; never discard a real charge.
8. Append an `ai_cost_ledger` internal-estimate entry and save the assistant response.
9. Return the response with explicit cost-estimate labeling. Reconcile provider invoices against request-level estimates periodically.

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

## Implemented gateway scaffold

- `POST /api/ai/chat` requires an authenticated member and a conversation owned by that member.
- The route is disabled unless `AI_PROVIDER=openai-compatible`, HTTPS (or localhost) `AI_BASE_URL`, server-only API key, model, TWD per-million-token rates, and a positive per-request reservation are configured.
- The route reserves budget before calling the provider, uses a 32 KiB JSON limit, caps history to 16,000 characters, applies a conservative character-count preflight, limits output to 1,200 tokens, and enforces a timeout.
- No automatic provider retries are performed. Failed calls release the reservation. Successful calls settle the budget, append an internal-estimate cost-ledger entry, and save the assistant message.
- Provider invoice amount is intentionally left null; configured token rates are internal estimates, not verified invoice charges.
- The service-role key is accessed only by a server-only module and is never returned to the client.
- This route is an initial single-provider adapter, not yet a production-grade multi-provider router. Idempotency, rate limiting, streaming, provider-specific token accounting, and PostgreSQL integration tests remain required before public launch.
