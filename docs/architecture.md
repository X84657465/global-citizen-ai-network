# Architecture

## MVP stack

- Next.js App Router and TypeScript for the web application.
- Supabase Auth and PostgreSQL for identity, durable data, and row-level security.
- Server-only model provider adapter; provider credentials and the Supabase service-role key never reach the browser.
- PostgreSQL RPCs for atomic budget reservation, idempotency, settlement, and contribution review.
- Background jobs and external provider reconciliation remain intentionally deferred until an operator process and evidence source are available.

The repository is an early MVP and is not production-ready. No live provider billing, payout, or distributed compute node is enabled by default.

## Logical components

1. Web UI: AI workspace, projects, contribution center, personal ledger.
2. Application API: authentication, authorization, validation, quotas, and business rules.
3. Model gateway: provider request validation, bounded response parsing, timeout, and idempotent request lifecycle.
4. Cost ledger: provider-reported usage, internal estimates, imported invoices, and allocations kept distinct.
5. Budget guard: platform kill switch, per-request ceiling, per-user quotas, and monthly hard spend cap.
6. Contribution engine: task lifecycle, immutable reward snapshots, submissions, human review, and appeals.
7. Admin console: cost transparency, stale-request review, and audit trail.
8. Data layer: PostgreSQL, RLS, and append-only financial ledgers.

## AI request lifecycle

1. Authenticate the member and verify ownership of the target conversation.
2. Validate the server-only OpenAI-compatible provider configuration, request body, and Idempotency-Key.
3. Call the service-role-only claim_ai_request RPC. PostgreSQL serializes same-member/same-key claims, compares the payload hash, applies rate limits, and reserves the maximum request budget before any provider call.
4. Reject by default when platform controls, member limits, account status, or budget reservation do not permit the request.
5. Apply a conservative prompt-cost preflight. The current route accepts up to 8,000 characters of new content, reads at most 20 history messages / 16,000 history characters, caps the JSON body at 32 KiB, and requests at most 1,200 output tokens.
6. Send one server-side provider request with no automatic retry, redirect following disabled, and a bounded timeout. Provider response bodies are capped at 1 MiB and validated before usage or answer content is trusted.
7. On a known pre-provider or provider rejection, fail_ai_chat_request atomically releases the reservation and marks the idempotency record failed.
8. On a validated success, complete_ai_chat_request atomically settles the reservation, stores the assistant message, appends an internal_estimate cost-ledger row, and caches the idempotent response. A replay of the same committed response is safe.
9. If the provider outcome is uncertain—timeout, transport failure, provider 408/5xx, malformed success response, or database finalization failure—the route does not retry the provider or release the reservation. It preserves the idempotency state and marks the request for operator reconciliation.
10. The admin reconciliation endpoint reports up to the 100 oldest queued/running requests with reserved budgets older than 15 minutes. It is read-only: it never retries, settles, or releases a request. Operators must verify provider logs and billing evidence before any manual resolution.

Provider usage, configured token-rate estimates, provider-reported billed usage, and imported invoices are different accounting facts. The dashboard labels them separately and does not claim an internal estimate is an invoice. If usage fields are absent, conservative character-count fallbacks are explicitly recorded in the calculation method.

## Budget and concurrency controls

- reserve_ai_budget and settlement functions lock the platform control row to serialize global budget decisions.
- New logical requests consume fixed-window limits of 10 per minute and 60 per hour per member; safe same-key retries do not consume additional quota. A database advisory lock serializes claims per member, and only one unresolved reserved/processing request is allowed across all of that member's conversations.
- The reservation ceiling counts against both platform and member monthly spend limits until settlement or release.
- A hard-stop condition disables further AI generation after a configured monthly cap is exceeded or actual estimated cost exceeds the reservation.
- Missing, disabled, or zero-valued budget controls fail closed.

## Contribution lifecycle

Draft task → published task → submission → human review → accepted or rejected → appeal/re-review → immutable contribution/reward ledger event → settlement eligibility.

Reward amount and currency are snapshotted when a submission is created. Legacy submissions are marked as estimates because their original task price cannot be reconstructed reliably. An AI evaluator may assist triage but cannot be the sole authority for high-impact reward decisions.

## Trust boundaries

- Browser clients, user-uploaded documents, retrieved pages, and model outputs are untrusted.
- Admin and service credentials are privileged secrets.
- Service-role database calls must be preceded by server-side identity and role checks.
- RLS remains the member-data boundary; privileged RPCs re-check ownership and state transitions.

## Deployment principle

Start with a single-region, observable deployment. Add queues, replicas, and regional infrastructure only when measured demand justifies them. Do not build a global microservice or distributed-compute network before product-market signal and independent security review.

## Known pre-launch gaps

- No production provider is configured or billing-enabled by this repository.
- The stale-request queue is a report, not a provider-specific reconciliation adapter.
- Automated reconciliation, scheduled retention, data export/deletion workflows, backup/restore drills, MFA enforcement, and independent security review remain release gates.
- Streaming, multi-provider routing, and a production incident-response process are not implemented.
