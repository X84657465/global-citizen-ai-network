# AI Runner Foundation

## Current implementation

This is a controlled task-intake and validation layer. It is **not yet an autonomous coding agent**.

- Manual task intake is restricted to an open issue authored by the repository owner.
- The issue body is treated as untrusted data and must be no larger than 20,000 characters.
- The task schema requires exactly four unique sections: Goal, Allowed paths, Acceptance criteria, and Explicit exclusions.
- Allowed paths are limited to files below `app/`, `components/`, `lib/`, `tests/`, and `docs/`.
- Traversal segments, absolute paths, backslashes, hidden files, secrets, credentials, Supabase and GitHub workflow paths are rejected.
- Preflight uses only read permissions and produces a short-lived JSON artifact.
- A self-hosted Windows workflow runs validation tests; it does not execute repository application code.

## Verification

The validation module is covered by Node's built-in test runner, including negative tests for:

- non-owner issues, closed issues and pull requests;
- missing, duplicate and unexpected sections;
- non-bullet lists;
- traversal, absolute paths, protected roots, dotfiles and duplicate paths;
- oversized issue bodies and malformed repository identifiers.

## Activation stages

1. **Task intake and validation:** implemented in this branch; no model call or repository write.
2. **AI planning:** requires a chosen provider, an explicit spending limit and a credential isolated from task content.
3. **Isolated implementation:** requires a disposable OS-enforced sandbox, no production credentials, restricted network egress, and CPU, memory, process and time limits.
4. **Patch validation:** only allowlisted files may be emitted; validate the complete diff and run positive and negative tests.
5. **Draft PR creation:** use a separate short-lived write credential unavailable to the model or untrusted task text.
6. **Human release gate:** merge, migrations, secrets/configuration changes and production deployment remain manual.

## Cost and safety

- No paid AI API is called.
- No Supabase connection or production deployment is used.
- No write-capable GitHub token is provided to the task validator.
- A self-hosted runner is a host machine, not a sandbox. Do not execute model-generated code on the normal Windows desktop account.
- Future AI execution remains disabled until sandbox isolation and credential separation are implemented and tested.


## Local container isolation proof

The Windows self-hosted runner reports Docker Desktop, WSL and an active hypervisor. A disposable Node container smoke test is also run with:

- no network namespace connectivity (`--network none`);
- read-only container root filesystem;
- all Linux capabilities dropped;
- `no-new-privileges`;
- PID, memory and CPU limits;
- non-root UID 1000;
- a size-limited, `noexec` temporary filesystem;
- no host paths, Docker socket, repository secrets or production credentials mounted into the container.

This is a proof of the configured container boundary, not a complete security certification. Future generated-code execution must occur only inside this disposable boundary, with model access and any GitHub write credential kept outside it.
