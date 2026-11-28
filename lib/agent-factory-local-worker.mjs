import {
  cpSync,
  existsSync,
  lstatSync,
  mkdtempSync,
  mkdirSync,
  realpathSync,
  rmSync,
} from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { performance } from "node:perf_hooks";
import {
  applyLocalFactoryPatchToScratch,
  generateLocalFactoryPatch,
  generateLocalFactoryPlan,
  restoreLocalFactoryTask,
} from "./agent-factory-local-adapter.mjs";
import { runLocalFactorySandboxTests } from "./agent-factory-local-sandbox.mjs";
import { verifyTrustedAcceptanceOracle } from "./agent-factory-trusted-oracle.mjs";
import { verifyLocalFactoryPublicationTarget } from "./agent-factory-local-publication-contract.mjs";

const ALLOWED_FILES = Object.freeze([
  "lib/agent-factory-local-queue.mjs",
  "lib/agent-factory-local-publication-contract.mjs",
  "tests/agent-factory-local-queue.test.mjs",
  "tests/agent-factory-local-queue-regression.test.mjs",
]);
const MAX_OUTPUT_BYTES = 512 * 1024;

export class LocalFactoryWorkerError extends Error {
  constructor(message, scope = "system") {
    super(message);
    this.name = "LocalFactoryWorkerError";
    this.scope = scope;
  }
}

function copyAllowlistedFiles(repositoryRoot, scratchRoot) {
  const realRoot = realpathSync(repositoryRoot);
  for (const relativePath of ALLOWED_FILES) {
    const source = resolve(realRoot, relativePath);
    if (source !== realRoot && !source.startsWith(realRoot + sep)) {
      throw new LocalFactoryWorkerError("Allowlisted source resolved outside the repository.");
    }
    if (!existsSync(source)) throw new LocalFactoryWorkerError("Required allowlisted test source is missing: " + relativePath);
    const stat = lstatSync(source);
    if (stat.isSymbolicLink() || !stat.isFile()) {
      throw new LocalFactoryWorkerError("Allowlisted test source must be a regular non-symlink file: " + relativePath);
    }
    const realSource = realpathSync(source);
    if (realSource !== realRoot && !realSource.startsWith(realRoot + sep)) {
      throw new LocalFactoryWorkerError("Allowlisted test source resolves outside the repository.");
    }
    const destination = join(scratchRoot, relativePath);
    mkdirSync(dirname(destination), { recursive: true });
    cpSync(source, destination, { errorOnExist: true, force: false });
  }
}

const KILL_GRACE_MS = 2_000;

export function terminateLocalFactoryProcessTree(child, {
  graceMs = KILL_GRACE_MS,
  platform = process.platform,
  spawnSyncImpl = spawnSync,
  env = process.env,
} = {}) {
  if (!child || !Number.isInteger(child.pid) || child.pid <= 0) {
    throw new TypeError("A spawned child process with a valid pid is required.");
  }
  if (!Number.isSafeInteger(graceMs) || graceMs < 0 || graceMs > 10_000) {
    throw new TypeError("graceMs must be between 0 and 10000 milliseconds.");
  }

  if (platform === "win32") {
    const systemRoot = env.SystemRoot || env.WINDIR || "C:\\Windows";
    const taskkill = join(systemRoot, "System32", "taskkill.exe");
    const result = spawnSyncImpl(taskkill, ["/PID", String(child.pid), "/T", "/F"], {
      encoding: "utf8",
      windowsHide: true,
      timeout: graceMs + 5_000,
      shell: false,
      env: {
        PATH: env.PATH ?? "",
        SystemRoot: systemRoot,
        WINDIR: systemRoot,
      },
    });
    if (result.error || result.signal || result.status !== 0) {
      const reason = result.error?.message ||
        (result.signal ? "terminated by signal " + result.signal : "exit status " + String(result.status));
      throw new LocalFactoryWorkerError("Windows process-tree termination was not confirmed: " + reason);
    }
    return { strategy: "windows-taskkill-tree", pid: child.pid, confirmed: true };
  }

  try {
    process.kill(-child.pid, "SIGKILL");
  } catch (error) {
    if (error?.code !== "ESRCH") throw error;
  }
  return { strategy: "posix-process-group-sigkill", pid: child.pid, confirmed: true };
}
function collectOutput(stream, limit = MAX_OUTPUT_BYTES) {
  let chunks = [];
  let bytes = 0;
  let truncated = false;
  stream?.on("data", (chunk) => {
    const buffer = Buffer.from(chunk);
    const remaining = limit - bytes;
    if (remaining > 0) {
      const accepted = buffer.subarray(0, remaining);
      chunks.push(accepted);
      bytes += accepted.length;
    }
    if (buffer.length > remaining) truncated = true;
  });
  return () => ({ text: Buffer.concat(chunks).toString("utf8"), truncated });
}

export async function runLocalFactoryTask({ payload, repositoryRoot = process.cwd(), timeoutMs = 120_000 } = {}) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload) ||
      payload.schema_version !== 1 || payload.kind !== "local-queue-tests" ||
      Object.keys(payload).sort().join(",") !== "kind,schema_version") {
    throw new LocalFactoryWorkerError("Unsupported or invalid local task payload.", "task");
  }
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 300_000) {
    throw new TypeError("timeoutMs must be between 1000 and 300000 milliseconds.");
  }

  let scratchRoot;
  let cleanupError = null;
  const started = performance.now();
  try {
    scratchRoot = mkdtempSync(join(tmpdir(), "gcan-factory-local-"));
    copyAllowlistedFiles(repositoryRoot, scratchRoot);
    const command = [
      "--test",
      "tests/agent-factory-local-queue.test.mjs",
      "tests/agent-factory-local-queue-regression.test.mjs",
    ];
    const result = await new Promise((resolveResult, rejectResult) => {
      const child = spawn(process.execPath, command, {
        cwd: scratchRoot,
        windowsHide: true,
        shell: false,
        detached: process.platform !== "win32",
        env: {
          PATH: process.env.PATH ?? "",
          SystemRoot: process.env.SystemRoot ?? "",
          WINDIR: process.env.WINDIR ?? "",
          TEMP: process.env.TEMP ?? "",
          TMP: process.env.TMP ?? "",
          NODE_OPTIONS: "",
          CI: "1",
        },
      });
      const stdout = collectOutput(child.stdout);
      const stderr = collectOutput(child.stderr);
      let timedOut = false;
      let settled = false;
      const timeout = setTimeout(() => {
        timedOut = true;
        try {
          terminateLocalFactoryProcessTree(child);
        } catch (error) {
          if (!settled) {
            settled = true;
            rejectResult(error);
          }
        }
      }, timeoutMs);
      child.once("error", (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        rejectResult(new LocalFactoryWorkerError("Unable to start allowlisted Node tests: " + error.message, "task"));
      });
      child.once("close", (code, signal) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        const out = stdout();
        const err = stderr();
        if (timedOut || code !== 0) {
          rejectResult(new LocalFactoryWorkerError(
            timedOut ? "Allowlisted local queue tests exceeded the execution timeout." :
              "Allowlisted local queue tests failed with exit code " + String(code) + " (signal " + String(signal) + ").",
            "task",
          ));
          return;
        }
        resolveResult({
          exit_code: code,
          stdout: out.text,
          stderr: err.text,
          stdout_truncated: out.truncated,
          stderr_truncated: err.truncated,
        });
      });
    });
    const durationMs = Math.round(performance.now() - started);
    return {
      schema_version: 1,
      kind: payload.kind,
      outcome: "passed",
      command_id: "node-test-local-queue",
      exit_code: result.exit_code,
      duration_ms: durationMs,
      node_version: process.version,
      platform: process.platform,
      test_files: command.slice(1),
      stdout: result.stdout.slice(-20_000),
      stderr: result.stderr.slice(-20_000),
      output_truncated: result.stdout_truncated || result.stderr_truncated,
      process_tree_termination: process.platform === "win32" ? "taskkill /T /F" : "detached process group",
      scratch_cleanup: "completed",
    };
  } catch (error) {
    if (error instanceof LocalFactoryWorkerError) throw error;
    throw new LocalFactoryWorkerError(error instanceof Error ? error.message : "Local worker failed unexpectedly.", "system");
  } finally {
    if (scratchRoot) {
      try {
        rmSync(scratchRoot, { recursive: true, force: true, maxRetries: 2, retryDelay: 100 });
      } catch (error) {
        cleanupError = error;
      }
    }
    if (cleanupError) {
      throw new LocalFactoryWorkerError(
        "Disposable scratch cleanup failed; task result must not be accepted: " +
          (cleanupError instanceof Error ? cleanupError.message : "unknown cleanup error"),
        "system",
      );
    }
  }
}


/**
 * Executes a bounded local Ollama pipeline. Generated tests can only run
 * through the locally enabled container sandbox.
 */
export async function runLocalFactoryAgentTask({
  payload,
  repositoryRoot = process.cwd(),
  sandboxTests = false,
  sandboxTestRunner = runLocalFactorySandboxTests,
} = {}) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload) ||
      payload.schema_version !== 1 || payload.kind !== "local-agent-task" ||
      Object.keys(payload).sort().join(",") !== "kind,publication_target,schema_version,task,task_id,trusted_oracle_contract" ||
      typeof payload.task_id !== "string" || !payload.trusted_oracle_contract) {
    throw new LocalFactoryWorkerError("Unsupported or invalid local agent task payload.", "task");
  }

  let task;
  try {
    task = restoreLocalFactoryTask(payload.task);
  } catch (error) {
    throw new LocalFactoryWorkerError(
      error instanceof Error ? error.message : "Local agent task validation failed.",
      "task",
    );
  }

  let oracleVerification;
  try {
    oracleVerification = verifyTrustedAcceptanceOracle({
      repositoryRoot,
      contract: payload.trusted_oracle_contract,
      taskId: payload.task_id,
    });
    verifyLocalFactoryPublicationTarget(payload.publication_target, {
      taskId: payload.task_id,
      contract: payload.trusted_oracle_contract,
    });
    const expectedWorkerPaths = [...task.allowed_paths].sort();
    if (JSON.stringify(expectedWorkerPaths) !== JSON.stringify(oracleVerification.worker_allowed_paths)) {
      throw new Error("Trusted Oracle contract does not bind the exact restored Worker write allowlist.");
    }
  } catch (error) {
    throw new LocalFactoryWorkerError(
      error instanceof Error ? error.message : "Trusted Oracle intake verification failed.",
      "task",
    );
  }
  if (sandboxTests !== true) {
    throw new LocalFactoryWorkerError(
      "Agent task is not eligible for completion: set GCAN_FACTORY_SANDBOX_TESTS=1 so generated tests and the independent Trusted Oracle both execute.",
      "system",
    );
  }
  if (typeof sandboxTestRunner !== "function") {
    throw new LocalFactoryWorkerError("A trusted sandbox test runner is required.", "system");
  }

  try {
    const planArtifact = await generateLocalFactoryPlan({ task });
    const patchArtifact = await generateLocalFactoryPatch({
      task,
      plan: planArtifact,
      repositoryRoot,
    });
    const scratchEvidence = applyLocalFactoryPatchToScratch({
      task,
      patchArtifact,
      repositoryRoot,
      sandboxTestRunner,
      trustedOracleContract: payload.trusted_oracle_contract,
    });
    const finalOracleVerification = verifyTrustedAcceptanceOracle({
      repositoryRoot,
      contract: payload.trusted_oracle_contract,
      taskId: payload.task_id,
    });
    if (!scratchEvidence.generated_code_executed ||
        !scratchEvidence.trusted_oracle_evidence?.valid ||
        scratchEvidence.trusted_oracle_evidence.contract_sha256 !== oracleVerification.contract_sha256 ||
        finalOracleVerification.contract_sha256 !== oracleVerification.contract_sha256) {
      throw new LocalFactoryWorkerError("Trusted Oracle acceptance evidence is missing, incomplete or no longer bound to the intake contract.", "task");
    }
    return {
      schema_version: 1,
      kind: "local-agent-task",
      outcome: "accepted",
      acceptance_status: "ACCEPTED",
      generated_code_executed: true,
      test_execution: scratchEvidence.test_execution,
      trusted_oracle: finalOracleVerification,
      acceptance_evidence: scratchEvidence.trusted_oracle_evidence,
      plan_artifact: planArtifact,
      patch_artifact: patchArtifact,
      scratch_evidence: scratchEvidence,
      persistence_contract: "The SQLite queue persists this complete ACCEPTED result under the task lease before completion is reported.",
    };
  } catch (error) {
    if (error instanceof LocalFactoryWorkerError) throw error;
    const scope = error?.scope === "task" || error?.name === "TrustedAcceptanceOracleError" ? "task" : "system";
    throw new LocalFactoryWorkerError(
      error instanceof Error ? error.message : "Local agent pipeline failed.",
      scope,
    );
  }
}
