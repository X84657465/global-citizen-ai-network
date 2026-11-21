# Agent Factory V2 — Operations Readiness Runbook

## Scope and release boundary

This runbook covers the current mainline Agent Factory V2 operations defined by:

- `.github/workflows/agent-task-preflight.yml` — task intake, five-minute scheduled preflight, durable state/lease gates, controlled dispatch and candidate publication.
- `.github/workflows/ci.yml` — exact-head candidate metadata resolution, Windows quality/build, database/RLS, Ollama integration and candidate outcome evidence.
- `.github/workflows/agent-factory-system-health.yml` — post-CI global breaker recovery, which must use trusted mainline controller code and verified exact-run evidence.

The current mainline workflow declares `schedule: "*/5 * * * *"`, `issues: opened/reopened`, `repository_dispatch: ai-task-next`, and `workflow_dispatch` with an explicit `issue_number`. These are configured triggers, not proof that a scheduled run was dispatched, that the Runner is online, or that a task executed successfully. Verify each fact from the exact GitHub Actions run and job records.

- The Windows self-hosted Runner is one execution lane, not multi-host parallel capacity. Preserve shared Runner serialization for all state writers.
- CI database tests use isolated local Supabase/PostgreSQL. They are not production database tests.
- This runbook does not authorize merges, production deployments, production migrations, secret changes, or live paid AI activation.
- The current handoff file `docs/AGENT_HANDOFF.md` records the latest main SHA, active PRs, run IDs and blockers. Refresh it after every development round; this runbook records durable operating procedures.

## Mainline scheduling and controlled dispatch

GitHub evaluates scheduled and issue-event workflows from the repository's default branch. The current mainline `.github/workflows/agent-task-preflight.yml` declares the five-minute schedule and `issues: opened/reopened` trigger. The old instruction to select `feat/agent-factory-v2` for normal operation is historical and must not be followed as the default operating path.

### Controlled manual dispatch

1. Open **Actions → AI Agent Task Preflight → Run workflow**.
2. Select the intended branch only after confirming it contains the reviewed controller/workflow version. For normal operation, use `main`.
3. Enter the explicitly approved task Issue number.
4. Before starting, verify no active task lease, cooldown, quarantine, or duplicate workflow already owns that task.
5. After dispatch, record the run URL, run ID, attempt, branch and exact checked-out SHA. Confirm the Windows job is actually assigned and inspect its steps.
6. Read back durable state and the candidate PR metadata before any retry. Never dispatch duplicates to bypass a lease, backoff, quarantine or pending queue.

Operational consequences:

- A configured cron or issue trigger is not evidence of a live scheduler or successful Runner execution. Inspect Actions.
- The durable state Issue is machine-managed. Do not edit its JSON manually, create a replacement state Issue, or clear processed-event keys to force progress.
- The task selector, state machine, exact-head candidate resolver, and publisher are one controlled workflow. Do not bypass the durable lease, candidate branch naming, task marker, isolation or evidence checks.
- Pull-request CI can validate code without proving that the default-branch scheduler or state writer is operational.
- Any migration of the durable state format requires exact-SHA regression evidence and a read-back proving schema version and preserved task/system history.

## Normal health checks

Before treating an Agent Factory failure as an application defect, verify in this order:

1. **GitHub Actions:** inspect the latest CI and Agent Task Preflight runs. Record the run URL, run ID, attempt, branch and exact tested commit SHA.
2. **Runner:** confirm the Windows self-hosted Runner is online and has the expected `self-hosted`, `Windows`, `X64` labels. Confirm the job is queued for the expected runner rather than silently waiting for an unavailable host.
3. **Host toolchain:** verify Node.js/npm, Docker Desktop/Engine, and the local Ollama API are available. The CI smoke checks exercise these dependencies.
4. **Isolation:** candidate dependency installation and candidate tests must remain inside the pinned disposable Docker image. Do not run generated candidate code directly in the normal Windows host session.
5. **Durable state:** inspect the Agent Factory state issue and candidate PR metadata before manually retrying. Do not edit state JSON or create a second PR to bypass a lease, backoff, quarantine, or superseded state.

## Runner interruption and recovery

If the PC sleeps, restarts, loses network, or Docker/Ollama stops:

1. Do not repeatedly dispatch duplicate tasks. First inspect the existing workflow run and durable task state.
2. Restore the PC's network connection and keep it awake for the recovery window.
3. Start Docker Desktop and wait until `docker info` succeeds.
4. Start Ollama and verify the local API responds at `http://127.0.0.1:11434/api/tags`. Do not download a new model as an incident workaround without checking disk and memory capacity.
5. Confirm the GitHub Actions Runner application/service is running. If it was installed as a Windows service, use Windows Services to restart that service; if it is operated interactively, restart it using the repository runner's own `run.cmd` in its configured directory. Do not run both modes at once.
6. Return to GitHub Actions and verify the queued job is picked up. If a job was cancelled or timed out, inspect durable task state and let the scheduler's retry/backoff policy decide eligibility.
7. After recovery, verify the next CI/smoke run on the exact commit SHA. Preserve logs for the interrupted run.

Do not delete the Runner's `_work` directory, remove Docker volumes, reset the repository checkout, or clear durable task state as a first-line recovery action. These actions can destroy evidence or active work.

## Failure triage

- **Build/test failure:** inspect the failed step and classify whether it is a candidate assertion failure or a host/system failure. Do not mark a candidate successful from partial checks.
- **Database job failure:** distinguish Supabase CLI installation, container startup, migration application, and PostgreSQL/RLS assertion failures. The workflow's cleanup step should stop the local Supabase services; verify the job log before assuming cleanup completed.
- **Ollama failure:** verify the API and installed model before retrying. A CLI being installed is not proof that inference works.
- **Candidate retry/backoff:** respect `next_attempt_at`, failure count and quarantine. Do not manually reset a task to `queued` unless the underlying failure is understood and the state transition is audited.
- **Vercel Preview quota:** treat a build-rate-limit response as an external Preview capacity issue, not as proof that GitHub CI passed or failed. Do not upgrade a plan or trigger Production deployment without separate approval.

## Security controls and open checks

- All workflow `actions/checkout` steps must set `persist-credentials: false`. A regression test enforces this across workflow YAML files.
- Keep write-capable `GITHUB_TOKEN` use step-scoped and pass only the minimum required permissions to each job.
- Candidate code must not receive GitHub tokens, Supabase credentials, production environment variables, Docker socket access, or host filesystem mounts.
- The current `prepare-task` job has `actions: none`; it retains `contents: write`, `issues: write`, and `pull-requests: write` because it creates task branches/PRs and updates workflow state. A future hardening task should trace each API call and split task preparation from a narrow write-only publisher before enabling autonomous operation at scale.
- Branch protection/ruleset settings could not be verified through the connected GitHub integration: the branch-protection API returned 403 (resource not accessible by integration), and repository rulesets are unavailable on the current private-repository plan. An owner must inspect repository Settings directly before release.
- Confirm repository Actions settings allow GitHub Actions to create pull requests only if the automated Draft PR publisher is intended to run. Do not enable broader workflow permissions than required.
- Rotate any credential suspected of exposure; never paste secrets into issues, PRs, logs, chat, or source files.

## Fine-grained token and publisher boundary audit

The preflight workflow currently grants its single `prepare-task` job `contents: write`, `issues: write`, and `pull-requests: write`, while explicitly setting `actions: none`. The permissions are job-scoped, not step-scoped; putting a token only in selected step environments reduces accidental exposure but does not reduce the job's GitHub API authority.

Observed API responsibilities in the current implementation:

- `contents: write`: the deterministic publisher creates/updates the candidate branch and commit before opening a Draft PR.
- `pull-requests: write`: the publisher opens the task's Draft PR.
- `issues: write`: the V2 state store creates/updates the durable state Issue; the planner creates task Issues; the publisher posts a task Issue comment.
- `issues: read`: task preflight reads the selected task Issue; queue selection and state recovery also enumerate Issues.
- `actions: none`: retained intentionally; the preflight job does not need Actions API write authority.

Candidate code is executed in disposable Docker containers. The workflow does not pass `GITHUB_TOKEN`, `GH_TOKEN`, or `GITHUB_*` environment variables into candidate install/test containers; candidate tests run with `--network none`, `--cap-drop ALL`, and `--read-only`. New regression tests now enforce the token-isolation boundary and ensure credential injection remains in named trusted orchestration/publisher steps.

**Do not claim least-privilege completion yet.** Because GitHub token permissions are job-scoped, the remaining write scopes are still available to trusted steps throughout the combined job. A safe future split should introduce a distinct publisher job with only `contents: write` and `pull-requests: write`, and a state/issue writer with only `issues: write`; read-only preparation should receive only `contents: read` and `issues: read`. The split must explicitly transfer and validate immutable task/plan/patch artifacts, candidate base SHA, lease ID, issue number, runner identity and exact test evidence. It must preserve single-runner serialization, lease recovery, idempotent deterministic branch publication, failure classification, and cleanup. Do not split until integration tests cover cancellation, artifact expiry/tampering, stale base commits, publisher retries, and partial state-write recovery.

## Processed-event ledger capacity

- V2 currently stores at most 500 processed event keys in the durable state Issue.
- The state machine must never evict an older key to make room: replaying an evicted system/candidate event could otherwise apply a stale side effect again.
- When the ledger reaches capacity, new event-bearing transitions fail closed with an explicit capacity error; already-recorded duplicate events remain harmless and return as duplicates.
- This is an intentional safety stop, not normal steady-state operation. Before the limit is reached in sustained production use, implement and test a schema migration to a compact, auditable idempotency representation (for example, per-task candidate event identity plus monotonic workflow-run/attempt watermarks where the source guarantees ordering). Do not manually delete processed keys or edit the state Issue to bypass the stop.
- Monitor the serialized state Issue size and processed-event count. A full ledger requires a reviewed migration and recovery procedure; it must not be silently reset.

## Backup and rollback

- Before any future Production release, confirm a recent recoverable Supabase backup/PITR point in the Supabase Dashboard and record its timestamp. This runbook does not claim that a backup was created or restore-tested.
- Keep schema migrations backward-compatible with the currently deployed application where practical. Review migration forward/rollback implications before release; do not assume every migration is safely reversible.
- For a bad feature-branch change, prefer a new revert commit on the affected branch. For a mainline change, use a reviewed revert PR and verify the exact reverted SHA. Do not force-push or rewrite shared branch history.
- For a future Production incident, stop further rollout first, identify the exact Vercel deployment and database migration state, then follow the separately approved application rollback and database recovery plan. Do not blindly roll back the database after writes have occurred.
- A restore is not proven until a controlled restore test has completed and the restored application has passed health, authentication, and data-integrity checks.

## Latest verified evidence (2026-11-22)

- Main HEAD at the latest handoff check: `4d3653b3da766ae3910aeef39bd840d2e6de30dd`.
- Main CI run [#44928069201](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44928069201) was pending with zero jobs assigned. This is queue/dispatch evidence only; it is neither a pass nor a test failure.
- Main Agent Task Preflight run [#44928069246](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44928069246) was pending. Its existence does not prove the task job ran or completed.
- Main Agent Factory System Health Recovery run [#44928172808](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44928172808) was pending with no jobs assigned. Do not infer Runner offline from an empty job list.
- The active PR heads, exact CI runs and review states are maintained in `docs/AGENT_HANDOFF.md`. At this check, the active A-line candidate/recovery PRs had not produced a complete successful exact-head Windows quality, database/RLS and Ollama evidence set.
- Recent Vercel statuses report `Deployment rate limited — retry in 24 hours`. This is an external Preview capacity limitation, not GitHub CI evidence. No Preview or Production deployment is claimed.
- Workflow Checkout steps set `persist-credentials: false`; the repository policy test enforces this.
- The preflight workflow still has a combined trusted orchestration/publisher job with write-capable token scopes. The scopes are job-scoped; step-scoped environment injection reduces accidental exposure but does not create true least privilege. Do not claim least-privilege completion.
- No Production database mutation, secret change, or Production deployment was performed as part of this verification.

## Historical evidence (2026-11-19 and earlier)

- PR #134 head `7dfa22be7cd2624badfd57b269fd9f2894669017` completed CI run [#44507769727](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44507769727) successfully. That run passed 249/249 unit tests, isolated local Supabase migrations and PostgreSQL/RLS checks, Ollama structured inference, TypeScript, ESLint, production build, and dependency audits (0 reported vulnerabilities).
- Runbook commit `f8afc46c833a67311e93ffd4638981396750a8b0` completed CI run [#44508384407](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44508384407) successfully. These results are historical evidence for those exact SHAs; they do not prove the current main or active PR heads pass.
- Windows Runner read-only smoke run [#44507755044](https://github.com/X84657465/global-citizen-ai-network/actions/runs/44507755044) passed on the development branch. It verified Runner identity, Windows/x64, Node.js/npm, checkout, and workspace presence; it was not a restart/reconnect rehearsal.

## Release gates still outstanding

1. Obtain complete exact-head Windows CI evidence for the current A-line candidate/recovery changes: resolver, quality/tests/types/lint/audit/production build, isolated database/RLS, Ollama/local execution, and required outcome evidence.
2. Verify the health-recovery controller rejects missing, skipped, duplicated, wrong-attempt and wrong-SHA required jobs before any durable breaker reset.
3. Complete an actual unattended 24-hour Runner soak. The existing 24-hour lifecycle test is simulated time and is not a wall-clock soak.
4. Verify Runner restart/reconnect and Docker/Ollama recovery with recorded workflow evidence; the historical read-only smoke run does not prove recovery after interruption.
5. Obtain owner confirmation of branch protection, required status checks, Actions workflow permissions, secrets and environment protections.
6. Trace all publisher API calls and evaluate splitting task preparation from narrow write-only publisher/state-writer jobs. Preserve artifact integrity, lease recovery, exact candidate evidence and single-runner serialization.
7. Verify backup/PITR readiness and perform a controlled restore rehearsal.
8. Resolve Vercel Preview capacity and complete a separate Preview smoke test.
9. Obtain explicit human release approval before promoting any Draft PR, merging, or deploying.

## Evidence record

Record each rehearsal with UTC start/end time, commit SHA, workflow run URL, runner state, test outcome, incident, recovery action, and operator. Do not describe simulated time as elapsed wall-clock time.


## Cross-track CI evidence export

- Candidate success/failure callbacks emit a machine-readable `EvidenceRecord v1.0.0` containing repository, exact task branch, 40-character commit SHA, result, canonical GitHub Actions run URL, timestamp and task/PR/run identifiers in the command label.
- The seven-field record is compatible with the Deep Neural `EvidenceRecord` validator introduced in Track D 0.2.0 and unchanged through D 0.2.3. Terminal CI success/failure map to `pass`/`fail`; cancelled or non-terminal runs are not scored.
- GitHub Actions uploads `candidate-evidence.json` for 90 days. Predictive Coding may ingest it only after checking repository, branch, SHA, run URL, timestamp and source provenance. It is evidence, never a production command.
- Duplicate callback replays do not emit another artifact. Durable task state and callback idempotency remain authoritative.
- This creates an export path only; live C/D ingestion still requires an explicit receiver and compatibility tests.
