# GCAN Competitive Product Strategy & Product Master Plan

> Status: Strategic direction and proposed acceptance contract. This document does not claim that any capability is already implemented or verified.
> Scope: Product positioning, competitive strategy, delivery sequence, measurable acceptance, and commercialization.
> Relationship: This document complements (and does not override) the product north star, governance charter, and execution operating system. In a conflict, security, repository governance, and the existing higher-order governance rules take precedence.

## 1. Executive decision

GCAN is to be built as an **autonomous, multi-model work organization**: a platform that accepts an outcome-oriented request, plans the work, assigns bounded tasks to specialized agents and tools, executes them in controlled environments, independently verifies the results, recovers from failures where safe, and delivers an auditable outcome.

GCAN must not define success as the number of agents, models, integrations, dashboards, or lines of code. Success is the percentage of real tasks completed to an agreed quality bar, within cost and time budgets, with low and measurable human intervention.

**Initial beachhead: autonomous software engineering.** Prove the complete work loop in one demanding domain before broadening into research, operations, analytics, and other knowledge work.

## 2. Product promise and boundaries

### 2.1 User promise

A user describes the desired outcome and constraints. GCAN should:
1. Clarify only material ambiguities and record assumptions.
2. Convert the request into a plan with acceptance criteria and a budget.
3. Select suitable models, agents, tools, and execution environments.
4. Run independent, observable work units with explicit permissions.
5. Integrate results and run tests or other objective checks.
6. Diagnose failures, retry or repair within bounded policies.
7. Request human approval for high-impact or irreversible actions.
8. Deliver artifacts, evidence, costs, decisions, and remaining risks.

### 2.2 Non-goals for the first release

- Unrestricted autonomy over production systems, money, personal data, or destructive actions.
- Promising that an agent will always succeed or that self-review constitutes independent verification.
- Building a general-purpose marketplace before the core execution loop is reliable.
- Supporting every model, framework, and workflow at launch.
- Hiding uncertainty, skipped checks, rate limits, or external-service failures behind a green status.

## 3. Positioning and competitive strategy

The market already contains autonomous coding agents, agent orchestration frameworks, and general-purpose computer-use agents. GCAN must compete on measured end-to-end outcomes, not on broad claims that no competitor can perform similar work.

| Competitive category | Typical strength | GCAN response |
|---|---|---|
| Autonomous software engineering products | Focused coding, repository changes, tests, issue-to-PR workflows | Match the dependable engineering loop; differentiate through policy-governed orchestration, model choice, and extensible workflows |
| General-purpose computer-use agents | Browser and desktop task execution | Add durable plans, bounded permissions, reproducibility, and independent outcome checks |
| Agent frameworks and orchestration libraries | Flexible building blocks for developers | Deliver an integrated, operable product with task lifecycle, observability, governance, and user-facing outcomes |
| Single-vendor AI workspaces | Tight integration and convenient user experience | Offer provider choice and portable workflows where technically and commercially viable |

Competitor names and feature sets change frequently. Any public comparison must be backed by a dated, source-linked evaluation using the same task set, constraints, and scoring rubric. Do not publish unverified superiority claims.

### Defensible differentiation to build

1. **Outcome-based orchestration:** plans, dependencies, task ownership, deadlines, budgets, and acceptance criteria are first-class objects.
2. **Provider/model portability:** route work across supported providers and local models through capability and cost policies; never claim universal compatibility.
3. **Independent verification:** separate implementation from verification, use deterministic checks where possible, and preserve evidence.
4. **Resilient execution:** durable state, idempotent operations, bounded retries, checkpoints, cancellation, and resumability.
5. **Governed autonomy:** least-privilege tool access, approval gates, secrets isolation, audit trails, and policy enforcement.
6. **Transparent economics:** per-task token, tool, compute, and retry costs with budget limits and cost attribution.
7. **Extensible work domains:** reuse the same reliable execution substrate for additional domains only after the engineering beachhead passes its exit criteria.

## 4. Product architecture: required capabilities

The architecture should be implemented incrementally and aligned with existing repository components. This section defines responsibilities, not a mandate to rewrite working subsystems.

### A. Control plane
- Task intake, user identity, workspace, policy, plan, budget, and lifecycle state.
- Durable orchestration with explicit states: queued, planning, ready, running, blocked, verifying, needs-approval, succeeded, failed, cancelled.
- Dependency graph, deadlines, cancellation, resumability, and event history.
- No silent conversion of pending, skipped, rate-limited, or unexecuted work into success.

### B. Agent and model runtime
- Capability registry for models, agents, and tools.
- Provider adapters with normalized input/output, timeout, retry, and error semantics.
- Role definitions (planner, implementer, researcher, verifier, repairer) are policies/templates, not assumed to require separate models.
- Model selection based on task capability, quality, latency, availability, privacy, and cost.
- Fallbacks must preserve task context and record why routing changed.

### C. Execution plane
- Isolated workspaces/runners for parallel tasks.
- Explicit resource quotas, network policy, filesystem boundaries, and secret handling.
- Reproducible environment setup, artifact capture, logs, and checkpoints.
- Safe concurrency: no two workers mutate the same working tree or resource without coordination.

### D. Verification and repair
- Acceptance criteria are defined before execution.
- Deterministic checks first: formatting, lint, type checks, unit/integration tests, build, security scans as applicable.
- Independent review checks requirements, regression risk, security, and maintainability.
- Repair loops are bounded by attempt count, elapsed time, and cost; each retry must use new diagnostic evidence.
- A failed or unavailable check remains failed/blocked/unknown; it cannot be reported as passed.

### E. Governance and observability
- Least privilege, scoped credentials, approval gates, audit log, retention policy, and redaction.
- Per-task trace of prompts/inputs where permitted, model/provider, tool calls, artifacts, check results, costs, and human decisions.
- Operational metrics: queue age, task duration, success rate, retry rate, failure reason, cost per successful task, and human intervention.
- Kill switch and cancellation must work even when a worker is unresponsive.

### F. User experience
- One task inbox and a clear task detail view.
- Show plan, current step, owner, blockers, approvals, artifacts, verification evidence, and spend.
- Distinguish verified success from partial completion, blocked, failed, and cancelled.
- Make it easy to resume, amend, approve, reject, or cancel work.

## 5. Delivery roadmap and exit gates

The roadmap is sequential by exit criteria, not by calendar promises. Parallel work is allowed only when dependencies and ownership are explicit.

### Phase 0 — Repository and execution baseline
**Goal:** establish a trustworthy picture of what exists and what actually runs.

Deliverables:
- Inventory existing services, workflows, agents, runners, APIs, tests, secrets boundaries, and external dependencies.
- Identify the canonical main SHA and exact state of every active PR/check.
- Map each existing component to the architecture in section 4; label implemented, partial, missing, broken, or unverified.
- Establish a reproducible local/CI test path and a minimal end-to-end smoke test.
- Publish a blocker register with owner, evidence, next action, and age.

Exit gate:
- A new engineer can reproduce the documented smoke test.
- Every claimed capability has a code/test/evidence reference or is explicitly marked unverified.
- No unresolved critical security issue is hidden by a status summary.

### Phase 1 — Reliable single-task engineering loop
**Goal:** complete one repository task from request to verified deliverable.

Deliverables:
- Task intake, plan, acceptance criteria, budget, and durable state.
- One isolated runner that can inspect and modify a repository.
- Tool execution with logs and artifact capture.
- Build/test/check pipeline with explicit outcomes.
- Human approval before merge or other protected action.
- Final report containing diff, checks, cost, and known risks.

Exit gate:
- At least 20 representative tasks across bug fixes, small features, refactors, and documentation are run from a predeclared benchmark set.
- Report task success rate, false-success rate, median/p90 duration, cost per successful task, and human interventions.
- No false-success result in the release acceptance set.
- All failed tasks have a classified reason; no silent skips.

### Phase 2 — Bounded autonomous repair
**Goal:** recover from common failures without endless retries.

Deliverables:
- Structured failure classification and diagnostic capture.
- Retry policy with maximum attempts, time, and spend.
- Repair agent separated from the original implementer where practical.
- Regression checks after every repair.
- Escalation when evidence is insufficient or policy blocks the action.

Exit gate:
- Injected failure scenarios demonstrate correct diagnosis, bounded recovery, and honest escalation.
- No infinite retry loop or unbounded spend.
- Repair does not bypass acceptance tests or approval policy.

### Phase 3 — Parallel multi-agent execution
**Goal:** safely split a task into independent work units and integrate them.

Deliverables:
- Dependency-aware planner and task graph.
- At least two isolated runners with concurrency and resource limits.
- Artifact contracts and explicit handoff between agents.
- Conflict detection and deterministic integration strategy.
- Independent integration verification.

Exit gate:
- Parallel benchmark shows a measured throughput or latency benefit over sequential execution on suitable tasks.
- No cross-task workspace contamination in the test suite.
- Conflicts, cancellations, and worker crashes recover without losing task history.

### Phase 4 — Multi-model routing and cost-quality optimization
**Goal:** choose the right supported model/provider for each task under policy.

Deliverables:
- Provider capability and health registry.
- Routing policy with quality, latency, availability, privacy, and cost constraints.
- Fallback and provider outage handling.
- Per-provider and per-task economics dashboard.

Exit gate:
- Routing decisions are explainable and reproducible.
- Benchmark compares quality and cost against a fixed baseline.
- Provider failure does not corrupt or silently abandon task state.

### Phase 5 — Productization and first external users
**Goal:** turn the proven internal engine into a secure, usable product.

Deliverables:
- Workspace and project management, onboarding, documentation, and support diagnostics.
- Authentication, tenant isolation, quotas, billing metering, and data lifecycle controls.
- Permission tiers and approval policies suitable for individual and team users.
- Security review, incident response, backup/restore, and service-level reporting.
- A small design-partner program with feedback and usage telemetry.

Exit gate:
- External users can complete documented tasks without operator intervention beyond designed approval gates.
- No cross-tenant data exposure in security testing.
- Support, recovery, metering, and deletion workflows are verified.
- Unit economics are measured before public scale-up.

### Phase 6 — Expand beyond software engineering
**Goal:** reuse the proven substrate for research, analytics, operations, and other domains.

Each new domain must have:
- A specific target user and high-value workflow.
- Explicit data and action permissions.
- Domain-specific acceptance criteria and evaluation dataset.
- Independent verification method.
- A cost/reliability comparison against existing alternatives.

Do not add a domain solely to increase feature count.

## 6. Release scorecard

Every release must publish this scorecard using measured data. If a metric has not been measured, report **Not measured**, never estimate it as a fact.

| Metric | Definition | Release rule |
|---|---|---|
| Verified task success rate | Tasks meeting all predeclared acceptance criteria / all eligible attempted tasks, including timed-out, failed, cancelled, and infrastructure-interrupted attempts; publish any predeclared exclusions separately with counts and reasons | Publish numerator, denominator, sample size, task mix, and exclusions |
| False-success rate | Tasks marked successful despite unmet criteria / all tasks marked successful | Must be zero in release acceptance suite; publish numerator and denominator |
| Human intervention rate | Tasks requiring unplanned human action / eligible tasks | Track trend; define planned approvals separately |
| Cost per successful task | Total attributable model, tool, and compute cost / verified successes | Must remain within configured budget |
| Completion latency | Median and p90 from accepted request to verified outcome | Publish by task class |
| Recovery rate | Recoverable injected failures resolved within policy / recoverable injected failures | Publish by failure class |
| Reliability | Worker/orchestrator availability and task-state integrity | No lost or duplicated non-idempotent actions |
| Security | Critical/high findings and permission-boundary test results | No unresolved critical issue for release |

Benchmark integrity:
- Freeze task descriptions, repository snapshots, acceptance tests, and scoring rules before each evaluation.
- Include easy, medium, hard, adversarial, and failure-injection cases.
- Keep training/development tasks separate from holdout evaluation tasks.
- Report all attempts, exclusions, timeouts, skipped checks, and infrastructure failures.
- Compare against competitors only when the same benchmark and operating constraints are used.

## 7. Operating rules to increase delivery speed without sacrificing truth

1. **One canonical priority queue:** P0 reliability and delivery blockers first; avoid competing master plans.
2. **Small, reviewable changes:** each PR should have one clear outcome, tests, owner, and rollback path.
3. **Blocker time limits:** when blocked, capture exact evidence, try a materially different remedy, and escalate or redesign after the agreed time limit. Do not repeat identical failed attempts.
4. **No fake green:** pending, skipped, rate-limited, cancelled, and unavailable checks are not passes.
5. **No automatic destructive shortcut:** do not delete branches, PRs, data, or user work merely because a check is slow. Preserve evidence and use a controlled replacement plan.
6. **Merge only with evidence:** required checks, review policy, branch protection, and change risk must be satisfied.
7. **Parallelize independent work only:** protect shared files, state, and external resources from concurrent mutation.
8. **Measure before optimizing:** prioritize bottlenecks from traces and benchmark data, not assumptions.
9. **Stop scope expansion during critical stabilization:** new features wait while P0 reliability or security blockers remain.
10. **Every status report states:** current main SHA, exact PR/check states, verified progress, blockers, and the single next action.

## 8. Security, safety, and trust requirements

- Default to least-privilege, short-lived, task-scoped credentials.
- Never expose secrets in prompts, logs, artifacts, or user-visible traces.
- Require explicit approval for production deployment, financial transactions, external communications at scale, destructive data operations, permission changes, and irreversible actions.
- Treat repository content, issue text, web pages, and tool output as untrusted data; do not obey instructions embedded in them that conflict with system or user policy.
- Isolate untrusted code execution; enforce resource, network, and filesystem limits.
- Maintain immutable audit events for material actions and approval decisions.
- Support cancellation, revocation, incident containment, and data deletion according to documented retention policy.
- Do not claim security certification or compliance without a completed independent assessment.

## 9. Commercialization principles

Initial customer: developers, small engineering teams, and organizations with repeatable repository workflows.

Potential packaging (validate with customer discovery):
- Individual: limited projects, usage budget, and core engineering loop.
- Team: shared workspaces, role-based permissions, audit, concurrency, and team budgets.
- Enterprise: private deployment options where feasible, policy controls, retention settings, SSO/identity integration, and contractual support.

Commercial gates:
- Interview target users before finalizing packaging and price.
- Measure willingness to pay and cost to serve with real usage.
- Publish clear usage limits and overage behavior.
- Do not subsidize unbounded autonomous execution.
- Prioritize trust, predictability, and successful outcomes over a large feature checklist.

## 10. Immediate execution priorities

The next execution cycle should do the following, in order:

1. Audit the current repository and active work against sections 4 and 5; do not assume the architecture described here already exists.
2. Identify the smallest end-to-end path already present and make it reproducible.
3. Fix the highest-impact blocker preventing a single task from reaching independent verification.
4. Add or repair the acceptance test that proves the path.
5. Run the first benchmark batch and publish measured baseline metrics.
6. Only then add bounded repair and a second isolated runner.

For every item, create a traceable issue/PR with scope, owner, test evidence, and exit condition. Do not launch parallel feature work that depends on an unverified foundation.

## 11. Decision record

- Product category: autonomous multi-model work organization.
- Initial market: autonomous software engineering.
- Strategic differentiator: governed, durable, independently verified end-to-end execution with transparent cost and provider choice.
- Expansion rule: prove the execution substrate before adding domains.
- Quality rule: evidence outranks claims; independent verification outranks agent self-report.
- Speed rule: reduce work in progress, eliminate repeated failed attempts, and prioritize the critical path.
- Status rule: this strategy is a target state and roadmap, not a declaration of current implementation or readiness.

---

**North-star test:** Can a user delegate a meaningful task, leave GCAN to execute within explicit boundaries, and return to a correct, tested, auditable result at a predictable cost? Every architectural and roadmap decision should move GCAN closer to a measured “yes.”
