import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateAgentPlan } from "../lib/agent-plan-validation.mjs";

test("CLI and local Ollama planner schemas constrain output budget to numeric 16384", () => {
  const cli = readFileSync(new URL("../scripts/generate-agent-plan.mjs", import.meta.url), "utf8");
  const adapter = readFileSync(new URL("../lib/agent-factory-local-adapter.mjs", import.meta.url), "utf8");
  const exactNumericBudget = /max_output_bytes:\s*\{\s*type:\s*"integer",\s*minimum:\s*16384,\s*maximum:\s*16384,\s*enum:\s*\[16384\]\s*\}/;
  assert.match(cli, exactNumericBudget);
  assert.match(adapter, exactNumericBudget);
  assert.doesNotMatch(cli, /max_output_bytes:\s*\{[^}]*type:\s*"string"/);
  assert.doesNotMatch(adapter, /max_output_bytes:\s*\{[^}]*type:\s*"string"/);
});

test("existing fail-closed plan validator accepts the 16384 patch budget and rejects 4096", () => {
  const task = {
    schema_version: 1,
    allowed_paths: ["lib/factory-worker.mjs"],
  };
  const valid = {
    schema_version: 1,
    tasks: [
      {
        id: "inspect",
        title: "Inspect Factory worker",
        role: "planner",
        action: "inspect",
        depends_on: [],
        allowed_paths: [],
        acceptance_criteria: ["Inspect the bounded Factory worker behavior."],
        max_output_bytes: 16384,
      },
      {
        id: "patch",
        title: "Propose Factory worker patch",
        role: "implementer",
        action: "propose_patch",
        depends_on: ["inspect"],
        allowed_paths: ["lib/factory-worker.mjs"],
        acceptance_criteria: ["Propose only the approved Factory worker change."],
        max_output_bytes: 16384,
      },
      {
        id: "validate",
        title: "Validate Factory worker patch",
        role: "tester",
        action: "validate_patch",
        depends_on: ["patch"],
        allowed_paths: [],
        acceptance_criteria: ["Validate the proposed Factory worker patch."],
        max_output_bytes: 16384,
      },
    ],
  };
  assert.equal(validateAgentPlan(valid, task).tasks[1].max_output_bytes, 16384);
  const undersized = structuredClone(valid);
  undersized.tasks[1].max_output_bytes = 4096;
  assert.throws(() => validateAgentPlan(undersized, task), /between 16384 and 65536/);
});
