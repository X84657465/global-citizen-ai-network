import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const script = readFileSync(new URL("../scripts/apply-agent-patch-sandbox.mjs", import.meta.url), "utf8");
const runner = readFileSync(new URL("../scripts/run-agent-sandbox.ps1", import.meta.url), "utf8");

test("sandbox revalidates task, plan, and patch before applying anything", () => {
  assert.ok(script.includes("validateAgentPlan"));
  assert.ok(script.includes("validatePatchManifest"));
  assert.ok(script.includes("task_path_allowlist_enforced"));
});

test("sandbox applies patch only to a scratch copy and preserves source hashes", () => {
  assert.ok(script.includes("cpSync(inputRoot, projectRoot"));
  assert.ok(script.includes("sourceHashes"));
  assert.ok(script.includes("source_was_modified = false"));
  assert.ok(script.includes("scratch_only = true"));
});

test("sandbox executes only fixed test commands inside its isolated container", () => {
  assert.ok(script.includes('runCheck("unit tests", "npm", ["run", "test:unit"])'));
  assert.ok(script.includes('runCheck("TypeScript", process.execPath'));
  assert.ok(script.includes('runCheck("ESLint", "npm", ["run", "lint"])'));
  assert.ok(!script.includes("eval("));
  assert.ok(!script.includes("new Function"));
  assert.ok(!script.includes("execSync"));
});

test("Docker sandbox has no network, read-only root and source/dependency mounts", () => {
  assert.ok(runner.includes('"--network", "none"'));
  assert.ok(runner.includes('"--read-only"'));
  assert.ok(runner.includes('"--cap-drop", "ALL"'));
  assert.ok(runner.includes('"--security-opt", "no-new-privileges"'));
  assert.ok(runner.includes("target=/input,readonly"));
  assert.ok(runner.includes("target=/deps,readonly"));
});
