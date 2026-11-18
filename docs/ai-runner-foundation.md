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

The Windows self-hosted runner reports Windows 11 Pro, Docker Desktop 29.9.3, WSL and an active hypervisor. A disposable Node container smoke test passed on the user's PC using image digest `sha256:1314fb30ec37592d5845e5a160d522c0e680972aa534549940b8d73bde88481a`. The test verified the non-root UID, read-only root filesystem, writable bounded temporary filesystem, and blocked outbound network. The run also configured:

- no network namespace connectivity (`--network none`);
- read-only container root filesystem;
- all Linux capabilities dropped;
- `no-new-privileges`;
- PID, memory and CPU limits;
- non-root UID 1000;
- a size-limited, `noexec` temporary filesystem;
- only the repository as a read-only input mount and a dedicated temporary output directory as a writable mount; no Docker socket, repository secrets or production credentials are mounted. The host verifies the source checkout stayed unchanged and the output remained inside the dedicated scratch directory.

This is a proof of the configured container boundary, not a complete security certification. Future generated-code execution must occur only inside this disposable boundary, with model access and any GitHub write credential kept outside it.


Latest Windows verification run: https://github.com/X84657465/global-citizen-ai-network/actions/runs/44337182323

- Disposable container isolation smoke test: passed.
- Complete unit test suite: passed (80 tests).
- TypeScript validation: passed.
- ESLint: passed.
- The Windows Sandbox optional-feature query could not be completed because it requires elevation; this is not a blocker for the Docker-based proof.


Latest read-only workspace boundary run: https://github.com/X84657465/global-citizen-ai-network/actions/runs/44337526428

The pinned image and all sandbox checks passed, including the read-only repository mount and dedicated output-only mount.


## Candidate patch contract

A separate pure validation module now defines the handoff contract for future model-generated changes:

- Exact file allowlist inherited from the validated task issue.
- Only `add` and `modify` operations; no deletes.
- Each file must match the expected existence state in the base checkout.
- Maximum 20 files, 64 KiB per file and 256 KiB total.
- Rejects traversal, absolute paths, hidden/protected roots, duplicate paths, binary/NUL content, and unexpected JSON fields.
- This validates patch data only; it does not apply the patch or execute generated code.


Latest patch-contract verification run: https://github.com/X84657465/global-citizen-ai-network/actions/runs/44337947322

- 88 unit tests passed, 0 failed.
- TypeScript validation passed.
- ESLint passed.
- Docker sandbox and read-only workspace/output mount checks passed.


## Local model availability audit

The Windows runner confirmed that the Ollama CLI is installed and the local API at `127.0.0.1:11434` responds. The installed model list currently includes `qwen3:8b` and `qwen3.6:latest`. This confirms local inference is available as a zero-cloud-API-cost candidate, but does not yet prove that either model completes a generation request reliably. A bounded local inference probe is queued for the next available runner session; no model was downloaded.
