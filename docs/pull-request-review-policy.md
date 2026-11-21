# Independent Pull Request Review and Approval Policy

**Policy revision:** 1.0.0  
**Effective baseline:** pending merge to `main` and repository enforcement configuration  
**Scope:** all pull requests; applies especially to Agent Factory V2 (A), Governance, Migration, Workspace/Message (B), and cross-track changes.

## 1. Non-negotiable independence

1. A pull request author must never approve their own pull request.
2. A person who authored the latest commit on the candidate HEAD must not count as an independent approver for that HEAD.
3. The same execution identity must not implement, approve, and release its own change. The PR author and latest commit author/committer are always excluded. If a separate human or automation execution identity produced the candidate, declare it as `Execution identity: @login` in the PR body; declared identities are also excluded. Automation identities may report evidence but cannot provide human approval.
4. A review only counts when GitHub records state `APPROVED`, its `commit_id` equals the current PR HEAD SHA, and the reviewer is independent under rules 1–2.
5. A new commit invalidates approvals tied to an earlier HEAD for acceptance purposes. Re-review the exact current SHA.
6. `CHANGES_REQUESTED`, unresolved review threads, failed required checks, or an unresolved declared blocker prevent acceptance. A dismissed/stale approval does not count.
7. No workflow may approve or merge a PR automatically. A green CI result is evidence, not approval.

## 2. Risk classification and approval threshold

The strictest applicable class wins. PR labels may raise a class but cannot lower one.

| Class | Typical scope | Minimum independent approvals | Evidence |
|---|---|---:|---|
| Low | Isolated docs, copy, presentation-only change; no runtime, permission, data, workflow, or contract effect | 1 | Exact-HEAD CI green, correct base, no declared open blocker, clean review state |
| High | Agent Factory runtime/state/recovery, workflow/control-plane, security/auth, secrets, API authorization, database/schema/RLS, migrations, dependency/lockfile, release pipeline, or explicit `risk:high` | 2 distinct reviewers | All Low evidence plus focused failure-mode/security review and migration/rollback evidence where applicable |
| Cross-track | Changes affecting two or more independently versioned tracks or shared contracts | 2 distinct reviewers, including receiving-track ownership | Compatibility evidence for each affected track and explicit receiving-owner acceptance |
| Migration | Any schema/data migration, RLS/grant/policy change, or migration-chain alteration | 2 distinct reviewers, including database/security competence | Disposable clean-database apply/verification, rollback or forward-fix plan, no production mutation |

**Fast path:** Low-risk changes may be approved promptly once the current HEAD's CI is fully successful, base/dependency checks pass, no declared blocker is open, and one independent reviewer approves that exact SHA. “Fast” never means self-approval or skipping checks.

**High-risk path:** High-risk, cross-track, and migration changes require the higher threshold. If suitable independent reviewers are unavailable, the PR remains unaccepted; do not downgrade its risk to bypass review.

## 3. Exact-HEAD and base validation

- The CI evidence must belong to the current `pull_request.head.sha`, not a prior commit or a branch name.
- The PR base must be the declared integration target. Independent A work targets `main`; a stacked PR may target its direct parent branch only while that parent PR is open and explicitly documented.
- A stacked child cannot be accepted or merged before its parent is merged. After parent merge, retarget/restack the child onto the accepted parent baseline and rerun full exact-HEAD CI.
- Required CI means the repository's `CI` workflow completed successfully for the exact HEAD. Pending, skipped required jobs, cancelled, timed-out, or failed runs are not green.
- Third-party deployment previews are reported separately from GitHub Actions CI. A provider quota failure is not a code-test failure, but any separately required deployment check must still pass before release.

## 4. Declared blockers

- PRs must identify dependency blockers in a `Blocked by:` line using issue references (for example, `Blocked by: #136, #175`).
- Every issue listed there must be closed before acceptance.
- A PR carrying a `blocked` or `blocked-by` label is not acceptable.
- Ordinary linked implementation/acceptance issues are not blockers unless explicitly declared in `Blocked by:`; this avoids treating the task being implemented as a blocker to its own PR.
- Reviewers must check for undeclared blockers and unresolved review threads; automation cannot infer every semantic dependency.

## 5. Required reviewer conduct

Reviewers must inspect the diff and relevant call paths, not merely the CI badge. High-risk reviews should address failure modes, authorization boundaries, idempotency/replay, data integrity, observability, rollback, and test adequacy. Cross-track reviewers must verify compatibility with each affected contract. Migration reviewers must inspect ordering, forward/backward compatibility, clean apply, and recovery.

## 6. Automation contract and enforcement status

The companion `.github/workflows/review-governance.yml` workflow reports:
- exact current HEAD and successful exact-HEAD CI;
- default-base or valid parent-stack relationship;
- declared `Blocked by:` issue state and blocking labels;
- risk class and required number of distinct independent approvals;
- reviewer independence from PR author and latest commit author/committer;
- approval freshness against the current HEAD.

This workflow is an **advisory verification check until configured as a required status check**. It does not grant merge permission, approve, merge, or change branch protection. The repository is currently private; GitHub's Rulesets endpoint returned a plan restriction (Pro required or repository must be public), while the connected integration could not read classic branch protection (403 permission denied). Therefore server-side enforcement has not been verified or enabled by this change.

To make the gate enforceable, a repository administrator must:
1. enable an eligible GitHub plan or use a repository visibility/hosting arrangement that supports the required protection feature;
2. configure protection for `main` (and any active integration branch) to require pull requests, required status check `Independent review governance / review-gate`, up-to-date branches, and no bypass for normal writers;
3. require the stated number of approvals (GitHub branch protection may have a single global count; the workflow calculates risk-specific thresholds);
4. enable dismissal of stale approvals and require approval of the most recent reviewable push;
5. install a CODEOWNERS file with real, available reviewers for high-risk paths and migrations, then require Code Owner review;
6. keep administrator/bypass access restricted and audited.

Until these administrator settings are confirmed in GitHub, do not claim this policy is a hard merge block. Use the workflow result plus formal GitHub review records as a manual acceptance gate.

## 7. Acceptance record

Every accepted PR records the exact HEAD SHA, base SHA/ref, risk class, independent approver identities, exact-HEAD CI run, blocker disposition, review-thread disposition, and merge/rollback decision. A PR is accepted only when every applicable gate is evidenced.
