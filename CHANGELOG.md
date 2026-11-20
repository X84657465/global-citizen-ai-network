# Changelog

## 0.1.1 — 2026-11-20

### Fixed
- Move Windows self-hosted Supabase CI port allocation from the default dynamic TCP range (`55000–63999`) to `20000–39999`.
- Add a CI policy regression test that rejects the legacy allocation expression.

### Verification
- Exact-head GitHub Actions validation is required. The previous run confirmed Unit Tests, TypeScript, ESLint and production build passed, but Supabase startup failed on a Windows port bind conflict; PostgreSQL/RLS therefore did not run.
- This change is not accepted until the new exact-head run completes Supabase startup, migrations, PostgreSQL and RLS tests.
