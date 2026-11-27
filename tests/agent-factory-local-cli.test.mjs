import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createLocalFactoryQueue } from "../lib/agent-factory-local-queue.mjs";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const cli = join(repositoryRoot, "scripts", "factory-local.mjs");
const queueTest = { schema_version: 1, kind: "local-queue-tests" };

function openFixture(t) {
  const directory = mkdtempSync(join(tmpdir(), "gcan-factory-cli-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const databasePath = join(directory, "factory.sqlite");

  function invoke(args, { cwd = repositoryRoot, exit = 0 } = {}) {
    const result = spawnSync(process.execPath, [cli, ...args], {
      cwd,
      env: { ...process.env, GCAN_FACTORY_DB: databasePath },
      encoding: "utf8",
      timeout: 30_000,
    });
    assert.ifError(result.error);
    assert.equal(result.status, exit, result.stderr);
    return result.stdout ? JSON.parse(result.stdout) : null;
  }

  return { databasePath, directory, invoke };
}

test("one batch runs multiple queued tasks and their evidence survives CLI restart", (t) => {
  const { invoke } = openFixture(t);
  const ids = ["First", "Second", "Third"].map((title) =>
    invoke(["task", "add", "--title", title]).task.id
  );

  assert.deepEqual(invoke(["run-until-idle", "--max-tasks", "101"], { exit: 1 }), null);
  assert.deepEqual(invoke(["run-until-idle", "--max-tasks", "2"]), {
    processed: 2, completed: 2, failed: 0, stop_reason: "limit_reached",
  });
  assert.deepEqual(invoke(["run-until-idle"]), {
    processed: 1, completed: 1, failed: 0, stop_reason: "no_eligible_task",
  });

  const tasks = invoke(["status"]);
  assert.equal(tasks.length, ids.length);
  for (const id of ids) {
    const task = tasks.find((entry) => entry.id === id);
    assert.equal(task.status, "succeeded");
    assert.equal(task.attempts, 1);
    assert.equal(task.result.exit_code, 0);
    assert.equal(task.result.command_id, "node-test-local-queue");
    assert.deepEqual(invoke(["logs", id]).map((event) => event.event_type), [
      "task_queued", "task_claimed", "task_succeeded",
    ]);
  }
});

test("a task failure is persisted and does not block the next ready task", (t) => {
  const { databasePath, invoke } = openFixture(t);
  const queue = createLocalFactoryQueue({ databasePath, now: () => 1 });
  try {
    queue.add({ title: "Invalid task", payload: { schema_version: 1, kind: "invalid" } });
  } finally {
    queue.close();
  }
  invoke(["task", "add", "--title", "Next task"]);

  assert.deepEqual(invoke(["run-until-idle"], { exit: 1 }), {
    processed: 2, completed: 1, failed: 1, stop_reason: "no_eligible_task",
  });
  assert.deepEqual(invoke(["status"]).map((task) => [task.status, task.attempts]), [
    ["retry_wait", 1], ["succeeded", 1],
  ]);
});

test("a system failure ends the batch and leaves the remaining task queued", (t) => {
  const { databasePath, directory, invoke } = openFixture(t);
  const queue = createLocalFactoryQueue({ databasePath, now: () => 1 });
  try {
    queue.add({ id: "first", title: "First", payload: queueTest });
    queue.add({ id: "second", title: "Second", payload: queueTest });
  } finally {
    queue.close();
  }

  assert.deepEqual(invoke(["run-until-idle"], { cwd: directory, exit: 1 }), {
    processed: 1, completed: 0, failed: 1, stop_reason: "system_failure",
  });
  assert.deepEqual(invoke(["status"]).map((task) => [task.status, task.attempts, task.system_failures]), [
    ["queued", 1, 1], ["queued", 0, 0],
  ]);
});
