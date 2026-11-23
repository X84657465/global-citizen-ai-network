import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync, readdirSync, chmodSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(new URL("../scripts/apply-agent-patch-to-scratch.mjs", import.meta.url));
const FIXTURE_COMMIT = "0123456789abcdef0123456789abcdef01234567";

function fixture(t, { invalidPatch = false, invalidPlan = false, invalidPlanJson = false, invalidPatchJson = false, invalidTaskIdentity = false, missingIssueSafety = false, invalidRunnerTemp = false } = {}) {
  const root = mkdtempSync(join(tmpdir(), "gcan-scratch-apply-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const gitBin = join(root, "git-bin");
  mkdirSync(gitBin);
  if (process.platform === "win32") {
    // The Windows host runner has Git installed; retain a real repository fixture there.
    execFileSync("git", ["init"], { cwd: root, stdio: "ignore" });
    execFileSync("git", ["config", "user.email", "factory-test@example.invalid"], { cwd: root });
    execFileSync("git", ["config", "user.name", "Factory Test"], { cwd: root });
  } else {
    // The network-isolated Node container intentionally has no Git package.
    // Provide only the two read-only Git responses this script consumes.
    const gitShim = `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args[0] === "ls-files" && args[1] === "-z") {
  process.stdout.write("README.md\0");
} else if (args[0] === "rev-parse" && args[1] === "HEAD") {
  process.stdout.write("${FIXTURE_COMMIT}\n");
} else {
  console.error("Unsupported fixture git command: " + args.join(" "));
  process.exitCode = 2;
}
`;
    const shimPath = join(gitBin, "git");
    writeFileSync(shimPath, gitShim, { mode: 0o755 });
    chmodSync(shimPath, 0o755);
  }
  writeFileSync(join(root, "README.md"), "scratch fixture\n");
  if (process.platform === "win32") {
    execFileSync("git", ["add", "README.md"], { cwd: root });
    execFileSync("git", ["commit", "-m", "fixture"], { cwd: root, stdio: "ignore" });
  }
  const artifacts = join(root, "artifacts");
  mkdirSync(artifacts);
  const allowedPath = "docs/generated-fixture.md";
  writeFileSync(join(artifacts, "agent-task.json"), JSON.stringify({
    schema_version: 1, mode: "preflight_only", ai_execution_enabled: false,
    issue: { number: invalidTaskIdentity ? "117" : 117, title: "Factory failure isolation", url: "https://github.com/X84657465/global-citizen-ai-network/issues/117", author: "X84657465" },
    safety: missingIssueSafety ? {} : { issue_content_is_untrusted_data: true },
    allowed_paths: [allowedPath],
  }));
  const planPath = join(artifacts, "agent-plan.json");
  writeFileSync(planPath, JSON.stringify({
    schema_version: 1, execution_mode: "validated_plan_only", ai_execution_enabled: false,
    safety: { no_commands_or_model_code_executed: true },
    tasks: [{
      id: "write-docs", title: "Propose a bounded documentation patch", role: "implementer",
      action: "propose_patch", depends_on: [],
      allowed_paths: [invalidPlan ? "docs/outside-task-allowlist.md" : allowedPath],
      acceptance_criteria: ["The patch remains within its approved path."], max_output_bytes: 1024,
    }],
  }));
  if (invalidPlanJson) writeFileSync(planPath, "{");
  const patchPath = join(artifacts, "agent-patch.json");
  writeFileSync(patchPath, JSON.stringify({
    schema_version: 1,
    files: [{ path: invalidPatch ? "docs/outside-allowlist.md" : allowedPath, operation: "add", content: "# Generated fixture\\n" }],
  }));
  if (invalidPatchJson) writeFileSync(patchPath, "{");
  const githubEnv = join(root, "github-env.txt");
  writeFileSync(githubEnv, "");
  const runnerTemp = invalidRunnerTemp ? join(root, "missing-runner-temp") : join(root, "runner-temp");
  if (!invalidRunnerTemp) mkdirSync(runnerTemp);
  return { root, githubEnv, runnerTemp, gitBin };
}

function runScript(data) {
  return spawnSync(process.execPath, [scriptPath], {
    cwd: data.root, encoding: "utf8",
    env: { ...process.env, ...(process.platform === "win32" ? {} : { PATH: [data.gitBin, process.env.PATH ?? ""].filter(Boolean).join(delimiter) }), GITHUB_ENV: data.githubEnv, RUNNER_TEMP: data.runnerTemp },
  });
}

test("does not classify malformed plan JSON without a valid fetched Issue identity", (t) => {
  const data = fixture(t, { invalidPlanJson: true, invalidTaskIdentity: true });
  const result = runScript(data);
  assert.notEqual(result.status, 0);
  assert.equal(readFileSync(data.githubEnv, "utf8"), "");
  assert.match(result.stderr, /valid fetched Issue identity/);
});

test("does not classify malformed plan JSON without the Issue safety attestation", (t) => {
  const data = fixture(t, { invalidPlanJson: true, missingIssueSafety: true });
  const result = runScript(data);
  assert.notEqual(result.status, 0);
  assert.equal(readFileSync(data.githubEnv, "utf8"), "");
  assert.match(result.stderr, /valid fetched Issue identity/);
});

test("records task scope for a typed patch validation rejection after cleanup", (t) => {
  const data = fixture(t, { invalidPatch: true });
  const result = runScript(data);
  assert.notEqual(result.status, 0);
  assert.equal(readFileSync(data.githubEnv, "utf8"), "AGENT_FACTORY_FAILURE_SCOPE=task\n");
  assert.match(result.stderr, /not explicitly authorized by the task/);
});

test("records task scope for a typed plan revalidation rejection", (t) => {
  const data = fixture(t, { invalidPlan: true });
  const result = runScript(data);
  assert.notEqual(result.status, 0);
  assert.equal(readFileSync(data.githubEnv, "utf8"), "AGENT_FACTORY_FAILURE_SCOPE=task\n");
});

test("leaves Runner scratch-directory failures unmarked for system-scope classification", (t) => {
  const data = fixture(t, { invalidRunnerTemp: true });
  const result = runScript(data);
  assert.notEqual(result.status, 0);
  assert.equal(readFileSync(data.githubEnv, "utf8"), "");
  assert.match(result.stderr, /Unable to create a disposable scratch directory/);
});

test("applies an authorized patch only to scratch and emits no failure marker", (t) => {
  const data = fixture(t);
  assert.equal(data.gitBin, join(data.root, "git-bin"));
  const result = runScript(data);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(readFileSync(data.githubEnv, "utf8"), "");
  const manifest = JSON.parse(readFileSync(join(data.root, "artifacts", "agent-scratch.json"), "utf8"));
  if (process.platform !== "win32") assert.equal(manifest.base_commit, FIXTURE_COMMIT);
  assert.equal(manifest.repository_files_modified, false);
  assert.equal(manifest.generated_code_executed, false);
  assert.equal(manifest.patched_files.length, 1);
});

test("keeps a patch-validation rejection system-scoped when the task marker cannot be written", (t) => {
  const data = fixture(t, { invalidPatch: true });
  rmSync(data.githubEnv);
  mkdirSync(data.githubEnv);
  const result = runScript(data);
  assert.notEqual(result.status, 0);
  assert.deepEqual(readdirSync(data.githubEnv), []);
  assert.match(result.stderr, /Task marker unavailable or scratch cleanup failed; failure remains system-scoped/);
});

test("keeps missing tracked repository files system-scoped", (t) => {
  const data = fixture(t);
  rmSync(join(data.root, "README.md"));
  const result = runScript(data);
  assert.notEqual(result.status, 0);
  assert.equal(readFileSync(data.githubEnv, "utf8"), "");
  assert.match(result.stderr, /A tracked repository file is missing from the checkout/);
});

test("keeps scratch manifest write failures system-scoped", (t) => {
  const data = fixture(t);
  mkdirSync(join(data.root, "artifacts", "agent-scratch.json"));
  const result = runScript(data);
  assert.notEqual(result.status, 0);
  assert.equal(readFileSync(data.githubEnv, "utf8"), "");
  assert.match(result.stderr, /Unable to write the scratch workspace manifest/);
});

test("records task scope for malformed plan JSON as a typed plan validation failure", (t) => {
  const data = fixture(t, { invalidPlanJson: true });
  const result = runScript(data);
  assert.notEqual(result.status, 0);
  assert.equal(readFileSync(data.githubEnv, "utf8"), "AGENT_FACTORY_FAILURE_SCOPE=task\n");
  assert.match(result.stderr, /Validated plan contains invalid JSON/);
});

test("records task scope for malformed patch JSON as a typed patch validation failure", (t) => {
  const data = fixture(t, { invalidPatchJson: true });
  const result = runScript(data);
  assert.notEqual(result.status, 0);
  assert.equal(readFileSync(data.githubEnv, "utf8"), "AGENT_FACTORY_FAILURE_SCOPE=task\n");
  assert.match(result.stderr, /Validated patch proposal contains invalid JSON/);
});

test("keeps missing patch artifact I/O system-scoped", (t) => {
  const data = fixture(t);
  rmSync(join(data.root, "artifacts", "agent-patch.json"));
  const result = runScript(data);
  assert.notEqual(result.status, 0);
  assert.equal(readFileSync(data.githubEnv, "utf8"), "");
  assert.match(result.stderr, /Validated patch proposal is missing or unreadable/);
});

test("keeps patch rejection system-scoped when task identity is invalid", (t) => {
  const data = fixture(t, { invalidPatch: true, invalidTaskIdentity: true });
  const result = runScript(data);
  assert.notEqual(result.status, 0);
  assert.equal(readFileSync(data.githubEnv, "utf8"), "");
  assert.match(result.stderr, /Only a validated task bundle with a valid fetched Issue identity is accepted/);
  assert.doesNotMatch(result.stderr, /AGENT_FACTORY_FAILURE_SCOPE=task/);
});

test("guards task marker persistence behind successful scratch cleanup", () => {
  const source = readFileSync(scriptPath, "utf8");
  const cleanupFailure = source.indexOf("cleanupSucceeded = false");
  const cleanupAttempt = source.indexOf("if (scratchDir) {");
  const cleanupCall = source.indexOf('rmSync(scratchDir, { recursive: true, force: true })');
  const guardedMarker = source.indexOf("if (taskScoped && cleanupSucceeded && validTaskIdentity");
  const markerAppend = source.indexOf('appendFileSync(process.env.GITHUB_ENV, "AGENT_FACTORY_FAILURE_SCOPE=task');
  assert.ok(cleanupFailure >= 0);
  assert.ok(cleanupAttempt >= 0);
  assert.ok(cleanupCall > cleanupAttempt);
  assert.equal(source.includes("if (scratchDir && existsSync(scratchDir))"), false);
  assert.ok(guardedMarker > cleanupFailure);
  assert.ok(markerAppend > guardedMarker);
});

test("only typed plan and patch validation errors may request task-scoped markers", () => {
  const source = readFileSync(scriptPath, "utf8");
  assert.match(source, /taskScoped:\s*error instanceof AgentPlanValidationError/);
  assert.match(source, /taskScoped:\s*error instanceof PatchValidationError/);
  assert.doesNotMatch(source, /invalidJsonTaskScoped|taskScoped:\s*true/);
});
