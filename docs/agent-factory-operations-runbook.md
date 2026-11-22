# Agent Factory V2 — Operations Readiness Runbook

> **核心架構依據：** 工廠長期自主開發使命、A0–A6 成熟度、模型／工具可替換原則及人工核准邊界，統一依 [Agent Factory 自主開發最高核心章程](AGENT_FACTORY_AUTONOMY_CHARTER.md)。本 runbook 僅描述已存在或已驗證的操作；不得把章程中的目標能力當成現有功能。


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

GitHub evaluates scheduled workflows and issue events from the repository's default branch only. The current mainline `.github/workflows/agent-task-preflight.yml` declares the five-minute schedule and `issues: opened/reopened` trigger. The old instruction to select `feat/agent-factory-v2` for normal operation is historical and must not be followed as the default operating path.

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

## Candidate metadata resolver and Windows queue boundary

The current mainline CI resolver `resolve-candidate` performs GitHub PR/Issue metadata verification and reads the Factory state Issue for authorized AI-task candidates. It is currently configured on the Windows self-hosted Runner and takes the same shared concurrency group as machine-dependent CI. This means metadata-only work can wait behind the Windows execution lane before the quality, Ollama and database jobs even become eligible.

The hosted separation experiment was attempted in [PR #243](https://github.com/X84657465/global-citizen-ai-network/pull/243) and closed without merge:

- PR #243's exact-head run #44929303631 failed before recording any resolver steps; the job had no runner assignment and no retrievable log artifact. The available evidence does not establish the failure cause.
- The PR was closed without merge. No downstream Windows job ran, so this did not validate the hosted resolver or unblock the Windows queue.
- Keep the current resolver on the Windows self-hosted Runner until hosted-runner availability can be confirmed through an authorized minimal diagnostic and the usage/billing boundary is known.
- Do not move candidate execution, privileged writes or state mutation to a hosted runner.

## Recovery queue scope and state-writer serialization

The current mainline `.github/workflows/agent-factory-system-health.yml` places the shared concurrency group under `jobs.reset-system-breaker.concurrency`, not at workflow scope. This change was merged through [PR #240](https://github.com/X84657465/global-citizen-ai-network/pull/240).

- A completed `workflow_run` event can still start the workflow for successful, failed, cancelled, skipped and unrelated PR CI completions, but only an eligible job reserves the shared Windows Runner queue.
- The recovery job requires a successful `pull_request` workflow run, a same-repository head repository, a non-empty PR association, and a branch beginning `ai-task/issue-`.
- The shared concurrency group remains `global-citizen-ai-network-self-hosted-runner` with `cancel-in-progress: false` and `queue: max`. Do not remove serialization: the recovery job is a durable state writer.
- The publisher's branch form is `ai-task/issue-${issueNumber}-${digest}`, with a 12-character lowercase hexadecimal digest. The controller independently validates PR, issue, branch and exact-SHA provenance; the branch prefix is only a queue eligibility filter.
- The recovery job remains on the Windows self-hosted Runner and checks out trusted `main`. Never execute PR code or move privileged state mutation to an untrusted runner.
- Current mainline workflow and regression-test source both contain this job-level queue policy. Existing runs queued under the former workflow-level configuration are not retroactively changed; verify newly triggered eligible and ineligible events after the merge.
- PR #240's exact-head resolver check was still pending in the latest inspection and no independent review was recorded. The code is merged, but end-to-end operational acceptance still requires post-merge Actions evidence.

## Normal health checks

Before treating an Agent Factory failure as an application defect, verify in this order:

1. **GitHub Actions:** inspect the latest CI and Agent Task Preflight runs. Record the run URL, run ID, attempt, branch and exact tested commit SHA.
2. **Runner:** inspect whether the job has actually been assigned to a runner and record `runner_name`, labels, queue delay and job steps. A pending job with no runner assignment is not evidence that the Runner is offline; do not infer host availability from an empty job record.
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

## GitHub API rate-limit cooldown and persistence boundary

- The Factory controller captures a classified GitHub API rate-limit deadline from `Retry-After` or `x-ratelimit-reset`, bounds it, and passes it to the system-failure callback. The state machine preserves the later of that provider deadline, any existing cooldown, and the 15-minute system breaker floor once the three-failure threshold is reached.
- Capturing the deadline in a workflow output is **not** proof that it was durably persisted. The callback writes the cooldown to the machine-managed Factory state Issue through the same GitHub API provider; a hard API rate limit can block that write too.
- **Publisher cooldown handoff (M-01, current-main gap / candidate remediation):** current `main` still lacks the durable publisher-to-callback handoff, so the risk remains open on the production baseline. Draft PR #333 proposes a run- and attempt-scoped, one-day sanitized artifact containing only the validated UTC deadline; the downstream `record-publication` job validates the timestamp before restoring it for the failure callback. Latest candidate HEAD `8ffaf02082d68c8e721fef3eb1dd1e52fde8e273` has exact-head Actions run [#45009480231](https://github.com/X84657465/global-citizen-ai-network/actions/runs/45009480231) pending. Do not mark M-01 resolved until exact-head CI and failure-path fault injection prove upload-after-publisher-failure, artifact retrieval, and durable state read-back.
- Treat the cooldown as durable only after a subsequent read confirms the expected state version and `system.cooldown_until`. If the failure callback itself is rate-limited or its write cannot be confirmed, record the workflow/run evidence and allow the normal scheduler to retry after provider access recovers. Do not claim a persisted cooldown, manually edit the state Issue, dispatch duplicate workers, or weaken the breaker to bypass the provider limit.
- A failed state write followed by a failed read-back is an ambiguous outcome. The state store is designed to reconcile a later read against the intended version/payload; inspect the durable Issue before any operator retry and preserve event idempotency.

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
- The current Agent Task Preflight workflow separates publication authority across jobs: `prepare-task` has `actions: none`, `contents: read`, `issues: write`, and `pull-requests: read`; `begin-publication` has `contents: read` and `issues: write`; `publish-task` has `actions: read`, `contents: write`, `issues: none`, and `pull-requests: write`. Do not describe `prepare-task` as holding content/PR write access.
- Branch protection/ruleset settings could not be verified through the connected GitHub integration: the branch-protection API returned 403 (resource not accessible by integration), and repository rulesets are unavailable on the current private-repository plan. An owner must inspect repository Settings directly before release.
- Confirm repository Actions settings allow GitHub Actions to create pull requests only if the automated Draft PR publisher is intended to run. Do not enable broader workflow permissions than required.
- Rotate any credential suspected of exposure; never paste secrets into issues, PRs, logs, chat, or source files.

## Fine-grained token and publisher boundary audit

The current preflight flow is already split into three permission boundaries. These are **job-level GitHub token permissions**, while explicit `GITHUB_TOKEN` environment injection is limited to selected trusted steps:

- `prepare-task`: `actions: none`, `contents: read`, `issues: write`, `pull-requests: read`. It reads task Issues, selects work, and uses the V2 state store to reserve/transition durable state. The roadmap planner can create a task Issue.
- `begin-publication`: `contents: read`, `issues: write`. It records the durable `publishing` transition before publisher authority is granted.
- `publish-task`: `actions: read`, `contents: write`, `issues: none`, `pull-requests: write`. It creates the candidate branch/commit and Draft PR without Issue-write authority.
- `actions: none` remains intentional on task preparation; Actions API access is not required there.

The remaining least-privilege gap is narrower than the previous description but not closed: `prepare-task` still carries `issues: write` for its whole job because state persistence and roadmap Issue creation share that job. A future split may isolate the durable state writer and roadmap Issue creation from read-only planning, but only after mapping every write call and preserving the single-runner queue, lease fencing/recovery, state-version checks, and ambiguous-write reconciliation.

Candidate code remains isolated in disposable containers. The dependency install containers use a restricted bridge network; candidate tests use `--network none`, `--cap-drop ALL`, `--read-only`, non-root UID and disabled lifecycle scripts. Candidate install/test steps must not receive `GITHUB_TOKEN`, `GH_TOKEN`, or `GITHUB_*` variables.

PR #331 adds exact permission-set assertions and an allowlist of the trusted `prepare-task` steps that may receive the token. Those assertions are candidate-branch changes, not yet mainline evidence; accept them only after exact-head CI and review.

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

- Authoritative `main` HEAD: `c4f46dbcc78b40cb3a4f31a6d3513f6e922aca79`.
- Main release metadata at that SHA: root `0.3.125`; Agent Factory V2 `2.0.84`.
- PR #331 is the active narrow A-line CI-policy test repair. Its current head is `79223d2af77d0444b1b2ab344e836639b2978352`, based directly on the current main SHA above, with only `tests/ci-trigger-policy.test.mjs` changed. It bounds named-step extraction to the owning job and includes a regression proving a later job cannot satisfy a missing step.
- Exact-head Actions run [#45008582252](https://github.com/X84657465/global-citizen-ai-network/actions/runs/45008582252) completed successfully for HEAD `79223d2af77d0444b1b2ab344e836639b2978352`: exact metadata resolver, Windows quality gates (unit tests, type check, lint, dependency audits and production build), Supabase migrations/PostgreSQL/RLS, and Ollama/local execution integration all passed. Conditional failure/evidence callbacks were skipped as expected on success. This is CI acceptance for that exact PR head only; it is not independent review or release approval.
- Previous PR #331 head `c19aec7195421dd74e2e244561e80b7495d8a07f` completed run [#45005379860](https://github.com/X84657465/global-citizen-ai-network/actions/runs/45005379860): exact metadata resolution, Windows quality gates, Ollama/local execution, and Supabase/PostgreSQL/RLS jobs succeeded. Three conditional diagnostics/state-persistence jobs were skipped. This evidence does **not** transfer to current head `d2fb71191826555346bddda96bcd85fd5b633e45`.
- PR #333 is the publisher cooldown handoff candidate at exact HEAD `8ffaf02082d68c8e721fef3eb1dd1e52fde8e273`; exact-head run [#45009480231](https://github.com/X84657465/global-citizen-ai-network/actions/runs/45009480231) is pending. The artifact name now includes both workflow run ID and attempt to prevent collisions on reruns. The artifact handoff remains a candidate change, not yet accepted or merged.
- PR #331 and PR #333 currently have no submitted formal reviews. The prior Codex review attempt on `c19aec7` failed because the connected review usage limit was reached; this is not approval. Obtain a fresh independent maintainer review against each current exact head before merge.
- Vercel reports the free-plan daily deployment quota limit for the current Preview attempt. This is an external Preview capacity block, not a GitHub CI result or a passing Preview smoke test.
- PR #259 remains open but is stale/diverged: candidate head `3330cd04a77358cf0ff780940d09f938cab1dc3a` compares against current main as 111 commits ahead and 461 behind, with `mergeable=false`. Do not merge it or transplant its broad diff. Any needed change must be selectively reimplemented on a fresh current-main branch and revalidated.
- No Production database mutation, secret change, permission change, Factory durable-state edit, lease/cooldown/quarantine operation, or Production deployment was performed in this verification.

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
