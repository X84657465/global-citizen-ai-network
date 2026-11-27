import { mkdirSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
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

const args = process.argv.slice(2);
const databasePath = resolve(process.env.GCAN_FACTORY_DB ?? ".factory/factory-local.sqlite");
const workerId = "local-worker-" + process.pid;

function usage() {
  console.log([
    "Factory Local — single-worker, local-only task runner",
    "  node scripts/factory-local.mjs task add --title \"Queue regression tests\"",
    "  node scripts/factory-local.mjs task add-agent --file <local-task.json> --oracle-file <tracked-tests/*.test.mjs> [--repository <owner/name>] [--base-branch <branch>]",
    "  node scripts/factory-local.mjs intake-next  (requires GITHUB_TOKEN and GCAN_FACTORY_ORACLE_FILES)",
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

async function publishAcceptedTask(queue, taskRecord) {
  const publication = await publishAcceptedLocalFactoryTask({
    taskRecord,
    taskEvents: queue.events(taskRecord.id),
    existingPublication: queue.getPublication(taskRecord.id),
    repositoryRoot: process.cwd(),
    persistPublication: (value) => queue.recordPublication(taskRecord.id, value),
  });
  return publication;
}

async function retryPendingPublications(queue, { force = false } = {}) {
  const now = Date.now();
  if (!force && now < nextPublicationRetryAt) return [];
  nextPublicationRetryAt = now + 30_000;
  const acceptedTasks = queue.list({ status: "succeeded", limit: 500 }).filter((task) =>
    task.payload?.kind === "local-agent-task" &&
    task.result?.acceptance_status === "ACCEPTED" &&
    queue.getPublication(task.id)?.state !== "draft_pr_created"
  );
  const outcomes = [];
  for (const task of acceptedTasks) {
    try {
      outcomes.push({ task_id: task.id, state: (await publishAcceptedTask(queue, task)).state });
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

async function runNextTask(queue) {
  const recoveredPublications = await retryPendingPublications(queue);
  const task = queue.claim(workerId);
  if (!task) return {
    claimed: false,
    message: "No eligible task is ready.",
    recovered_publications: recoveredPublications,
  };

  try {
    if (task.payload?.kind === "local-agent-task" && task.payload.task_id !== task.id) {
      throw new LocalFactoryWorkerError("Queued task ID does not match its persisted Trusted Oracle contract identity.", "task");
    }
    const result = task.payload?.kind === "local-agent-task"
      ? await runLocalFactoryAgentTask({
        payload: task.payload,
        repositoryRoot: process.cwd(),
        sandboxTests: process.env.GCAN_FACTORY_SANDBOX_TESTS === "1",
      })
      : await runLocalFactoryTask({ payload: task.payload });
    const completed = queue.complete(task.id, workerId, task.lease_token, result);
    if (completed.payload?.kind !== "local-agent-task" || completed.result?.acceptance_status !== "ACCEPTED") {
      return { claimed: true, completed: true, task: completed, recovered_publications: recoveredPublications };
    }
    try {
      const publication = await publishAcceptedTask(queue, completed);
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
    const scope = error?.scope === "task" ? "task" :
      error instanceof LocalFactoryWorkerError ? error.scope : "system";
    const failed = queue.fail(
      task.id,
      workerId,
      task.lease_token,
      error instanceof Error ? error.message : "Unknown worker error",
      { scope },
    );
    return { claimed: true, completed: false, failure_scope: scope, task: failed };
  }
}

async function serve(queue) {
  const shutdown = new AbortController();
  const stop = () => shutdown.abort();
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  try {
    console.log(JSON.stringify({ event: "worker_started", worker_id: workerId }));
    while (!shutdown.signal.aborted) {
      const result = await runNextTask(queue);
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
    const publication = await publishAcceptedLocalFactoryTask({
      taskRecord,
      taskEvents,
      existingPublication,
      repositoryRoot: process.cwd(),
      dryRun,
      persistPublication: dryRun ? null : (value) => queue.recordPublication(taskId, value),
    });
    print(publication);
  } else if (command === "status") {
    print(queue.list({ limit: 100 }));
  } else if (command === "logs") {
    if (!args[1]) throw new Error("logs requires a task id.");
    print(queue.events(args[1]));
  } else if (command === "recover") {
    const recoveredLeases = queue.recoverExpiredLeases();
    const recoveredPublications = await retryPendingPublications(queue, { force: true });
    print({ recovered_leases: recoveredLeases, recovered_publications: recoveredPublications });
  } else if (command === "serve" && args.length === 1) {
    await serve(queue);
  } else if (command === "run-once") {
    const result = await runNextTask(queue);
    print(result);
    if (result.claimed && !result.completed) process.exitCode = 1;
  } else if (command === "run-until-idle") {
    const maxTasks = parseMaxTasks(args.slice(1));
    const summary = { processed: 0, completed: 0, failed: 0, stop_reason: "limit_reached" };
    for (let index = 0; index < maxTasks; index += 1) {
      const result = await runNextTask(queue);
      if (!result.claimed) {
        summary.stop_reason = "no_eligible_task";
        break;
      }
      summary.processed += 1;
      if (result.completed) {
        summary.completed += 1;
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
