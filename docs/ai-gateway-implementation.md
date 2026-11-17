# AI Gateway: Budget Enforcement Contract

## Status

This document is an implementation contract, not evidence that runtime spend controls are active. The current application has no provider-backed AI generation route. Keep `platform_ai_controls.ai_enabled = false` and all per-user limits disabled until the gateway and integration tests are complete.

## Required request lifecycle

1. Authenticate the member and derive `owner_id` from the verified session. Never accept an owner ID, role, price, or model cost from the browser.
2. Validate the feature, model allowlist, prompt size, attachment size, and request idempotency key.
3. Create a server-owned `ai_requests` row with status `queued`. The client must never be able to insert or modify this table.
4. Call one database reservation function that atomically locks the global control row, checks the global kill switch, per-request cap, global monthly cap, user enablement, user daily/monthly request limits, user monthly spend cap, and already-active reservations. Reject closed or missing controls by default.
5. Only after reservation succeeds, call the provider from server code. Provider keys and the Supabase service-role key must never enter browser code, logs, or Git.
6. Record provider-reported token usage, provider request ID, latency, retry count, and provider-reported charge where available. Never invent missing usage or invoice values.
7. Finalize the reservation exactly once using an idempotent database operation. Record estimated TWD cost separately from actual invoice cost; do not add both to the same budget total.
8. On provider failure or timeout, mark the request failed and release or reconcile the reservation. A timed-out provider call must not silently leave spend unaccounted.
9. If final actual cost exceeds the reservation, record the variance, trigger a hard-stop/alert threshold, and prevent new requests until reviewed.

## Accounting rules

- All budget comparisons must use one normalized currency (initially TWD) and a documented FX source/rate/time when the provider bills in another currency.
- Separate provider invoice charges from internal allocation estimates. Invoice import reconciliation must not double-count request estimates.
- Reservations count against available budget before a provider call. Completed request costs replace the reservation; they are not added on top of it.
- Retries are separate provider attempts and must be costed, even if the user sees one logical request.
- Every mutation must be idempotent and leave an audit record.

## Fail-closed conditions

Reject the request when the global control row is missing, AI is disabled, a user limit row is missing, a cap is zero, a reservation cannot be created, cost currency cannot be normalized, or the database cannot be reached. Do not fall back to an unmetered provider call.

## Integration test gates

1. Two concurrent requests cannot jointly exceed the global monthly cap.
2. Two concurrent requests for one member cannot exceed that member's monthly cap.
3. Daily and monthly request limits count concurrent requests correctly.
4. A duplicate idempotency key cannot create duplicate reservations or provider calls.
5. Provider timeout, retry, and late response paths reconcile reservations exactly once.
6. A missing control row, missing user limit, database error, or zero cap blocks generation.
7. Browser users cannot call the reservation/finalization functions or write request/cost/ledger rows directly.
8. Usage, estimates, invoice charges, FX conversion, and variances remain separately auditable.