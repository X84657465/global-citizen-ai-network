# Engineering Governance and Verification Standard

This standard applies to every human or AI contributor working in this repository. It is intentionally tool-neutral and complements, rather than replaces, code review, CI, database tests, and production change control.

## 1. Definition of done

A task is not complete because code was written, a command was attempted, or an agent reported success. Completion requires evidence for the exact acceptance criteria.

Every work item must record:
- scope, owner, reviewer, affected paths, and risk classification;
- acceptance criteria written as observable outcomes;
- exact commands/checks executed and their exit status;
- positive control proving each important check can detect a known-bad case;
- negative control proving the intended valid case passes;
- test limitations, unavailable infrastructure, and any `needs-validation` items;
- downstream consumers checked when a shared field, API, schema, or event changes.

Never describe an unrun check as passed. Distinguish source review, isolated test, local integration test, CI, preview, and production verification.

## 2. Verification Discipline

Use the upstream MIT skill as a review checklist: [ppcvote/ultralab-skills — verification-discipline](https://github.com/ppcvote/ultralab-skills/tree/main/skills/verification-discipline).

Required controls:
1. Verify the actual user journey, not only internal functions. For UI work, record browser evidence; for APIs, test the caller-visible path with representative authentication; for CLI work, use a clean directory.
2. Prove checks can fail using a deliberately invalid fixture before trusting a green result.
3. Mark work complete only after the intended external effect is confirmed.
4. Count successful outcomes, not attempted work; represent missing telemetry as UNKNOWN, never zero.
5. Search all consumers before changing shared contracts and verify affected consumers.
6. When a test fails, inspect the test assumptions and fixtures before weakening assertions.
7. For silent failures, inspect early exits, actual outputs, and every layer from trigger through persistence and notification.

## 3. Security review

Use [Cloudflare security-audit-skill](https://github.com/cloudflare/security-audit-skill/tree/main/skills/security-audit) for source-first security reviews. The full six-phase audit is required for explicit comprehensive security audits; focused changes use the relevant guidance only.

The skill requires an OS-enforced sandbox for executing repository-controlled code. If no sandbox can enforce no external network, a clean allowlisted environment, read-only source, scratch-only writes, and resource limits, do not execute target-controlled code as part of the security audit. Record the limitation as `needs-validation`. Never probe production or shared infrastructure as a substitute.

Every confirmed finding must identify the affected principal, resource, trust boundary, concrete impact, source evidence, safe reproduction, severity rationale, and smallest effective remediation. Findings that cannot be safely validated remain `needs-validation`; checklist deviations alone are not vulnerabilities.

## 4. Multi-agent work allocation

Default concurrency: at most 3 active workstreams, increased only with an explicit reason and available budget.

| Role | Responsibility | Write boundary |
|---|---|---|
| Orchestrator / integrator | Defines scope, contracts, dependencies, review, and final evidence | Integration branch only |
| Implementation agent | One bounded feature or module | Own feature branch / assigned paths |
| Security reviewer | Independent source review and adversarial validation | Read-only; findings only |
| Test / verification agent | Positive/negative controls, regression and user-path tests | Test branch / assigned test paths |
| Cost observer | Records model, token, tool, CI, build, and infrastructure usage | Ledger only |

Do not assign two agents to the same files. Agents must not review their own findings. Parallelize independent research and tests, not conflicting writes. The orchestrator reconciles changes through reviewed pull requests.

## 5. Cost controls

- Prefer deterministic code, local tests, cached dependencies, and static checks before model calls.
- Do not call paid inference providers for security checks that can be performed statically.
- Use a maximum of 3 concurrent agent workstreams by default; stop duplicate or low-information tasks.
- Avoid repeated Vercel previews when the deployment quota is exhausted; batch changes into a single reviewed PR.
- Record actual usage only when the source provides it. Unknown token/API/CI spend must remain UNKNOWN, not estimated as zero.
- Never introduce a paid integration or upgrade plan without an explicit cost/benefit review and owner approval.

See [Agent and CI Cost Ledger](./agent-cost-ledger.md).

## 6. Pull request and release gates

- All code changes go through a pull request; no direct production changes.
- A PR remains draft until source review, tests, security checks, and migration review are complete.
- Database changes require migration review, local/disposable database tests, RLS verification, and explicit release approval. Never use production as a test database.
- Production deploy requires a successful reviewed main-branch build and explicit release approval.
- A deployment marked READY is not proof of user-path correctness. Verify the deployed feature and downstream effects after release.
- Failed CI, exhausted quotas, missing secrets, unavailable sandbox controls, and unexecuted integration tests are blockers, not waivers.

## 7. Required PR evidence template

Each PR description must include:
- Scope and affected trust boundaries
- Risks and data classification
- Tests run, with exact commands and results
- Positive and negative controls
- User-path / integration evidence
- Database migration and RLS impact (or explicit “none”)
- Security findings and unresolved `needs-validation` items
- Cost impact (measured or UNKNOWN)
- Rollback plan
- Explicit statement that no production DB/deployment was changed unless authorized
