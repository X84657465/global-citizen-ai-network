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
  for (const title of [
    "Do not deploy to production, but update billing rules",
    "Do not deploy to production and update billing rules",
  ]) {
    const result = evaluateAgentDecision(withImplementerText(title), task);
    assert.equal(result.signals.no_high_risk_scope, false, title);
    assert.equal(result.decision, "reject_and_replan", title);
  }
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
    "Production is not out of scope for this task",
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

test("coordinated objects remain under the preceding prohibition", () => {
  const result = evaluateAgentDecision(withImplementerText("Do not modify billing or payout settings"), task);
  assert.equal(result.signals.no_high_risk_scope, true);
  assert.equal(result.evidence.high_risk_scope_detected, false);
});

test("allows read-only billing and production-control verification language", () => {
  const result = evaluateAgentDecision(withImplementerText("Verify billing visibility and document production kill-switch behavior", [
    "Use mock provider fixtures to verify invoice reconciliation and usage alerts",
    "Confirm quota reservations and hard-stop behavior without live billable calls",
  ]), task);
  assert.equal(result.signals.no_high_risk_scope, true);
  assert.equal(result.evidence.high_risk_scope_detected, false);
  assert.equal(result.decision, "approve_for_sandbox_validation");
});

test("still rejects explicit mutating operations in sensitive domains", () => {
  for (const title of [
    "Enable live billing for production",
    "Publish credentials to production",
    "Modify production authentication settings",
  ]) {
    const result = evaluateAgentDecision(withImplementerText(title), task);
    assert.equal(result.signals.no_high_risk_scope, false, title);
    assert.equal(result.decision, "reject_and_replan", title);
  }
});

test("read-only deployment, billing-change, and release-process descriptions are not mutations", () => {
  const result = evaluateAgentDecision(withImplementerText("Verify production deployment status and review billing changes; document the release process"), task);
  assert.equal(result.signals.no_high_risk_scope, true);
  assert.equal(result.evidence.high_risk_scope_detected, false);
  assert.equal(result.decision, "approve_for_sandbox_validation");
});

test("progressive and passive mutating instructions remain high-risk", () => {
  for (const title of [
    "We are enabling live billing for production",
    "The agent is rotating credentials",
    "Credentials are being published to production",
    "The plan has modified production authentication settings",
    "The agent is transferring payouts",
  ]) {
    const result = evaluateAgentDecision(withImplementerText(title), task);
    assert.equal(result.signals.no_high_risk_scope, false, title);
    assert.equal(result.decision, "reject_and_replan", title);
  }
});

test("modal and infinitive mutating instructions remain high-risk", () => {
  for (const title of [
    "The plan must enable live billing for production",
    "We will modify production authentication settings",
    "The agent needs to rotate credentials",
  ]) {
    const result = evaluateAgentDecision(withImplementerText(title), task);
    assert.equal(result.signals.no_high_risk_scope, false, title);
    assert.equal(result.decision, "reject_and_replan", title);
  }
});


test("common write/create/set/apply/execute instructions remain high-risk", () => {
  for (const title of [
    "Write credentials to production",
    "Create a production authentication user",
    "Set billing limits",
    "Apply production migration",
    "Execute a production payout",
    "The agent is writing production credentials",
    "The plan has created a production authentication user",
    "The agent is setting billing limits",
    "The plan is applying production migration",
    "The agent will execute a production payout",
  ]) {
    const result = evaluateAgentDecision(withImplementerText(title), task);
    assert.equal(result.signals.no_high_risk_scope, false, title);
    assert.equal(result.evidence.high_risk_scope_detected, true, title);
    assert.equal(result.decision, "reject_and_replan", title);
  }
});

test("new mutating verbs remain suppressed by explicit prohibitions", () => {
  for (const title of [
    "Do not write credentials to production",
    "Do not create a production authentication user",
    "Do not set billing limits",
    "Do not apply production migration",
    "Do not execute a production payout",
  ]) {
    const result = evaluateAgentDecision(withImplementerText(title), task);
    assert.equal(result.signals.no_high_risk_scope, true, title);
    assert.equal(result.evidence.high_risk_scope_detected, false, title);
    assert.equal(result.decision, "approve_for_sandbox_validation", title);
  }
});
