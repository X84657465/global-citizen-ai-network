# Exact scheduler workflow write exception

The agent task validator keeps the normal write roots restricted to `app/`, `components/`, `lib/`, `tests/`, and `docs/`. The `.github/` tree remains denied by default because workflow changes can alter execution triggers, runner selection, permissions, and release behavior.

A single exact-path exception is available for:

```text
.github/workflows/agent-task-preflight.yml
```

This exception does not permit other workflow files, other files under `.github/`, case variants, path traversal, absolute paths, backslashes, secret-like segments, or protected roots such as `supabase/`. It is implemented as an exact string match, not a directory prefix or wildcard.

## Required review boundary

A task that requests this path must still pass the ordinary issue structure, owner-authorship, path validation, patch validation, disposable scratch application, candidate tests, and Draft PR publication flow. The exception only allows the task specification to name this one file; it does not authorize automatic merge, production deployment, changes to secrets, or changes to production database settings.

Changes to this workflow must receive normal human review in the Draft PR. Reviewers should inspect trigger conditions, permissions, concurrency, runner labels, timeouts, secret exposure, and all shell commands before approving any merge.

## Regression evidence

The task-validator test suite verifies that the exact scheduler workflow path is accepted while other `.github/` paths, other workflow files, case variants, traversal attempts, and secret-like paths remain rejected. Full unit tests, TypeScript, lint, and isolated candidate validation must pass in CI before this capability is considered verified.
