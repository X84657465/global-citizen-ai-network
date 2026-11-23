import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(new URL("../scripts/apply-agent-patch-to-scratch.mjs", import.meta.url));

function fixture(t, {
  invalidPatch = false,
  invalidPatchJson = false,
  invalidTask = false,
  invalidPlan = false,
  invalidRunnerTemp = false,
} = {}) {
  const root = mkdtempSync(join(tmpdir(), "gcan-scratch-apply-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  execFileSync("git", ["init"], { cwd: root, stdio: "ignore" });
  execFileSync("git", ["config", "user.email", "factory-test@example.invalid"], { cwd: root });
  execFileSync("git", ["config", "user.name", "Factory Test"], { cwd: root });
  writeFileSync(join(root, "README.md"), "scratch fixture\n");
  execFileSync("git", ["add", "README.md"], { cwd: root });
  execFileSync("git", ["commit", "-m", "fixture"], { cwd: root, stdio: "ignore" });
  const artifacts = join(root, "artifacts");
  mkdirSync(artifacts);
  const allowedPath = "docs/generated-fixture.md";
  writeFileSync(join(artifacts, "agent-task.json"), JSON.stringify({
    schema_version: 1, mode: invalidTask ? "invalid_mode" : "preflight_only", ai_execution_enabled: false,
    allowed_paths: [allowedPath],
  }));
  writeFileSync(join(artifacts, "agent-plan.json"), JSON.stringify({
    schema_version: 1, execution_mode: invalidPlan ? "invalid_plan" : "validated_plan_only", ai_execution_enabled: false,
    safety: { no_commands_or_model_code_executed: true },
    tasks: [{
      id: "write-docs", title: "Propose a bounded documentation patch", role: "implementer",
      action: "propose_patch", depends_on: [], allowed_paths: [allowedPath],
      acceptance_criteria: ["The patch remains within its approved path."], max_output_bytes: 1024,
    }],
  }));
  const patchContent = invalidPatchJson
    ? "{ invalid json"
    : JSON.stringify({
        schema_version: 1,
        files: [{ path: invalidPatch ? "docs/outside-allowlist.md" : allowedPath, operation: "add", content: "# Generated fixture\\n" }],
      });
  writeFileSync(join(artifacts, "agent-patch.json"), patchContent);
  const githubEnv = join(root, "github-env.txt");
  writeFileSync(githubEnv, "");
  const runnerTemp = invalidRunnerTemp ? join(root, "missing-runner-temp") : join(root, "runner-temp");
  if (!invalidRunnerTemp) mkdirSync(runnerTemp);
  return { root, githubEnv, runnerTemp };
}

function runScript(data) {
  return spawnSync(process.execPath, [scriptPath], {
    cwd: data.root, encoding: "utf8",
    env: { ...process.env, GITHUB_ENV: data.githubEnv, RUNNER_TEMP: data.runnerTemp },
  });
}

test("does not mark malformed patch JSON as task-scoped when the task bundle is invalid", (t) => {
  const data = fixture(t, { invalidTask: true, invalidPatchJson: true });
  const result = runScript(data);
  assert.notEqual(result.status, 0);
  assert.equal(readFileSync(data.githubEnv, "utf8"), "");
  assert.match(result.stderr, /Only a validated, AI-disabled task bundle is accepted/);
});

test("does not mark malformed patch JSON as task-scoped when the plan is invalid", (t) => {
  const data = fixture(t, { invalidPlan: true, invalidPatchJson: true });
  const result = runScript(data);
  assert.notEqual(result.status, 0);
  assert.equal(readFileSync(data.githubEnv, "utf8"), "");
  assert.match(result.stderr, /Only a validated read-only plan is accepted/);
});

test("records an explicit task marker for a validated patch rejected by the task allowlist", (t) => {
  const data = fixture(t, { invalidPatch: true });
  const result = runScript(data);
  assert.notEqual(result.status, 0);
  assert.equal(readFileSync(data.githubEnv, "utf8"), "AGENT_FACTORY_FAILURE_SCOPE=task\n");
  assert.match(result.stderr, /not explicitly authorized by the task/);
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
  const result = runScript(data);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(readFileSync(data.githubEnv, "utf8"), "");
  const manifest = JSON.parse(readFileSync(join(data.root, "artifacts", "agent-scratch.json"), "utf8"));
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
  assert.deepEqual(requireDirectoryEntries(data.githubEnv), []);
  assert.match(result.stderr, /Task failure marker unavailable; failure remains system-scoped/);
});

function requireDirectoryEntries(path) {
  return readdirSync(path);
}


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
