import { mkdirSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { createLocalFactoryQueue } from "../lib/agent-factory-local-queue.mjs";
import { LocalFactoryWorkerError, runLocalFactoryAgentTask, runLocalFactoryTask } from "../lib/agent-factory-local-worker.mjs";
import { validateLocalFactoryTask } from "../lib/agent-factory-local-adapter.mjs";
import { createTrustedAcceptanceOracle } from "../lib/agent-factory-trusted-oracle.mjs";
import { createLocalFactoryPublicationTarget } from "../lib/agent-factory-local-publication-contract.mjs";
import { publishAcceptedLocalFactoryTask } from "../lib/agent-factory-local-publisher.mjs";
import { createGitHubApiClient } from "../lib/github-api-client.mjs";
import { intakeNextGitHubIssue } from "../lib/agent-factory-local-issue-intake.mjs";
import { createGitHubActionsFactoryCoordinator, FACTORY_WORKER_SCOPE } from "../lib/agent-factory-cross-executor-coordinator.mjs";

const args = process.argv.slice(2);
const databasePath = resolve(process.env.GCAN_FACTORY_DB ?? ".factory/factory-local.sqlite");
const workerId = "local-worker-" + process.pid;
const coordinator = createGitHubActionsFactoryCoordinator();

function usage() {
  console.log([
    "Factory Local — single-worker, local-only task runner",
    "  node scripts/factory-local.mjs task add --title \"Queue regression tests\"",
    "  node scripts/factory-local.mjs task add-agent --file <local-task.json> --oracle-file <tracked-tests/*.test.mjs> [--repository <owner/name>] [--base-branch <branch>]",
    "  node scripts/factory-local.mjs intake-next  (DISABLED: requires a verified cross-executor V2 lease/fencing coordinator)",
    "  node scripts/factory-local.mjs run-once",
    "  node scripts/factory-local.mjs run-until-idle [--max-tasks <1-100>]",
    "  node scripts/factory-local.mjs serve",
    "  node scripts/factory-local.mjs status",
    "  node scripts/factory-local.mjs logs <task-id>",
    "  node scripts/factory-local.mjs recover",
    "  node scripts/factory-local.mjs publish <accepted-task-id> [--dry-run]",
    "  node scripts/factory-local.mjs publish <accepted-task-id>",
  ].join("\n"));
}

function print(value) {
  console.log(JSON.stringify(value, null, 2));
}

function parseTitle(values) {
  const index = values.indexOf("--title");
  if (index < 0 || !values[index + 1]) throw new Error("task add requires --title <text>.");
  return values[index + 1];
}

function parseAgentTask(values) {
  let inputPath = null;
  let repository = null;
  let baseBranch = null;
  const oracleTestFiles = [];
  for (let index = 0; index < values.length; index += 1) {
    if (values[index] === "--file" && values[index + 1] && inputPath === null) {
      inputPath = values[++index];
    } else if (values[index] === "--oracle-file" && values[index + 1]) {
      oracleTestFiles.push(values[++index]);
    } else if (values[index] === "--repository" && values[index + 1] && repository === null) {
      repository = values[++index];
    } else if (values[index] === "--base-branch" && values[index + 1] && baseBranch === null) {
      baseBranch = values[++index];
    } else {
      throw new Error("task add-agent accepts --file, one or more --oracle-file, and optional --repository / --base-branch arguments.");
    }
  }
  if (!inputPath) throw new Error("task add-agent requires --file <local-task.json>.");
  if (oracleTestFiles.length === 0) {
    throw new Error("task add-agent requires at least one operator-selected --oracle-file tracked test.");
  }
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(resolve(inputPath), "utf8"));
  } catch {
    throw new Error("Unable to read or parse the supplied local task JSON file.");
  }
  return {
    task: validateLocalFactoryTask(parsed),
    oracleTestFiles,
    repository,
    baseBranch,
  };
}

function gitOutput(args) {
  try {
    return execFileSync("git", args, {
      cwd: process.cwd(),
      encoding: "utf8",
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    throw new Error("Unable to resolve the local Git repository and publication base.");
  }
}

function resolvePublicationRepository(explicitRepository) {
  const candidate = explicitRepository ||
    process.env.GCAN_FACTORY_REPOSITORY ||
    process.env.GITHUB_REPOSITORY ||
    "";
  if (candidate) {
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(candidate)) {
      throw new Error("Publication repository must use owner/name format.");
    }
    return candidate;
  }
  const remote = gitOutput(["remote", "get-url", "origin"]);
  const match = /github\.com[:/]([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+?)(?:\.git)?$/i.exec(remote);
  if (!match) throw new Error("Unable to derive a GitHub owner/name from origin; pass --repository explicitly.");
  return match[1];
}

function resolvePublicationBaseBranch(explicitBranch) {
  const candidate = explicitBranch ||
    process.env.GCAN_FACTORY_BASE_BRANCH ||
    process.env.GITHUB_BASE_REF ||
    process.env.GITHUB_REF_NAME ||
    (() => {
      try { return gitOutput(["symbolic-ref", "--quiet", "--short", "HEAD"]); }
      catch { return ""; }
    })();
  if (!candidate || candidate === "HEAD") {
    throw new Error("Publication base branch is unavailable; pass --base-branch explicitly when using a detached checkout.");
  }
  return candidate;
}

function parseMaxTasks(values) {
  if (values.length === 0) return 25;
  if (values.length === 2 && values[0] === "--max-tasks" && /^(?:[1-9][0-9]?|100)$/.test(values[1])) {
    return Number(values[1]);
  }
  throw new Error("run-until-idle accepts only --max-tasks <1-100>.");
}

let nextPublicationRetryAt = 0;

async function publishAcceptedTask(queue, taskRecord, { coordinatorClient = null, lease = null } = {}) {
  if (taskRecord.payload?.kind === "local-agent-task" && (!coordinatorClient || !lease)) {
    throw new Error("Remote publication requires the authenticated cross-executor Factory coordinator.");
  }
  const persistPublication = async (value) => {
    if (coordinatorClient && lease && value.state === "prepared") {
      const payloadHash = createHash("sha256").update(JSON.stringify(value)).digest("hex");
      const reservation = await coordinatorClient.reservePublication(
        lease, value.idempotency_key, payloadHash, value,
      );
      if (!reservation?.reserved) throw new Error("Durable cross-executor publication intent was not reserved.");
    } else if (coordinatorClient && lease && value.state === "draft_pr_created") {
      const recorded = await coordinatorClient.recordPublication(
        lease, value.idempotency_key, "published", value.branch, value.pull_request_number,
      );
      if (!recorded) throw new Error("Durable cross-executor publication result was not recorded.");
    }
    await queue.recordPublication(taskRecord.id, value);
  };
  return await publishAcceptedLocalFactoryTask({
    taskRecord,
    taskEvents: queue.events(taskRecord.id),
    existingPublication: queue.getPublication(taskRecord.id),
    repositoryRoot: process.cwd(),
    persistPublication,
  });
}

async function retryPendingPublications(queue, { force = false, coordinatorClient = null, lease = null } = {}) {
  if (!coordinatorClient || !lease) return [];
  const now = Date.now();
  if (!force && now < nextPublicationRetryAt) return [];
  nextPublicationRetryAt = now + 30_000;
  const acceptedTasks = queue.listPendingPublications({ limit: 500 });
  const outcomes = [];
  for (const task of acceptedTasks) {
    try {
      outcomes.push({ task_id: task.id, state: (await publishAcceptedTask(queue, task, { coordinatorClient, lease })).state });
    } catch (error) {
      outcomes.push({
        task_id: task.id,
        state: "pending",
        error: error instanceof Error ? error.message : "Unknown publication error",
      });
    }
  }
  return outcomes;
}

async function runNextTask(queue, { excludeTaskIds = [], coordinatorClient = coordinator } = {}) {
  let lease = null;
  let heartbeatTimer = null;
  let heartbeatInFlight = false;
  let leaseLost = false;
  if (coordinatorClient) {
    lease = await coordinatorClient.acquireLease(FACTORY_WORKER_SCOPE, 300_000);
    if (!lease?.acquired) {
      return {
        claimed: false,
        message: "Another executor currently owns the durable Factory worker lease.",
        coordinator_lease: lease?.reason ?? "unavailable",
      };
    }
    heartbeatTimer = setInterval(async () => {
      if (heartbeatInFlight || leaseLost) return;
      heartbeatInFlight = true;
      try {
        const renewed = await coordinatorClient.renewLease(lease, 300_000);
        if (!renewed?.renewed) leaseLost = true;
      } catch {
        leaseLost = true;
      } finally {
        heartbeatInFlight = false;
      }
    }, 30_000);
    heartbeatTimer.unref?.();
  }

  const assertLease = async () => {
    if (!coordinatorClient || !lease) return;
    if (leaseLost || !await coordinatorClient.assertLease(lease)) {
      leaseLost = true;
      throw new Error("Factory cross-executor lease was lost; stale worker writes are blocked.");
    }
  };
  const persistState = async (task, status, extra = {}) => {
    if (!coordinatorClient || !lease) return;
    await assertLease();
    const result = await coordinatorClient.persistTaskState(lease, randomUUID(), {
      task_id: task.id,
      status,
      attempts: task.attempts,
      worker_id: workerId,
      ...extra,
    });
    if (!result?.persisted) throw new Error("Durable Factory task state write was not confirmed.");
  };

  try {
    const recoveredPublications = await retryPendingPublications(queue, {
      coordinatorClient, lease,
    });
    await assertLease();
    const task = queue.claim(workerId, { excludeTaskIds });
    if (!task) return {
      claimed: false,
      message: "No eligible task is ready.",
      recovered_publications: recoveredPublications,
    };

    try {
      if (task.payload?.kind === "local-agent-task" && task.payload.task_id !== task.id) {
        throw new LocalFactoryWorkerError("Queued task ID does not match its persisted Trusted Oracle contract identity.", "task");
      }
      await persistState(task, "running", {
        source_issue_number: task.payload?.source_envelope?.issue_number ?? null,
      });
      const result = task.payload?.kind === "local-agent-task"
        ? await runLocalFactoryAgentTask({
          payload: task.payload,
          repositoryRoot: process.cwd(),
          sandboxTests: process.env.GCAN_FACTORY_SANDBOX_TESTS === "1",
        })
        : await runLocalFactoryTask({ payload: task.payload });
      await assertLease();
      await persistState(task, "succeeded", {
        acceptance_status: result.acceptance_status ?? null,
        outcome: result.outcome ?? null,
      });
      const completed = queue.complete(task.id, workerId, task.lease_token, result);
      if (completed.payload?.kind !== "local-agent-task" || completed.result?.acceptance_status !== "ACCEPTED") {
        return { claimed: true, completed: true, task: completed, recovered_publications: recoveredPublications };
      }
      if (!coordinatorClient || !lease) {
        return {
          claimed: true,
          completed: true,
          task: completed,
          publication: {
            state: "deferred_local_only",
            reason: "Remote Draft PR publication requires the authenticated cross-executor coordinator.",
          },
          recovered_publications: recoveredPublications,
        };
      }
      try {
        await assertLease();
        const publication = await publishAcceptedTask(queue, completed, { coordinatorClient, lease });
        await assertLease();
        return { claimed: true, completed: true, task: completed, publication, recovered_publications: recoveredPublications };
      } catch (error) {
        return {
          claimed: true,
          completed: true,
          task: completed,
          publication: queue.getPublication(task.id),
          publication_error: error instanceof Error ? error.message : "Unknown publication error",
          recovered_publications: recoveredPublications,
        };
      }
    } catch (error) {
      if (leaseLost) {
        return {
          claimed: true,
          completed: false,
          failure_scope: "system",
          task: queue.get(task.id),
          lease_lost: true,
          error: error instanceof Error ? error.message : "Unknown worker error",
        };
      }
      const scope = error?.scope === "task" ? "task" :
        error instanceof LocalFactoryWorkerError ? error.scope : "system";
      try {
        await persistState(task, "failed", {
          failure_scope: scope,
          error: error instanceof Error ? error.message : "Unknown worker error",
        });
        await assertLease();
      } catch (fencingError) {
        return {
          claimed: true,
          completed: false,
          failure_scope: "system",
          task: queue.get(task.id),
          lease_lost: true,
          error: fencingError instanceof Error ? fencingError.message : "Factory fencing check failed.",
        };
      }
      const failed = queue.fail(
        task.id,
        workerId,
        task.lease_token,
        error instanceof Error ? error.message : "Unknown worker error",
        { scope },
      );
      return { claimed: true, completed: false, failure_scope: scope, task: failed };
    }
  } finally {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    if (coordinatorClient && lease) {
      try { await coordinatorClient.releaseLease(lease); } catch { /* expiry safely reclaims an unreleased lease */ }
    }
  }
}

async function serve(queue, coordinatorClient = coordinator) {
  const shutdown = new AbortController();
  const stop = () => shutdown.abort();
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  try {
    console.log(JSON.stringify({ event: "worker_started", worker_id: workerId }));
    while (!shutdown.signal.aborted) {
      const result = await runNextTask(queue, { coordinatorClient });
      if (!result.claimed) {
        await delay(1_000, undefined, { signal: shutdown.signal });
        continue;
      }
      console.log(JSON.stringify({
        event: "task_finished",
        task_id: result.task.id,
        status: result.task.status,
        failure_scope: result.failure_scope ?? null,
        publication_state: result.publication?.state ?? null,
        publication_error: result.publication_error ?? null,
      }));
      if (result.failure_scope === "system") {
        const retryAt = result.task.available_at;
        console.log(JSON.stringify({ event: "worker_backoff", retry_at: retryAt }));
        await delay(Math.max(1_000, retryAt - Date.now()), undefined, { signal: shutdown.signal });
      }
    }
  } catch (error) {
    if (!shutdown.signal.aborted || error?.name !== "AbortError") throw error;
  } finally {
    process.off("SIGINT", stop);
    process.off("SIGTERM", stop);
    console.log(JSON.stringify({ event: "worker_stopped" }));
  }
}

const command = args[0];
if (!command || command === "--help" || command === "help") {
  usage();
  process.exit(0);
}

mkdirSync(dirname(databasePath), { recursive: true });
const queue = createLocalFactoryQueue({ databasePath });
try {
  if (command === "task" && args[1] === "add") {
    const task = queue.add({
      title: parseTitle(args.slice(2)),
      payload: { schema_version: 1, kind: "local-queue-tests" },
    });
    print({ accepted: true, task });
  } else if (command === "task" && args[1] === "add-agent") {
    const { task: agentTask, oracleTestFiles, repository: requestedRepository, baseBranch: requestedBaseBranch } = parseAgentTask(args.slice(2));
    const taskId = randomUUID();
    let baseSha;
    try {
      baseSha = execFileSync("git", ["rev-parse", "HEAD"], {
        cwd: process.cwd(),
        encoding: "utf8",
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      }).trim();
    } catch {
      throw new Error("task add-agent requires a valid Git checkout so the exact intake base SHA can be captured.");
    }
    const trustedOracleContract = createTrustedAcceptanceOracle({
      repositoryRoot: process.cwd(),
      baseSha,
      taskId,
      oracleTestFiles,
      workerAllowedPaths: agentTask.allowed_paths,
    });
    const publicationTarget = createLocalFactoryPublicationTarget({
      taskId,
      repository: resolvePublicationRepository(requestedRepository),
      baseBranch: resolvePublicationBaseBranch(requestedBaseBranch),
      baseSha,
      contractSha256: trustedOracleContract.contract_sha256,
    });
    const task = queue.add({
      id: taskId,
      title: agentTask.title,
      payload: {
        schema_version: 1,
        kind: "local-agent-task",
        task_id: taskId,
        task: agentTask,
        trusted_oracle_contract: trustedOracleContract,
        publication_target: publicationTarget,
      },
    });
    print({ queued: true, trusted_oracle_contract: trustedOracleContract, publication_target: publicationTarget, task });
  } else if (command === "intake-next" && args.length === 1) {
    const repository = resolvePublicationRepository(null);
    const baseBranch = process.env.GCAN_FACTORY_BASE_BRANCH ?? "";
    if (!baseBranch || !/^[A-Za-z0-9][A-Za-z0-9._/-]{0,199}$/.test(baseBranch)) {
      throw new Error("intake-next requires an explicit GCAN_FACTORY_BASE_BRANCH; the current branch is never inferred as a publication target.");
    }
    const baseSha = gitOutput(["rev-parse", "HEAD"]);
    if (gitOutput(["rev-parse", baseBranch]) !== baseSha) {
      throw new Error("intake-next requires the checked-out HEAD to equal the configured publication base branch SHA.");
    }
    const token = process.env.GITHUB_TOKEN ?? "";
    if (!token) throw new Error("intake-next requires GITHUB_TOKEN; no anonymous or fallback identity is permitted.");
    const oracleTestFiles = (process.env.GCAN_FACTORY_ORACLE_FILES ?? "")
      .split(";").map((value) => value.trim()).filter(Boolean);
    if (oracleTestFiles.length === 0) {
      throw new Error("intake-next requires operator-configured GCAN_FACTORY_ORACLE_FILES (semicolon-separated tracked test paths).");
    }
    const api = createGitHubApiClient({
      baseUrl: process.env.GITHUB_API_URL || undefined,
      token,
      timeoutMs: 15_000,
      maxRetries: 2,
      maxInlineRetryDelayMs: 30_000,
    });
    const skippedIssueNumbers = (process.env.AGENT_FACTORY_SKIPPED_ISSUES ?? "")
      .split(",").map((value) => Number(value))
      .filter((value) => Number.isSafeInteger(value) && value > 0);
    const result = await intakeNextGitHubIssue({
      api,
      queue,
      repository,
      repositoryRoot: process.cwd(),
      oracleTestFiles,
      baseSha,
      baseBranch,
      stateIssueNumber: process.env.AGENT_FACTORY_STATE_ISSUE_NUMBER,
      skippedIssueNumbers,
    });
    print(result);
  } else if (command === "publish") {
    const taskId = args[1];
    const dryRun = args.length === 3 && args[2] === "--dry-run";
    if (!taskId || !/^[A-Za-z0-9_-]{1,128}$/.test(taskId) || (args.length > 2 && !dryRun)) {
      throw new Error("publish requires <accepted-task-id> and optional --dry-run.");
    }
    const taskRecord = queue.get(taskId);
    if (!taskRecord) throw new Error("Accepted task was not found in the local SQLite queue.");
    const taskEvents = queue.events(taskId);
    const existingPublication = queue.getPublication(taskId);
    if (dryRun) {
      const publication = await publishAcceptedLocalFactoryTask({
        taskRecord, taskEvents, existingPublication, repositoryRoot: process.cwd(),
        dryRun: true, persistPublication: null,
      });
      print(publication);
    } else {
      if (!coordinator) throw new Error("Remote publication requires the authenticated cross-executor Factory coordinator.");
      const lease = await coordinator.acquireLease(FACTORY_WORKER_SCOPE, 300_000);
      if (!lease?.acquired) throw new Error("Another executor currently owns the durable Factory worker lease.");
      try {
        if (!await coordinator.assertLease(lease)) throw new Error("Factory worker lease is not current.");
        const publication = await publishAcceptedTask(queue, taskRecord, { coordinatorClient: coordinator, lease });
        print(publication);
      } finally {
        try { await coordinator.releaseLease(lease); } catch { /* expiry safely reclaims an unreleased lease */ }
      }
    }
  } else if (command === "status") {
    print(queue.list({ limit: 100 }));
  } else if (command === "logs") {
    if (!args[1]) throw new Error("logs requires a task id.");
    print(queue.events(args[1]));
  } else if (command === "recover") {
    const recoveredLeases = queue.recoverExpiredLeases();
    let recoveredPublications = [];
    if (coordinator) {
      const lease = await coordinator.acquireLease(FACTORY_WORKER_SCOPE, 300_000);
      if (lease?.acquired) {
        try {
          recoveredPublications = await retryPendingPublications(queue, {
            force: true, coordinatorClient: coordinator, lease,
          });
        } finally {
          try { await coordinator.releaseLease(lease); } catch { /* expiry safely reclaims an unreleased lease */ }
        }
      } else {
        recoveredPublications = [{ state: "blocked", reason: lease?.reason ?? "coordinator_unavailable" }];
      }
    } else {
      recoveredPublications = [{ state: "blocked", reason: "authenticated_coordinator_unavailable" }];
    }
    print({ recovered_leases: recoveredLeases, recovered_publications: recoveredPublications });
  } else if (command === "serve" && args.length === 1) {
    await serve(queue, coordinator);
  } else if (command === "run-once") {
    const result = await runNextTask(queue, { coordinatorClient: coordinator });
    print(result);
    if (result.claimed && !result.completed) process.exitCode = 1;
  } else if (command === "run-until-idle") {
    const maxTasks = parseMaxTasks(args.slice(1));
    const summary = {
      processed: 0,
      completed: 0,
      failed: 0,
      publication_deferred: 0,
      publication_delivered: 0,
      stop_reason: "limit_reached",
    };
    const attemptedTaskIds = new Set();
    for (let index = 0; index < maxTasks; index += 1) {
      const result = await runNextTask(queue, { excludeTaskIds: [...attemptedTaskIds], coordinatorClient: coordinator });
      if (!result.claimed) {
        summary.stop_reason = "no_eligible_task";
        break;
      }
      summary.processed += 1;
      attemptedTaskIds.add(result.task.id);
      if (result.completed) {
        summary.completed += 1;
        if (result.publication?.state === "deferred_local_only") summary.publication_deferred += 1;
        if (result.publication?.state === "draft_pr_created") summary.publication_delivered += 1;
      } else {
        summary.failed += 1;
        if (result.failure_scope === "system") {
          summary.stop_reason = "system_failure";
          break;
        }
      }
    }
    print(summary);
    if (summary.failed > 0) process.exitCode = 1;
  } else {
    usage();
    throw new Error("Unknown command.");
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Factory Local command failed.");
  process.exitCode = 1;
} finally {
  queue.close();
}
