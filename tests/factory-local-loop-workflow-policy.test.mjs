import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workflow = readFileSync(
  new URL("../.github/workflows/factory-local-loop-windows-validation.yml", import.meta.url),
  "utf8",
).replace(/\r\n/g, "\n");

test("Factory Windows E2E does not cancel an in-flight validation run", () => {
  const match = /^concurrency:\n([\s\S]*?)^jobs:\n/m.exec(workflow);
  assert.ok(match, "workflow-level concurrency block must exist");
  const concurrency = match[0];
  assert.ok(concurrency.includes("group: factory-local-loop-windows-validation"));
  assert.ok(concurrency.includes("cancel-in-progress: false"));
  assert.equal(concurrency.includes("global-citizen-ai-network-self-hosted-runner"), false);
  assert.ok(workflow.includes("runs-on: [self-hosted, Windows, X64]"));
  assert.ok(workflow.includes("tests/factory-local-loop-workflow-policy.test.mjs"),
    "the Windows E2E run must execute its own queue-policy regression");
  assert.ok(workflow.includes(".github/workflows/ci.yml"),
    "changes to the core CI dispatch and concurrency policy must trigger the Windows E2E regression");
});
