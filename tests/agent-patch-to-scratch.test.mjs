import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { candidateContainerFailureScope } from "../lib/agent-factory-policy.mjs";

const scriptPath = fileURLToPath(new URL("../scripts/apply-agent-patch-to-scratch.mjs", import.meta.url));
const FIXTURE_COMMIT = "0123456789abcdef0123456789abcdef01234567";

function fixture(t, { invalidPatch = false, invalidPlan = false, invalidPlanJson = false, invalidPatchJson = false, invalidTaskIdentity = false, missingIssueSafety = false, invalidRunnerTemp = false, trackedDirectoryCollision = false } = {}) {
  const root = mkdtempSync(join(tmpdir(), "gcan-scratch-apply-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  if (process.platform === "win32") {
    // The Windows host runner has Git installed; retain a real repository fixture there.
    execFileSync("git", ["init"], { cwd: root, stdio: "ignore" });
    execFileSync("git", ["config", "user.email", "factory-test@example.invalid"], { cwd: root });
    execFileSync("git", ["config", "user.name", "Factory Test"], { cwd: root });
  }
  writeFileSync(join(root, "README.md"), "scratch fixture\n");
  if (trackedDirectoryCollision) writeFileSync(join(root, "docs"), "not a directory\n");
  if (process.platform === "win32") {
    execFileSync("git", ["add", ...(trackedDirectoryCollision ? ["README.md", "docs"] : ["README.md"])], { cwd: root });
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
    files: [{ path: invalidPatch ? "docs/outside-allowlist.md" : allowedPath, operation: "add", content: "# Generated fixture\n" }],
  }));
  if (invalidPatchJson) writeFileSync(patchPath, "{");
  const githubEnv = join(root, "github-env.txt");
  writeFileSync(githubEnv, "");
  const runnerTemp = invalidRunnerTemp ? join(root, "missing-runner-temp") : join(root, "runner-temp");
  if (!invalidRunnerTemp) mkdirSync(runnerTemp);
  return { root, githubEnv, runnerTemp, trackedDirectoryCollision };
}

function runScript(data) {
  return spawnSync(process.execPath, [scriptPath], {
    cwd: data.root, encoding: "utf8",
    env: { ...process.env, NODE_ENV: "test", GCAN_TEST_GIT_SHIM: process.platform === "win32" ? "0" : "1", GCAN_TEST_TRACKED_DIRECTORY_COLLISION: data.trackedDirectoryCollision ? "1" : "0", GITHUB_ENV: data.githubEnv, RUNNER_TEMP: data.runnerTemp },
  });
}

test("Linux fixture Git shim returns only the expected read-only metadata", (t) => {
  if (process.platform === "win32") return;
  const data = fixture(t);
  const shimPath = fileURLToPath(new URL("./fixtures/agent-factory-git-shim.mjs", import.meta.url));
  assert.equal(execFileSync(process.execPath, [shimPath, "ls-files", "-z"], { encoding: "utf8" }), "README.md\0");
  assert.equal(execFileSync(process.execPath, [shimPath, "rev-parse", "HEAD"], { encoding: "utf8" }), `${FIXTURE_COMMIT}\n`);
  const unexpected = spawnSync(process.execPath, [shimPath, "status"], { encoding: "utf8" });
  assert.equal(unexpected.status, 2);
  assert.match(unexpected.stderr, /Unsupported fixture git command/);
});

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


test("classifies ambiguous SIGKILL exit 137 and Docker OOM/dead containers as system failures", () => {
  const healthyRuntimeFailure = {
    Status: "exited",
    Error: "",
    ExitCode: 137,
    OOMKilled: false,
    Dead: false,
  };

  assert.equal(candidateContainerFailureScope(healthyRuntimeFailure), "system");
  assert.equal(candidateContainerFailureScope({ ...healthyRuntimeFailure, ExitCode: 1 }), "task");
  assert.equal(candidateContainerFailureScope({ ...healthyRuntimeFailure, ExitCode: 0 }), "none");
  assert.equal(candidateContainerFailureScope({ ...healthyRuntimeFailure, ExitCode: 1, OOMKilled: true }), "system");
  assert.equal(candidateContainerFailureScope({ ...healthyRuntimeFailure, ExitCode: 1, Dead: true }), "system");
  assert.equal(candidateContainerFailureScope({ ...healthyRuntimeFailure, ExitCode: 1, OOMKilled: true, Dead: true }), "system");

  const missingOomKilled = { ...healthyRuntimeFailure, ExitCode: 1 };
  delete missingOomKilled.OOMKilled;
  const missingDead = { ...healthyRuntimeFailure, ExitCode: 1 };
  delete missingDead.Dead;
  assert.equal(candidateContainerFailureScope(missingOomKilled), "system");
  assert.equal(candidateContainerFailureScope(missingDead), "system");
  assert.equal(candidateContainerFailureScope({ ...healthyRuntimeFailure, ExitCode: 1, OOMKilled: null }), "system");
  assert.equal(candidateContainerFailureScope({ ...healthyRuntimeFailure, ExitCode: 1, Dead: "false" }), "system");
});

test("keeps scratch filesystem collisions system-scoped and removes partial scratch workspaces", (t) => {
  const data = fixture(t, { trackedDirectoryCollision: true });
  const result = runScript(data);
  assert.notEqual(result.status, 0);
  assert.equal(readFileSync(data.githubEnv, "utf8"), "");
  assert.match(result.stderr, /Unable to create a patch destination directory in the scratch workspace/);
  assert.deepEqual(readdirSync(data.runnerTemp), []);
});


test("successful task publication does not invoke the non-mutating legacy success callback", () => {
  const workflowPath = fileURLToPath(new URL("../.github/workflows/agent-task-preflight.yml", import.meta.url));
  const workflow = readFileSync(workflowPath, "utf8");
  assert.equal(
    workflow.includes("Reset circuit breaker after successful task publication"),
    false,
    "publishing a task must not invoke the legacy success callback or imply system recovery",
  );
  assert.equal(workflow.includes("AGENT_FACTORY_SUCCESS_SCOPE: task"), false);
  assert.equal(workflow.includes("COMPLETED_ISSUE_NUMBER: ${{ needs.prepare-task.outputs.issue_number }}"), false);
});



const prepareTaskScriptPath = fileURLToPath(new URL("../scripts/prepare-agent-task.mjs", import.meta.url));
const identityTestBody = [
  "## Goal",
  "Verify the fetched task identity gate before task content is classified.",
  "## Allowed paths",
  "- tests/agent-patch-to-scratch.test.mjs",
  "## Acceptance criteria",
  "- Only a validated fetched Issue may enter task-content validation.",
  "## Explicit exclusions",
  "- Do not modify paths outside the task allowlist.",
].join("\n");
const identityTestUrl = "https://github.com/X84657465/global-citizen-ai-network/issues/117";

function identityIssue(overrides = {}) {
  return {
    number: 117,
    state: "open",
    html_url: identityTestUrl,
    title: "Factory failure scope identity regression",
    body: identityTestBody,
    user: { login: "X84657465" },
    labels: [],
    ...overrides,
  };
}

function runTaskPreparation(issue, t) {
  const root = mkdtempSync(join(tmpdir(), "gcan-task-identity-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, "artifacts"));
  const githubEnv = join(root, "github-env.txt");
  writeFileSync(githubEnv, "");
  const mockFetchPath = join(root, "mock-github-fetch.mjs");
  writeFileSync(mockFetchPath, [
    "const issue = JSON.parse(process.env.GCAN_TEST_GITHUB_ISSUE_JSON);",
    "globalThis.fetch = async (url) => {",
    '  if (String(url) !== "https://api.github.com/repos/X84657465/global-citizen-ai-network/issues/117") {',
    '    return new Response(JSON.stringify({ message: "unexpected URL" }), { status: 404, headers: { "content-type": "application/json" } });',
    "  }",
    '  return new Response(JSON.stringify(issue), { status: 200, headers: { "content-type": "application/json" } });',
    "};",
  ].join("\n"));
  const preload = "--import=" + pathToFileURL(mockFetchPath).href;
  const result = spawnSync(process.execPath, [prepareTaskScriptPath], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      NODE_ENV: "test",
      GITHUB_ENV: githubEnv,
      GITHUB_API_URL: "https://api.github.com",
      GITHUB_REPOSITORY: "X84657465/global-citizen-ai-network",
      GITHUB_TOKEN: "test-token",
      ISSUE_NUMBER: "117",
      GCAN_TEST_GITHUB_ISSUE_JSON: JSON.stringify(issue),
      NODE_OPTIONS: [process.env.NODE_OPTIONS, preload].filter(Boolean).join(" "),
    },
  });
  return { result, githubEnv };
}

test("task preflight accepts a matching open repository-owner Issue identity", (t) => {
  const { result, githubEnv } = runTaskPreparation(identityIssue(), t);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(readFileSync(githubEnv, "utf8"), "");
});

test("task preflight accepts a matching planner-authored Issue with the required marker", (t) => {
  const issue = identityIssue({
    user: { login: "github-actions[bot]" },
    body: identityTestBody.replace(
      "Verify the fetched task identity gate before task content is classified.",
      "Verify the fetched task identity gate before task content is classified. <!-- ai-task-generated-by-planner -->",
    ),
  });
  const { result, githubEnv } = runTaskPreparation(issue, t);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(readFileSync(githubEnv, "utf8"), "");
});

test("task preflight rejects mismatched fetched Issue identities without writing a task marker", (t) => {
  const invalidCases = [
    ["wrong issue number", identityIssue({ number: 118 })],
    ["closed issue", identityIssue({ state: "closed" })],
    ["pull request response", identityIssue({ pull_request: { url: "https://api.github.com/repos/X84657465/global-citizen-ai-network/pulls/117" } })],
    ["mismatched canonical URL", identityIssue({ html_url: "https://github.com/X84657465/another-repository/issues/117" })],
    ["unauthorized author", identityIssue({ user: { login: "untrusted-contributor" } })],
  ];
  for (const [label, issue] of invalidCases) {
    const { result, githubEnv } = runTaskPreparation(issue, t);
    assert.notEqual(result.status, 0, label + " must be rejected");
    assert.equal(readFileSync(githubEnv, "utf8"), "", label + " must not write a task marker");
    assert.match(result.stderr, /did not match the requested open task identity/, label);
  }
});

test("only a valid fetched Issue identity with rejected task content writes the task marker", (t) => {
  const issue = identityIssue({ body: "## Goal\nMalformed task body without required sections." });
  const { result, githubEnv } = runTaskPreparation(issue, t);
  assert.notEqual(result.status, 0);
  assert.equal(readFileSync(githubEnv, "utf8"), "AGENT_FACTORY_FAILURE_SCOPE=task\n");
  assert.match(result.stderr, /Required section is missing/);
});


test("preflight requires Docker start exit evidence to match inspected container state", () => {
  const workflowPath = fileURLToPath(new URL("../.github/workflows/agent-task-preflight.yml", import.meta.url));
  const workflow = readFileSync(workflowPath, "utf8");
  assert.match(workflow, /DockerStartExitCode -NotePropertyValue \$startExitCode/);
  assert.match(workflow, /candidateContainerFailureScope\(state\)/);
});
