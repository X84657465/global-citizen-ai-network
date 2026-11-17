# Database integration tests

The database security suite uses pgTAP and is intended to run against a fresh local
Supabase database after all migrations have been applied.

## Run locally

1. Install Docker and the Supabase CLI.
2. From the repository root, start the local Supabase stack:

   `supabase start`

3. Apply the repository migrations and run the database tests:

   `supabase db reset`

   `supabase test db`

The test file `supabase/tests/database_security.test.sql` verifies:

- RLS is enabled on all 16 tables created by the initial application schema.
- AI is disabled by default with zero configured budget and hard-stop enabled.
- Budget reservation, idempotency, and rate-limit tables exist.
- The budget and idempotency RPC signatures exist.
- Authenticated clients cannot execute the privileged idempotency claim RPC.
- The server-side `service_role` can execute that RPC.

## Important boundary

The existing GitHub CI currently runs static schema guards, TypeScript, ESLint,
and a Next.js production build. It does **not** start PostgreSQL or execute these
pgTAP tests. A passing CI run therefore does not prove that migrations execute
successfully or that RLS and transaction behavior work against a live database.

Do not enable paid AI traffic until these tests and dedicated concurrency tests
have passed against a disposable PostgreSQL/Supabase environment.
