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

const offlineSubscriptionTask = {
  issue: { number: 88, title: "[AI Task] Implement subscription billing foundation with entitlement and refund safeguards" },
  goal: "Implement a provider-independent, auditable subscription lifecycle foundation. This phase is limited to deterministic domain logic and documentation.",
  allowed_paths: [
    "lib/subscription-billing-lifecycle.mjs",
    "tests/subscription-billing-lifecycle.test.mjs",
    "docs/subscription-billing-foundation.md",
  ],
  explicit_exclusions: [
    "Do not add or activate payment-provider SDKs, live checkout, subscriptions, payment collection, or webhook endpoints.",
    "Do not access provider secrets, production payment accounts, production databases, or real member data.",
    "Do not change authentication, payout, reward, cash-balance, or profit-distribution behavior.",
    "Do not modify files outside the three exact allowed paths.",
    "Do not represent this foundation as authorization to launch paid services.",
  ],
};
const offlinePlan = {
  ...safePlan,
  tasks: safePlan.tasks.map((item) => item.id === "patch"
    ? { ...item, allowed_paths: ["lib/subscription-billing-lifecycle.mjs"] }
    : item),
};

test("allows only the exact offline subscription lifecycle scope with explicit prohibitions", () => {
  const result = evaluateAgentDecision(offlinePlan, offlineSubscriptionTask);
  assert.equal(result.decision, "approve_for_sandbox_validation");
  assert.equal(result.signals.no_high_risk_scope, true);
  assert.equal(result.evidence.high_risk_scope_detected, false);
});

for (const [name, replacement] of [
  ["payout", "Do not change authentication, reward, cash-balance, or profit-distribution behavior."],
  ["reward", "Do not change authentication, payout, cash-balance, or profit-distribution behavior."],
  ["cash-balance", "Do not change authentication, payout, reward, or profit-distribution behavior."],
  ["profit-distribution", "Do not change authentication, payout, reward, or cash-balance behavior."],
]) {
  test(`keeps the offline subscription path high-risk when the ${name} exclusion is missing`, () => {
    const task = {
      ...offlineSubscriptionTask,
      explicit_exclusions: offlineSubscriptionTask.explicit_exclusions.map((item, index) =>
        index === 2 ? replacement : item),
    };
    const result = evaluateAgentDecision(offlinePlan, task);
    assert.equal(result.decision, "reject_and_replan");
    assert.ok(result.blockers.includes("no_high_risk_scope"));
  });
}

test("rejects exclusions that explicitly say sensitive actions are not prohibited", () => {
  const task = {
    ...offlineSubscriptionTask,
    explicit_exclusions: offlineSubscriptionTask.explicit_exclusions.map((item, index) =>
      index === 0
        ? "Payment-provider SDKs, live checkout, payment collection, and webhook endpoints are not prohibited."
        : item),
  };
  const result = evaluateAgentDecision(offlinePlan, task);
  assert.equal(result.decision, "reject_and_replan");
  assert.ok(result.blockers.includes("no_high_risk_scope"));
});

test("rejects positive authorization and a prohibition scope terminated by contrast", () => {
  const positiveAuthorization = {
    ...offlineSubscriptionTask,
    explicit_exclusions: offlineSubscriptionTask.explicit_exclusions.map((item, index) =>
      index === 0
        ? "Payment-provider SDKs, live checkout, payment collection, and webhook endpoints are permitted."
        : item),
  };
  const contrastAuthorization = {
    ...offlineSubscriptionTask,
    explicit_exclusions: offlineSubscriptionTask.explicit_exclusions.map((item, index) =>
      index === 0
        ? "Do not add payment-provider SDKs, but live checkout, payment collection, and webhook endpoints are permitted."
        : item),
  };
  for (const task of [positiveAuthorization, contrastAuthorization]) {
    const result = evaluateAgentDecision(offlinePlan, task);
    assert.equal(result.decision, "reject_and_replan");
    assert.ok(result.blockers.includes("no_high_risk_scope"));
  }
});

test("rejects comma-joined positive authorization of a previously prohibited concept", () => {
  const task = {
    ...offlineSubscriptionTask,
    explicit_exclusions: offlineSubscriptionTask.explicit_exclusions.map((item, index) =>
      index === 0
        ? "Do not add payment-provider SDKs, live checkout, payment collection, or webhook endpoints, while live checkout is permitted."
        : item),
  };
  const result = evaluateAgentDecision(offlinePlan, task);
  assert.equal(result.decision, "reject_and_replan");
  assert.ok(result.blockers.includes("no_high_risk_scope"));
});

test("rejects positive authorization after a comma in the same exclusion", () => {
  const task = {
    ...offlineSubscriptionTask,
    explicit_exclusions: offlineSubscriptionTask.explicit_exclusions.map((item, index) =>
      index === 0
        ? "Do not add payment-provider SDKs, live checkout is permitted, payment collection, or webhook endpoints."
        : item),
  };
  const result = evaluateAgentDecision(offlinePlan, task);
  assert.equal(result.decision, "reject_and_replan");
  assert.ok(result.blockers.includes("no_high_risk_scope"));
});

test("does not exempt live billing endpoints from high-risk path classification", () => {
  const liveBillingTask = { allowed_paths: ["app/api/billing/checkout/route.ts"] };
  const result = evaluateAgentDecision(safePlan, liveBillingTask);
  assert.equal(result.decision, "reject_and_replan");
  assert.ok(result.blockers.includes("no_high_risk_scope"));
});
