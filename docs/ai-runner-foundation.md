# AI Runner Foundation

## Current implementation

This first slice establishes a controlled task intake boundary. It is deliberately **not yet an autonomous coding agent**.

- `.github/workflows/agent-task-preflight.yml` is manually triggered with one issue number.
- `scripts/prepare-agent-task.mjs` fetches that issue using the workflow's read-only GitHub token.
- The issue must be open, authored by the repository owner, and contain all four required sections.
- Allowed paths are restricted to `app/`, `components/`, `lib/`, `tests/`, and `docs/`. Workflow files, scripts, Supabase migrations, environment files, and secrets are excluded.
- A JSON handoff artifact is retained for three days.
- The workflow has no repository write permission. It does not call an AI provider, execute repository code, change files, create a branch, open a PR, deploy, or access a database.

## Task issue contract

Create an owner-authored issue with exactly these sections:

```markdown
## Goal
Describe one bounded outcome in 20–3,000 characters.

## Allowed paths
- app/path/to/file.ts
- tests/path/to/file.test.ts

## Acceptance criteria
- Observable criterion one
- Observable criterion two

## Explicit exclusions
- No production database changes
- No deployment or merge
```

The task issue is untrusted input. Preflight packages it as data only; it does not treat issue text as executable instructions.

## Staged activation plan

1. **Task intake (this PR):** manual, owner-authored issue, strict schema, path allowlist, read-only token.
2. **AI planning:** one bounded model request, hard output-token ceiling, no tools and no write credentials. Requires an explicitly configured provider credential and cost approval.
3. **Isolated implementation:** a disposable OS-enforced sandbox with no production credentials, restricted network egress, read-only checkout plus scratch workspace, and CPU/memory/process/time limits.
4. **Patch validation:** apply only allowlisted changes, inspect the diff, run positive and negative tests, and produce a Draft PR from a dedicated branch.
5. **Human release gate:** merge, migrations, secrets/configuration changes, and deployment remain manual approvals.

## Blocking prerequisites for autonomous coding

- A model provider and credential must be selected. No API key is assumed or created here; model API usage may incur charges.
- A true sandbox must be available. A normal GitHub-hosted Actions job is not by itself proof that repository-controlled code is safely sandboxed under this project's security standard.
- A separate write-capable GitHub credential must be scoped to creating a branch and Draft PR only, and must not be available to the model or untrusted task content.
- CI execution must be available and verified. Current repository Actions runs have recently failed; investigate before granting any write-capable agent.

## Verification status

Source files are committed on an isolated feature branch for review. The workflow has not been executed in this environment. No claim is made that autonomous AI coding is active.
