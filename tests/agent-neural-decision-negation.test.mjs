import test from "node:test";
import assert from "node:assert/strict";
import { evaluateAgentDecision } from "../lib/agent-neural-decision.mjs";

const task = { allowed_paths: ["docs/example.md"] };
const safePlan = {
  execution_mode: "validated_plan_only",
  ai_execution_enabled: false,
  tasks: [
    { id: "inspect", role: "planner", action: "inspect", title: "Inspect requirements", acceptance_criteria: ["Confirm scope"], depends_on: [], allowed_paths: [], max_output_bytes: 4096 },
    { id: "patch", role: "implementer", action: "propose_patch", title: "Propose documentation", acceptance_criteria: ["Stay within scope"], depends_on: ["inspect"], allowed_paths: ["docs/example.md"], max_output_bytes: 8192 },
    { id: "verify", role: "tester", action: "validate_patch", title: "Verify proposed patch", acceptance_criteria: ["Check acceptance criteria"], depends_on: ["patch"], allowed_paths: [], max_output_bytes: 4096 },
  ],
};

function withImplementerText(title, acceptance_criteria = [], allowedPath = "docs/example.md") {
  return {
    ...safePlan,
    tasks: safePlan.tasks.map((item) => item.id === "patch" ? { ...item, title, acceptance_criteria, allowed_paths: [allowedPath] } : item),
  };
}

test("negated high-risk prohibitions do not independently trigger positive-risk rejection", () => {
  const result = evaluateAgentDecision(
    withImplementerText("Do not deploy to production", [
      "Do not modify billing or payout settings",
      "Secrets are not modified",
      "Credentials remain unchanged",
      "Auth is out of scope",
      "Production remains out of scope",
    ]),
    task,
  );
  assert.equal(result.signals.no_high_risk_scope, true);
  assert.equal(result.evidence.high_risk_scope_detected, false);
  assert.equal(result.decision, "approve_for_sandbox_validation");
});

test("positive actionable high-impact intent remains rejected", () => {
  for (const title of ["Deploy to production", "Change billing policy", "Rotate credentials"]) {
    const result = evaluateAgentDecision(withImplementerText(title), task);
    assert.equal(result.signals.no_high_risk_scope, false, title);
    assert.equal(result.decision, "reject_and_replan", title);
  }
});

test("sensitive target paths remain fail-closed even when surrounding wording is negated", () => {
  const sensitiveTask = { allowed_paths: ["docs/example.md", "app/api/auth/route.ts"] };
  const result = evaluateAgentDecision(
    withImplementerText("Do not change the auth route"),
    sensitiveTask,
  );
  assert.equal(result.signals.no_high_risk_scope, false);
  assert.equal(result.evidence.high_risk_scope_detected, true);
  assert.equal(result.decision, "reject_and_replan");
});

test("mixed negative and positive clauses are classified conservatively", () => {
  const result = evaluateAgentDecision(
    withImplementerText("Do not deploy to production, but update billing rules"),
    task,
  );
  assert.equal(result.signals.no_high_risk_scope, false);
  assert.equal(result.decision, "reject_and_replan");
});

test("ordinary words such as author do not match the auth risk token", () => {
  const authorTask = { allowed_paths: ["docs/author-guide.md"] };
  const plan = withImplementerText("Author the documentation", [
    "Explain the author workflow and authorship metadata",
  ], "docs/author-guide.md");
  const result = evaluateAgentDecision(plan, authorTask);
  assert.equal(result.signals.no_high_risk_scope, true);
  assert.equal(result.evidence.high_risk_scope_detected, false);
  assert.equal(result.decision, "approve_for_sandbox_validation");
});

test("a standalone discourse no cannot negate a later actionable production deployment", () => {
  for (const title of ["No, deploy to production", "No, update billing rules", "No, rotate credentials"]) {
    const result = evaluateAgentDecision(withImplementerText(title), task);
    assert.equal(result.signals.no_high_risk_scope, false, title);
    assert.equal(result.evidence.high_risk_scope_detected, true, title);
    assert.equal(result.decision, "reject_and_replan", title);
  }
});

test("double-negated risk language remains high risk instead of being treated as a prohibition", () => {
  for (const title of [
    "There is no reason not to deploy to production",
    "Credentials are not prohibited from being rotated",
    "Production is not out of scope for this task, so deploy now",
  ]) {
    const result = evaluateAgentDecision(withImplementerText(title), task);
    assert.equal(result.signals.no_high_risk_scope, false, title);
    assert.equal(result.evidence.high_risk_scope_detected, true, title);
    assert.equal(result.decision, "reject_and_replan", title);
  }
});

test("absence of a prohibition or restriction remains positive high-risk intent", () => {
  for (const title of [
    "There is no prohibition on deploying to production",
    "There is no restriction against changing billing",
    "There is no ban on rotating credentials",
    "Without any restriction on production deployment",
    "Credentials are not prevented from being rotated",
    "Deployment is not disallowed to production",
  ]) {
    const result = evaluateAgentDecision(withImplementerText(title), task);
    assert.equal(result.signals.no_high_risk_scope, false, title);
    assert.equal(result.evidence.high_risk_scope_detected, true, title);
    assert.equal(result.decision, "reject_and_replan", title);
  }
});

test("a direct prohibition still suppresses prose-only risk while keeping the decision bounded", () => {
  const result = evaluateAgentDecision(withImplementerText("No deployment is allowed"), task);
  assert.equal(result.signals.no_high_risk_scope, true);
  assert.equal(result.evidence.high_risk_scope_detected, false);
  assert.equal(result.authority.may_execute_code, false);
  assert.equal(result.authority.may_publish_changes, false);
});

test("a sequential action is not swallowed by an earlier prohibition", () => {
  for (const title of [
    "Do not modify the report and subsequently deploy to production",
    "Never change the documentation and then rotate credentials",
    "Do not update the draft; next change billing settings",
  ]) {
    const result = evaluateAgentDecision(withImplementerText(title), task);
    assert.equal(result.signals.no_high_risk_scope, false, title);
    assert.equal(result.evidence.high_risk_scope_detected, true, title);
    assert.equal(result.decision, "reject_and_replan", title);
  }
});

test("coordinated actions within one prohibition remain negated", () => {
  const result = evaluateAgentDecision(
    withImplementerText("Do not deploy to production or change billing settings"),
    task,
  );
  assert.equal(result.signals.no_high_risk_scope, true);
  assert.equal(result.evidence.high_risk_scope_detected, false);
  assert.equal(result.decision, "approve_for_sandbox_validation");
});

test("non-mutating production and dependency audit verification does not trigger positive risk", () => {
  for (const title of [
    "Verify production and full dependency audit outcomes",
    "Review billing configuration and credential inventory",
    "Inspect production readiness and confirm audit evidence",
    "Audit production controls and report the findings",
  ]) {
    const result = evaluateAgentDecision(withImplementerText(title), task);
    assert.equal(result.signals.no_high_risk_scope, true, title);
    assert.equal(result.evidence.high_risk_scope_detected, false, title);
    assert.equal(result.decision, "approve_for_sandbox_validation", title);
  }
});

test("actionable high-impact operations remain rejected after narrowing prose cues", () => {
  for (const title of [
    "Deploy to production",
    "Change billing policy",
    "Rotate credentials",
    "Production migration",
    "Publish the production release",
  ]) {
    const result = evaluateAgentDecision(withImplementerText(title), task);
    assert.equal(result.signals.no_high_risk_scope, false, title);
    assert.equal(result.evidence.high_risk_scope_detected, true, title);
    assert.equal(result.decision, "reject_and_replan", title);
  }
});
