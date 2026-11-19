import test from "node:test";
import assert from "node:assert/strict";
import { evaluateAgentDecision } from "../lib/agent-neural-decision.mjs";

const task = { allowed_paths: ["docs/example.md"] };
const safePlan = { execution_mode: "validated_plan_only", ai_execution_enabled: false, tasks: [
  { id: "inspect", role: "planner", action: "inspect", title: "Inspect requirements", acceptance_criteria: ["Confirm scope"], depends_on: [], allowed_paths: [], max_output_bytes: 4096 },
  { id: "patch", role: "implementer", action: "propose_patch", title: "Propose documentation", acceptance_criteria: ["Stay within scope"], depends_on: ["inspect"], allowed_paths: ["docs/example.md"], max_output_bytes: 8192 },
  { id: "verify", role: "tester", action: "validate_patch", title: "Verify proposed patch", acceptance_criteria: ["Check acceptance criteria"], depends_on: ["patch"], allowed_paths: [], max_output_bytes: 4096 },
] };

test("approves bounded plans only for sandbox validation", () => {
  const result = evaluateAgentDecision(safePlan, task);
  assert.equal(result.decision, "approve_for_sandbox_validation");
  assert.equal(result.confidence_score, 100);
  assert.equal(result.authority.may_execute_code, false);
  assert.equal(result.authority.may_publish_changes, false);
});
test("rejects plans missing implementation or verification", () => {
  const result = evaluateAgentDecision({ ...safePlan, tasks: [safePlan.tasks[0]] }, task);
  assert.equal(result.decision, "reject_and_replan");
  assert.ok(result.blockers.includes("implementation_present"));
  assert.ok(result.blockers.includes("verification_present"));
});
test("rejects production-risk scope in task descriptions", () => {
  const result = evaluateAgentDecision({ ...safePlan, tasks: [...safePlan.tasks, { ...safePlan.tasks[0], id: "deploy", title: "Deploy to production" }] }, task);
  assert.equal(result.decision, "reject_and_replan");
  assert.ok(result.blockers.includes("no_high_risk_scope"));
});
test("rejects sensitive target paths even when task wording looks harmless", () => {
  const sensitiveTask = { allowed_paths: ["app/api/auth/route.ts"] };
  const result = evaluateAgentDecision(safePlan, sensitiveTask);
  assert.equal(result.decision, "reject_and_replan");
  assert.ok(result.blockers.includes("no_high_risk_scope"));
  assert.equal(result.evidence.high_risk_scope_detected, true);
});
test("rejects plans without the data-only execution boundary", () => {
  const result = evaluateAgentDecision({ ...safePlan, ai_execution_enabled: true }, task);
  assert.ok(result.blockers.includes("schema_validated"));
});
test("requires structured plan and task inputs", () => {
  assert.throws(() => evaluateAgentDecision(null, task), /validated plan/);
});

test("approves multiple bounded implementer tasks when every path is allowlisted", () => {
  const multiTask = { allowed_paths: ["docs/one.md", "docs/two.md"] };
  const multiPlan = {
    ...safePlan,
    tasks: [
      safePlan.tasks[0],
      { ...safePlan.tasks[1], id: "patch-one", allowed_paths: ["docs/one.md"] },
      { ...safePlan.tasks[2], id: "verify-one", depends_on: ["patch-one"] },
      { ...safePlan.tasks[1], id: "patch-two", allowed_paths: ["docs/two.md"] },
      { ...safePlan.tasks[2], id: "verify-two", depends_on: ["patch-two"] },
    ],
  };
  const result = evaluateAgentDecision(multiPlan, multiTask);
  assert.equal(result.decision, "approve_for_sandbox_validation");
  assert.equal(result.evidence.implementer_count, 2);
  assert.equal(result.evidence.proposed_path_count, 2);
});
