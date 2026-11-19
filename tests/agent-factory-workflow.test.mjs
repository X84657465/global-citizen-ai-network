import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const agentWorkflow = readFileSync(new URL("../.github/workflows/agent-task-preflight.yml", import.meta.url), "utf8");
const ciWorkflow = readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");

function concurrencyGroup(workflow) {
  return /^concurrency:\s*\n\s+group:\s*([^\r\n]+)$/m.exec(workflow)?.[1]?.trim();
}

test("CI validation and scheduled agent factory use separate concurrency groups", () => {
  const ciGroup = concurrencyGroup(ciWorkflow);
  const agentGroup = concurrencyGroup(agentWorkflow);

  assert.ok(ciGroup, "CI workflow must declare a concurrency group");
  assert.ok(agentGroup, "agent workflow must declare a concurrency group");
  assert.notEqual(ciGroup, agentGroup, "CI runs must not replace the factory's pending scheduler run");
  assert.match(ciWorkflow, /cancel-in-progress:\s*false/);
  assert.match(agentWorkflow, /cancel-in-progress:\s*false/);
});

test("the agent factory keeps the five-minute polling schedule", () => {
  assert.match(agentWorkflow, /schedule:\s*\n\s+- cron:\s*["']\*\/5 \* \* \* \*["']/);
});
