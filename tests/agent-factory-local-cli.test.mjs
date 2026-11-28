import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
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

  function invoke(args, { cwd = repositoryRoot, exit = 0, env = {} } = {}) {
    const result = spawnSync(process.execPath, [cli, ...args], {
      cwd,
      env: { ...process.env, ...env, GCAN_FACTORY_DB: databasePath },
      encoding: "utf8",
      timeout: 60_000,
    });
    assert.ifError(result.error);
    assert.equal(result.status, exit, result.stderr);
    return result.stdout ? JSON.parse(result.stdout) : null;
  }

  return { databasePath, directory, invoke };
}

test("a stored local agent task reaches Ollama configuration validation after CLI restart", (t) => {
  const { directory, invoke } = openFixture(t);
  const inputFile = join(directory, "task.json");
  writeFileSync(inputFile, JSON.stringify({
    schema_version: 1,
    title: "Local documentation fixture",
    goal: "Add one short documentation example",
    allowed_paths: ["docs/local-factory-fixture.md"],
    acceptance_criteria: ["Document the example"],
    explicit_exclusions: [],
  }));

  const added = invoke([
    "task", "add-agent", "--file", inputFile,
    "--oracle-file", "tests/agent-factory-local-queue.test.mjs",
    "--repository", "X84657465/global-citizen-ai-network",
    "--base-branch", "main",
  ]);
  assert.equal(added.queued, true);
  assert.equal(added.task.payload.task.mode, "local_only");
  assert.equal(added.task.payload.task_id, added.task.id);
  assert.equal(added.task.payload.trusted_oracle_contract.schema_version, 2);
  assert.equal(added.task.payload.trusted_oracle_contract.task_id, added.task.id);
  assert.match(added.task.payload.trusted_oracle_contract.contract_sha256, /^[a-f0-9]{64}$/);
  assert.equal(added.task.payload.publication_target.repository, "X84657465/global-citizen-ai-network");
  assert.equal(added.task.payload.publication_target.base_branch, "main");
  assert.equal(added.task.payload.publication_target.base_sha, added.task.payload.trusted_oracle_contract.base_sha);
  assert.match(added.task.payload.publication_target.target_sha256, /^[a-f0-9]{64}$/);

  const claimed = invoke(["run-once"], {
    exit: 1,
    env: {
      OLLAMA_BASE_URL: "https://127.0.0.1:11434",
      GCAN_FACTORY_SANDBOX_TESTS: "1",
    },
  });
  assert.equal(claimed.task.id, added.task.id);
  assert.match(claimed.task.last_error, /OLLAMA_BASE_URL must be a plain HTTP loopback origin/);
});

test("one batch runs multiple queued tasks and their evidence survives CLI restart", (t) => {
  const { invoke } = openFixture(t);
  const ids = ["First", "Second", "Third"].map((title) =>
    invoke(["task", "add", "--title", title]).task.id
  );

  assert.deepEqual(invoke(["run-until-idle", "--max-tasks", "101"], { exit: 1 }), null);
  assert.deepEqual(invoke(["run-until-idle", "--max-tasks", "2"]), {
    processed: 2, completed: 2, failed: 0, publication_deferred: 0, publication_delivered: 0, stop_reason: "limit_reached",
  });
  assert.deepEqual(invoke(["run-until-idle"]), {
    processed: 1, completed: 1, failed: 0, publication_deferred: 0, publication_delivered: 0, stop_reason: "no_eligible_task",
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
  const queue = createLocalFactoryQueue({ databasePath, now: () => Date.now() });
  try {
    queue.add({ title: "Invalid task", payload: { schema_version: 1, kind: "invalid" }, maxFailures: 1 });
  } finally {
    queue.close();
  }
  invoke(["task", "add", "--title", "Next task"]);

  assert.deepEqual(invoke(["run-until-idle"], { exit: 1 }), {
    processed: 2, completed: 1, failed: 1, publication_deferred: 0, publication_delivered: 0, stop_reason: "no_eligible_task",
  });
  assert.deepEqual(invoke(["status"]).map((task) => [task.status, task.attempts]), [
    ["quarantined", 1], ["succeeded", 1],
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
    processed: 1, completed: 0, failed: 1, publication_deferred: 0, publication_delivered: 0, stop_reason: "system_failure",
  });
  assert.deepEqual(invoke(["status"]).map((task) => [task.status, task.attempts, task.system_failures]), [
    ["queued", 1, 1], ["queued", 0, 0],
  ]);
});


test("publish command is wired and refuses a task absent from durable SQLite", (t) => {
  const { invoke } = openFixture(t);
  const result = invoke(["publish", "missing-accepted-task"], { exit: 1 });
  assert.equal(result, null);
});

test("publish command rejects malformed task IDs before any GitHub request", (t) => {
  const { invoke } = openFixture(t);
  const result = invoke(["publish", "../outside"], { exit: 1 });
  assert.equal(result, null);
});
