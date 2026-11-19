# Supabase migration-chain verification

## Scope and safety

This verification covers the existing migration files and their repository-side static contracts. It does not modify migrations, connect to a hosted Supabase project, or use real member identities or production data.

**Important:** static checks are not proof that PostgreSQL can apply every migration. A clean disposable local Supabase database is required before the full migration chain, grants, RLS behavior, triggers, indexes, and RPC execution can be marked verified.

## Current evidence

| Area | Status | Evidence |
|---|---|---|
| Migration filename format and ordering | Passed when the test suite passes | `tests/migration-chain-verification.test.mjs` and `scripts/check-migration-versions.mjs` |
| Repository static schema contracts | Passed when the test suite passes | `scripts/check-schema.mjs` |
| Presence of critical migration files | Passed when the test suite passes | Required migration inventory in the Node test |
| Presence of SQL regression suites | Passed when the test suite passes | Required SQL test inventory in the Node test |
| Applying the complete chain to a clean PostgreSQL database | **Not verified** | Requires a disposable local Supabase stack |
| Runtime RLS checks as anon/authenticated/service_role | **Not verified** | Static inspection cannot substitute for database execution |
| Trigger, index, RPC grant and rollback behavior at runtime | **Not verified** | Requires local database execution |
| Generated TypeScript database types versus live schema | **Not verified** | No generated database-types artifact is currently tracked in this repository |

The repository currently contains static schema assertions and SQL regression suites. Do not describe those as a successful clean-database migration run.

## Routine CI verification

The migration-chain Node test is included in `npm run test:unit`. Run:

```sh
npm ci
npm run test:unit
npm run lint
npm run build
```

The test checks unique and ordered 14-digit migration versions, required security/lifecycle migration files, the presence of SQL regression suites, and the existing migration-version and static-schema checkers.

## Disposable local database verification

Only perform this procedure on a disposable local Supabase instance. Never point `SUPABASE_DB_URL`, Supabase CLI link configuration, or a database client at production or a hosted project.

Prerequisites:
- Docker Desktop running locally.
- Supabase CLI installed.
- Repository checked out at the commit being verified.
- No linked production project and no production credentials in the shell environment.

Suggested local sequence:

```sh
supabase start
supabase db reset
supabase test db
```

Record the exact commit SHA, Supabase CLI version, migration reset output, SQL test output, and any failing migration name. If the local stack cannot start or a prerequisite is missing, record the result as **not verified**, not passed.

## Failure handling and recovery

- Preserve the first failing migration and complete PostgreSQL error output.
- Do not edit historical migration files or manually apply SQL to force a green result.
- Reproduce failures from a fresh disposable database after any approved correction.
- Keep synthetic identities and transaction rollback boundaries in security tests.
- Stop before any operation that requests a hosted project link, production URL, or real member data.

## Known limitations

This repository-side test is a static regression guard. It does not itself start Docker, invoke Supabase, connect to PostgreSQL, impersonate database roles, or compare generated TypeScript types with a live schema. Those checks remain **not verified** until disposable-environment evidence is attached to the task.
