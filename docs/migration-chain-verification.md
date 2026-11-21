# Supabase migration-chain verification

## Scope and safety

This verification covers the repository's exact 24-file migration inventory and a disposable local Supabase/PostgreSQL execution. It does not connect to a hosted Supabase project or use real member identities or production data.

All database execution is isolated to a CI-created local Supabase stack. No hosted project link, production URL, production credentials, or production data are part of this verification.

## Current candidate status

The migration verification changes are carried forward on top of the current A–P governance candidate (PR #179), so the migration handoff does not reintroduce the older A–E registry or overwrite newer shared release metadata.

**Current candidate CI:** pending for the final head of this PR. The exact-head GitHub Actions run attached to this PR is the authority for acceptance. No database-runtime pass is claimed for this candidate until its own CI completes successfully.

## Historical exact-head evidence (superseded revision only)

**Historical revision:** `bcdd8e29e0369f261b1716bc1bec5555552bc5a9`  
**Historical exact-head CI:** [#2551](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44838306544) (`44838306544`) — completed successfully on 2026-11-21.

The following results apply only to that historical revision and disposable CI environment. They must not be carried forward as acceptance evidence for a later SHA.

| Area | Historical result | Evidence |
|---|---|---|
| Exact 24-file migration inventory and ordering | **Passed** | `tests/migration-chain-verification.test.mjs`; exact ordered-list comparison via `assert.deepEqual` |
| Migration filename format and ordering guard | **Passed** | Historical exact-head CI: Migration filename safety guard |
| Repository static schema contracts | **Passed** | Historical exact-head CI: Schema safety guard |
| Applying the complete migration chain to a clean disposable local Supabase database | **Passed** | Historical exact-head CI: initialize isolated local Supabase project; start isolated Supabase and apply migrations |
| PostgreSQL and RLS SQL regression suites | **Passed** | Historical exact-head CI: PostgreSQL and RLS pgTAP tests |
| Two-member application-level RLS integration | **Passed** | Historical exact-head CI: two-member application RLS integration tests |
| Local Supabase teardown | **Passed** | Historical exact-head CI: stop Supabase services |
| Generated TypeScript database types versus live schema | **Not verified** | No generated database-types artifact is currently tracked in this repository |

The historical exact-head CI also passed Windows quality gates, including unit tests, type check, lint, security audits and production build, plus bounded local Ollama inference. These results do not imply deployment to production.

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

A successful exact-head CI execution must use only a disposable local Supabase instance. The recorded sequence is:

1. Initialize an isolated local Supabase project.
2. Start the isolated Supabase stack and apply the migration chain.
3. Run PostgreSQL and RLS pgTAP tests.
4. Run two-member application RLS integration tests.
5. Stop the local Supabase services.

For every candidate revision, record the exact commit SHA, Supabase CLI version, migration reset output, SQL test output, and any failing migration name. If the local stack cannot start or a prerequisite is missing, record the result as **not verified**, not passed.

Never point `SUPABASE_DB_URL`, Supabase CLI link configuration, or a database client at production or a hosted project for this procedure.

## Failure handling and recovery

- Preserve the first failing migration and complete PostgreSQL error output.
- Do not edit historical migration files or manually apply SQL to force a green result.
- Reproduce failures from a fresh disposable database after any approved correction.
- Keep synthetic identities and transaction rollback boundaries in security tests.
- Stop before any operation that requests a hosted project link, production URL, or real member data.

## Known limitations

The evidence above verifies the migration chain and PostgreSQL/RLS behavior only for the historical exact SHA and disposable CI environment explicitly identified above. It does not verify generated TypeScript database types against a live schema, nor does it establish production deployment, production data integrity, hosted-project configuration, or production runtime behavior. Re-run exact-head CI after every subsequent commit; evidence from a different SHA must not be presented as current acceptance.
