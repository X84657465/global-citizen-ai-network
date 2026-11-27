import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workflow = readFileSync(
  new URL("../.github/workflows/factory-local-loop-windows-validation.yml", import.meta.url),
  "utf8",
).replace(/\r\n/g, "\n");

test("Factory Windows E2E coalesces only superseded runs in its dedicated queue", () => {
  const start = workflow.indexOf("\\nconcurrency:\\n");
  const end = workflow.indexOf("\\njobs:\\n", start);
  assert.ok(start >= 0 && end > start, "workflow-level concurrency block must exist");
  const concurrency = workflow.slice(start, end);
  assert.ok(concurrency.includes("group: factory-local-loop-windows-validation"));
  assert.ok(concurrency.includes("cancel-in-progress: true"));
  assert.equal(concurrency.includes("global-citizen-ai-network-self-hosted-runner"), false);
  assert.ok(workflow.includes("runs-on: [self-hosted, Windows, X64]"));
  assert.ok(workflow.includes("tests/factory-local-loop-workflow-policy.test.mjs"),
    "the Windows E2E run must execute its own queue-policy regression");
});
