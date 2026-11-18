# Agent and CI Cost Ledger

Purpose: expose the marginal cost of parallel development and platform operation without inventing usage data. This repository currently has no verified per-agent token telemetry integration, so unmeasured fields remain UNKNOWN.

## Workstream allocation

| Workstream | Owner role | Default concurrency | Deliverable | Cost policy |
|---|---|---:|---|---|
| Architecture / implementation | Orchestrator + implementation agent | 1 | Reviewed PR | Reuse existing code and dependencies |
| Security review | Independent security reviewer | 1 | Findings with evidence | Static/source-first; no paid model scan |
| Verification | Test agent | 1 | Positive/negative controls and user-path evidence | Local/disposable tests before CI |
| Cost and observability | Cost observer | 1 | Actual usage and cost record | Read existing telemetry; no new paid service |

Maximum default concurrency is 3 active workstreams. Roles can be combined for small changes, but an agent must not independently validate its own security findings.

## Per-task record

Copy one row per task and populate only from actual evidence.

| Date (UTC) | PR / task | Workstream | Model / tool | Input tokens | Output tokens | Tool calls | CI minutes | Vercel builds | Provider spend | Infra spend | Evidence |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| YYYY-MM-DD | — | — | — | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | No usage source recorded |

## Existing telemetry integration

- **GitHub:** PR metadata, review status, Actions run outcomes, and run duration where available.
- **Vercel:** deployment state, build logs, and deployment count. A deployment attempt is not a successful release.
- **Supabase:** project health and migration inventory are read-only operational signals. Do not write to production to collect metrics.
- **PostHog:** use the already-connected project for product/error analytics only after confirming the active project, event schema, and whether the application SDK is actually installed. Do not assume that a connected ChatGPT integration means the website emits events.

Do not duplicate event pipelines or install a second paid observability vendor while existing free-tier tools are sufficient.

## Cost guardrails

1. Prefer static analysis and local tests over model-based checks.
2. Run one consolidated preview per PR; do not repeatedly trigger deployments after quota exhaustion.
3. Do not increase plan tiers or enable paid features without an explicit approval.
4. Do not infer token costs from message count. Record token usage only from provider/API usage records.
5. Mark missing data UNKNOWN. Zero means a verified zero from a named data source and time window.

## Monthly review

Report:
- number of PRs and review outcomes;
- CI runs, failed runs, minutes, and quota failures;
- Vercel build attempts, successful deployments, and failed deployment causes;
- Supabase health and migration drift;
- PostHog event/error coverage;
- measured model/provider and infrastructure spend;
- unmeasured cost categories and actions to instrument them.
