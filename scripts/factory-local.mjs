import { mkdirSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { createLocalFactoryQueue } from "../lib/agent-factory-local-queue.mjs";
import { LocalFactoryWorkerError, runLocalFactoryAgentTask, runLocalFactoryTask } from "../lib/agent-factory-local-worker.mjs";
import { validateLocalFactoryTask } from "../lib/agent-factory-local-adapter.mjs";
import { createTrustedAcceptanceOracle } from "../lib/agent-factory-trusted-oracle.mjs";

const args = process.argv.slice(2);
const databasePath = resolve(process.env.GCAN_FACTORY_DB ?? ".factory/factory-local.sqlite");
const workerId = "local-worker-" + process.pid;

function usage() {
  console.log([
    "Factory Local — single-worker, local-only task runner",
    "  node scripts/factory-local.mjs task add --title \"Queue regression tests\"",
    "  node scripts/factory-local.mjs run-once",
    "  node scripts/factory-local.mjs run-until-idle [--max-tasks <1-100>]",
    "  node scripts/factory-local.mjs serve",
    "  node scripts/factory-local.mjs status",
    "  node scripts/factory-local.mjs logs <task-id>",
    "  node scripts/factory-local.mjs recover",
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
  const oracleTestFiles = [];
  for (let index = 0; index < values.length; index += 1) {
    if (values[index] === "--file" && values[index + 1] && inputPath === null) {
      inputPath = values[++index];
    } else if (values[index] === "--oracle-file" && values[index + 1]) {
      oracleTestFiles.push(values[++index]);
    } else {
      throw new Error("task add-agent accepts only --file <local-task.json> and one or more --oracle-file <tracked-tests/*.test.mjs> arguments.");
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
  return { task: validateLocalFactoryTask(parsed), oracleTestFiles };
}

function parseMaxTasks(values) {
  if (values.length === 0) return 25;
  if (values.length === 2 && values[0] === "--max-tasks" && /^(?:[1-9][0-9]?|100)$/.test(values[1])) {
    return Number(values[1]);
  }
  throw new Error("run-until-idle accepts only --max-tasks <1-100>.");
}

async function runNextTask(queue) {
  const task = queue.claim(workerId);
  if (!task) return { claimed: false, message: "No eligible task is ready." };

  try {
    const result = task.payload?.kind === "local-agent-task"
      ? await runLocalFactoryAgentTask({
        payload: task.payload,
        repositoryRoot: process.cwd(),
        sandboxTests: process.env.GCAN_FACTORY_SANDBOX_TESTS === "1",
      })
      : await runLocalFactoryTask({ payload: task.payload });
    const completed = queue.complete(task.id, workerId, task.lease_token, result);
    return { claimed: true, completed: true, task: completed };
  } catch (error) {
    const scope = error instanceof LocalFactoryWorkerError ? error.scope : "system";
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
    const { task: agentTask, oracleTestFiles } = parseAgentTask(args.slice(2));
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
    const task = queue.add({
      id: taskId,
      title: agentTask.title,
      payload: {
        schema_version: 1,
        kind: "local-agent-task",
        task_id: taskId,
        task: agentTask,
        trusted_oracle_contract: trustedOracleContract,
      },
    });
    print({ queued: true, trusted_oracle_contract: trustedOracleContract, task });
  } else if (command === "status") {
    print(queue.list({ limit: 100 }));
  } else if (command === "logs") {
    if (!args[1]) throw new Error("logs requires a task id.");
    print(queue.events(args[1]));
  } else if (command === "recover") {
    print({ recovered_leases: queue.recoverExpiredLeases() });
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
