# AI Gateway: Budget Enforcement Contract

## Current implementation status

The authenticated provider-backed chat route is implemented at `app/api/ai/chat/route.ts`. It remains fail-closed unless the provider configuration, global AI control, member limits, and Supabase server credentials are explicitly configured.

The current implementation includes:

- Authenticated ownership checks and server-side provider credentials.
- Bounded request parsing and a 16,000-character conversation-history ceiling.
- Atomic idempotency claim and database budget reservation before provider access.
- A 1 MiB provider-response body limit and strict response/usage validation.
- Provider calls reject HTTP redirects so a configured endpoint cannot silently forward a billable request to an unexpected destination.
- Conservative character-based token fallback when provider usage is absent or partial.
- Atomic database completion of reservation settlement, assistant-message persistence, internal cost-ledger insertion, and idempotency response.
- Atomic known-failure release.
- Unknown provider outcomes remain reserved and visible to the administrator stale-request report; the system does not automatically retry them.
- If the computed estimate exceeds the reserved amount, the global AI hard stop is activated. If a member's committed monthly estimate exceeds their member ceiling, that member's AI access is disabled.

This document is an implementation contract, not evidence that production provider credentials or live billing are active. The default global AI control and per-member limits remain disabled/zero.

## Required request lifecycle

1. Authenticate the member and derive `owner_id` from the verified session. Never accept an owner ID, role, price, or model cost from the browser.
2. Validate the conversation, content size, and request idempotency key.
3. Atomically claim the idempotency key and reserve the maximum request budget before contacting a provider.
4. Mark the request as running and persist the user message only after the conservative preflight estimate fits the reservation.
5. Call the configured provider from server code. Provider keys and the Supabase service-role key must never enter browser code, logs, or Git.
6. Read the provider response through a bounded stream. Reject malformed JSON, unsupported content shapes, invalid token counts, excessive token counts, and oversized answers.
7. Use provider-reported token usage when valid. When usage is absent or partial, use the documented conservative character fallback and label the estimate accordingly.
8. Complete the request in one database transaction: settle the reservation, update the request's internal estimate and cost method, persist the assistant message, insert the internal-estimate ledger row, and save the idempotency replay response.
9. Release budget only for a known pre-provider failure or a provider rejection response that is not an ambiguous server/timeout outcome.
10. On timeout, transport failure, malformed successful response, oversized response, provider 5xx, or a failed post-provider database commit, keep the reservation and mark the request for administrator reconciliation. Never silently release a potentially billable request or automatically call the provider again with a new key.

## Accounting rules

- All budget comparisons use one normalized currency (initially TWD).
- The AI chat route records token-rate calculations as `internal_estimate`; it does not claim that these are provider invoices.
- Provider-reported charges, when later supplied by an integration, belong in the separate provider-billed fields and must not be added to the same budget total as internal estimates.
- Provider/model cost dashboard totals must come from linked `ai_cost_ledger` rows marked `internal_estimate`. A successful legacy request without such a row is counted separately; never present its reservation ceiling as an estimated cost.
- Invoice imports remain the source of verified supplier invoice totals. Do not infer invoice amounts from token usage.
- Reservations count against available budget before a provider call. Successful completion replaces the reservation with the computed internal estimate.
- Retries with the same idempotency key replay the completed response. A processing or reconciliation-pending request must not trigger a second provider call. The workspace retains uncertain request keys in session storage across reloads and only clears them when the server confirms a known failure or a completed response.
- Every financial mutation must be idempotent and leave an auditable database record.

## Fail-closed conditions

Reject or defer the request when the global control row is missing, AI is disabled, a member limit row is missing, a cap is zero, a reservation cannot be created, the database cannot be reached, the provider response is malformed, or a provider outcome cannot be safely classified.

Do not fall back to an unmetered provider call. Do not release a reservation when the provider may already have generated a billable response.


## Administrator reconciliation queue

The admin AI cost center includes a read-only queue at `/admin/ai-costs`. Its server endpoint, `/api/admin/ai-reconciliation`, verifies the authenticated user's active admin profile before using the server-only service-role client to call `list_stale_ai_requests`.

The database report returns at most the 100 oldest requests that remain queued/running with a reserved budget and are older than the configured threshold (15 minutes in the admin endpoint). The list is informational only: it does not retry a provider call, release a reservation, settle a charge, or alter request state. Operators must verify the provider-side outcome before any future manual resolution workflow is introduced.

The endpoint uses no-store response headers and returns a generic service error rather than exposing database error details. The underlying report RPC is executable only by `service_role`; the API's separate active-admin check is mandatory because service-role access bypasses row-level security.

## Provider-specific reconciliation limitation

An OpenAI-compatible URL does not guarantee a common request-status, idempotency, or invoice API. Until the production provider is selected and its adapter is implemented, the gateway deliberately does not claim automatic reconciliation of ambiguous provider outcomes. It retains the reservation, preserves the original idempotency key, and exposes the stale request for administrator review. Do not release or settle an ambiguous request based only on a client timeout.

## Integration test gates

Completed in the current repository test suite:

1. Atomic AI completion stores one assistant message, one internal-estimate ledger row, a settled reservation, and a replayable idempotency response.
2. Replaying atomic completion does not duplicate messages or cost rows.
3. Known provider failures atomically release reservations and fail the request/idempotency state.
4. Unknown provider outcomes retain the reservation and appear in the administrator stale-request report.
5. Provider response size, JSON structure, content shape, token count, and cached-token consistency have unit tests.

Still required before production provider activation:

1. Concurrent requests cannot jointly exceed global or member monthly spend caps.
2. Concurrent daily/monthly request-limit behavior is verified under load.
3. Real provider timeout/late-response behavior and provider-specific idempotency semantics are tested.
4. Invoice import reconciliation, FX normalization, and request-to-invoice matching are implemented and verified.
5. A production Supabase environment has applied all migrations through `0013`, and the production secrets/limits have been reviewed.
6. Independent security review and end-to-end authenticated UI tests are complete.

## Migration order

Apply migrations in numeric order: `0001` through `0013`. Migration `0012_atomic_ai_chat_completion_and_reconciliation.sql` adds atomic completion and reconciliation safeguards. Migration `0013_bound_ai_reconciliation_queue.sql` caps the read-only operator queue at 100 oldest records. Both are additive and leave earlier deployed migration files unchanged.
