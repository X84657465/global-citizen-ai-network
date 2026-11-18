import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../scripts/generate-agent-plan.mjs", import.meta.url), "utf8");

test("local planner is restricted to loopback Ollama endpoints", () => {
  assert.match(source, /Only a loopback Ollama endpoint is permitted/);
  assert.match(source, /127\\.0\\.0\\.1/);
});

test("local planner uses no-think mode and structured JSON output", () => {
  assert.match(source, /\\/no_think/);
  assert.match(source, /format: PLAN_SCHEMA/);
  assert.match(source, /temperature: 0/);
});

test("local planner validates output and never executes generated commands", () => {
  assert.match(source, /validateAgentPlan\\(candidate, task\\)/);
  assert.match(source, /Execution remains disabled/);
  assert.doesNotMatch(source, /child_process|execSync|spawnSync/);
});

test("local planner rejects empty or invalid model responses", () => {
  assert.match(source, /empty response/);
  assert.match(source, /not valid JSON/);
});
