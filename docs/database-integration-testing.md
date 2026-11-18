# Database integration tests

The database security suite uses pgTAP against a fresh local Supabase database
after all repository migrations have been applied. Repository migration filenames
use the exact 14-digit versions already recorded by the linked Production project;
the migration SQL contents are unchanged by that filename alignment.

## Run locally

1. Install Docker and the Supabase CLI.
2. From the repository root, initialize local Supabase configuration if needed:
   `supabase init`
3. Start the local services used by CI:
   `supabase start -x studio,imgproxy,edge-runtime,logflare,vector,supavisor,mailpit`
4. Apply all timestamped migrations and seed the disposable local database:
   `supabase db reset`
5. Run PostgreSQL, RLS, and lifecycle tests:
   `supabase test db`
6. Stop the local stack:
   `supabase stop --no-backup`

## CI coverage

GitHub Actions runs two jobs for pull requests and pushes to `main` or `codex/**`.

- **Build:** migration filename guard, dependency installation/audit, schema safety
  guard, unit tests, TypeScript, ESLint, and Next.js production build.
- **Database:** initializes a disposable local Supabase stack, applies every
  timestamped migration, runs the pgTAP/PostgreSQL/RLS suite, and stops the stack
  even when an earlier step fails.

A successful Database job proves the migrations apply to a fresh disposable
PostgreSQL/Supabase instance and the included SQL assertions pass. It does not,
by itself, prove behavior under two independent concurrent database sessions.

## Concurrency test requirements

A genuine concurrency test must use at least two independent PostgreSQL
connections and coordinate transaction timing. For the AI request claim path,
the test should:

1. Create one member with two owned conversations and a valid budget fixture.
2. Start two independent sessions attempting to claim distinct request IDs for
   that same member at the same time.
3. Hold the first transaction after it acquires the member-level advisory lock.
4. Verify the second session blocks until the first transaction commits or rolls
   back, then observes the unresolved-request guard.
5. Assert that at most one request, reservation, processing idempotency record,
   and persisted prompt can be created for the member.
6. Repeat with the first session rolling back and verify the waiting transaction
   can proceed without leaving orphaned state.

Structural pgTAP assertions about lock ordering are useful regression guards,
but they are not a substitute for the coordinated two-session test.

## Production boundary

- The live Supabase project already reports all 24 timestamped migrations as
  applied. Do not replay the initial schema or run a bulk migration repair.
- Keep Production read-only during CI and local migration testing.
- Keep paid AI disabled until provider credentials, per-request limits, monthly
  budget caps, uncertain-outcome reconciliation, and billing verification have
  passed the separate release gates.
