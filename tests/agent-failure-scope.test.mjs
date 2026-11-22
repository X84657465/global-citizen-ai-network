import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { markAgentFactoryTaskFailure } from "../lib/agent-failure-scope.mjs";

test("task-scoped patch failures are exported to the next GitHub Actions step", () => {
  const directory = mkdtempSync(join(tmpdir(), "gcan-failure-scope-"));
  const envFile = join(directory, "github-env");
  try {
    assert.equal(markAgentFactoryTaskFailure(envFile), true);
    assert.equal(readFileSync(envFile, "utf8"), "AGENT_FACTORY_FAILURE_SCOPE=task\n");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("missing or unavailable GitHub Actions environment files do not throw", () => {
  const directory = mkdtempSync(join(tmpdir(), "gcan-failure-scope-missing-"));
  try {
    assert.equal(markAgentFactoryTaskFailure(undefined), false);
    assert.equal(markAgentFactoryTaskFailure(join(directory, "missing", "github-env")), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("publisher classifies default-branch drift as a task-scoped candidate failure", () => {
  const publisher = readFileSync(new URL("../scripts/publish-agent-patch.mjs", import.meta.url), "utf8");
  assert.match(publisher, /const failTask = \(message\) => \{\\n  markAgentFactoryTaskFailure\(process\.env\.GITHUB_ENV\);\\n  fail\(message\);\\n\};/);
  assert.match(publisher, /failTask\("Default branch advanced after candidate tests; rerun the task against the latest base\."\)/);
  assert.match(publisher, /failTask\("Default branch advanced during publication; rerun the task against the latest base\."\)/);
});
