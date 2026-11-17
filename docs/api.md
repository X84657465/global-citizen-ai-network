# Application API

All private data endpoints require a valid Supabase session. Ordinary member routes use the signed-in user's session and RLS. Privileged AI and contribution operations use a server-only service-role client only after server-side identity and role checks. The service-role key is never exposed to the browser.

## Health

- GET /api/health: reports application status and whether integration variables are present. It does not test credentials or connectivity.

## Authentication

- POST /api/auth/signup: server-gated email registration. Disabled unless ENABLE_PUBLIC_SIGNUP=true; Supabase dashboard sign-ups must also be enabled intentionally.
- GET /auth/callback: verifies email confirmation code and creates the session.
- POST /auth/signout: clears the current session.
- GET /account: server-verified private member profile.

## AI chat

- POST /api/ai/chat: authenticated chat request. It remains disabled unless a complete server-side OpenAI-compatible provider configuration and active platform/member budget controls are supplied.
- Required header: Idempotency-Key, 8–128 characters using letters, digits, dot, underscore, colon, or hyphen. Generate one key per logical user action and reuse it for all retries of that action.
- Body: { "conversationId": "<uuid>", "content": "..." }; maximum body size 32 KiB and content length 1–8,000 characters.
- The server hashes the conversation ID and content. Reusing a key with a different payload returns 409; clients must restore the original payload and reuse the original key.
- New logical requests are limited to 10 per fixed minute and 60 per fixed hour per member. Duplicate retries do not consume additional rate quota.
- Only one unresolved billable AI request is allowed per member across all conversations. A second new request is rejected before reservation/provider call until the original request is safely completed, failed, or manually reconciled.
- A completed request replays its cached response for 24 hours without another provider call or budget reservation. A request still processing or awaiting reconciliation returns 409 with Retry-After where applicable.
- GET /api/ai/pending: authenticated member-only recovery endpoint. It returns only that member's oldest unresolved request, original conversation ID, original message content, and idempotency key; response is no-store. This restores retry capability after a tab/browser session is lost. The key is returned only after session authentication and owner-scoped database queries, and must never be logged or exposed to another member.
- The workspace also caches pending keys in session storage for the active tab. The server recovery endpoint is authoritative across tabs and browser restarts. Do not generate a new key merely because a response timed out.
- Provider calls have no automatic retry, redirects are rejected, response bodies are capped at 1 MiB, and the timeout is bounded by server configuration (maximum 60 seconds).
- Known failures release the reservation. Uncertain outcomes—including timeout, transport failure, provider 408/5xx, malformed successful response, and post-provider database finalization failure—retain the reservation and idempotency state for manual reconciliation. The route returns retryWithSameKey: true for cases where the original key must be preserved.
- Costs returned by the gateway are configured internal estimates, not verified supplier invoice amounts. Missing usage values may use a conservative character-count fallback and are labeled in the calculation method.

## Admin AI reconciliation

- GET /api/admin/ai-reconciliation: active-admin-only, read-only report of up to 100 oldest queued/running requests with reserved budgets older than 15 minutes.
- The response includes request, owner, provider/model, reservation, idempotency, and available provider request ID fields. It uses Cache-Control: no-store.
- This endpoint does not retry provider requests, settle budgets, release reservations, or prove that a provider charged the request. Operators must verify provider logs and billing evidence before any manual action.

## Admin AI costs

- GET /api/admin/ai-costs: active-admin-only cost transparency data.
- Returns bounded recent windows: up to 500 cost-ledger rows, 500 AI request rows, and 100 invoice imports.
- Separates internal estimates, allocations, provider-reported usage amounts, and imported invoice totals by currency. It does not treat the reservation ceiling as actual cost.

## Projects

- GET /api/projects: list up to 100 projects owned by the current member.
- POST /api/projects: create a project. JSON request bodies are streamed with a 32 KiB hard byte limit.
- PATCH /api/projects/:id: update title and/or description for an owned project; JSON body limit is 32 KiB.
- DELETE /api/projects/:id: delete an owned project.

## Conversations and messages

- GET /api/conversations: list up to 100 conversations owned by the current member.
- POST /api/conversations: create a conversation; optional project_id must belong to the current member. JSON body limit is 32 KiB.
- GET /api/conversations/:id/messages: read up to 500 messages in an owned conversation.
- POST /api/conversations/:id/messages: append a user message (1–20,000 characters; JSON body limit is 96 KiB).
- Clients cannot submit assistant or system messages. Those roles are reserved for trusted server-side AI orchestration.

## Contribution

- GET/POST /api/contribution/tasks: list published tasks and submit member work.
- GET /api/contribution/summary: member-scoped read-only contribution and reward summary.
- GET/POST /api/contribution/appeals: submit and inspect appeals for the signed-in member's own rejected submissions.
- GET/POST /api/admin/contribution/reviews: active reviewer/admin review queue and idempotent review action.
- GET/POST /api/admin/contribution/appeals: active reviewer/admin appeal queue and idempotent appeal decision.
- GET/POST /api/admin/contribution/tasks: admin-only task authoring and lifecycle operations.

## Error behavior

- 400: invalid input, missing idempotency key, or rejected write.
- 401: session missing or invalid.
- 403: authenticated user lacks the required active role.
- 404: requested project or conversation not found for the current member.
- 409: idempotency key reused with a different payload, original request still processing, or lifecycle conflict.
- 413: request body exceeds its route-specific byte limit or preflight cost exceeds the configured per-request reservation.
- 429: budget or usage quota rejected the request.
- 502: provider rejection or uncertain provider outcome. Inspect retryWithSameKey; never blindly create a new key.
- 503: required backend configuration is missing or request state/finalization cannot be safely confirmed.
- 500: read failure; response does not expose database diagnostics.

Private data responses use Cache-Control: no-store. JSON request bodies are read from the request stream and stopped once the configured byte ceiling is exceeded, including when Content-Length is absent.

## Database operational functions

- cleanup_expired_ai_operational_records(): removes expired completed/failed idempotency mappings and rate-limit windows older than 48 hours. It does not delete financial or AI request records.
- list_stale_ai_requests(p_older_than_seconds): service-role-only, read-only operator report. Default 900 seconds; accepted range 300–86,400; migration 0013 caps output at the 100 oldest records.
- A stale request is not proof of provider failure. Never auto-retry it or release its reservation solely because it is old.
- Cleanup is not scheduled by migrations. Enable Supabase Cron intentionally only after a project exists and manual execution has been verified.
