# Four-Track Engineering Governance

**Governance revision: 1.0.0**  
**Repository release baseline: 0.1.1**

## 1. Four development tracks

| Track | Scope | Primary responsibility |
|---|---|---|
| A — Agent Factory V2 | Autonomous engineering workflow | Task lifecycle, isolated patch generation, CI, recovery, evidence |
| B — Global Citizen AI Network | Public product | User experience, AI workspace, contribution workflows, ledger and platform |
| C — Existing third workstream | Existing separately agreed scope | Preserve its established mission; do not invent or silently replace its scope |
| D — Deep Neural | Neural intelligence foundation | Memory, reasoning, evaluation, knowledge integration and cross-track learning |

Each track owns its own branch, work items, version history, tests and acceptance evidence. Shared contracts are maintained centrally and changes that affect multiple tracks require explicit impact analysis.

## 2. Numeric version policy

Use numeric `MAJOR.MINOR.PATCH` only. Do not use words such as alpha, beta or rc as version identifiers.

- **MAJOR**: incompatible architecture or contract change; reset MINOR and PATCH to zero.
- **MINOR**: backward-compatible capability or subsystem addition; reset PATCH to zero.
- **PATCH**: every smaller improvement, defect fix, documentation correction that changes an operational rule, or test/quality improvement.

Examples: `1.2.4 → 2.0.0`, `1.2.4 → 1.3.0`, `1.2.4 → 1.2.5`.

Every release must update the relevant track version, the overall integration version when shared behavior/contracts change, and `CHANGELOG.md`. The authoritative current values are in `VERSION` and `versions/manifest.json`. Git tags use the exact numeric version, for example `v0.1.1`; tags are created only after the release candidate has passed its required checks and human review.

A version bump is not evidence of completion. Acceptance requires exact commit SHA, tests, CI outcome, reviewer decision and rollback instructions.

## 3. Cross-track learning and support

Tracks A, B, C and D must exchange reusable knowledge through reviewed, versioned artifacts:

1. A publishes engineering patterns, test fixtures, failure classifications, recovery playbooks and verified automation capabilities.
2. B contributes real product workflows, user-facing requirements, usability findings and operational constraints.
3. C contributes its domain-specific requirements, implementation results and verified lessons without losing its independent scope.
4. D converts approved findings into reusable knowledge, reasoning/evaluation strategies and versioned memory/knowledge modules; it returns improvements to the other tracks.

The learning loop is: **observe → record evidence → classify → review → generalize → test → publish → adopt → measure**.

No track may silently rewrite another track's code, configuration, database or policy. Reuse occurs through explicit interfaces, reviewed PRs and compatibility tests. Unverified model output is a proposal, never an authoritative fact.

## 4. Shared contracts

- Versioned task and event schemas.
- Stable API/module boundaries and explicit ownership.
- Common error taxonomy and retry semantics.
- Evidence format containing repository, branch, commit SHA, test command, result and timestamp.
- Security and privacy classification for every shared knowledge artifact.
- Compatibility checks before a shared contract is changed.

## 5. Quality gates

A change is not accepted merely because code was committed or a PR exists.

- Unit and integration tests must pass for the affected scope.
- Type checking, lint and production build must pass where applicable.
- Database migrations and RLS tests must run in an isolated local/test environment.
- Candidate CI must refer to the exact PR head SHA.
- Failure must be classified as code, test, dependency, infrastructure or unknown; unknown is not reported as passed.
- No automatic approval, merge, production database mutation or production deployment.
- Draft PRs remain Draft until all stated acceptance criteria are evidenced and reviewed.

## 6. Required change record

Every improvement, including a small one, records:

- old version → new version;
- track(s) affected;
- change summary and rationale;
- affected interfaces/dependencies;
- tests and exact commit SHA;
- CI status (pass/fail/pending/blocked);
- security/privacy impact;
- rollback or recovery method.

## 7. Rollback

Each change must identify the smallest safe rollback unit. Application changes should be reverted by commit or PR; schema changes require a separately reviewed forward-fix or verified migration rollback strategy. Never assume a database migration is reversible.

## 8. Current baseline note

Track C is represented as `0.0.0` in the manifest only to indicate that its version baseline has not yet been identified. This is not a claim that its work is empty or cancelled. Confirm its established scope and repository before assigning its first release version.
