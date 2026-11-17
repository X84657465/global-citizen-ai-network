# AI Gateway: Budget Enforcement and Recovery Contract

## Status

The repository contains a server-side OpenAI-compatible gateway and database-enforced budget/idempotency workflow, but it is not production-ready. No provider is configured by default. Keep platform AI controls disabled until a real Supabase project, provider adapter, billing limits, and operational procedures have been configured and tested.

## Required request lifecycle

1. Authenticate the member and derive owner_id from the verified session. Never accept an owner ID, role, price, or model cost from the browser.
2. Validate request content, conversation ownership, provider configuration, and the idempotency key.
3. Claim the logical request through the service-role-only database RPC. PostgreSQL serializes claims per member across all conversations, compares the payload hash, blocks a second new request while an earlier reservation is unresolved, enforces fixed-window quotas, and reserves the maximum budget before any provider call.
4. Reject closed or missing controls by default. Do not fall back to an unmetered provider call.
5. Call the provider once from server code with a bounded timeout, no automatic retry, and redirect following disabled. Provider credentials and the Supabase service-role key must never enter browser code, logs, or Git.
6. Bound provider response reads and validate the response shape, answer, token usage, and request identifiers before accepting it.
7. On validated success, atomically settle the reservation, save the assistant message, write an internal-estimate ledger row, and complete the idempotency response in one transaction.
8. On a known failure, atomically release the reservation and mark the request failed.
9. On an uncertain provider outcome—timeout, transport failure, provider 408/5xx, malformed success response, or database finalization failure—do not retry the provider and do not release the reservation. Preserve the same idempotency key and make the request visible for operator reconciliation.
10. The authenticated member recovery endpoint can restore the original conversation, payload, and idempotency key after a tab/browser session is lost. It returns only the caller's own oldest unresolved request and uses no-store responses; the key must never be logged.
11. The admin reconciliation queue is read-only and bounded. It does not prove whether the provider billed the request and does not automatically retry, settle, or release anything. Operators must verify provider request logs and billing evidence before manual resolution.

## Accounting rules

- All budget comparisons use normalized TWD and a documented conversion method when needed.
- Separate provider invoice charges, provider-reported usage, internal estimates, and cost allocations. Never label an estimate as an invoice.
- Reservations count against available budget before a provider call. On completion, the actual normalized estimate replaces the reservation; it is not added on top of it.
- A provider charge above the reservation is recorded and triggers the configured hard-stop logic; it cannot be retroactively prevented.
- A retry of the same logical action must reuse the original key and payload. A new key represents a new billable action.
- Every mutation must be idempotent and leave an audit record.

## Fail-closed conditions

Reject the request when the global control row is missing, AI is disabled, a user limit row is missing, a cap is zero, a reservation cannot be created, cost cannot be normalized, or the database cannot be reached. Do not call the provider if reservation state is not confirmed.

## Integration and release test gates

1. Concurrent requests cannot jointly exceed global or per-member spend caps.
2. Daily and monthly request limits count concurrent logical requests correctly.
3. A duplicate idempotency key cannot create duplicate reservations or provider calls.
4. A different payload under an existing key is rejected without changing the original pending request.
5. Provider timeout, 408/5xx, malformed success, transport failure, and post-provider database failure preserve the reservation for reconciliation.
6. A known pre-provider or provider rejection releases the reservation exactly once.
7. A successful completion atomically persists the assistant message, cost ledger entry, settlement, and replay response.
8. A lost HTTP response after committed completion can be replayed without another provider call.
9. A missing control row, missing user limit, database error, or zero cap blocks generation.
10. Browser users cannot call privileged reservation/finalization/reconciliation functions or write request/cost/ledger rows directly.
11. Provider usage, internal estimates, invoice charges, FX conversion, and variances remain separately auditable.
12. Admin reconciliation access is role-checked, read-only, bounded, and returns no-store responses.

## Operational gaps

Provider-specific request lookup, invoice import automation, scheduled retention, incident response, and independent security review remain pre-launch requirements. The current stale-request report is a manual triage queue, not automatic reconciliation.
