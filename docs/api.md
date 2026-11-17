# Application API

All data endpoints require a valid Supabase session. Ordinary member routes use the publishable key with the signed-in user's cookie session; row-level security remains the database authorization boundary. The AI gateway additionally uses a server-only service-role client for budget and idempotency RPCs. The service-role key is never exposed to the browser.

## Health

- `GET /api/health`: reports application status and whether integration variables are present. It does not test credentials or connectivity.

## Authentication

- `POST /api/auth/signup`: server-gated email registration. Disabled unless `ENABLE_PUBLIC_SIGNUP=true`; Supabase dashboard sign-ups must also be enabled intentionally.
- `GET /auth/callback`: verifies email confirmation code and creates the session.
- `POST /auth/signout`: clears the current session.
- `GET /account`: server-verified private member profile.

## AI chat

- `POST /api/ai/chat`: authenticated chat request, currently disabled unless a complete server-side AI provider configuration and active budget controls are supplied.
- Required header: `Idempotency-Key`, 8–128 characters using letters, digits, dot, underscore, colon or hyphen. Generate one key per logical user action and reuse the same key for transport retries.
- Body: `{ "conversationId": "<uuid>", "content": "..." }`; maximum body size 32 KiB and content length 1–8,000 characters.
- The server hashes the conversation ID and content. Reusing a key with a different payload returns `409`.
- New logical requests are limited to 10 per fixed minute and 60 per fixed hour per member. Duplicate retries do not consume additional rate quota. These are conservative MVP defaults.
- A completed request replays its cached response for 24 hours without another provider call or budget reservation. A request still processing returns `409` with `Retry-After`; a failed request remains failed for the replay window and is not automatically re-executed.
- Clients must not generate a new key merely because a response timed out. First retry with the same key. If the result remains uncertain after the replay window, contact support rather than blindly submitting a new paid request.
- Cached response JSON is stored server-side for 24 hours to support safe replay. It is inaccessible to anon/authenticated database roles. A production retention job and privacy review are still required before launch.
- Costs returned by the gateway are configured internal estimates, not verified supplier invoice amounts.

## Projects

- `GET /api/projects`: list up to 100 projects owned by the current member.
- `POST /api/projects`: create a project. JSON request bodies are streamed with a 32 KiB hard byte limit.
- `PATCH /api/projects/:id`: update title and/or description for an owned project; JSON body limit is 32 KiB.
- `DELETE /api/projects/:id`: delete an owned project.

## Conversations and messages

- `GET /api/conversations`: list up to 100 conversations owned by the current member.
- `POST /api/conversations`: create a conversation; optional `project_id` must belong to the current member. JSON body limit is 32 KiB.
- `GET /api/conversations/:id/messages`: read up to 500 messages in an owned conversation.
- `POST /api/conversations/:id/messages`: append a user message (1–20,000 characters; JSON body limit is 96 KiB).
- Clients cannot submit assistant or system messages. Those roles are reserved for trusted server-side AI orchestration.

## Error behavior

- `401`: session missing or invalid.
- `400`: invalid input, missing idempotency key, or rejected write.
- `409`: idempotency key reused with a different payload or the original request is still processing.
- `413`: request body exceeds its route-specific byte limit.
- `429`: budget or usage quota rejected the request.
- `502`: provider failure or a previous idempotent attempt failed.
- `503`: required backend configuration is missing or request state cannot be safely confirmed.
- `404`: requested project or conversation not found for the current member.
- `500`: read failure; response does not expose database diagnostics.

All private data responses use `Cache-Control: no-store`. JSON request bodies are read from the request stream and stopped once the configured byte ceiling is exceeded, including when `Content-Length` is absent.
