# Database integration tests

The database security suite uses pgTAP against a fresh local Supabase database
after all repository migrations have been applied.

## Run locally

1. Install Docker and the Supabase CLI.
2. From the repository root, initialize the local Supabase configuration if needed:
   `supabase init`
3. Start the local Supabase services:
   `supabase start -x studio,imgproxy,edge-runtime,logflare,vector,supavisor,mailpit`
4. Run the PostgreSQL and RLS tests:
   `supabase test db`
5. Stop the local stack when finished:
   `supabase stop --no-backup`

## CI coverage

The GitHub Actions workflow runs two jobs on pull requests:

- **Build:** dependency installation, schema safety guard, dependency audit,
  unit tests, TypeScript, lint, and Next.js production build.
- **Database:** starts a disposable local Supabase stack, applies the repository
  migrations, runs `supabase test db` (pgTAP/PostgreSQL/RLS tests), and stops
  the stack even when an earlier step fails.

A successful Database job verifies that migrations apply and that the included
SQL assertions pass against the disposable CI database. It does not, by itself,
prove behavior under two independent concurrent database sessions. The current
pgTAP assertions include structural checks for lock ordering and transaction
guards; they must not be described as a true concurrent race test.

## Concurrency test requirements

A genuine concurrency test must use at least two independent PostgreSQL
connections and coordinate their transaction timing. For the AI request claim
path, the test should:

1. Create one member with two owned conversations and a valid budget fixture.
2. Start two independent sessions attempting to claim distinct request IDs
   for that same member at the same time.
3. Hold the first transaction after it acquires the member-level advisory lock.
4. Verify the second session blocks until the first transaction commits or rolls
   back, then observes the unresolved request guard.
5. Assert that at most one request, reservation, processing idempotency record,
   and persisted prompt can be created for the member.
6. Repeat with the first session rolling back to verify the waiting session can
   proceed safely and no orphaned reservation or idempotency state remains.

Do not substitute a single-session sequential test, source-text assertion, or
sleep-only test for this two-session contract. Prefer an isolated test harness
with explicit barriers and bounded lock timeouts so failures are deterministic.
The harness must run only against disposable local/CI PostgreSQL, never the
linked production database.

## Safety boundary

Production AI remains disabled with the hard stop enabled until provider
configuration, budget controls, recovery behavior, and the required concurrency
tests have been independently reviewed. Never apply test fixtures or migrations
to the linked production project as part of this workflow.
