# Supabase migration-chain verification

## Scope and safety

This verification covers the repository's exact 24-file migration inventory and a disposable local Supabase/PostgreSQL execution. It does not connect to a hosted Supabase project or use real member identities or production data.

All database execution is isolated to the CI-created local Supabase stack. No hosted project link, production URL, production credentials, or production data are part of this verification.

## Current evidence

**Verified candidate revision:** `bcdd8e29e0369f261b1716bc1bec5555552bc5a9`  
**Exact-head CI run:** [#2551](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44838306544) (`44838306544`) — completed successfully on 2026-11-21.

| Area | Status | Evidence |
|---|---|---|
| Exact 24-file migration inventory and ordering | **Passed** | `tests/migration-chain-verification.test.mjs`; exact ordered-list comparison via `assert.deepEqual` |
| Migration filename format and ordering guard | **Passed** | Exact-head CI: Migration filename safety guard |
| Repository static schema contracts | **Passed** | Exact-head CI: Schema safety guard |
| Applying the complete migration chain to a clean disposable local Supabase database | **Passed** | Exact-head CI: Initialize isolated local Supabase project; Start isolated Supabase and apply migrations |
| PostgreSQL and RLS SQL regression suites | **Passed** | Exact-head CI: Run PostgreSQL and RLS pgTAP tests |
| Two-member application-level RLS integration | **Passed** | Exact-head CI: Run two-member application RLS integration tests |
| Local Supabase teardown | **Passed** | Exact-head CI: Stop Supabase services |
| Generated TypeScript database types versus live schema | **Not verified** | No generated database-types artifact is currently tracked in this repository |

The exact-head CI run also passed the Windows quality gates, including unit tests, type check, lint, security audits and production build, plus bounded local Ollama inference. These results do not imply deployment to production.

## Routine CI verification

The migration-chain Node test is automatically discovered by the repository's recursive `scripts/run-unit-tests.mjs` runner because it matches `*.test.mjs`; `package.json` routes `npm run test:unit` through that runner.

```sh
npm ci
npm run test:unit
npm run lint
npm run build
```

The migration test checks the exact ordered 24-file inventory, unique and ordered 14-digit migration versions, required security/lifecycle migration files, the presence of SQL regression suites, and the existing migration-version and static-schema checkers.

## Disposable local database verification

The successful exact-head CI execution uses only a disposable local Supabase instance. Its recorded sequence includes:

1. Initialize an isolated local Supabase project.
2. Start the isolated Supabase stack and apply the migration chain.
3. Run PostgreSQL and RLS pgTAP tests.
4. Run two-member application RLS integration tests.
5. Stop the local Supabase services.

For a repeat verification, record the exact commit SHA, Supabase CLI version, migration reset output, SQL test output, and any failing migration name. If the local stack cannot start or a prerequisite is missing, record the result as **not verified**, not passed.

Never point `SUPABASE_DB_URL`, Supabase CLI link configuration, or a database client at production or a hosted project for this procedure.

## Failure handling and recovery

- Preserve the first failing migration and complete PostgreSQL error output.
- Do not edit historical migration files or manually apply SQL to force a green result.
- Reproduce failures from a fresh disposable database after any approved correction.
- Keep synthetic identities and transaction rollback boundaries in security tests.
- Stop before any operation that requests a hosted project link, production URL, or real member data.

## Known limitations

The evidence above verifies the migration chain and PostgreSQL/RLS behavior only for the exact candidate SHA and disposable CI environment identified above. It does not verify generated TypeScript database types against a live schema, nor does it establish production deployment, production data integrity, hosted-project configuration, or production runtime behavior. Re-run exact-head CI after any subsequent commit; evidence from this SHA must not be carried forward to a changed revision without re-verification.
