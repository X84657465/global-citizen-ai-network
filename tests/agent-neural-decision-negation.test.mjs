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


test("read-only production audit and review language is not actionable high-risk intent", () => {
  for (const title of [
    "Verify production and full dependency audit outcomes",
    "Review production deployment",
    "Audit production configuration",
    "Inspect billing changes",
    "Audit changes to billing",
    "Review credentials rotation proposal",
  ]) {
    const result = evaluateAgentDecision(withImplementerText(title), task);
    assert.equal(result.signals.no_high_risk_scope, true, title);
    assert.equal(result.evidence.high_risk_scope_detected, false, title);
    assert.equal(result.decision, "approve_for_sandbox_validation", title);
  }
});

test("active and passive high-impact operations remain rejected", () => {
  for (const title of [
    "Deploy to production",
    "Change billing policy",
    "Rotate credentials",
    "Modify the production configuration",
    "Billing was changed",
    "Credentials must be rotated",
    "Production will be deployed",
    "Make changes to billing",
  ]) {
    const result = evaluateAgentDecision(withImplementerText(title), task);
    assert.equal(result.signals.no_high_risk_scope, false, title);
    assert.equal(result.evidence.high_risk_scope_detected, true, title);
    assert.equal(result.decision, "reject_and_replan", title);
  }
});

test("review verbs do not turn nearby mutation nouns into operations", () => {
  for (const title of [
    "Review production deployment plan",
    "Audit changes to billing policy",
    "Inspect credential rotation evidence",
    "Verify production migration checklist",
  ]) {
    const result = evaluateAgentDecision(withImplementerText(title), task);
    assert.equal(result.signals.no_high_risk_scope, true, title);
  }
});

test("negation applies to the actionable operation but not to an independent positive clause", () => {
  const safe = evaluateAgentDecision(withImplementerText("Do not deploy to production"), task);
  assert.equal(safe.signals.no_high_risk_scope, true);
  const mixed = evaluateAgentDecision(withImplementerText("Do not deploy to production, but update billing rules"), task);
  assert.equal(mixed.signals.no_high_risk_scope, false);
});


test("sensitive modifiers stay attached to active operations while noun phrases stay descriptive", () => {
  for (const title of [
    "Rotate production credentials",
    "Apply the production migration",
    "Change billing settings",
    "Production credentials were rotated",
  ]) {
    const result = evaluateAgentDecision(withImplementerText(title), task);
    assert.equal(result.signals.no_high_risk_scope, false, title);
  }
  for (const title of [
    "Review the production deploy plan",
    "Review production deployment",
    "Production deployment checklist",
    "Inspect billing change history",
  ]) {
    const result = evaluateAgentDecision(withImplementerText(title), task);
    assert.equal(result.signals.no_high_risk_scope, true, title);
  }
});


test("prose risk requires an actionable target relationship, not a deploy noun", () => {
  for (const title of [
    "Deploy to production",
    "Production deployment will be executed",
    "Billing changes will be applied",
  ]) {
    const result = evaluateAgentDecision(withImplementerText(title), task);
    assert.equal(result.signals.no_high_risk_scope, false, title);
  }
  for (const title of [
    "Deploy to staging",
    "Review the production deploy plan",
    "Review production deployment",
    "Production deployment checklist",
  ]) {
    const result = evaluateAgentDecision(withImplementerText(title), task);
    assert.equal(result.signals.no_high_risk_scope, true, title);
  }
});


test("past-tense application remains an actionable production operation", () => {
  for (const title of [
    "Applied the production migration",
    "Applied changes to billing",
  ]) {
    const result = evaluateAgentDecision(withImplementerText(title), task);
    assert.equal(result.signals.no_high_risk_scope, false, title);
  }
});


test("additional active high-impact verbs remain rejected", () => {
  for (const title of [
    "Execute production migration",
    "Perform billing update",
    "Start credential rotation",
    "Trigger production deployment",
    "Complete production migration",
    "Run production migration",
    "Launch production release",
  ]) {
    const result = evaluateAgentDecision(withImplementerText(title), task);
    assert.equal(result.signals.no_high_risk_scope, false, title);
    assert.equal(result.evidence.high_risk_scope_detected, true, title);
    assert.equal(result.decision, "reject_and_replan", title);
  }
});

test("read-only review of completed or proposed operations is not actionable intent", () => {
  for (const title of [
    "Audit production migration completed",
    "Verify billing changes applied",
    "Review credentials were rotated",
    "Inspect production deployment initiated",
    "Compare production release performed",
  ]) {
    const result = evaluateAgentDecision(withImplementerText(title), task);
    assert.equal(result.signals.no_high_risk_scope, true, title);
    assert.equal(result.evidence.high_risk_scope_detected, false, title);
    assert.equal(result.decision, "approve_for_sandbox_validation", title);
  }
});

test("an explicit operation after a review verb is still high risk", () => {
  for (const title of [
    "Review and execute production migration",
    "Audit then deploy to production",
    "Inspect and rotate credentials",
  ]) {
    const result = evaluateAgentDecision(withImplementerText(title), task);
    assert.equal(result.signals.no_high_risk_scope, false, title);
  }
});


test("reviewing a plan for a future high-impact operation is not execution intent", () => {
  for (const title of [
    "Review the plan to deploy to production",
    "Audit the proposal to modify billing",
    "Inspect the checklist to rotate credentials",
  ]) {
    const result = evaluateAgentDecision(withImplementerText(title), task);
    assert.equal(result.signals.no_high_risk_scope, true, title);
    assert.equal(result.evidence.high_risk_scope_detected, false, title);
    assert.equal(result.decision, "approve_for_sandbox_validation", title);
  }
});

test("a separate active operation after reviewing a plan remains high risk", () => {
  for (const title of [
    "Review the plan and deploy to production",
    "Audit the proposal then modify billing",
    "Inspect the checklist and rotate credentials",
  ]) {
    const result = evaluateAgentDecision(withImplementerText(title), task);
    assert.equal(result.signals.no_high_risk_scope, false, title);
    assert.equal(result.evidence.high_risk_scope_detected, true, title);
    assert.equal(result.decision, "reject_and_replan", title);
  }
});


test("an independent passive high-impact clause after review remains rejected", () => {
  for (const title of [
    "Review credentials were rotated and production is deployed",
    "Audit billing history then credentials are rotated",
    "Inspect the migration report and billing is changed",
  ]) {
    const result = evaluateAgentDecision(withImplementerText(title), task);
    assert.equal(result.signals.no_high_risk_scope, false, title);
    assert.equal(result.evidence.high_risk_scope_detected, true, title);
    assert.equal(result.decision, "reject_and_replan", title);
  }
});

test("a second read-only review verb does not turn a status statement into an operation", () => {
  for (const title of [
    "Review and confirm that production is deployed",
    "Audit and verify that billing was changed",
  ]) {
    const result = evaluateAgentDecision(withImplementerText(title), task);
    assert.equal(result.signals.no_high_risk_scope, true, title);
    assert.equal(result.evidence.high_risk_scope_detected, false, title);
  }
});
