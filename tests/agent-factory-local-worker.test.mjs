import test from "node:test";
import assert from "node:assert/strict";
import { runLocalFactoryAgentTask, runLocalFactoryTask, LocalFactoryWorkerError } from "../lib/agent-factory-local-worker.mjs";

test("local worker executes only the allowlisted queue regression suite and returns evidence", () => {
  const result = runLocalFactoryTask({
    payload: { schema_version: 1, kind: "local-queue-tests" },
    repositoryRoot: process.cwd(),
    timeoutMs: 120_000,
  });
  assert.equal(result.outcome, "passed");
  assert.equal(result.command_id, "node-test-local-queue");
  assert.equal(result.exit_code, 0);
  assert.equal(result.platform, process.platform);
  assert.deepEqual(result.test_files, [
    "tests/agent-factory-local-queue.test.mjs",
    "tests/agent-factory-local-queue-regression.test.mjs",
  ]);
  assert.match(result.stdout, /tests/);
});

test("local worker rejects arbitrary task kinds before starting a process", () => {
  assert.throws(
    () => runLocalFactoryTask({ payload: { schema_version: 1, kind: "arbitrary-shell" } }),
    (error) => error instanceof LocalFactoryWorkerError && error.scope === "task",
  );
});


test("local agent worker rejects malformed task envelopes before contacting Ollama", async () => {
  await assert.rejects(
    runLocalFactoryAgentTask({ payload: { schema_version: 1, kind: "local-agent-task", task: {} } }),
    (error) => error instanceof LocalFactoryWorkerError && error.scope === "task",
  );
  await assert.rejects(
    runLocalFactoryAgentTask({ payload: { schema_version: 1, kind: "local-agent-task", task: { title: "x" }, command: "whoami" } }),
    (error) => error instanceof LocalFactoryWorkerError && error.scope === "task",
  );
});
