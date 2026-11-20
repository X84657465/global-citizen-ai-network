# Agent Factory operations and workflow safety

## Exact scheduler workflow write exception

Task-agent write roots remain restricted to `app/`, `components/`, `lib/`, `tests/`, and `docs/`. The `.github/` tree is denied by default because workflow changes can alter execution triggers, Runner selection, token permissions, concurrency, and release behavior.

A single exact-path exception exists for:

```text
.github/workflows/agent-task-preflight.yml
```

The exception is an exact, case-sensitive string match. It does not permit other files under `.github/`, other workflow files, alternate extensions, case variants, path traversal, absolute paths, backslashes, secret-like segments, or protected roots such as `supabase/`.

## Control-plane approval and validation chain

The scheduler workflow is registered as a factory control-plane file. A task that names this path must carry the existing `factory-control-plane-approved` Issue label. The authorization is checked when the task is parsed and again by the shared write policy during patch validation.

The patch must target the already-existing workflow file with the `modify` operation. Add/replace ambiguity, deletions, binary content, and test-file modifications remain prohibited. The same validated task and patch manifest are then rechecked during disposable scratch application and publisher validation; this path exception does not bypass those stages.

## Required review boundary

The exception only allows a task specification to name this one workflow file. It does not authorize automatic merge, production deployment, secret changes, production database settings, or broader GitHub workflow access.

Every resulting candidate remains a Draft PR. Human reviewers must inspect event triggers, permissions, concurrency, Runner labels, timeouts, secret exposure, checkout credential persistence, shell commands, and downstream job conditions before any merge decision. Exact-head unit tests, type checks, lint, full GitHub Actions CI, and the isolated Windows factory validation remain required.

## Regression coverage

Task validation and patch validation each test:
- exact path acceptance with control-plane approval;
- rejection without the approval label;
- rejection of every other `.github/` path and case variant;
- rejection of traversal and secret-like path segments;
- requirement that the existing workflow file be modified rather than added.

No workflow file is changed by this capability-enablement change.
