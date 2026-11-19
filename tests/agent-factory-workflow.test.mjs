import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
const preflight = readFileSync(resolve(root, ".github/workflows/agent-task-preflight.yml"), "utf8");

function concurrencyBlock(source, workflowName) {
  const match = /^concurrency:\r?\n((?:[ \t].*(?:\r?\n|$))*)/m.exec(source);
  assert.ok(match, workflowName + " must declare workflow-level concurrency.");
  return match[1];
}

test("CI and the agent factory share one bounded FIFO Windows Runner queue", () => {
  const ciConcurrency = concurrencyBlock(ci, "CI");
  const factoryConcurrency = concurrencyBlock(preflight, "Agent Task Preflight");
  const ciGroup = /^  group:\s*(.+)$/m.exec(ciConcurrency)?.[1];
  const factoryGroup = /^  group:\s*(.+)$/m.exec(factoryConcurrency)?.[1];

  assert.ok(ciGroup, "CI concurrency group must be explicit.");
  assert.equal(factoryGroup, ciGroup, "Both workflows must serialize through the same Runner queue.");
  assert.match(ciConcurrency, /^  queue:\s*max$/m);
  assert.match(factoryConcurrency, /^  queue:\s*max$/m);
  assert.match(ciConcurrency, /^  cancel-in-progress:\s*false$/m);
  assert.match(factoryConcurrency, /^  cancel-in-progress:\s*false$/m);
});

test("CI does not run duplicate push validation on codex task branches", () => {
  assert.match(ci, /^  push:\r?\n    branches: \[main\]$/m);
  assert.match(ci, /^  pull_request:\r?\n    branches: \[main\]/m);
  assert.match(ci, /types: \[opened, reopened, synchronize\]/);
});

test("expensive local Ollama and Docker smoke checks are opt-in", () => {
  assert.match(preflight, /run_validation_smoke:[\s\S]{0,220}default: false/);
  assert.match(preflight, /inputs\.run_validation_smoke == true/);
  assert.match(preflight, /\[runner-smoke\]/);
  assert.match(preflight, /cron: "\*\/5 \* \* \* \*"/);
  assert.match(preflight, /types: \[opened, reopened\]/);
});
