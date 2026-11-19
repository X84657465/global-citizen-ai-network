import test from "node:test";
import assert from "node:assert/strict";
import { AgentPlanValidationError, validateAgentPlan } from "../lib/agent-plan-validation.mjs";

const task = {
  schema_version: 1,
  allowed_paths: ["lib/agent-plan-validation.mjs", "tests/agent-plan-validation.test.mjs"],
};

function item(overrides = {}) {
  return {
    id: "inspect-task",
    title: "Inspect the validated task",
    role: "planner",
    action: "inspect",
    depends_on: [],
    allowed_paths: [],
    acceptance_criteria: ["Inspection summary is produced"],
    max_output_bytes: 4096,
    ...overrides,
  };
}

function plan(tasks = [item()]) {
  return { schema_version: 1, tasks };
}

function rejects(fn, pattern) {
  assert.throws(fn, (error) => {
    assert.ok(error instanceof AgentPlanValidationError);
    assert.match(error.message, pattern);
    return true;
  });
}

test("accepts a minimal data-only plan and marks execution disabled", () => {
  const result = validateAgentPlan(plan(), task);
  assert.equal(result.execution_mode, "validated_plan_only");
  assert.equal(result.ai_execution_enabled, false);
  assert.equal(result.tasks[0].id, "inspect-task");
  assert.equal(result.safety.no_commands_or_model_code_executed, true);
});

test("topologically orders tasks while preserving stable order among ready tasks", () => {
  const result = validateAgentPlan(plan([
    item({ id: "implement-patch", role: "implementer", action: "propose_patch",
      depends_on: ["inspect-task"], allowed_paths: ["lib/agent-plan-validation.mjs"] }),
    item({ id: "inspect-task" }),
    item({ id: "review-patch", role: "reviewer", action: "validate_patch",
      depends_on: ["implement-patch"] }),
  ]), task);
  assert.deepEqual(result.tasks.map((entry) => entry.id), [
    "inspect-task", "implement-patch", "review-patch",
  ]);
});

test("rejects unexpected plan fields", () => {
  rejects(() => validateAgentPlan({ ...plan(), execute: true }, task), /unexpected fields/);
});

test("rejects unsupported role and role-action escalation", () => {
  rejects(() => validateAgentPlan(plan([item({ role: "admin" })]), task), /role is not supported/);
  rejects(() => validateAgentPlan(plan([item({ role: "planner", action: "propose_patch" })]), task),
    /not permitted/);
});

test("rejects paths outside the original task allowlist", () => {
  rejects(() => validateAgentPlan(plan([item({
    id: "write-patch", role: "implementer", action: "propose_patch",
    allowed_paths: ["app/page.tsx"],
  })]), task), /not approved/);
});

test("rejects unknown, self and duplicate dependencies", () => {
  rejects(() => validateAgentPlan(plan([item({ depends_on: ["missing-task"] })]), task),
    /Unknown task dependency/);
  rejects(() => validateAgentPlan(plan([item({ depends_on: ["inspect-task"] })]), task),
    /cannot depend on itself/);
  rejects(() => validateAgentPlan(plan([item({ depends_on: ["x-task", "x-task"] })]), task),
    /duplicate dependencies/);
});

test("rejects dependency cycles", () => {
  rejects(() => validateAgentPlan(plan([
    item({ id: "task-alpha", depends_on: ["task-beta"] }),
    item({ id: "task-beta", depends_on: ["task-alpha"] }),
  ]), task), /dependency cycle/);
});

test("rejects malformed acceptance criteria and oversized output", () => {
  rejects(() => validateAgentPlan(plan([item({ acceptance_criteria: [] })]), task),
    /acceptance criteria/);
  rejects(() => validateAgentPlan(plan([item({ max_output_bytes: 65537 })]), task),
    /max_output_bytes/);
});

test("rejects plans with too many tasks", () => {
  const tasks = Array.from({ length: 13 }, (_, index) => item({
    id: `task-${String(index).padStart(2, "0")}`,
  }));
  rejects(() => validateAgentPlan(plan(tasks), task), /between 1 and 12/);
});


test("collects Ollama NDJSON response fragments when a multibyte UTF-8 character is split across chunks", async () => {
  const encoder = new TextEncoder();
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode('{"response":"hello "'));
      const tail = encoder.encode(',"done":false}\r\n{"response":"世界","done":true,"done_reason":"stop","eval_count":4}\n');
      const multibyteStart = tail.indexOf(0xe4);
      controller.enqueue(tail.slice(0, multibyteStart + 1));
      controller.enqueue(tail.slice(multibyteStart + 1));
      controller.close();
    },
  });
  const progress = [];
  const result = await collectOllamaGenerateStream(body, (value) => progress.push(value));
  assert.equal(result.response, "hello 世界");
  assert.equal(result.done_reason, "stop");
  assert.equal(result.eval_count, 4);
  assert.equal(progress.at(-1).done, true);
});

test("rejects malformed Ollama stream chunks and streams without completion markers", async () => {
  const encoder = new TextEncoder();
  const malformed = new ReadableStream({
    start(controller) { controller.enqueue(encoder.encode("{not-json}\n")); controller.close(); },
  });
  await assert.rejects(() => collectOllamaGenerateStream(malformed), /invalid NDJSON/);

  const incomplete = new ReadableStream({
    start(controller) { controller.enqueue(encoder.encode('{"response":"partial","done":false}\n')); controller.close(); },
  });
  await assert.rejects(() => collectOllamaGenerateStream(incomplete), /without a completion marker/);
});


test("splits large approved patch scopes into deterministic bounded batches", () => {
  const paths = Array.from({ length: 11 }, (_, index) => "app/file-" + index + ".tsx");
  const batches = splitPatchPathsIntoBatches(paths, 4);
  assert.deepEqual(batches.map((batch) => batch.length), [4, 4, 3]);
  assert.deepEqual(batches.flat(), paths);
});

test("rejects invalid and duplicate patch batch paths", () => {
  assert.throws(() => splitPatchPathsIntoBatches([]), /non-empty array/);
  assert.throws(() => splitPatchPathsIntoBatches(["app/a.tsx", "APP/A.TSX"]), /unique/);
  assert.throws(() => splitPatchPathsIntoBatches(["app/a.tsx"], 0), /between 1 and 20/);
});
