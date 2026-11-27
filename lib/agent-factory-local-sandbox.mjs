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

export function parseStrictTapSummary(stdout) {
  const output = String(stdout ?? "");
  const summaryNames = ["tests", "pass", "fail", "cancelled", "skipped", "todo"];
  const summary = {};
  const summaryPositions = [];
  let summaryValid = true;

  for (const name of summaryNames) {
    const matches = [...output.matchAll(new RegExp("^# " + name + " (\\d+)$", "gm"))];
    if (matches.length !== 1) {
      summaryValid = false;
      summary[name] = null;
      continue;
    }
    summary[name] = Number(matches[0][1]);
    summaryPositions.push(matches[0].index);
    if (!Number.isSafeInteger(summary[name])) summaryValid = false;
  }

  // Only column-zero TAP records belong to the root suite. Indented plans and
  // points are nested subtests and must not be mistaken for root evidence.
  const plans = [...output.matchAll(/^1\.\.(\d+)(?:\s|$)/gm)];
  const rootPoints = [...output.matchAll(/^(not )?ok (\d+)(?:\s|$)/gm)];
  const planCount = plans.length === 1 ? Number(plans[0][1]) : null;
  const rootPointNumbers = rootPoints.map((match) => Number(match[2]));
  const rootPlanValid = plans.length === 1 &&
    Number.isSafeInteger(planCount) && planCount > 0 &&
    rootPoints.length === planCount &&
    rootPointNumbers.every((number, index) => number === index + 1) &&
    rootPoints.every((match) => !match[1] && match.index < plans[0].index) &&
    summaryPositions.every((position) => position > plans[0].index);

  const valid = summaryValid &&
    Object.values(summary).every(Number.isSafeInteger) &&
    summary.tests > 0 && summary.pass === summary.tests &&
    summary.fail === 0 && summary.cancelled === 0 &&
    summary.skipped === 0 && summary.todo === 0 &&
    rootPlanValid;

  return { ...summary, valid };
}
export function runLocalFactorySandboxTests({ scratchRoot, testFiles, mode = "generated" }) {
  if (!["generated", "trusted-oracle"].includes(mode) ||
      !isAbsolute(scratchRoot) || /[,"\r\n]/.test(scratchRoot) || !Array.isArray(testFiles) ||
      testFiles.length === 0 || testFiles.some((path) => !/^tests\/(?:[A-Za-z0-9_-][\w.-]*\/)*[A-Za-z0-9_-][\w.-]*\.test\.mjs$/.test(path))) {
    throw new Error("Invalid Factory sandbox workspace or test paths.");
  }

  exposeScratchReadOnly(scratchRoot);
  const name = "gcan-factory-test-" + randomUUID();
  const started = performance.now();
  const proxyArgs = PROXY_VARIABLES.flatMap((key) => ["--env", key + "=", "--env", key.toLowerCase() + "="]);
  const acceptanceArgs = mode === "trusted-oracle" ? ["--env", "GCAN_FACTORY_TRUSTED_ORACLE=1"] : [];
  const created = docker([
    "create", "--name", name, "--pull", "never", "--network", "none", "--read-only",
    "--cap-drop", "ALL", "--security-opt", "no-new-privileges", "--pids-limit", "64",
    "--memory", "512m", "--cpus", "1", "--user", "1000:1000", "--log-driver", "none",
    "--tmpfs", "/tmp:rw,noexec,nosuid,nodev,size=32m,uid=1000,gid=1000",
    "--mount", "type=bind,src=" + scratchRoot + ",dst=/workspace,readonly",
    "--workdir", "/workspace", ...proxyArgs, ...acceptanceArgs, "--entrypoint", "/usr/local/bin/node", IMAGE,
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
    const tap = parseStrictTapSummary(executed.stdout);
  const passed = tap.pass ?? 0;
  const verifiedExitCode = executed.status === 0 && tap.valid ? 0 : 1;
    const failureLines = String(executed.stdout ?? "").split(/\r?\n/)
      .filter((line) => /^(?:not ok|# (?:error|fail|tests|pass)|\s*(?:error|AssertionError|ERR_))|\bat\s+/.test(line))
      .slice(-12);
    const failureSummary = failureLines.join(" ").replace(/\s+/g, " ").slice(-800);
    return {
      schema_version: 1,
      command_id: "docker-node-test-local-patch",
      image: IMAGE,
      network: "none",
      test_files: testFiles,
      exit_code: verifiedExitCode,
      passed_tests: passed,
      tap_summary: tap,
      stdout: String(executed.stdout ?? "").slice(-6000),
      stderr: String(executed.stderr ?? "").slice(-6000),
      failure_summary: failureSummary,
      duration_ms: Math.round(performance.now() - started),
    };
  } finally {
    const removed = docker(["rm", "--force", name]);
    if ((created.status === 0 || created.error?.code === "ETIMEDOUT") && (removed.error || removed.status !== 0)) {
      throw new Error("Unable to confirm removal of the Factory sandbox container.");
    }
  }
}
