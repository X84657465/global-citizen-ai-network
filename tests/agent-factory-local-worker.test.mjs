import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { createTrustedAcceptanceOracle } from "../lib/agent-factory-trusted-oracle.mjs";
import { createLocalFactoryPublicationTarget } from "../lib/agent-factory-local-publication-contract.mjs";
import { runLocalFactoryAgentTask, runLocalFactoryTask, terminateLocalFactoryProcessTree, LocalFactoryWorkerError } from "../lib/agent-factory-local-worker.mjs";

test("local worker executes only the allowlisted queue regression suite and returns evidence", async () => {
  const result = await runLocalFactoryTask({
    payload: { schema_version: 1, kind: "local-queue-tests" },
    repositoryRoot: process.cwd(),
    timeoutMs: 300_000,
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

test("local worker rejects arbitrary task kinds before starting a process", async () => {
  await assert.rejects(
    runLocalFactoryTask({ payload: { schema_version: 1, kind: "arbitrary-shell" } }),
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

test("local agent worker accepts only after separate generated and trusted Oracle tests pass", async (t) => {
  const documentPath = "docs/gcan-local-worker-fixture.md";
  const generatedTestPath = "tests/gcan-local-worker-fixture.test.mjs";
  const taskId = "worker-oracle-fixture";
  const task = {
    schema_version: 1,
    title: "Documentation fixture",
    goal: "Add a documentation example and an independently executed regression test",
    allowed_paths: [documentPath, generatedTestPath],
    acceptance_criteria: ["Document the example", "Add a deterministic regression test"],
    explicit_exclusions: [],
  };
  const baseSha = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: process.cwd(), encoding: "utf8",
  }).trim();
  const trustedOracleContract = createTrustedAcceptanceOracle({
    repositoryRoot: process.cwd(),
    baseSha,
    taskId,
    oracleTestFiles: ["tests/agent-factory-local-queue.test.mjs"],
    workerAllowedPaths: task.allowed_paths,
  });
  const publicationTarget = createLocalFactoryPublicationTarget({
    taskId,
    repository: process.env.GITHUB_REPOSITORY || "X84657465/global-citizen-ai-network",
    baseBranch: process.env.GITHUB_REF_NAME || execFileSync("git", ["symbolic-ref", "--short", "HEAD"], {
      cwd: process.cwd(), encoding: "utf8",
    }).trim(),
    baseSha,
    contractSha256: trustedOracleContract.contract_sha256,
  });
  const criteria = { acceptance_criteria: task.acceptance_criteria };
  const plan = { schema_version: 1, tasks: [
    { ...criteria, id: "inspect", title: "Inspect task", role: "planner", action: "inspect",
      depends_on: [], allowed_paths: [], max_output_bytes: 16384 },
    { ...criteria, id: "implement", title: "Draft example and test", role: "implementer", action: "propose_patch",
      depends_on: ["inspect"], allowed_paths: [documentPath, generatedTestPath], max_output_bytes: 16384 },
    { ...criteria, id: "check", title: "Check example and test", role: "tester", action: "validate_patch",
      depends_on: ["implement"], allowed_paths: [documentPath, generatedTestPath], max_output_bytes: 16384 },
  ] };
  const patch = {
    schema_version: 1,
    files: [
      { path: documentPath, operation: "add", content: "# Local example\\n" },
      { path: generatedTestPath, operation: "add",
        content: 'import test from "node:test";\\ntest("generated fixture", () => {});\\n' },
    ],
  };
  t.mock.method(globalThis, "fetch", async (url, options) => {
    if (url.endsWith("/api/tags")) {
      return Response.json({ models: [{ name: process.env.GCAN_OLLAMA_MODEL || "fixture-model" }] });
    }
    assert.ok(url.endsWith("/api/generate"));
    const request = JSON.parse(options.body);
    const response = request.format.properties.tasks ? plan : patch;
    return Response.json({ response: JSON.stringify(response) });
  });

  const calls = [];
  const result = await runLocalFactoryAgentTask({
    payload: {
      schema_version: 1,
      kind: "local-agent-task",
      task_id: taskId,
      task,
      trusted_oracle_contract: trustedOracleContract,
      publication_target: publicationTarget,
    },
    sandboxTests: true,
    sandboxTestRunner({ scratchRoot, testFiles }) {
      calls.push([...testFiles]);
      for (const path of testFiles) assert.equal(existsSync(join(scratchRoot, path)), true);
      if (testFiles.includes(generatedTestPath)) {
        assert.equal(readFileSync(join(scratchRoot, documentPath), "utf8"), "# Local example\\n");
      } else {
        assert.deepEqual(testFiles, ["tests/agent-factory-local-queue.test.mjs"]);
      }
      return {
        exit_code: 0,
        passed_tests: 1,
        test_files: [...testFiles],
        tap_summary: {
          tests: 1, pass: 1, fail: 0, cancelled: 0, skipped: 0, todo: 0, valid: true,
        },
      };
    },
  });
  assert.equal(result.outcome, "accepted");
  assert.equal(result.acceptance_status, "ACCEPTED");
  assert.equal(result.plan_artifact.status, "VALIDATED_PLAN");
  assert.equal(result.patch_artifact.status, "VALIDATED_PATCH");
  assert.deepEqual(calls, [[generatedTestPath], ["tests/agent-factory-local-queue.test.mjs"]]);
  assert.equal(result.scratch_evidence.generated_code_executed, true);
  assert.equal(result.acceptance_evidence.valid, true);
  assert.equal(result.acceptance_evidence.contract_sha256, trustedOracleContract.contract_sha256);
});

test("Windows process-tree termination only reports success after taskkill confirms exit zero", () => {
  let directKillCalls = 0;
  const child = {
    pid: 4242,
    exitCode: null,
    signalCode: null,
    kill() { directKillCalls += 1; },
  };
  const env = { SystemRoot: "C:\\Windows", PATH: "" };
  const successful = terminateLocalFactoryProcessTree(child, {
    platform: "win32",
    env,
    spawnSyncImpl: (command, args, options) => {
      assert.equal(command, "C:\\Windows\\System32\\taskkill.exe");
      assert.deepEqual(args, ["/PID", "4242", "/T", "/F"]);
      assert.equal(options.shell, false);
      return { status: 0, signal: null, error: null, stdout: "", stderr: "" };
    },
  });
  assert.deepEqual(successful, { strategy: "windows-taskkill-tree", pid: 4242, confirmed: true });
  assert.equal(directKillCalls, 0, "successful tree termination must not silently fall back to direct-child kill");

  for (const failedResult of [
    { status: 1, signal: null, error: null, stdout: "", stderr: "Access is denied." },
    { status: null, signal: "SIGTERM", error: null, stdout: "", stderr: "" },
    { status: null, signal: null, error: Object.assign(new Error("spawn failed"), { code: "ENOENT" }), stdout: "", stderr: "" },
  ]) {
    assert.throws(
      () => terminateLocalFactoryProcessTree(child, {
        platform: "win32",
        env,
        spawnSyncImpl: () => failedResult,
      }),
      (error) => error instanceof LocalFactoryWorkerError &&
        error.scope === "system" &&
        /termination was not confirmed/.test(error.message),
    );
  }
});

test("timeout termination kills the worker and its descendant process tree", async () => {
  const childCode = [
    "const { spawn } = require('node:child_process');",
    "const grandchild = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });",
    "process.stdout.write(String(grandchild.pid) + '\\n');",
    "setInterval(() => {}, 1000);",
  ].join("\n");
  const child = spawn(process.execPath, ["-e", childCode], {
    detached: process.platform !== "win32",
    stdio: ["ignore", "pipe", "ignore"],
    windowsHide: true,
    shell: false,
  });
  const grandchildPid = await new Promise((resolve, reject) => {
    let output = "";
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(pidTimeout);
      callback(value);
    };
    const pidTimeout = setTimeout(() => {
      let terminationError = null;
      try {
        terminateLocalFactoryProcessTree(child);
      } catch (error) {
        terminationError = error;
      }
      finish(
        reject,
        new Error(
          "Worker did not report its descendant PID within 5000ms." +
            (terminationError ? " Process-tree termination also failed: " + terminationError.message : ""),
        ),
      );
    }, 5_000);
    child.once("error", (error) => finish(reject, error));
    child.once("close", (code, signal) => {
      finish(reject, new Error(
        "Worker exited before reporting its descendant PID (code " + String(code) +
          ", signal " + String(signal) + ").",
      ));
    });
    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
      const match = output.match(/(\d+)\r?\n/);
      if (match) finish(resolve, Number(match[1]));
    });
  });

  const closed = new Promise((resolve) => child.once("close", resolve));
  terminateLocalFactoryProcessTree(child);
  await closed;

  let stillAlive = true;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      process.kill(grandchildPid, 0);
      if (process.platform === "linux") {
        // A terminated child can retain its PID until the container init reaps it.
        const stat = await readFile(`/proc/${grandchildPid}/stat`, "utf8");
        const state = stat.slice(stat.lastIndexOf(")") + 2, stat.lastIndexOf(")") + 3);
        if (state === "Z" || state === "X") {
          stillAlive = false;
          break;
        }
      }
    } catch (error) {
      if (error?.code === "ESRCH" || error?.code === "ENOENT") {
        stillAlive = false;
        break;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.equal(stillAlive, false, "descendant process must not survive worker termination");
});
