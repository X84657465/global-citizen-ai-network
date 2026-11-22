import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { persistPublicationFailureScope } from "../lib/agent-publisher-failure-scope.mjs";

test("persists a task-scoped publication race for the following workflow failure classifier", () => {
  const directory = mkdtempSync(join(tmpdir(), "gcan-publish-failure-"));
  try {
    const envPath = join(directory, "github-env");
    assert.equal(persistPublicationFailureScope("task", { GITHUB_ENV: envPath }), true);
    assert.equal(readFileSync(envPath, "utf8"), "AGENT_FACTORY_FAILURE_SCOPE=task\nAGENT_FACTORY_ERROR_CODE=STALE_BASE\n");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("does not downgrade unclassified publication failures to task-scoped failures", () => {
  const writes = [];
  const append = (...args) => writes.push(args);
  assert.equal(persistPublicationFailureScope("system", { GITHUB_ENV: "unused" }, append), false);
  assert.equal(persistPublicationFailureScope(null, { GITHUB_ENV: "unused" }, append), false);
  assert.equal(writes.length, 0);
});

test("does not fail when GitHub Actions environment file is unavailable", () => {
  assert.equal(persistPublicationFailureScope("task", {}, () => assert.fail("must not write")), false);
});

test("preserves the original publisher failure when writing the workflow environment file throws", () => {
  const writes = [];
  const append = () => { throw new Error("read-only or unavailable environment file"); };
  assert.equal(persistPublicationFailureScope("task", { GITHUB_ENV: "/unavailable" }, append), false);
  assert.equal(writes.length, 0);
});


test("both explicit default-branch drift guards persist the stale-base task classification", () => {
  const publisher = readFileSync(new URL("../scripts/publish-agent-patch.mjs", import.meta.url), "utf8");
  const afterTests = 'fail("Default branch advanced after candidate tests; rerun the task against the latest base.", "task");';
  const duringPublish = 'fail("Default branch advanced during publication; rerun the task against the latest base.", "task");';
  assert.equal(publisher.split(afterTests).length - 1, 1);
  assert.equal(publisher.split(duringPublish).length - 1, 1);
});


test("the workflow classifier and controller consume the persisted stale-base code", () => {
  const workflow = readFileSync(new URL("../.github/workflows/agent-task-preflight.yml", import.meta.url), "utf8");
  const controller = readFileSync(new URL("../lib/agent-factory-controller.mjs", import.meta.url), "utf8");
  assert.match(workflow, /if \(\$env:AGENT_FACTORY_FAILURE_SCOPE -eq "task"/);
  assert.match(workflow, /AGENT_FACTORY_FAILURE_SCOPE=task/);
  assert.match(controller, /const errorCode = env\.AGENT_FACTORY_ERROR_CODE \|\| "WORKFLOW_FAILURE";/);
  assert.match(controller, /recordTaskFailure\(state, issueNumber, leaseId, eventKey, errorCode, summary, timestamp\)/);
});
