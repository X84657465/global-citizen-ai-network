import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createLocalFactoryQueue } from "../lib/agent-factory-local-queue.mjs";
import { LocalFactoryWorkerError, runLocalFactoryAgentTask, runLocalFactoryTask } from "../lib/agent-factory-local-worker.mjs";
import { validateLocalFactoryTask } from "../lib/agent-factory-local-adapter.mjs";

const args = process.argv.slice(2);
const databasePath = resolve(process.env.GCAN_FACTORY_DB ?? ".factory/factory-local.sqlite");
const workerId = "local-worker-" + process.pid;

function usage() {
  console.log([
    "Factory Local — single-worker, local-only task runner",
    "  node scripts/factory-local.mjs task add --title \"Queue regression tests\"",
    "  node scripts/factory-local.mjs run-once",
    "  node scripts/factory-local.mjs run-until-idle [--max-tasks <1-100>]",
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
  const index = values.indexOf("--file");
  if (index < 0 || !values[index + 1]) throw new Error("task add-agent requires --file <local-task.json>.");
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(resolve(values[index + 1]), "utf8"));
  } catch {
    throw new Error("Unable to read or parse the supplied local task JSON file.");
  }
  return validateLocalFactoryTask(parsed);
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
    const agentTask = parseAgentTask(args.slice(2));
    const task = queue.add({
      title: agentTask.title,
      payload: { schema_version: 1, kind: "local-agent-task", task: agentTask },
    });
    print({ accepted: true, task });
  } else if (command === "status") {
    print(queue.list({ limit: 100 }));
  } else if (command === "logs") {
    if (!args[1]) throw new Error("logs requires a task id.");
    print(queue.events(args[1]));
  } else if (command === "recover") {
    print({ recovered_leases: queue.recoverExpiredLeases() });
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
