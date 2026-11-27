import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { runLocalFactoryAgentTask, runLocalFactoryTask, terminateLocalFactoryProcessTree, LocalFactoryWorkerError } from "../lib/agent-factory-local-worker.mjs";

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


test("timeout termination kills the worker and its descendant process tree", async () => {
  const childCode = [
    "const { spawn } = require('node:child_process');",
    "const grandchild = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });",
    "process.stdout.write(String(grandchild.pid) + '\\n');",
    "setInterval(() => {}, 1000);",
  ].join("\\n");
  const child = spawn(process.execPath, ["-e", childCode], {
    detached: process.platform !== "win32",
    stdio: ["ignore", "pipe", "ignore"],
    windowsHide: true,
    shell: false,
  });
  const grandchildPid = await new Promise((resolve, reject) => {
    child.once("error", reject);
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
      const match = output.match(/(\\d+)\\r?\\n/);
      if (match) resolve(Number(match[1]));
    });
  });

  terminateLocalFactoryProcessTree(child);
  await new Promise((resolve) => child.once("close", resolve));

  let stillAlive = true;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      process.kill(grandchildPid, 0);
    } catch (error) {
      if (error?.code === "ESRCH") {
        stillAlive = false;
        break;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.equal(stillAlive, false, "descendant process must not survive worker termination");
});
