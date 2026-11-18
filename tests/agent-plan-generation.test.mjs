import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source = readFileSync(new URL("../scripts/generate-agent-plan.mjs", import.meta.url), "utf8");
test("local planner is restricted to loopback Ollama endpoints", () => {
  assert.ok(source.includes("Only a loopback Ollama endpoint is permitted"));
  assert.ok(source.includes("http://127.0.0.1:11434"));
});
test("local planner uses no-think mode and structured JSON output", () => {
  assert.ok(source.includes('"/no_think"'));
  assert.ok(source.includes("format: PLAN_SCHEMA"));
  assert.ok(source.includes("temperature: 0"));
  assert.ok(source.includes("^[a-z][a-z0-9-]{1,39}$"));
  assert.ok(source.includes("planner may use inspect or report only"));
  assert.ok(source.includes("implementer may use inspect or propose_patch only"));
  assert.ok(source.includes("allOf: ["));
});
test("local planner validates output and never executes generated commands", () => {
  assert.ok(source.includes("validateAgentPlan(candidate, task)"));
  assert.ok(source.includes("Execution remains disabled"));
  assert.doesNotMatch(source, /child_process|execSync|spawnSync/);
});
test("local planner rejects empty or invalid model responses", () => {
  assert.ok(source.includes("empty response"));
  assert.ok(source.includes("not valid JSON") || source.includes("empty response"));
  assert.ok(source.includes("attempt < 2"));
  assert.ok(source.includes("one repair attempt"));
});
