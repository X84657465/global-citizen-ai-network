import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createLocalFactoryQueue } from "../lib/agent-factory-local-queue.mjs";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const queueModuleUrl = pathToFileURL(join(repositoryRoot, "lib", "agent-factory-local-queue.mjs")).href;

function runWorker(databasePath, workerId) {
  const source = `
    import { createLocalFactoryQueue } from ${JSON.stringify(queueModuleUrl)};
    const queue = createLocalFactoryQueue({ databasePath: process.env.GCAN_FACTORY_DB, leaseMs: 1000 });
    try {
      const task = queue.claim(process.env.GCAN_WORKER_ID);
      process.stdout.write(JSON.stringify(task ? { id: task.id, lease_token: task.lease_token } : null));
    } finally {
      queue.close();
    }
  `;
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--input-type=module", "-e", source], {
      cwd: repositoryRoot,
      env: { ...process.env, GCAN_FACTORY_DB: databasePath, GCAN_WORKER_ID: workerId },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (chunk) => { stdout += chunk; });
    child.stderr.setEncoding("utf8").on("data", (chunk) => { stderr += chunk; });
    child.once("error", reject);
    child.once("close", (code) => {
      if (code !== 0) return reject(new Error(stderr || "Worker subprocess failed."));
      try { resolve(JSON.parse(stdout)); } catch (error) { reject(error); }
    });
  });
}

test("independent Node processes share SQLite claim fencing and recover a crashed worker lease", async (t) => {
  const directory = mkdtempSync(join(tmpdir(), "gcan-multiprocess-queue-"));
  const databasePath = join(directory, "shared-factory.sqlite");
  const queue = createLocalFactoryQueue({ databasePath, leaseMs: 1000 });
  t.after(() => {
    queue.close();
    rmSync(directory, { recursive: true, force: true });
  });

  const firstTask = queue.add({ id: "issue-101", title: "Issue 101", payload: {} });
  queue.add({ id: "issue-102", title: "Issue 102", payload: {} });

  const [workerA, workerB] = await Promise.all([
    runWorker(databasePath, "process-a"),
    runWorker(databasePath, "process-b"),
  ]);
  const claims = [workerA, workerB].filter(Boolean);
  assert.equal(claims.length, 1, "only one independent process may claim while the shared lease is active");
  assert.equal(claims[0].id, firstTask.id, "oldest ready task is claimed first");
  assert.equal(queue.list({ status: "running" }).length, 1, "the shared database must never expose two running tasks");

  // The claiming process has exited without completing the task: model a crashed Worker.
  await new Promise((resolve) => setTimeout(resolve, 1100));
  const recovered = await runWorker(databasePath, "process-c");
  assert.equal(recovered?.id, firstTask.id, "a new process must recover and reclaim the expired lease");
  assert.notEqual(recovered.lease_token, claims[0].lease_token, "recovery must issue a fresh fencing token");
  assert.throws(
    () => queue.complete(firstTask.id, "process-a", claims[0].lease_token, { stale: true }),
    /lease is not owned/,
    "the old process token must not complete a recovered task",
  );
  assert.equal(
    queue.complete(firstTask.id, "process-c", recovered.lease_token, { recovered: true }).status,
    "succeeded",
  );
  assert.equal(queue.claim("verification-worker")?.id, "issue-102", "the next Issue becomes claimable only after the first lease is completed");
});
