import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { chmodSync, readdirSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { performance } from "node:perf_hooks";
import { candidateContainerFailureScope } from "./agent-factory-policy.mjs";

const IMAGE = "node@sha256:1314fb30ec37592d5845e5a160d522c0e680972aa534549940b8d73bde88481a";
const PROXY_VARIABLES = ["HTTP_PROXY", "HTTPS_PROXY", "FTP_PROXY", "ALL_PROXY", "NO_PROXY"];

function exposeScratchReadOnly(directory) {
  chmodSync(directory, 0o755);
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) exposeScratchReadOnly(path);
    else if (entry.isFile()) chmodSync(path, 0o644);
    else throw new Error("The Factory scratch contains an unsupported file type.");
  }
}

function docker(args, timeout = 10_000) {
  return spawnSync("docker", args, { encoding: "utf8", windowsHide: true, timeout, maxBuffer: 512 * 1024 });
}

export function runLocalFactorySandboxTests({ scratchRoot, testFiles }) {
  if (!isAbsolute(scratchRoot) || /[,"\r\n]/.test(scratchRoot) || !Array.isArray(testFiles) ||
      testFiles.length === 0 || testFiles.some((path) => !/^tests\/(?:[A-Za-z0-9_-][\w.-]*\/)*[A-Za-z0-9_-][\w.-]*\.test\.mjs$/.test(path))) {
    throw new Error("Invalid Factory sandbox workspace or test paths.");
  }

  exposeScratchReadOnly(scratchRoot);
  const name = "gcan-factory-test-" + randomUUID();
  const started = performance.now();
  const proxyArgs = PROXY_VARIABLES.flatMap((key) => ["--env", key + "=", "--env", key.toLowerCase() + "="]);
  const created = docker([
    "create", "--name", name, "--pull", "never", "--network", "none", "--read-only",
    "--cap-drop", "ALL", "--security-opt", "no-new-privileges", "--pids-limit", "64",
    "--memory", "512m", "--cpus", "1", "--user", "1000:1000", "--log-driver", "none",
    "--tmpfs", "/tmp:rw,noexec,nosuid,nodev,size=32m,uid=1000,gid=1000",
    "--mount", "type=bind,src=" + scratchRoot + ",dst=/workspace,readonly",
    "--workdir", "/workspace", ...proxyArgs, "--entrypoint", "/usr/local/bin/node", IMAGE,
    "--test", "--test-reporter=tap", ...testFiles,
  ]);

  try {
    if (created.error || created.status !== 0) {
      throw new Error("Unable to create the isolated Factory test container. Verify Docker and the pinned image.");
    }
    const executed = docker(["start", "--attach", name], 60_000);
    if (executed.error) throw new Error("Factory sandbox exceeded its execution or output limit, or Docker failed to attach.");
    const inspected = docker(["inspect", "--format", "{{json .State}}", name]);
    if (inspected.error || inspected.status !== 0) throw new Error("Unable to verify Factory sandbox container state.");
    const state = JSON.parse(inspected.stdout);
    if (candidateContainerFailureScope(state, executed.status) === "system") {
      throw new Error("Factory sandbox did not exit normally with verifiable test evidence.");
    }
    const passed = Number(/^# pass (\d+)\r?$/m.exec(executed.stdout)?.[1] ?? 0);
    return {
      schema_version: 1,
      command_id: "docker-node-test-local-patch",
      image: IMAGE,
      network: "none",
      test_files: testFiles,
      exit_code: executed.status,
      passed_tests: passed,
      stdout: String(executed.stdout ?? "").slice(-6000),
      stderr: String(executed.stderr ?? "").slice(-6000),
      duration_ms: Math.round(performance.now() - started),
    };
  } finally {
    const removed = docker(["rm", "--force", name]);
    if ((created.status === 0 || created.error?.code === "ETIMEDOUT") && (removed.error || removed.status !== 0)) {
      throw new Error("Unable to confirm removal of the Factory sandbox container.");
    }
  }
}
