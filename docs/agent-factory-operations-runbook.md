# Agent Factory V2 — Operations Readiness Runbook

## Scope and release boundary

This runbook covers the GitHub Actions + Windows self-hosted Runner workflow on `feat/agent-factory-v2` and PR #134.

- PR #134 must remain Draft until a separate human release decision.
- Do not merge, deploy, change production secrets, or run production migrations as part of this runbook.
- CI database tests create an isolated local Supabase/PostgreSQL environment. They are not production database tests.
- The scheduled workflow is defined in `.github/workflows/agent-task-preflight.yml` and currently polls every five minutes (`*/5 * * * *`). GitHub may delay scheduled events.
- The Windows Runner is a single execution lane. Workflow concurrency serializes its work; this is not multi-host parallel capacity.

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
- The current `prepare-task` job has write permissions for contents, issues and pull requests because it creates task branches/PRs and updates workflow state. Review whether this can be split into a narrow write-only publishing job before enabling autonomous operation at scale.
- Branch protection/ruleset settings could not be verified through the connected GitHub integration: the branch-protection API returned 403 (resource not accessible by integration), and repository rulesets are unavailable on the current private-repository plan. An owner must inspect repository Settings directly before release.
- Confirm repository Actions settings allow GitHub Actions to create pull requests only if the automated Draft PR publisher is intended to run. Do not enable broader workflow permissions than required.
- Rotate any credential suspected of exposure; never paste secrets into issues, PRs, logs, chat, or source files.

## Backup and rollback

- Before any future Production release, confirm a recent recoverable Supabase backup/PITR point in the Supabase Dashboard and record its timestamp. This runbook does not claim that a backup was created or restore-tested.
- Keep schema migrations backward-compatible with the currently deployed application where practical. Review migration forward/rollback implications before release; do not assume every migration is safely reversible.
- For a bad feature-branch change, prefer a new revert commit on `feat/agent-factory-v2`. Do not force-push or rewrite shared branch history.
- For a future Production incident, stop further rollout first, identify the exact Vercel deployment and database migration state, then follow the separately approved application rollback and database recovery plan. Do not blindly roll back the database after writes have occurred.
- A restore is not proven until a controlled restore test has completed and the restored application has passed health, authentication, and data-integrity checks.

## Release gates still outstanding

1. Complete CI on the current PR head, including local PostgreSQL/RLS tests.
2. Complete an actual unattended 24-hour Runner soak. The existing 24-hour lifecycle test is simulated time and is not a wall-clock soak.
3. Verify runner restart/reconnect and Docker/Ollama recovery with recorded workflow evidence.
4. Obtain owner confirmation of branch protection, required status checks, Actions workflow permissions, secrets and environment protections.
5. Review the job-level write permission boundary in `agent-task-preflight.yml`.
6. Verify backup/PITR readiness and perform a controlled restore rehearsal.
7. Resolve Vercel Preview capacity and complete a separate Preview smoke test.
8. Obtain explicit human approval before changing PR #134 from Draft, merging, or deploying.

## Evidence record

Record each rehearsal with UTC start/end time, commit SHA, workflow run URL, runner state, test outcome, incident, recovery action, and operator. Do not describe simulated time as elapsed wall-clock time.
