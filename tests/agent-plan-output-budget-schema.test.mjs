import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateAgentPlan } from "../lib/agent-plan-validation.mjs";
import { validatePlannerGenerationContract } from "../lib/agent-factory-policy.mjs";

const plannerSource = readFileSync(
  new URL("../scripts/generate-agent-plan.mjs", import.meta.url),
  "utf8",
);

const task = {
  schema_version: 1,
  allowed_paths: [
    "scripts/generate-agent-plan.mjs",
    "tests/agent-plan-output-budget-schema.test.mjs",
  ],
};

function planWithPatchBudget(maxOutputBytes) {
  return {
    schema_version: 1,
    tasks: [
      {
        id: "inspect-planner",
        title: "Inspect the planner output contract",
        role: "planner",
        action: "inspect",
        depends_on: [],
        allowed_paths: [],
        acceptance_criteria: ["The planner contract is inspected"],
        max_output_bytes: 16384,
      },
      {
        id: "patch-planner",
        title: "Enforce the structured output budget",
        role: "implementer",
        action: "propose_patch",
        depends_on: ["inspect-planner"],
        allowed_paths: ["scripts/generate-agent-plan.mjs"],
        acceptance_criteria: ["Only the numeric 16384 budget is emitted"],
        max_output_bytes: maxOutputBytes,
      },
      {
        id: "validate-planner",
        title: "Validate the planner output contract",
        role: "tester",
        action: "validate_patch",
        depends_on: ["patch-planner"],
        allowed_paths: [],
        acceptance_criteria: ["The proposed planner change is validated"],
        max_output_bytes: 16384,
      },
    ],
  };
}

test("Ollama planner schema permits only numeric max_output_bytes 16384", () => {
  const schemaProperty = /max_output_bytes:\s*\{([^}]+)\}/.exec(plannerSource)?.[1];
  assert.ok(schemaProperty, "planner format schema must declare max_output_bytes");
  assert.match(schemaProperty, /type:\s*"integer"/);
  assert.match(schemaProperty, /minimum:\s*16384/);
  assert.match(schemaProperty, /maximum:\s*65536/);
  assert.match(schemaProperty, /enum:\s*\[\s*16384\s*\]/);
  assert.doesNotMatch(schemaProperty, /enum:\s*\[\s*["']16384["']/);
  assert.match(
    plannerSource,
    /max_output_bytes must be the numeric integer 16384 for every task/,
  );
});

test("the existing plan validator accepts 16384 and still rejects a 4096-byte patch", () => {
  const accepted = validateAgentPlan(planWithPatchBudget(16384), task);
  assert.equal(accepted.tasks.find((entry) => entry.id === "patch-planner").max_output_bytes, 16384);
  assert.throws(
    () => validateAgentPlan(planWithPatchBudget(4096), task),
    /between 16384 and 65536/,
  );
});


test("generation boundary rejects every non-numeric-or-non-16384 output budget", () => {
  for (const invalidBudget of [4096, 32768, "16384", null]) {
    const candidate = validateAgentPlan(planWithPatchBudget(16384), task);
    candidate.tasks[0].max_output_bytes = invalidBudget;
    assert.throws(
      () => validatePlannerGenerationContract(candidate, task),
      /numeric max_output_bytes 16384/,
    );
  }
  const oversizedPatch = validateAgentPlan(planWithPatchBudget(32768), task);
  assert.throws(
    () => validatePlannerGenerationContract(oversizedPatch, task),
    /numeric max_output_bytes 16384/,
  );
});

test("generation boundary requires exactly one patch implementer and explicit inspect/validate dependencies", () => {
  const valid = validateAgentPlan(planWithPatchBudget(16384), task);
  assert.equal(validatePlannerGenerationContract(valid, task), valid);

  const duplicatePatch = structuredClone(valid);
  duplicatePatch.tasks.push({
    ...duplicatePatch.tasks[1],
    id: "second-patch",
    depends_on: ["inspect-planner"],
  });
  assert.throws(
    () => validatePlannerGenerationContract(duplicatePatch, task),
    /exactly one implementer propose_patch/,
  );

  const missingInspect = structuredClone(valid);
  missingInspect.tasks[1].depends_on = [];
  assert.throws(
    () => validatePlannerGenerationContract(missingInspect, task),
    /planner inspect before propose_patch/,
  );

  const missingTester = structuredClone(valid);
  missingTester.tasks[2].depends_on = [];
  assert.throws(
    () => validatePlannerGenerationContract(missingTester, task),
    /tester validate_patch after propose_patch/,
  );
});
