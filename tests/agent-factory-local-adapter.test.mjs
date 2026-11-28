import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseStrictTapSummary } from "../lib/agent-factory-local-sandbox.mjs";
import { validatePlannerGenerationContract } from "../lib/agent-factory-policy.mjs";
import {
  validateLocalFactoryTask,
  restoreLocalFactoryTask,
  generateLocalFactoryPlan,
  applyLocalFactoryPatchToScratch,
} from "../lib/agent-factory-local-adapter.mjs";

function task(overrides = {}) {
  return {
    schema_version: 1,
    title: "Add a small local module",
    goal: "Add one isolated local module with a deterministic exported function.",
    allowed_paths: ["lib/local-adapter-fixture.mjs"],
    acceptance_criteria: ["The file is valid UTF-8 text.", "The repository checkout remains unchanged."],
    explicit_exclusions: ["No commands, network access, credentials, or deployment."],
    ...overrides,
  };
}

test("local task accepts only the explicit schema and never fabricates GitHub Issue identity", () => {
  const validated = validateLocalFactoryTask(task());
  assert.equal(validated.mode, "local_only");
  assert.equal(validated.safety.github_issue_identity_fabricated, false);
  assert.equal(validated.control_plane_authorized, false);
  assert.throws(() => validateLocalFactoryTask(task({ issue: { number: 682, url: "https://example.invalid/682", author: "owner" } })), /exactly the documented fields/);
});

test("local task rejects traversal, absolute paths, denied roots, duplicate paths and empty scope", () => {
  for (const path of ["../outside.mjs", "/tmp/outside.mjs", "scripts/agent.mjs", "lib/.env", "lib/secret.txt"]) {
    assert.throws(() => validateLocalFactoryTask(task({ allowed_paths: [path] })));
  }
  assert.throws(() => validateLocalFactoryTask(task({ allowed_paths: ["lib/a.mjs", "lib/A.mjs"] })), /unique/);
  assert.throws(() => validateLocalFactoryTask(task({ allowed_paths: [] })), /1–20/);
});

test("scratch apply revalidates the patch and never writes the repository checkout", () => {
  const root = mkdtempSync(join(tmpdir(), "gcan-local-adapter-test-"));
  try {
    mkdirSync(join(root, "lib"));
    const validatedTask = task();
    const result = applyLocalFactoryPatchToScratch({
      task: validatedTask,
      repositoryRoot: root,
      patchArtifact: {
        schema_version: 1,
        status: "VALIDATED_PATCH",
        patch: {
          schema_version: 1,
          files: [{
            path: "lib/local-adapter-fixture.mjs",
            operation: "add",
            content: "export const value = 42;\n",
          }],
        },
      },
    });
    assert.equal(result.status, "APPLIED_TO_SCRATCH_NOT_EXECUTED");
    assert.equal(result.repository_files_modified, false);
    assert.equal(result.generated_code_executed, false);
    assert.match(result.test_execution, /^NOT RUN\b/);
    assert.equal(result.sandbox_evidence, null);
    assert.equal(result.patched_files.length, 1);
    assert.equal(existsSync(join(root, "lib/local-adapter-fixture.mjs")), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("stored agent tasks can be restored without trusting derived permissions", () => {
  const input = task();
  const stored = JSON.parse(JSON.stringify(validateLocalFactoryTask(input)));
  assert.deepEqual(restoreLocalFactoryTask(input), input);
  assert.deepEqual(restoreLocalFactoryTask(stored), input);
  assert.throws(
    () => restoreLocalFactoryTask({ ...stored, control_plane_authorized: true }),
    /canonical queue format/,
  );
});

test("sandbox evidence requires a real exit code and at least one passing test", (t) => {
  const root = mkdtempSync(join(tmpdir(), "gcan-local-sandbox-evidence-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const testPath = "tests/local-adapter-fixture.test.mjs";
  const dependency = "lib/local-adapter-fixture.mjs";
  mkdirSync(join(root, "lib"));
  writeFileSync(join(root, dependency), "export const value = 42;\n");
  const proposal = {
    task: task({ allowed_paths: [testPath, dependency] }),
    repositoryRoot: root,
    patchArtifact: {
      status: "VALIDATED_PATCH",
      patch: {
        schema_version: 1,
        files: [{ path: testPath, operation: "add", content: "import test from 'node:test';\ntest('fixture', () => {});\n" }],
      },
    },
  };
  const run = (evidence) => applyLocalFactoryPatchToScratch({
    ...proposal,
    sandboxTestRunner({ scratchRoot, testFiles }) {
      assert.deepEqual(testFiles, [testPath]);
      assert.equal(readFileSync(join(scratchRoot, dependency), "utf8"), "export const value = 42;\n");
      assert.ok(existsSync(join(scratchRoot, testPath)));
      return {
        ...evidence,
        test_files: [...testFiles],
        tap_summary: {
          tests: evidence.passed_tests,
          pass: evidence.passed_tests,
          fail: 0,
          cancelled: 0,
          skipped: 0,
          todo: 0,
          valid: evidence.exit_code === 0 && evidence.passed_tests > 0,
        },
      };
    },
  });

  assert.throws(() => run({ exit_code: 0, passed_tests: 0 }), /exit code 0, passed 0/);
  assert.throws(() => run({ exit_code: 1, passed_tests: 0 }), /exit code 1, passed 0/);
  const result = run({ exit_code: 0, passed_tests: 1 });
  assert.equal(result.status, "SANDBOX_TESTS_PASSED");
  assert.equal(result.generated_code_executed, true);
  assert.equal(result.sandbox_evidence.exit_code, 0);
  assert.equal(existsSync(join(root, testPath)), false);
});

test("scratch apply rejects an unapproved patch path before writing", () => {
  const root = mkdtempSync(join(tmpdir(), "gcan-local-adapter-scope-"));
  try {
    mkdirSync(join(root, "lib"));
    assert.throws(() => applyLocalFactoryPatchToScratch({
      task: task(),
      repositoryRoot: root,
      patchArtifact: {
        status: "VALIDATED_PATCH",
        patch: {
          schema_version: 1,
          files: [{ path: "lib/other.mjs", operation: "add", content: "export default 1;\n" }],
        },
      },
    }), /not explicitly authorized|allowlist|Patch path/);
    assert.equal(existsSync(join(root, "lib/other.mjs")), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("local task refuses a path whose existing parent is a symlink", () => {
  const root = mkdtempSync(join(tmpdir(), "gcan-local-adapter-symlink-"));
  const outside = mkdtempSync(join(tmpdir(), "gcan-local-adapter-outside-"));
  try {
    symlinkSync(outside, join(root, "lib"), "junction");
    assert.throws(() => applyLocalFactoryPatchToScratch({
      task: task(),
      repositoryRoot: root,
      patchArtifact: {
        status: "VALIDATED_PATCH",
        patch: {
          schema_version: 1,
          files: [{ path: "lib/local-adapter-fixture.mjs", operation: "add", content: "export default 1;\n" }],
        },
      },
    }), /symbolic link|outside/);
    assert.equal(existsSync(join(outside, "local-adapter-fixture.mjs")), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

test("Ollama transport rejects non-loopback origins and URL redirection inputs before network access", async () => {
  const original = process.env.OLLAMA_BASE_URL;
  try {
    for (const value of [
      "https://example.invalid",
      "http://192.0.2.1:11434",
      "http://localhost:11434",
      "http://127.0.0.1:11434/proxy",
      "http://127.0.0.1:11434/?target=example.invalid",
      "http://user:pass@127.0.0.1:11434",
    ]) {
      process.env.OLLAMA_BASE_URL = value;
      await assert.rejects(
        generateLocalFactoryPlan({ task: task() }),
        /OLLAMA_BASE_URL must be a plain HTTP loopback origin/,
      );
    }
  } finally {
    if (original === undefined) delete process.env.OLLAMA_BASE_URL;
    else process.env.OLLAMA_BASE_URL = original;
  }
});


test("strict Trusted Oracle mode rejects a missing generated candidate", (t) => {
  const root = mkdtempSync(join(tmpdir(), "gcan-strict-oracle-missing-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, "tests"));
  writeFileSync(
    join(root, "tests/factory-local-loop-e2e-oracle.test.mjs"),
    readFileSync(new URL("./factory-local-loop-e2e-oracle.test.mjs", import.meta.url)),
  );
  const childEnv = { ...process.env, GCAN_FACTORY_TRUSTED_ORACLE: "1" };
  // Node test workers set NODE_TEST_CONTEXT; nested test runners inherit it
  // and can suppress their TAP output, producing a false zero-test success.
  delete childEnv.NODE_TEST_CONTEXT;
  const result = spawnSync(process.execPath, ["--test", join(root, "tests/factory-local-loop-e2e-oracle.test.mjs")], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
    env: childEnv,
  });
  assert.equal(result.error, undefined, "strict Oracle subprocess must start successfully");
  assert.notEqual(result.status, 0,
    "strict acceptance must fail when the candidate is absent; stdout: " + result.stdout + "; stderr: " + result.stderr);
  assert.match(result.stdout + result.stderr, /candidate is required in strict acceptance mode/);
});

test("strict TAP evidence rejects missing, failed, skipped, todo and empty test summaries", () => {
  const valid = [
    "TAP version 13",
    "ok 1 - one",
    "1..1",
    "# tests 1",
    "# pass 1",
    "# fail 0",
    "# cancelled 0",
    "# skipped 0",
    "# todo 0",
  ].join("\n");
  assert.equal(parseStrictTapSummary(valid).valid, true);
  assert.equal(parseStrictTapSummary(valid.replace("# skipped 0", "# skipped 1")).valid, false);
  assert.equal(parseStrictTapSummary(valid.replace("# todo 0", "# todo 1")).valid, false);
  assert.equal(parseStrictTapSummary(valid.replace("# pass 1", "# pass 0").replace("# tests 1", "# tests 0")).valid, false);
  assert.equal(parseStrictTapSummary(valid.replace("# fail 0", "# fail 1").replace("ok 1 - one", "not ok 1 - one")).valid, false);
  assert.equal(parseStrictTapSummary(valid.replace("1..1", "")).valid, false);
  assert.equal(parseStrictTapSummary("TAP version 13\n1..0\n# tests 0\n# pass 0\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0").valid, false);
});


test("local planner generation contract rejects loose budgets and incomplete dependency chains", () => {
  const sourceTask = task();
  const valid = {
    schema_version: 1,
    tasks: [
      { id: "inspect", role: "planner", action: "inspect", depends_on: [], max_output_bytes: 16384 },
      { id: "implement", role: "implementer", action: "propose_patch", depends_on: ["inspect"], max_output_bytes: 16384 },
      { id: "validate", role: "tester", action: "validate_patch", depends_on: ["implement"], max_output_bytes: 16384 },
    ],
  };
  assert.equal(validatePlannerGenerationContract(valid, sourceTask), valid);
  const smallerNonPatchBudgets = structuredClone(valid);
  smallerNonPatchBudgets.tasks[0].max_output_bytes = 1024;
  smallerNonPatchBudgets.tasks[2].max_output_bytes = 512;
  assert.equal(validatePlannerGenerationContract(smallerNonPatchBudgets, sourceTask), smallerNonPatchBudgets);
  const duplicateImplementer = structuredClone(valid);
  duplicateImplementer.tasks.push({ ...valid.tasks[1], id: "implement-two" });
  assert.throws(() => validatePlannerGenerationContract(duplicateImplementer, sourceTask),
    /exactly one implementer propose_patch/);
  const missingInspect = structuredClone(valid);
  missingInspect.tasks[1].depends_on = [];
  assert.throws(() => validatePlannerGenerationContract(missingInspect, sourceTask),
    /planner inspect before propose_patch/);
  const missingTester = structuredClone(valid);
  missingTester.tasks[2].depends_on = [];
  assert.throws(() => validatePlannerGenerationContract(missingTester, sourceTask),
    /tester validate_patch after propose_patch/);
});



test("Ollama planner provider boundary validates generated JSON, budgets, dependencies and timeout failures", async () => {
  const validPlan = {
    schema_version: 1,
    tasks: [
      {
        id: "inspect", title: "Inspect the allowed module", role: "planner", action: "inspect",
        depends_on: [], allowed_paths: [], acceptance_criteria: ["Inspect only the approved module."],
        max_output_bytes: 1024,
      },
      {
        id: "implement", title: "Propose the approved module patch", role: "implementer", action: "propose_patch",
        depends_on: ["inspect"], allowed_paths: ["lib/local-adapter-fixture.mjs"],
        acceptance_criteria: ["Propose only the approved module patch."], max_output_bytes: 16384,
      },
      {
        id: "validate", title: "Validate the proposed patch", role: "tester", action: "validate_patch",
        depends_on: ["implement"], allowed_paths: [], acceptance_criteria: ["Validate the patch in isolation."],
        max_output_bytes: 512,
      },
    ],
  };
  const makeFetch = (responseText, onGenerate = () => {}) => async (url, options = {}) => {
    if (url.endsWith("/api/tags")) {
      return { ok: true, status: 200, json: async () => ({ models: [{ name: "test-model", size: 1 }] }) };
    }
    assert.ok(url.endsWith("/api/generate"));
    const request = JSON.parse(options.body);
    assert.equal(request.model, "test-model");
    assert.equal(request.stream, false);
    assert.equal(request.format.properties.tasks.items.properties.max_output_bytes.minimum, 1);
    assert.equal(request.format.properties.tasks.items.properties.max_output_bytes.maximum, 65536);
    onGenerate(request);
    return { ok: true, status: 200, json: async () => ({ response: responseText }) };
  };

  const validRequests = [];
  const accepted = await generateLocalFactoryPlan({
    task: task(),
    fetchImpl: makeFetch(JSON.stringify(validPlan), (request) => validRequests.push(request)),
  });
  assert.equal(accepted.status, "VALIDATED_PLAN");
  assert.equal(accepted.decision.decision, "approve_for_sandbox_validation");
  assert.equal(validRequests.length, 1);
  assert.match(validRequests[0].prompt, /propose_patch tasks, output budget must be 16384/);

  await assert.rejects(() => generateLocalFactoryPlan({
    task: task(),
    fetchImpl: makeFetch("{malformed-json"),
  }), /Ollama did not return valid JSON/);

  const invalidBudget = structuredClone(validPlan);
  invalidBudget.tasks[1].max_output_bytes = 4096;
  await assert.rejects(() => generateLocalFactoryPlan({
    task: task(),
    fetchImpl: makeFetch(JSON.stringify(invalidBudget)),
  }), /Generated plan failed independent validation/);

  const invalidDependency = structuredClone(validPlan);
  invalidDependency.tasks[1].depends_on = [];
  await assert.rejects(() => generateLocalFactoryPlan({
    task: task(),
    fetchImpl: makeFetch(JSON.stringify(invalidDependency)),
  }), /Generated plan failed independent validation/);

  let generateCalls = 0;
  const timeoutFetch = async (url) => {
    if (url.endsWith("/api/tags")) {
      return { ok: true, status: 200, json: async () => ({ models: [{ name: "test-model", size: 1 }] }) };
    }
    generateCalls += 1;
    throw new Error("simulated provider timeout");
  };
  await assert.rejects(() => generateLocalFactoryPlan({
    task: task(), timeoutMs: 1, fetchImpl: timeoutFetch,
  }), (error) => error.scope === "system" && /failed or timed out/.test(error.message));
  assert.equal(generateCalls, 1);
});
