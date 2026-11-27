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
    const task = queue.claim(workerId);
    if (!task) {
      print({ claimed: false, message: "No eligible task is ready." });
    } else {
      try {
        const result = task.payload?.kind === "local-agent-task"
          ? await runLocalFactoryAgentTask({ payload: task.payload })
          : await runLocalFactoryTask({ payload: task.payload });
        const completed = queue.complete(task.id, workerId, task.lease_token, result);
        print({ claimed: true, completed: true, task: completed });
      } catch (error) {
        const scope = error instanceof LocalFactoryWorkerError ? error.scope : "system";
        const failed = queue.fail(
          task.id,
          workerId,
          task.lease_token,
          error instanceof Error ? error.message : "Unknown worker error",
          { scope },
        );
        print({ claimed: true, completed: false, failure_scope: scope, task: failed });
        process.exitCode = 1;
      }
    }
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
