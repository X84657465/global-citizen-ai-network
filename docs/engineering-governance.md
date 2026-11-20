# Five-Track Engineering Governance

**Governance revision: 1.4.2**  
**Repository release baseline: 0.3.84**

## 1. Five development tracks

| Track | Scope | Primary responsibility |
|---|---|---|
| A — Agent Factory V2 | Autonomous engineering workflow | Task lifecycle, isolated patch generation, CI, recovery, evidence |
| B — Global Citizen AI Network | Public product | User experience, AI workspace, contribution workflows, ledger and platform |
| C — Predictive Coding（預測編碼） | Predictive processing and prediction-error learning | Build explicit prediction, observation, error comparison and model-update loops; publish measurable signals to the other tracks |
| D — Deep Neural | Neural intelligence foundation | Memory, reasoning, evaluation, knowledge integration and cross-track learning |
| E — Deep Research（深度研究） | Research and evidence synthesis | Multi-source retrieval, source provenance and quality, corroboration, counter-evidence, cited synthesis and actionable research reports |

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

Tracks A, B, C, D and E must exchange reusable knowledge through reviewed, versioned artifacts:

1. A publishes engineering patterns, test fixtures, failure classifications, recovery playbooks and verified automation capabilities.
2. B contributes real product workflows, user-facing requirements, usability findings and operational constraints.
3. C (Predictive Coding) publishes explicit predictions, observed outcomes, prediction-error measurements, confidence/calibration data and tested model-update rules. It helps A anticipate task failures, B anticipate user/product needs and D prioritize memory/reasoning updates.
4. D (Deep Neural) maintains provenance-aware memory, integrates evidence, reasons over uncertainty and proposes reusable learning/evaluation strategies. It returns reviewed knowledge to A/B/C/E.
5. E (Deep Research) conducts multi-source research, checks source provenance and freshness, seeks corroboration and counter-evidence, and publishes cited findings and actionable recommendations to A/B/C/D.

### Five-track mutual-support loop

- **A → B/C/D:** verified automation, reproducible builds, test evidence, failure taxonomy and recovery playbooks.
- **B → A/C/D:** real product workflows, user feedback, operational constraints, usage patterns and measurable outcomes.
- **C → A/B/D:** predictions, prediction errors, uncertainty/calibration signals, drift indicators and experimentally validated update rules.
- **D → A/B/C/E:** reviewed memory, cross-domain synthesis, reasoning plans, evidence retrieval and evaluation recommendations.
- **E → A/B/C/D:** sourced research, verification methods, counter-evidence, source-quality assessments and cited synthesis.
- **All tracks → all tracks:** changes are proposed as versioned artifacts, reviewed by the receiving owner, tested against that track's acceptance criteria and adopted explicitly.

The shared loop is **observe → predict → act → measure outcome → calculate prediction error → explain/store evidence → revise model or plan → test → publish → adopt → monitor**. Prediction error is a learning signal, not automatic permission to mutate production systems.

No track is a subordinate of another. Each owns its roadmap and release; shared work is coordinated through documented interfaces, dependency records and cross-track PRs.

The learning loop is: **observe → record evidence → classify → review → generalize → test → publish → adopt → measure**.

No track may silently rewrite another track's code, configuration, database or policy. Reuse occurs through explicit interfaces, reviewed PRs and compatibility tests. Unverified model output is a proposal, never an authoritative fact.

## 4. Shared contracts

- Versioned task and event schemas.
- Stable API/module boundaries and explicit ownership.
- Common error taxonomy and retry semantics.
- Evidence format containing repository, branch, commit SHA, test command, result and timestamp.
- Security and privacy classification for every shared knowledge artifact.
- Prediction record contract: prediction, target, horizon, confidence, observed outcome, error metric, context/version and evidence provenance.
- Cross-track learning proposal contract: source evidence, affected tracks, expected benefit, risk, validation plan and receiving-owner decision.
- Compatibility checks before a shared contract is changed.

## 5. Integration-branch CI policy

- The integration branch `feat/github-project-showcase` is an approved base for dependent workstreams D and E while the five-track integration PR is under review.
- Pull requests targeting either `main` or the integration branch must run the same build, unit-test, type-check, lint, production-build and database/RLS verification workflow.
- A dependent branch must include the current integration branch as an ancestor; its PR diff must contain only its own workstream files.
- After the integration PR is merged, dependent PRs are retargeted to `main` only after their diff and exact-head CI are revalidated.

## 6. Quality gates

A change is not accepted merely because code was committed or a PR exists.

- Unit and integration tests must pass for the affected scope.
- Type checking, lint and production build must pass where applicable.
- Database migrations and RLS tests must run in an isolated local/test environment.
- Candidate CI must refer to the exact PR head SHA.
- Failure must be classified as code, test, dependency, infrastructure or unknown; unknown is not reported as passed.
- No automatic approval, merge, production database mutation or production deployment.
- Draft PRs remain Draft until all stated acceptance criteria are evidenced and reviewed.

## 7. Required change record

Every improvement, including a small one, records:

- old version → new version;
- track(s) affected;
- change summary and rationale;
- affected interfaces/dependencies;
- tests and exact commit SHA;
- CI status (pass/fail/pending/blocked);
- security/privacy impact;
- rollback or recovery method.

## 8. Rollback

Each change must identify the smallest safe rollback unit. Application changes should be reverted by commit or PR; schema changes require a separately reviewed forward-fix or verified migration rollback strategy. Never assume a database migration is reversible.

## 9. Five-track baseline

Track C is formally named **Predictive Coding（預測編碼）**; its current track version is recorded in `versions/manifest.json`. Track D is **Deep Neural** and Track E is **Deep Research（深度研究）**. All five tracks have independent ownership, interfaces, versions, tests and acceptance evidence. The overall integration baseline is `0.3.79`. A track version does not imply production readiness; current maturity and limitations must be stated explicitly.
