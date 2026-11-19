# AI task pull-request human approval boundary

## Policy

The agent factory may discover bounded tasks, produce a plan, generate a constrained patch, run isolated candidate checks, publish a Draft pull request, and report CI results. It must never mark its own pull request ready for review, approve it, merge it, close its source issue as a merge side effect, or dispatch a follow-up task as a consequence of an AI-initiated merge.

Every AI-generated pull request remains Draft until a human reviewer explicitly changes its review state. A human must inspect the diff and CI evidence and perform the merge.

## CI behavior

The CI workflow is limited to validation and failure reporting:

- Build, unit tests, type checking, lint, and production build remain enabled.
- Local Supabase migrations, PostgreSQL, and RLS tests remain enabled.
- Failed validation continues to feed the factory circuit breaker.
- Successful validation does not imply approval or merge.
- The scheduler remains idle while an AI task pull request is open. After a human merges or closes it, the normal scheduled queue poll can proceed.

## Security regression test

`tests/ci-human-approval-gate.test.mjs` verifies that the CI workflow does not contain the former auto-merge job, merge API calls, ready-for-review promotion, write permission for pull requests or repository contents, or merge-triggered task dispatch/issue closure.

## Operator checklist

1. Inspect the complete PR diff, including workflow, database, auth, and dependency changes.
2. Confirm required CI checks completed successfully for the exact PR head SHA.
3. Review any deployment preview separately; a preview deployment is not a CI pass.
4. Approve and merge manually only after review.
5. If the PR is rejected, close it and ensure the source task is explicitly triaged before resuming the queue.

No production database, secrets, billing, deployment settings, or branch-protection rules are changed by this policy.
