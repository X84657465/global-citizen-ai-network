# AI Uncertain-Outcome Reconciliation Runbook

## Purpose

Use this runbook when an AI request is listed by `GET /api/admin/ai-reconciliation`. A listed request has an unresolved provider outcome and a budget reservation that is intentionally still held.

The queue is read-only. It does not prove that the provider billed the request, and the application currently has no admin action that settles or releases an uncertain reservation. Do not make direct production database edits to force a resolution.

## Triage procedure

1. Open the reconciliation queue using an authenticated active-admin account.
2. Record the request ID, owner ID, provider, model, creation time, reserved amount, and provider request ID if one exists.
3. Use the configured provider's official request logs to search by provider request ID. If the provider did not return an ID, narrow the search by timestamp, model, account/project, and usage metadata.
4. Compare the provider request log with the provider's billing/usage export. A successful HTTP response, timeout, 5xx, or missing application response is not by itself proof of whether the provider charged the request.
5. Classify the evidence:
   - **Confirmed billed:** preserve the evidence and route the request to the finance/operator owner for a verified invoice/usage reconciliation.
   - **Confirmed not accepted / not billed:** preserve the provider evidence and route for an approved reservation-release procedure.
   - **Inconclusive:** leave the reservation and idempotency lock untouched. Escalate to the provider and keep new AI requests blocked for that member.
6. Record who reviewed the evidence, when, the provider evidence reference, the classification, and any approved financial adjustment in the organization's incident/audit process.

## Prohibited actions

- Do not automatically retry the provider call.
- Do not release a reservation because it is old or because a timeout occurred.
- Do not settle an estimate as an invoice.
- Do not change request, reservation, or idempotency rows directly in production.
- Do not expose the member's idempotency key in admin logs, screenshots, tickets, or analytics.

## Member experience

The member recovery endpoint restores only their own unresolved request's conversation, original message, and idempotency key after a browser session is lost. Reusing that key checks the same logical request; it does not initiate a second provider call. The member must wait for an approved reconciliation outcome before creating another billable request.

## Required work before production launch

Implement and test a privileged, audited resolution workflow with explicit evidence fields and separate outcomes for confirmed billed, confirmed not billed, and inconclusive. The workflow must be idempotent, enforce active-admin authorization, preserve the original evidence, update budget and request state atomically, and never call the provider again. Until that workflow exists, keep AI disabled for production members or operate only under a documented manual incident procedure approved by the service owner.
