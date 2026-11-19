import test from "node:test";
import assert from "node:assert/strict";
import {
  createInitialFactoryState, reserveTask, transitionTask, recordTaskFailure,
  recordSystemFailure, recordTaskSuccess, recordSystemSuccess,
  recoverExpiredLease, requeueTask, isSystemCooldownActive, validateFactoryState,
} from "../lib/agent-factory-state-machine.mjs";

const metadata = (overrides = {}) => ({
  issue_number: 42, lease_id: "lease-00000042", lease_owner: "DESKTOP-S2S4BM9",
  workflow_run_id: "run-123456", run_attempt: 1, base_sha: "a".repeat(40), ...overrides,
});
const event = (suffix) => "workflow-run-123456-" + suffix;

test("creates a valid versioned empty state", () => {
  const state = createInitialFactoryState(1000);
  assert.equal(state.schema_version, 2);
  assert.equal(state.state_version, 0);
  assert.equal(validateFactoryState(state), true);
});

test("reserves only one task and records an expiring lease", () => {
  const first = reserveTask(createInitialFactoryState(1000), metadata(), 1000);
  assert.equal(first.active_task.issue_number, 42);
  assert.equal(first.active_task.state, "reserved");
  assert.equal(Date.parse(first.active_task.lease_expires_at), 1000 + 90 * 60 * 1000);
  assert.throws(() => reserveTask(first, metadata({ issue_number: 43 })), /already owns/);
});

test("rejects incomplete reservation metadata", () => {
  assert.throws(() => reserveTask(createInitialFactoryState(), { issue_number: 42 }), /metadata is incomplete/);
});

test("enforces legal state transitions and releases terminal leases", () => {
  let state = reserveTask(createInitialFactoryState(1000), metadata(), 1000);
  assert.throws(() => transitionTask(state, 42, "publishing"), /Illegal task state transition/);
  state = transitionTask(state, 42, "preparing", {}, 2000);
  state = transitionTask(state, 42, "planning", {}, 3000);
  state = transitionTask(state, 42, "patching", {}, 4000);
  state = transitionTask(state, 42, "sandbox_testing", {}, 5000);
  state = transitionTask(state, 42, "publishing", {}, 6000);
  state = transitionTask(state, 42, "draft_pr_created", { head_sha: "b".repeat(40), pull_request_number: 99 }, 7000);
  state = transitionTask(state, 42, "awaiting_ci", {}, 8000);
  assert.equal(state.active_task.state, "awaiting_ci");
});

test("counts each task failure event once and quarantines after three distinct attempts", () => {
  let state = createInitialFactoryState(1000);
  state = reserveTask(state, metadata(), 1500);
  let result = recordTaskFailure(state, 42, event("1"), "PATCH_INVALID", "bad json", 2000);
  state = result.state;
  assert.equal(result.duplicate, false);
  result = recordTaskFailure(state, 42, event("1"), "PATCH_INVALID", "duplicate event", 3000);
  assert.equal(result.duplicate, true);
  assert.equal(result.state.tasks["42"].failures, 1);
  state = requeueTask(state, 42, 62_000);
  state = reserveTask(state, metadata({ lease_id: "lease-attempt-2", workflow_run_id: "run-123457" }), 62_000);
  state = recordTaskFailure(state, 42, event("2"), "PATCH_INVALID", "bad json", 63_000).state;
  state = requeueTask(state, 42, 183_000);
  state = reserveTask(state, metadata({ lease_id: "lease-attempt-3", workflow_run_id: "run-123458" }), 183_000);
  result = recordTaskFailure(state, 42, event("3"), "PATCH_INVALID", "bad json", 184_000);
  assert.equal(result.quarantined, true);
  assert.equal(result.state.tasks["42"].quarantined, true);
});

test("task failures do not increment the global system breaker", () => {
  let state = createInitialFactoryState(1000);
  state = reserveTask(state, metadata(), 1500);
  state = recordTaskFailure(state, 42, event("task"), "TEST_FAILURE", "assertion failed", 2000).state;
  assert.equal(state.system.consecutive_failures, 0);
  assert.equal(isSystemCooldownActive(state, 2000), false);
});

test("system failures release the lease and open a 15-minute cooldown after three unique events", () => {
  let state = reserveTask(createInitialFactoryState(1000), metadata(), 1000);
  state = recordSystemFailure(state, event("sys-1"), "DOCKER_UNAVAILABLE", "daemon offline", 2000).state;
  state = recordSystemFailure(state, event("sys-2"), "DOCKER_UNAVAILABLE", "daemon offline", 3000).state;
  const result = recordSystemFailure(state, event("sys-3"), "DOCKER_UNAVAILABLE", "daemon offline", 4000);
  assert.equal(result.state.active_task, null);
  assert.equal(result.state.system.consecutive_failures, 3);
  assert.equal(Date.parse(result.state.system.cooldown_until), 4000 + 15 * 60 * 1000);
  assert.equal(isSystemCooldownActive(result.state, 4001), true);
});

test("task success clears only that task retry record", () => {
  let state = reserveTask(createInitialFactoryState(1000), metadata(), 1000);
  state = recordTaskFailure(state, 42, event("fail"), "PATCH_INVALID", "bad", 2000).state;
  state = requeueTask(state, 42, 62_000);
  state = reserveTask(state, metadata({ lease_id: "lease-retry-000042", workflow_run_id: "run-123457" }), 62_000);
  state = transitionTask(state, 42, "preparing", {}, 62_100);
  state = transitionTask(state, 42, "planning", {}, 62_200);
  state = transitionTask(state, 42, "patching", {}, 62_300);
  state = transitionTask(state, 42, "sandbox_testing", {}, 62_400);
  state = transitionTask(state, 42, "publishing", {}, 62_500);
  state = transitionTask(state, 42, "draft_pr_created", { pull_request_number: 99 }, 62_600);
  state = transitionTask(state, 42, "awaiting_ci", {}, 62_700);
  state.system.consecutive_failures = 2;
  const result = recordTaskSuccess(state, 42, event("success"), 63_000);
  assert.equal(result.state.tasks["42"].failures, 0);
  assert.equal(result.state.system.consecutive_failures, 2);
});

test("system success clears system cooldown without erasing task failures", () => {
  let state = createInitialFactoryState(1000);
  state = reserveTask(state, metadata(), 1500);
  state = recordTaskFailure(state, 42, event("task-fail"), "PATCH_INVALID", "bad", 2000).state;
  state = recordSystemFailure(state, event("sys-fail"), "OLLAMA_OFFLINE", "offline", 3000).state;
  const result = recordSystemSuccess(state, event("sys-success"), 4000);
  assert.equal(result.state.system.consecutive_failures, 0);
  assert.equal(result.state.tasks["42"].failures, 1);
});

test("expired lease is recovered only after workflow is confirmed stopped", () => {
  let state = reserveTask(createInitialFactoryState(1000), metadata({ lease_ms: 60_000 }), 1000);
  let result = recoverExpiredLease(state, { workflow_still_running: true, event_key: event("recover") }, 61_200);
  assert.equal(result.recovered, false);
  assert.equal(result.reason, "workflow_may_still_be_running");
  result = recoverExpiredLease(state, { workflow_still_running: false, event_key: event("recover") }, 1200);
  assert.equal(result.recovered, true);
  assert.equal(result.state.active_task, null);
});

test("rejects duplicate or missing event keys", () => {
  const state = createInitialFactoryState(1000);
  assert.throws(() => recordSystemFailure(state, "short", "ERR", "bad", 2000), /event key/);
  const first = recordSystemFailure(state, event("one"), "ERR", "bad", 2000);
  const second = recordSystemFailure(first.state, event("one"), "ERR", "bad", 3000);
  assert.equal(second.duplicate, true);
  assert.equal(second.state.state_version, first.state.state_version);
});
test("task retry enters backoff and cannot be reserved until requeued", () => {
  let state = reserveTask(createInitialFactoryState(1000), metadata(), 1000);
  state = recordTaskFailure(state, 42, event("retry"), "PATCH_INVALID", "invalid manifest", 2000).state;
  assert.equal(state.tasks["42"].status, "retry_wait");
  assert.throws(() => reserveTask(state, metadata({ lease_id: "lease-retry-000042", workflow_run_id: "run-123457" }), 3000), /not currently queued/);
  assert.throws(() => requeueTask(state, 42, 60_000), /backoff has not elapsed/);
  state = requeueTask(state, 42, 62_000);
  assert.equal(state.tasks["42"].status, "queued");
  state = reserveTask(state, metadata({ lease_id: "lease-retry-000042", workflow_run_id: "run-123457" }), 63_000);
  assert.equal(state.active_task.attempt, 2);
});

test("task success cannot clear a quarantine without owning the active lease", () => {
  let state = createInitialFactoryState(1000);
  state = reserveTask(state, metadata(), 1500);
  state = recordTaskFailure(state, 42, event("q1"), "PATCH_INVALID", "bad", 2000).state;
  state = requeueTask(state, 42, 62_000);
  state = reserveTask(state, metadata({ lease_id: "lease-q2", workflow_run_id: "run-q2" }), 62_000);
  state = recordTaskFailure(state, 42, event("q2"), "PATCH_INVALID", "bad", 63_000).state;
  state = requeueTask(state, 42, 183_000);
  state = reserveTask(state, metadata({ lease_id: "lease-q3", workflow_run_id: "run-q3" }), 183_000);
  state = recordTaskFailure(state, 42, event("q3"), "PATCH_INVALID", "bad", 184_000).state;
  assert.throws(() => recordTaskSuccess(state, 42, event("fake-success"), 5000), /awaiting_ci state/);
  assert.equal(state.tasks["42"].quarantined, true);
});