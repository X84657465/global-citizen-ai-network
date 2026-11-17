# Data Model and Transparent Cost Ledger

## Core entities

- users, profiles, roles
- projects, conversations, messages
- documents, document_access_events
- ai_requests, ai_usage_events
- ai_cost_ledger, provider_invoice_imports
- contribution_tasks, task_submissions, task_reviews, task_appeals
- contribution_ledger, reward_ledger
- subscriptions, payments, refunds (only when payment integration is approved)
- security_events, audit_logs

## AI request record

Required or conditionally required fields:

- request_id (unique, non-secret)
- user_id (pseudonymous identifier in analytics)
- provider and model/version
- requested feature and project ID where applicable
- input_tokens, output_tokens, cached_tokens, tool_calls
- provider_request_id
- provider_billed_cost and currency, only when supported by invoice/usage evidence
- estimated_internal_cost and calculation_method
- started_at, completed_at, latency_ms, status, retry_count
- failure category and safe diagnostic metadata

Never infer exact token counts or actual provider invoice charges when the provider did not report them.

## Default AI budget controls

The initial schema includes a platform-wide AI kill switch and per-user limits. Both default to disabled with zero spend/request caps. Trusted server-side operations must explicitly enable them only after provider billing alerts, quota enforcement, and reconciliation are tested. Client users can read their own limit record but cannot change it.

## Cost categories

Keep these categories separate:

1. Direct AI/model provider charges
2. Search, retrieval, tools, and external service charges
3. Human review and quality assurance
4. Compute nodes, storage, bandwidth, and backups
5. Payment processing, refunds, and chargebacks
6. Security, maintenance, customer support, legal, administration, and marketing
7. Contributor rewards and actual payouts

## Accounting formulas

- Service contribution margin = service revenue − attributable direct service costs.
- User gross margin = revenue attributable to a user − attributable service costs.
- Platform operating result = total recognized revenue − all operating expenses.
- Distributable surplus = actual legally distributable surplus after reserves, liabilities, tax, and governance approval; not a forecast or promise.

## Append-only ledger

Use event records rather than mutable balances. A correction creates a reversal or adjustment event referencing the original event. Preserve actor, reason, timestamp, and evidence. A displayed balance is a projection of ledger events, not the authoritative record.

Suggested ledger fields: id, account_type, owner_id, event_type, amount, currency, status, source_type, source_id, idempotency_key, occurred_at, recorded_at, actor_id, reversal_of, metadata.

## Reconciliation

- Import provider invoices/usage exports.
- Reconcile billed totals against request-level allocations by provider, model, and billing period.
- Flag unexplained differences.
- Mark missing per-request charges as estimated allocations, not actual invoice amounts.
- Preserve invoice source, import time, and reconciliation status.

## Transparency views

User view:
- Their usage, model/provider where disclosed, quota, estimated or billed usage, projects, contribution reviews, reward events, and payout status.

Contributor view:
- Task rules, submitted evidence, review decision, reviewer notes, appeal status, reward calculation, and settlement status.

Public aggregate view:
- Revenue, AI/provider cost, infrastructure/operations, human review, contributor rewards, actual payouts, reserves, and operating result.
- Aggregate only; suppress small groups or sensitive segments to prevent re-identification.

## Anti-abuse and financial controls

- Rate limits and quotas at user, IP, feature, and global levels.
- Idempotency keys for payments, submissions, and ledger events.
- Duplicate/farming detection and reviewer conflict checks.
- Retry ceilings and cost anomaly alerts.
- Pause or degrade expensive features automatically when limits are hit.
- No arbitrary reversal of legitimately earned rewards; disputes require evidence and an appeal path.