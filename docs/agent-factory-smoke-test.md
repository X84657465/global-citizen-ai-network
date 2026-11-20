# Agent Factory V2 — bounded smoke-test result

**Result:** Preflight smoke test passed on 2026-11-20. This validates the synthetic, offline candidate path; it does not claim a live Issue-to-PR task was completed.

## Evidence

- Workflow: [AI Agent Task Preflight run #44751179147](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44751179147)
- Exact source revision: `ee62e9cfd8f5ac40f66f556a4a99ca7a7a9dd97e`
- Trigger: `push` (not `workflow_dispatch`, `issues`, or `repository_dispatch`)
- Overall workflow result: **success**

| Stage | Observed result |
| --- | --- |
| Local Ollama synthetic plan generation | Passed |
| Local Ollama synthetic patch proposal | Passed |
| Disposable-container isolation check | Passed |
| Apply validated patch to scratch workspace | Passed |
| Restricted offline candidate tests | Passed |
| Publisher validation | Passed in dry-run mode only |
| Locked dependency install without lifecycle scripts | Passed |
| Complete unit suite | 370 passed, 0 failed |
| TypeScript validation | Passed |
| ESLint | Passed |
| Scratch and synthetic artifact cleanup | Passed |

## Scope and limitations

- The run exercised a synthetic task through planning, patch proposal, isolated candidate testing, and publisher dry-run.
- The separate read-only GitHub task-selection/planning job was skipped for this push-triggered run. No real issue was selected, leased, or transitioned through the live task state machine.
- Publisher validation performed no GitHub API writes. No Draft PR was created by this smoke test.
- This run did not exercise live task dispatch, durable lease recovery, Runner restart recovery, or a real Issue-to-Draft-PR lifecycle.
- No production database, secrets, billing, or deployment configuration was accessed or changed.

## Acceptance statement

The bounded Preflight smoke test is green for the exact source SHA above. Live task ingestion and real Draft PR publication remain separate operational checks and are **not** claimed as passed. Full PR CI for this same SHA is tracked independently in [run #44751188879](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44751188879).
