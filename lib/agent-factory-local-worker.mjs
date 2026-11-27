import {
  cpSync,
  existsSync,
  lstatSync,
  mkdtempSync,
  mkdirSync,
  realpathSync,
  rmSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { performance } from "node:perf_hooks";

const ALLOWED_FILES = Object.freeze([
  "lib/agent-factory-local-queue.mjs",
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

export function runLocalFactoryTask({ payload, repositoryRoot = process.cwd(), timeoutMs = 120_000 } = {}) {
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
    const execution = spawnSync(process.execPath, command, {
      cwd: scratchRoot,
      encoding: "utf8",
      timeout: timeoutMs,
      maxBuffer: MAX_OUTPUT_BYTES,
      windowsHide: true,
      shell: false,
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
    const durationMs = Math.round(performance.now() - started);
    if (execution.error || execution.status !== 0) {
      const timedOut = execution.error?.code === "ETIMEDOUT";
      throw new LocalFactoryWorkerError(
        timedOut ? "Allowlisted local queue tests exceeded the execution timeout." :
          execution.error ? "Unable to start the allowlisted Node test process: " + execution.error.message :
            "Allowlisted local queue tests failed with exit code " + String(execution.status) + ".",
        "task",
      );
    }
    return {
      schema_version: 1,
      kind: payload.kind,
      outcome: "passed",
      command_id: "node-test-local-queue",
      exit_code: execution.status,
      duration_ms: durationMs,
      node_version: process.version,
      platform: process.platform,
      test_files: command.slice(1),
      stdout: String(execution.stdout ?? "").slice(-20_000),
      stderr: String(execution.stderr ?? "").slice(-20_000),
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
