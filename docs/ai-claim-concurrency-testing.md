# AI claim two-session concurrency test

This test exercises the real `public.claim_ai_request` RPC through two independent PostgreSQL connections. It is separate from pgTAP structural assertions: it verifies lock waiting and post-commit/rollback outcomes.

## Safety requirements

- Run only against a disposable local Supabase database.
- Never use a hosted Supabase URL, staging, or production database.
- The runner refuses non-loopback hosts, non-PostgreSQL URLs, and endpoints other than the default local `postgres@127.0.0.1:54322/postgres`; it also requires an explicit confirmation variable.
- It temporarily changes the singleton `platform_ai_controls` row and restores its prior values in a `finally` cleanup.
- It creates a random member and two conversations, then removes its fixture records.

## Run

Start local Supabase first:

```bash
supabase start
```

Set the local database URL from the CLI output (the default local DB URL is commonly `postgresql://postgres:postgres@127.0.0.1:54322/postgres`):

PowerShell:

```powershell
$env:LOCAL_SUPABASE_DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
$env:CONFIRM_LOCAL_SUPABASE = "YES"
npm run test:ai-claim-concurrency
```

macOS/Linux:

```bash
LOCAL_SUPABASE_DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
CONFIRM_LOCAL_SUPABASE=YES npm run test:ai-claim-concurrency
```

The runner requires Node.js and `psql` on PATH. It does not add an npm dependency.

## Scenarios

1. Same member, different conversations: the second claim waits for the first member-scoped advisory lock and is rejected while the first request remains unresolved.
2. Same idempotency key and payload: the second session sees the existing in-progress request.
3. Same idempotency key with a different payload: the second session receives an idempotency conflict.
4. First transaction rollback: the waiting second session successfully claims the request after the first transaction rolls back.
5. Atomic side effects: only four successful claims produce four requests, budget reservations, idempotency mappings, and original user prompts.

The runner does not call an AI provider and does not make external network requests. A successful run is a real local PostgreSQL integration test, not a CI or production verification.
