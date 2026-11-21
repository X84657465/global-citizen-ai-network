# Two-member RLS verification

This is a destructive-operation-free integration harness for a **disposable local Supabase database**. It creates synthetic auth identities and fixture rows inside a transaction, switches to the Supabase `authenticated` role with member JWT claims, asserts row isolation and privilege boundaries, then rolls the transaction back.

## Safety prerequisites

- Never set `SUPABASE_DB_URL` to a production, staging-with-real-users, or shared database.
- Start a fresh local Supabase stack from the repository migrations before running the suite.
- Use a database URL with permission to create synthetic `auth.users` fixtures. The Supabase local database default is commonly `postgresql://postgres:postgres@127.0.0.1:54322/postgres`; use the actual URL printed by your local CLI if ports differ.
- The harness refuses to run when `SUPABASE_DB_URL` is absent.
- Every test runs inside a transaction and ends with `ROLLBACK`. It does not call external services or use real member identities.

## Run

PowerShell:

```powershell
$env:SUPABASE_DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
node --test tests/security/two-member-rls.test.mjs
Remove-Item Env:SUPABASE_DB_URL
```

Bash:

```bash
SUPABASE_DB_URL='postgresql://postgres:postgres@127.0.0.1:54322/postgres' \
  node --test tests/security/two-member-rls.test.mjs
```

The host running Node must have `psql` on PATH. Set `PSQL_BIN` to an explicit executable path when needed.

## Coverage

- Two synthetic members can see only their own profiles, projects, conversations, messages, AI requests, and submissions.
- Cross-member project mutation and cross-member row reads affect/return zero rows.
- Cross-member conversation-to-project attachment is rejected with SQLSTATE `23514` by the ownership guard.
- Cross-member message insertion and forged contributor submissions are rejected with SQLSTATE `42501` by row-level security.
- A member cannot change their own role through the profile update path.
- Authenticated clients cannot insert assistant messages (the client insert policy is user-message-only).
- Authenticated clients cannot write directly to the reward ledger.
- Restricted accounts retain owner-scoped read access; suspended and closed accounts cannot read member data.
- Authenticated clients cannot read service-only audit logs.

## CI integration boundary

The repository's Windows database CI job starts an isolated local Supabase stack, applies repository migrations, and runs both `supabase test db` and this Node harness (`node --test tests/security/two-member-rls.test.mjs`). The job resolves the database URL from the isolated Supabase status output and targets the matching PostgreSQL container; it does not use production or shared user data.

Keep this harness destructive-operation-free: each scenario creates synthetic identities and fixtures inside a transaction and rolls back. Any future CI refactor must preserve the isolated-database boundary and must not point `SUPABASE_DB_URL` at production or a shared environment.

## Interpreting failures

A failing assertion means the disposable database allowed an operation or returned data outside the expected member boundary. A connection, missing `psql`, schema, or permission error is an environment/precondition failure, not a passing test. Preserve the complete stderr and exact migration revision when reporting a failure.
