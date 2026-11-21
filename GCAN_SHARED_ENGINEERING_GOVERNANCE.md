# GCAN Shared Engineering Governance

**Status:** Proposed shared engineering operating contract; requires review and adoption by the GCAN main controller.
**Scope:** All sixteen GCAN workstreams (A–P) as coordinated responsibilities inside one ecosystem.

## 1. One ecosystem, shared platform

GCAN A–P are not sixteen independent websites or separately deployed products by default. They are workstreams/modules with distinct ownership boundaries that may share platform services.

Shared capabilities should be reused where appropriate:
- application shell and routing;
- identity, authentication, authorization and role/permission model;
- database and migration process;
- object/file storage;
- API conventions and versioning;
- event bus, queue and background-job infrastructure;
- secrets management and configuration;
- observability, audit logging and alerting;
- CI, test fixtures, release evidence and deployment controls.

A workstream may own a bounded module, contract, workflow or policy surface. It must not create a duplicate platform service merely because it is a separate letter. A separate deployable service is justified only by an explicit architecture decision documenting operational need, trust boundary, data ownership, cost, failure mode, and support owner.

## 2. Architecture is not implementation

Every status report must distinguish:
1. **Planned** — documented intent only.
2. **Specified** — architecture/API/schema proposal exists.
3. **Implemented** — code exists in a named repository path and commit.
4. **Tested** — named tests/commands ran against that exact commit.
5. **Accepted** — acceptance criteria and required reviewers approved.
6. **Integrated** — merged into the selected shared baseline and integration checks passed.
7. **Deployed** — deployment evidence identifies environment, version and time.

A roadmap, manifest, README, diagram, PR title, mock, isolated mirror test, or author assertion cannot independently establish implementation, acceptance, integration or deployment.

For each claim, record repository, branch, commit SHA, file paths, test command, run ID/result, reviewer and remaining limitations. Missing evidence is UNKNOWN, not PASS.

## 3. Shared Git collaboration and agent isolation

All human and GPT agents must collaborate through the same canonical repository and explicit branch ownership.

### Before editing
- Read repository instructions (AGENTS.md, contribution guide, package scripts, relevant module docs).
- Record git status --short --branch, git worktree list, git branch -avv, current HEAD and upstream.
- Inspect the target files, recent commits, open PRs and active work ownership.
- Never assume a clean worktree. Preserve every pre-existing uncommitted or untracked change.

### Work isolation
- One task/agent owns one branch or isolated worktree at a time.
- Branch names should identify scope and owner, e.g. work/<track>-<task>-<agent>.
- Do not have two agents edit the same file set concurrently. If unavoidable, assign a single integrator and serialize edits.
- Use small, reviewable commits. Do not force-push shared branches.
- Do not reset, clean, checkout over, stash-pop over, rebase, cherry-pick or overwrite another agent's work without explicit coordination and a verified backup.
- Before updating a branch ref, verify its expected current SHA; reject stale updates rather than force-overwrite.

### Task ledger
Maintain a shared task ledger (issue/project board or repository document) with:
- task ID and workstream;
- one accountable owner/agent;
- branch/worktree and target files;
- base SHA and current head SHA;
- status (planned/in progress/blocked/review/accepted/integrated);
- dependencies and blockers;
- tests/evidence required;
- reviewer and acceptance record.

An agent must claim a task before editing and release/hand over ownership with commit SHA and test evidence.

## 4. Cross-workstream contracts and shared infrastructure

- Reuse existing identity, database, storage, API, queue, logging and CI facilities unless an approved decision says otherwise.
- Define module boundaries through versioned interfaces and explicit ownership, not duplicated infrastructure.
- Cross-module events must be authenticated, schema-validated, authorization-checked, replay/idempotency-safe, privacy-minimized and traceable.
- A consumer must not infer authority from an event payload or UI state.
- Shared database changes require migration review, backward-compatibility assessment, isolated test coverage and rollback plan.
- Cross-cutting security controls remain owned by the security authority; governance documentation does not itself enforce permissions.

## 5. Acceptance and integration gates

Before a PR can be accepted:
- scope and owner are explicit;
- diff is limited to the approved task;
- no unrelated agent work is overwritten;
- unit/type/lint/build and relevant integration tests are recorded;
- security/privacy/data migration impact is reviewed;
- exact-head CI is green for the final commit;
- acceptance criteria are checked by a reviewer other than the author where feasible;
- rollback/disable strategy exists for operationally risky changes.

A green check on a different SHA, an isolated local mirror, or a partial test suite is not exact-head repository acceptance.

## 6. Protected boundaries

Unless the authorized owner explicitly approves through the repository's normal review process, agents must not:
- modify production data or run destructive production migrations;
- deploy to production or change production routing;
- rotate, reveal, copy or print secrets;
- broaden permissions, enroll workers, or start community compute;
- alter protected A / Agent Factory V2 runtime ownership or state-machine behavior;
- merge competing ancestry stacks or force-update shared branches.

High-risk changes require a written plan, impact analysis, backup/rollback path, named approver and explicit approval before execution.

## 7. Agent Factory V2 and B Product boundaries

- Agent Factory V2 (A) remains the factory/orchestration authority for its task lifecycle, leases, isolated patching, candidate checks and publication flow.
- Other tracks may provide bounded security, evidence, telemetry, connector, recovery, knowledge, compliance or governance services; they must not silently take over A's state machine or dispatch authority.
- B remains the product/workspace authority. Shared modules integrate through reviewed contracts and the existing platform services.
- A/B integration must use one explicitly selected ancestry baseline. Competing PR stacks must be compared before transplanting or merging.

## 8. Required handover record

Every task handover must include:
- purpose and scope;
- files changed and commit SHA;
- shared services/contracts touched;
- tests actually run and exact results;
- acceptance state;
- known gaps and risks;
- downstream dependencies;
- next owner/action;
- confirmation that no unrelated work was overwritten.

## 9. Adoption note

This file is a governance proposal committed on the F–P audit branch. It is not yet a branch-protection rule, CI enforcement, permission control or production policy. The main controller and workstream owners must review it, resolve conflicts with existing repository policy, and adopt enforcement separately.
