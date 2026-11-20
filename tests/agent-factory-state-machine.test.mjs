import test from "node:test";
import assert from "node:assert/strict";
import {
  createInitialFactoryState, reserveTask, transitionTask, recordTaskFailure,
  recordSystemFailure, recordTaskSuccess, recordSystemSuccess,
  recoverExpiredLease, requeueTask, recordCandidateFailure, recordCandidateStarted, isSystemCooldownActive, validateFactoryState,
  getTaskRetryAt, normalizeLegacyRetryTimestamps,
} from "../lib/agent-factory-state-machine.mjs";

const metadata = (overrides = {}) => ({
  issue_number: 42, lease_id: "lease-00000042", lease_owner: "DESKTOP-S2S4BM9",
  workflow_run_id: "run-123456", run_attempt: 1, base_sha: "a".repeat(40), ...overrides,
});
const event = (suffix) => "workflow-run-123456-" + suffix;

const move = (state, issueNumber, nextStatus, details = {}, now = Date.now()) =>
  transitionTask(state, issueNumber, state.active_task?.lease_id, nextStatus, details, now);

const failTask = (state, issueNumber, eventKey, errorCode, summary, now = Date.now()) =>
  recordTaskFailure(state, issueNumber, state.active_task?.lease_id, eventKey, errorCode, summary, now);

const startCandidate = (state, issueNumber, evidence, now = Date.now()) =>
  recordCandidateStarted(state, issueNumber,
    "ci-start-" + evidence.ci_run_id + "-attempt-" + evidence.ci_run_attempt +
      "-issue-" + issueNumber + "-sha-" + evidence.head_sha.slice(0, 12),
    { ...evidence, head_ref: evidence.head_ref ?? ("ai-task/issue-" + issueNumber + "-abcdef123456") },
    now,
  ).state;

test("creates a valid versioned empty state", () => {
  const state = createInitialFactoryState(1000);
  assert.equal(state.schema_version, 2);
  assert.equal(state.state_version, 0);
  assert.equal(validateFactoryState(state), true);
});

test("validates workflow identity and base revision across the active lease and task record", () => {
  const reserved = reserveTask(createInitialFactoryState(1000), metadata(), 2000);
  const corruptions = [
    ["missing workflow run ID", state => { state.active_task.workflow_run_id = ""; }],
    ["invalid workflow attempt", state => { state.active_task.run_attempt = 0; }],
    ["invalid base SHA", state => { state.active_task.base_sha = "not-a-sha"; }],
    ["missing idempotency key", state => { state.active_task.idempotency_key = ""; }],
    ["mismatched task workflow ID", state => { state.tasks["42"].workflow_run_id = "different-run"; }],
    ["mismatched task attempt", state => { state.tasks["42"].run_attempt = 2; }],
    ["mismatched task base SHA", state => { state.tasks["42"].base_sha = "b".repeat(40); }],
  ];

  for (const [label, corrupt] of corruptions) {
    const invalid = JSON.parse(JSON.stringify(reserved));
    corrupt(invalid);
    assert.throws(() => validateFactoryState(invalid), /Active task lease is invalid/, label);
  }
});

test("rejects invalid system breaker counters and timestamps", () => {
  const invalidCounter = createInitialFactoryState(1000);
  invalidCounter.system.consecutive_failures = -1;
  assert.throws(() => validateFactoryState(invalidCounter), /system breaker state/);

  const invalidCooldown = createInitialFactoryState(1000);
  invalidCooldown.system.cooldown_until = "not-a-date";
  assert.throws(() => validateFactoryState(invalidCooldown), /system breaker state/);

  const invalidUpdatedAt = createInitialFactoryState(1000);
  invalidUpdatedAt.updated_at = "not-a-date";
  assert.throws(() => validateFactoryState(invalidUpdatedAt), /update timestamp/);
});

test("rejects duplicate, malformed, or oversized processed-event histories", () => {
  const duplicate = createInitialFactoryState(1000);
  duplicate.processed_events = ["workflow-event-1", "workflow-event-1"];
  assert.throws(() => validateFactoryState(duplicate), /Processed event history/);

  const malformed = createInitialFactoryState(1000);
  malformed.processed_events = ["short"];
  assert.throws(() => validateFactoryState(malformed), /Processed event history/);

  const oversized = createInitialFactoryState(1000);
  oversized.processed_events = Array.from({ length: 501 }, (_, index) => "workflow-event-" + index);
  assert.throws(() => validateFactoryState(oversized), /Processed event history/);
});

test("preserves old idempotency keys and fails closed at the processed-event ledger capacity", () => {
  const state = createInitialFactoryState(1000);
  state.processed_events = Array.from(
    { length: 500 },
    (_, index) => "workflow-event-" + String(index).padStart(4, "0"),
  );
  state.system.consecutive_failures = 1;
  assert.equal(validateFactoryState(state), true);

  const replay = recordSystemFailure(
    state,
    "workflow-event-0000",
    "REPLAYED_OLD_EVENT",
    "must remain a duplicate after the ledger reaches capacity",
    2000,
  );
  assert.equal(replay.duplicate, true);
  assert.equal(replay.state, state);
  assert.equal(replay.state.system.consecutive_failures, 1);
  assert.equal(replay.state.state_version, 0);

  assert.throws(
    () => recordSystemFailure(
      state,
      "workflow-event-new-0001",
      "NEW_EVENT",
      "must fail closed instead of evicting an old idempotency key",
      3000,
    ),
    /ledger capacity reached; refusing to evict idempotency keys/,
  );
  assert.equal(state.processed_events.length, 500);
  assert.equal(state.system.consecutive_failures, 1);
  assert.equal(state.state_version, 0);
});

test("rejects inconsistent quarantine flags and orphaned active leases", () => {
  const quarantined = createInitialFactoryState(1000);
  quarantined.tasks["42"] = {
    status: "quarantined", attempts: 3, failures: 3, candidate_failures: 0,
    quarantined: false, next_attempt_at: null, last_error: null, last_success_at: null,
  };
  assert.throws(() => validateFactoryState(quarantined), /Task state record/);

  const orphaned = reserveTask(createInitialFactoryState(1000), metadata(), 1000);
  orphaned.tasks["42"].lease_id = "different-lease";
  assert.throws(() => validateFactoryState(orphaned), /Active task lease/);
});

test("rejects orphaned and duplicate lease-bound task states", () => {
  const reserved = reserveTask(createInitialFactoryState(1000), metadata(), 1000);
  const orphaned = structuredClone(reserved);
  orphaned.active_task = null;
  assert.throws(
    () => validateFactoryState(orphaned),
    /lease-bound task exists without the single active worker lease/,
  );

  const duplicate = structuredClone(reserved);
  duplicate.tasks["43"] = {
    ...structuredClone(duplicate.tasks["42"]),
    lease_id: "lease-00000043",
    workflow_run_id: "run-654321",
    status: "preparing",
  };
  assert.throws(
    () => validateFactoryState(duplicate),
    /Active task lease is invalid or inconsistent/,
  );
});

test("reserves only one task and records an expiring lease", () => {
  const first = reserveTask(createInitialFactoryState(1000), metadata(), 1000);
  assert.equal(first.active_task.issue_number, 42);
  assert.equal(first.active_task.state, "reserved");
  assert.equal(Date.parse(first.active_task.lease_expires_at), 1000 + 90 * 60 * 1000);
  assert.throws(() => reserveTask(first, metadata({ issue_number: 43 })), /already owns/);
});

test("reservation replay must match the complete immutable lease identity", () => {
  const initial = createInitialFactoryState(1000);
  const input = metadata({ idempotency_key: "factory-event-42" });
  const reserved = reserveTask(initial, input, 2000);

  assert.equal(reserveTask(reserved, input, 3000), reserved);
  assert.throws(
    () => reserveTask(reserved, metadata({
      idempotency_key: "factory-event-42", lease_owner: "OTHER-RUNNER",
    }), 3000),
    /already owns the factory lease/,
  );
  assert.throws(
    () => reserveTask(reserved, metadata({
      idempotency_key: "different-event-key",
    }), 3000),
    /already owns the factory lease/,
  );
});

test("rejects oversized or blank lease identity fields", () => {
  const initial = createInitialFactoryState(1000);
  const valid = metadata();

  for (const patch of [
    { lease_id: "x".repeat(201) },
    { lease_owner: "x".repeat(201) },
    { workflow_run_id: "x".repeat(101) },
    { idempotency_key: "x".repeat(201) },
    { lease_owner: "   " },
    { idempotency_key: "   " },
  ]) {
    assert.throws(
      () => reserveTask(initial, { ...valid, ...patch }, 2000),
      /invalid|incomplete/i,
    );
  }
});

test("rejects incomplete reservation metadata", () => {
  assert.throws(() => reserveTask(createInitialFactoryState(), { issue_number: 42 }), /metadata is incomplete/);
});

test("enforces legal state transitions and releases terminal leases", () => {
  let state = reserveTask(createInitialFactoryState(1000), metadata(), 1000);
  assert.throws(() => move(state, 42, "publishing"), /Illegal task state transition/);
  state = move(state, 42, "preparing", {}, 2000);
  state = move(state, 42, "planning", {}, 3000);
  state = move(state, 42, "patching", {}, 4000);
  state = move(state, 42, "sandbox_testing", {}, 5000);
  state = move(state, 42, "publishing", {}, 6000);
  state = move(state, 42, "draft_pr_created", { head_sha: "b".repeat(40), pull_request_number: 99 }, 7000);
  state = move(state, 42, "awaiting_ci", {}, 8000);
  assert.equal(state.active_task, null);
  assert.equal(state.tasks["42"].status, "awaiting_ci");
  assert.equal(state.tasks["42"].head_sha, "b".repeat(40));
});

test("counts each task failure event once and quarantines after three distinct attempts", () => {
  let state = createInitialFactoryState(1000);
  state = reserveTask(state, metadata(), 1500);
  let result = failTask(state, 42, event("1"), "PATCH_INVALID", "bad json", 2000);
  state = result.state;
  assert.equal(result.duplicate, false);
  result = failTask(state, 42, event("1"), "PATCH_INVALID", "duplicate event", 3000);
  assert.equal(result.duplicate, true);
  assert.equal(result.state.tasks["42"].failures, 1);
  state = requeueTask(state, 42, 62_000);
  state = reserveTask(state, metadata({ lease_id: "lease-attempt-2", workflow_run_id: "run-123457" }), 62_000);
  state = failTask(state, 42, event("2"), "PATCH_INVALID", "bad json", 63_000).state;
  state = requeueTask(state, 42, 183_000);
  state = reserveTask(state, metadata({ lease_id: "lease-attempt-3", workflow_run_id: "run-123458" }), 183_000);
  result = failTask(state, 42, event("3"), "PATCH_INVALID", "bad json", 184_000);
  assert.equal(result.quarantined, true);
  assert.equal(result.state.tasks["42"].quarantined, true);
});

test("task failures do not increment the global system breaker", () => {
  let state = createInitialFactoryState(1000);
  state = reserveTask(state, metadata(), 1500);
  state = failTask(state, 42, event("task"), "TEST_FAILURE", "assertion failed", 2000).state;
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
  state = failTask(state, 42, event("fail"), "PATCH_INVALID", "bad", 2000).state;
  state = requeueTask(state, 42, 62_000);
  state = reserveTask(state, metadata({ lease_id: "lease-retry-000042", workflow_run_id: "run-123457" }), 62_000);
  state = move(state, 42, "preparing", {}, 62_100);
  state = move(state, 42, "planning", {}, 62_200);
  state = move(state, 42, "patching", {}, 62_300);
  state = move(state, 42, "sandbox_testing", {}, 62_400);
  state = move(state, 42, "publishing", {}, 62_500);
  state = move(state, 42, "draft_pr_created", { head_sha: "c".repeat(40), pull_request_number: 99 }, 62_600);
  state = move(state, 42, "awaiting_ci", {}, 62_700);
  const evidence = { head_sha: "c".repeat(40), pull_request_number: 99, ci_conclusion: "success", ci_run_id: "ci-123", ci_run_attempt: 1 };
  state = startCandidate(state, 42, evidence, 62_800);
  state.system.consecutive_failures = 2;
  const result = recordTaskSuccess(state, 42, event("success"), evidence, 63_000);
  assert.equal(result.state.tasks["42"].failures, 0);
  assert.equal(result.state.tasks["42"].status, "completed");
  assert.equal(result.state.tasks["42"].candidate_status, "success");
  assert.equal(result.state.system.consecutive_failures, 2);
});

test("system success clears system cooldown without erasing task failures", () => {
  let state = createInitialFactoryState(1000);
  state = reserveTask(state, metadata(), 1500);
  state = failTask(state, 42, event("task-fail"), "PATCH_INVALID", "bad", 2000).state;
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
  result = recoverExpiredLease(state, { workflow_still_running: false, event_key: event("recover") }, 61_200);
  assert.equal(result.recovered, true);
  assert.equal(result.state.active_task, null);
});

test("expired lease recovery is idempotent and activates the system cooldown at the failure threshold", () => {
  let state = createInitialFactoryState(1000);
  state = recordSystemFailure(state, event("system-before-recovery-1"), "OLLAMA_OFFLINE", "offline", 2000).state;
  state = recordSystemFailure(state, event("system-before-recovery-2"), "DOCKER_UNAVAILABLE", "docker unavailable", 3000).state;
  state = reserveTask(state, metadata({ lease_ms: 60_000 }), 4000);

  const recoveredAt = 65_000;
  const eventKey = event("threshold-lease-recovery");
  const result = recoverExpiredLease(state, {
    workflow_still_running: false,
    event_key: eventKey,
  }, recoveredAt);

  assert.equal(result.recovered, true);
  assert.equal(result.state.active_task, null);
  assert.equal(result.state.tasks["42"].status, "queued");
  assert.equal(result.state.system.consecutive_failures, 3);
  assert.equal(result.state.system.last_error_code, "WORKER_LEASE_EXPIRED");
  assert.equal(result.state.system.cooldown_until, new Date(recoveredAt + 15 * 60 * 1000).toISOString());
  assert.equal(isSystemCooldownActive(result.state, recoveredAt), true);

  // Replaying the same recovery after a controller restart cannot mutate state.
  const replay = recoverExpiredLease(result.state, {
    workflow_still_running: false,
    event_key: eventKey,
  }, recoveredAt + 1000);
  assert.equal(replay.recovered, false);
  assert.equal(replay.state, result.state);
  assert.equal(replay.state.state_version, result.state.state_version);
  assert.equal(replay.state.system.consecutive_failures, 3);
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
  state = failTask(state, 42, event("retry"), "PATCH_INVALID", "invalid manifest", 2000).state;
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
  state = failTask(state, 42, event("q1"), "PATCH_INVALID", "bad", 2000).state;
  state = requeueTask(state, 42, 62_000);
  state = reserveTask(state, metadata({ lease_id: "lease-q2", workflow_run_id: "run-q2" }), 62_000);
  state = failTask(state, 42, event("q2"), "PATCH_INVALID", "bad", 63_000).state;
  state = requeueTask(state, 42, 183_000);
  state = reserveTask(state, metadata({ lease_id: "lease-q3", workflow_run_id: "run-q3" }), 183_000);
  state = failTask(state, 42, event("q3"), "PATCH_INVALID", "bad", 184_000).state;
  assert.throws(() => recordTaskSuccess(state, 42, event("fake-success"), {}, 5000), /exact candidate SHA, PR, CI run ID/);
  assert.equal(state.tasks["42"].quarantined, true);
});
test("candidate-start rejects blank or oversized CI run IDs and invalid branch identity metadata", () => {
  let state = reserveTask(createInitialFactoryState(1000), metadata(), 1000);
  state = move(state, 42, "preparing", {}, 1100);
  state = move(state, 42, "planning", {}, 1200);
  state = move(state, 42, "patching", {}, 1300);
  state = move(state, 42, "sandbox_testing", {}, 1400);
  state = move(state, 42, "publishing", {}, 1500);
  state = move(state, 42, "draft_pr_created", {
    head_sha: "b".repeat(40), pull_request_number: 89,
  }, 1600);
  state = move(state, 42, "awaiting_ci", {}, 1700);

  const evidence = {
    head_sha: "b".repeat(40), pull_request_number: 89,
    ci_conclusion: "success", ci_run_id: "ci-889", ci_run_attempt: 1,
    head_ref: "ai-task/issue-42-abcdef123456",
  };
  for (const patch of [
    { ci_run_id: "   " },
    { ci_run_id: "x".repeat(101) },
    { head_ref: " ai-task/issue-42-abcdef123456" },
    { head_ref: "ai-task/issue-42-abcdef12345" },
    { head_ref: "ai-task/issue-42-abcdef12345g" },
    { head_ref: "ai-task/issue-42-abcdef123456" + String.fromCharCode(10) + "malicious" },
    { head_ref: "ai-task/issue-43-abcdef123456" },
    { head_ref: "ai-task/issue-42-" + "x".repeat(240) },
  ]) {
    assert.throws(
      () => startCandidate(state, 42, { ...evidence, ...patch }, 1800),
      /Candidate start requires an exact task branch/,
    );
    assert.equal(state.tasks["42"].status, "awaiting_ci");
    assert.equal(state.state_version > 0, true);
  }
});

test("candidate CI failure is recorded separately from worker task retries", () => {
  let state = reserveTask(createInitialFactoryState(1000), metadata(), 1000);
  state = move(state, 42, "preparing", {}, 1100);
  state = move(state, 42, "planning", {}, 1200);
  state = move(state, 42, "patching", {}, 1300);
  state = move(state, 42, "sandbox_testing", {}, 1400);
  state = move(state, 42, "publishing", {}, 1500);
  state = move(state, 42, "draft_pr_created", { head_sha: "d".repeat(40), pull_request_number: 77 }, 1600);
  state = move(state, 42, "awaiting_ci", {}, 1700);
  const evidence = { head_sha: "d".repeat(40), pull_request_number: 77, ci_conclusion: "failure", ci_run_id: "ci-456", ci_run_attempt: 1 };
  state = startCandidate(state, 42, evidence, 1750);
  assert.throws(() => recordCandidateFailure(state, 42, event("wrong-sha"), { ...evidence, head_sha: "e".repeat(40) }, "stale run", 1800), /exact candidate SHA, PR, CI run ID/);
  const result = recordCandidateFailure(state, 42, event("candidate-fail"), evidence, "lint failed", 1900);
  assert.equal(result.state.tasks["42"].status, "candidate_rejected");
  assert.equal(result.state.tasks["42"].failures, 0);
  assert.equal(result.state.active_task, null);
});

test("explicitly requeues a candidate CI rejection for a new worker attempt", () => {
  let state = reserveTask(createInitialFactoryState(1000), metadata(), 1000);
  state = move(state, 42, "preparing", {}, 1100);
  state = move(state, 42, "planning", {}, 1200);
  state = move(state, 42, "patching", {}, 1300);
  state = move(state, 42, "sandbox_testing", {}, 1400);
  state = move(state, 42, "publishing", {}, 1500);
  state = move(state, 42, "draft_pr_created", {
    head_sha: "f".repeat(40), pull_request_number: 78,
  }, 1600);
  state = move(state, 42, "awaiting_ci", {}, 1700);

  const evidence = {
    head_sha: "f".repeat(40), pull_request_number: 78,
    ci_conclusion: "failure", ci_run_id: "ci-789", ci_run_attempt: 1,
  };
  state = startCandidate(state, 42, evidence, 1750);
  state = recordCandidateFailure(state, 42, event("candidate-rejected-retry"), evidence, "lint failed", 1800).state;
  assert.equal(state.tasks["42"].status, "candidate_rejected");
  assert.equal(state.active_task, null);

  assert.equal(state.tasks["42"].next_attempt_at, new Date(61_800).toISOString());
  assert.throws(() => requeueTask(state, 42, 61_799), /backoff has not elapsed/);
  state = requeueTask(state, 42, 61_800);
  assert.equal(state.tasks["42"].status, "queued");
  assert.equal(state.tasks["42"].candidate_status, "retry_queued");

  state = reserveTask(state, metadata({
    lease_id: "lease-attempt-2", workflow_run_id: "run-123457", run_attempt: 2,
  }), 62_000);
  assert.equal(state.active_task.issue_number, 42);
  assert.equal(state.active_task.attempt, 2);
});


test("legacy candidate rejections without next_attempt_at retain a safe retry delay", () => {
  let state = reserveTask(createInitialFactoryState(1000), metadata(), 1000);
  state = move(state, 42, "preparing", {}, 1100);
  state = move(state, 42, "planning", {}, 1200);
  state = move(state, 42, "patching", {}, 1300);
  state = move(state, 42, "sandbox_testing", {}, 1400);
  state = move(state, 42, "publishing", {}, 1500);
  state = move(state, 42, "draft_pr_created", {
    head_sha: "d".repeat(40), pull_request_number: 79,
  }, 1600);
  state = move(state, 42, "awaiting_ci", {}, 1700);
  const evidence = {
    head_sha: "d".repeat(40), pull_request_number: 79,
    ci_conclusion: "failure", ci_run_id: "ci-legacy", ci_run_attempt: 1,
  };
  state = startCandidate(state, 42, evidence, 1750);
  state = recordCandidateFailure(state, 42, event("legacy-candidate-failure"), evidence, "failed", 1800).state;
  delete state.tasks["42"].next_attempt_at;

  assert.throws(() => requeueTask(state, 42, 61_799), /backoff has not elapsed/);
  state = requeueTask(state, 42, 61_800);
  assert.equal(state.tasks["42"].status, "queued");
});

test("stale workers cannot transition or fail a newer lease for the same Issue", () => {
  let state = reserveTask(createInitialFactoryState(1000), metadata({
    lease_id: "lease-old-worker", lease_ms: 60_000,
  }), 1000);
  const recovered = recoverExpiredLease(state, {
    workflow_still_running: false, event_key: event("old-lease-recovered"),
  }, 61_200);
  assert.equal(recovered.recovered, true);
  state = reserveTask(recovered.state, metadata({
    lease_id: "lease-current-worker", workflow_run_id: "run-current",
    run_attempt: 2,
  }), 62_000);

  assert.throws(
    () => transitionTask(state, 42, "lease-old-worker", "preparing"),
    /lease ID/,
  );
  assert.throws(
    () => recordTaskFailure(
      state, 42, "lease-old-worker", event("stale-worker-failure"),
      "PATCH_INVALID", "stale worker must not mutate the current task", 63_000,
    ),
    /lease ID/,
  );

  assert.equal(state.active_task.lease_id, "lease-current-worker");
  assert.equal(state.tasks["42"].status, "reserved");
  state = move(state, 42, "preparing", {}, 64_000);
  assert.equal(state.active_task.state, "preparing");
});


test("candidate success requires exact CI run ID and positive run attempt", () => {
  let state = reserveTask(createInitialFactoryState(1000), metadata(), 1000);
  state = move(state, 42, "preparing", {}, 1100);
  state = move(state, 42, "planning", {}, 1200);
  state = move(state, 42, "patching", {}, 1300);
  state = move(state, 42, "sandbox_testing", {}, 1400);
  state = move(state, 42, "publishing", {}, 1500);
  state = move(state, 42, "draft_pr_created", {
    head_sha: "a".repeat(40), pull_request_number: 88,
  }, 1600);
  state = move(state, 42, "awaiting_ci", {}, 1700);

  const evidence = {
    head_sha: "a".repeat(40), pull_request_number: 88,
    ci_conclusion: "success", ci_run_id: "ci-888", ci_run_attempt: 1,
  };
  state = startCandidate(state, 42, evidence, 1750);
  assert.throws(
    () => recordTaskSuccess(state, 42, event("missing-ci-run-id"), { ...evidence, ci_run_id: "" }, 1800),
    /CI run ID/,
  );
  assert.throws(
    () => recordTaskSuccess(state, 42, event("missing-ci-attempt"), { ...evidence, ci_run_attempt: 0 }, 1800),
    /CI run ID/,
  );
  state.tasks["42"].candidate_failures = 2;
  const result = recordTaskSuccess(state, 42, event("valid-ci-evidence"), evidence, 1900);
  assert.equal(result.state.tasks["42"].status, "completed");
  assert.equal(result.state.tasks["42"].candidate_failures, 0);
});

test("candidate failure also requires exact CI run ID and positive run attempt", () => {
  let state = reserveTask(createInitialFactoryState(1000), metadata(), 1000);
  state = move(state, 42, "preparing", {}, 1100);
  state = move(state, 42, "planning", {}, 1200);
  state = move(state, 42, "patching", {}, 1300);
  state = move(state, 42, "sandbox_testing", {}, 1400);
  state = move(state, 42, "publishing", {}, 1500);
  state = move(state, 42, "draft_pr_created", {
    head_sha: "b".repeat(40), pull_request_number: 89,
  }, 1600);
  state = move(state, 42, "awaiting_ci", {}, 1700);

  const evidence = {
    head_sha: "b".repeat(40), pull_request_number: 89,
    ci_conclusion: "failure", ci_run_id: "ci-889", ci_run_attempt: 1,
  };
  state = startCandidate(state, 42, evidence, 1750);
  assert.throws(
    () => recordCandidateFailure(state, 42, event("failure-missing-run-id"), { ...evidence, ci_run_id: "" }, "failed", 1800),
    /CI run ID/,
  );
  assert.throws(
    () => recordCandidateFailure(state, 42, event("failure-missing-attempt"), { ...evidence, ci_run_attempt: 0 }, "failed", 1800),
    /CI run ID/,
  );
  const result = recordCandidateFailure(state, 42, event("valid-failure-evidence"), evidence, "failed", 1900);
  assert.equal(result.state.tasks["42"].status, "candidate_rejected");
});


test("quarantines a task after three distinct candidate CI rejections", () => {
  let state = createInitialFactoryState(1000);
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const start = 1000 + attempt * 100_000;
    state = reserveTask(state, metadata({
      lease_id: "lease-candidate-" + attempt,
      workflow_run_id: "run-candidate-" + attempt,
      run_attempt: attempt,
    }), start);
    state = move(state, 42, "preparing", {}, start + 100);
    state = move(state, 42, "planning", {}, start + 200);
    state = move(state, 42, "patching", {}, start + 300);
    state = move(state, 42, "sandbox_testing", {}, start + 400);
    state = move(state, 42, "publishing", {}, start + 500);
    const headSha = String(attempt).repeat(40);
    const pullRequestNumber = 90 + attempt;
    state = move(state, 42, "draft_pr_created", {
      head_sha: headSha, pull_request_number: pullRequestNumber,
    }, start + 600);
    state = move(state, 42, "awaiting_ci", {}, start + 700);

    const evidence = {
      head_sha: headSha, pull_request_number: pullRequestNumber,
      ci_conclusion: "failure", ci_run_id: String(9000 + attempt), ci_run_attempt: 1,
    };
    state = startCandidate(state, 42, evidence, start + 750);
    state = recordCandidateFailure(
      state, 42, event("candidate-rejection-" + attempt), evidence,
      "candidate validation failed", start + 800,
    ).state;
    assert.equal(state.tasks["42"].candidate_failures, attempt);
    assert.equal(state.tasks["42"].failures, 0);

    if (attempt < 3) {
      assert.equal(state.tasks["42"].status, "candidate_rejected");
      assert.equal(state.tasks["42"].quarantined, false);
      state = requeueTask(state, 42, start + 800 + (60_000 * (2 ** (attempt - 1))));
    } else {
      assert.equal(state.tasks["42"].status, "quarantined");
      assert.equal(state.tasks["42"].quarantined, true);
      assert.throws(() => requeueTask(state, 42, start + 900), /not eligible/);
    }
  }
});


test("quarantine transitions set both the status and quarantine flag", () => {
  let state = reserveTask(createInitialFactoryState(1000), metadata(), 1000);
  state = move(state, 42, "quarantined", {}, 1100);
  assert.equal(state.active_task, null);
  assert.equal(state.tasks["42"].status, "quarantined");
  assert.equal(state.tasks["42"].quarantined, true);
  assert.throws(
    () => reserveTask(state, metadata({ lease_id: "lease-blocked", workflow_run_id: "run-blocked" }), 1200),
    /quarantined/,
  );
});


test("candidate-start reopens the same PR for a new head and fences stale CI outcomes", () => {
  let state = reserveTask(createInitialFactoryState(1000), metadata(), 1000);
  state = move(state, 42, "preparing", {}, 1100);
  state = move(state, 42, "planning", {}, 1200);
  state = move(state, 42, "patching", {}, 1300);
  state = move(state, 42, "sandbox_testing", {}, 1400);
  state = move(state, 42, "publishing", {}, 1500);
  state = move(state, 42, "draft_pr_created", {
    head_sha: "a".repeat(40), pull_request_number: 88,
  }, 1600);
  state = move(state, 42, "awaiting_ci", {}, 1700);

  const firstEvidence = {
    head_sha: "a".repeat(40), pull_request_number: 88,
    ci_conclusion: "success", ci_run_id: "ci-first", ci_run_attempt: 1,
  };
  state = startCandidate(state, 42, firstEvidence, 1750);
  state = recordTaskSuccess(state, 42, event("first-success"), firstEvidence, 1800).state;
  assert.equal(state.tasks["42"].status, "completed");

  const nextEvidence = {
    head_sha: "c".repeat(40), pull_request_number: 88,
    ci_conclusion: "success", ci_run_id: "ci-second", ci_run_attempt: 1,
  };
  state = startCandidate(state, 42, nextEvidence, 1900);
  assert.equal(state.tasks["42"].status, "awaiting_ci");
  assert.equal(state.tasks["42"].head_sha, "c".repeat(40));
  assert.throws(
    () => recordTaskSuccess(state, 42, event("stale-first-success"), firstEvidence, 2000),
    /exact candidate SHA, PR, CI run ID/,
  );
  state = recordTaskSuccess(state, 42, event("second-success"), nextEvidence, 2100).state;
  assert.equal(state.tasks["42"].status, "completed");
  assert.equal(state.tasks["42"].head_sha, "c".repeat(40));
});


test("rejects invalid reservation identity before creating or mutating a lease", () => {
  const initial = createInitialFactoryState(1000);
  const invalidInputs = [
    { lease_id: " ".repeat(1), lease_owner: "runner" },
    { lease_id: "x".repeat(201), lease_owner: "runner" },
    { lease_id: "lease-valid", lease_owner: "x".repeat(201) },
    { lease_id: "lease-valid", lease_owner: "runner", workflow_run_id: "x".repeat(101) },
    { lease_id: "lease-valid", lease_owner: "runner", idempotency_key: "x".repeat(201) },
  ];
  for (const overrides of invalidInputs) {
    assert.throws(
      () => reserveTask(initial, metadata(overrides), 2000),
      /reservation metadata is incomplete or outside its allowed bounds/,
    );
    assert.equal(initial.state_version, 0);
    assert.equal(initial.active_task, null);
    assert.deepEqual(initial.tasks, {});
  }
});

test("rejects unsafe integer Issue identities before reserving a worker lease", () => {
  const initial = createInitialFactoryState(1000);
  assert.throws(
    () => reserveTask(initial, metadata({ issue_number: Number.MAX_SAFE_INTEGER + 1 }), 2000),
    /positive Issue number|reservation metadata is incomplete/,
  );
  assert.equal(initial.state_version, 0);
  assert.equal(initial.active_task, null);
});

test("durable state rejects non-canonical or unsafe Issue-number object keys", () => {
  const makeTask = () => ({
    status: "queued", attempts: 0, failures: 0, candidate_failures: 0,
    quarantined: false, next_attempt_at: null, last_error: null, last_success_at: null,
  });
  for (const issueKey of ["042", "9007199254740992"]) {
    const state = createInitialFactoryState(1000);
    state.tasks[issueKey] = makeTask();
    assert.throws(() => validateFactoryState(state), /Task state record is invalid/);
  }
});

test("rejects normalized impossible dates, timezone-less values and out-of-range offsets", () => {
  const validOffset = createInitialFactoryState(1000);
  validOffset.updated_at = "2026-11-20T00:00:00+14:00";
  assert.equal(validateFactoryState(validOffset), true);

  for (const updated_at of [
    "2026-02-30T00:00:00.000Z",
    "2026-13-01T00:00:00.000Z",
    "2026-11-20T24:00:00.000Z",
    "2026-11-20T00:00:00",
    "2026-11-20T00:00:00+00:60",
    "2026-11-20T00:00:00+14:01",
    "2026-11-20T00:00:00-15:00",
  ]) {
    const invalid = createInitialFactoryState(1000);
    invalid.updated_at = updated_at;
    assert.throws(() => validateFactoryState(invalid), /update timestamp/);
  }
});


test("legacy retry deadlines prefer task failure timestamps and use a bounded durable state fallback", () => {
  const state = createInitialFactoryState(1000);
  state.updated_at = new Date(1000).toISOString();
  state.tasks["81"] = {
    status: "retry_wait", attempts: 1, failures: 1, candidate_failures: 0,
    quarantined: false, next_attempt_at: null,
    last_error: { code: "LEGACY_FAILURE", summary: "task timestamp exists", at: new Date(2000).toISOString() },
    last_success_at: null,
  };
  state.tasks["94"] = {
    status: "retry_wait", attempts: 2, failures: 2, candidate_failures: 0,
    quarantined: false, next_attempt_at: null, last_error: null, last_success_at: null,
  };
  state.tasks["95"] = {
    status: "quarantined", attempts: 3, failures: 3, candidate_failures: 0,
    quarantined: true, next_attempt_at: null, last_error: null, last_success_at: null,
  };

  const normalized = normalizeLegacyRetryTimestamps(state, state.updated_at, 5000);
  assert.equal(normalized.tasks["81"].next_attempt_at, new Date(62_000).toISOString());
  assert.equal(normalized.tasks["94"].next_attempt_at, new Date(121_000).toISOString());
  assert.equal(normalized.tasks["95"].next_attempt_at, null);
  assert.equal(normalized.tasks["95"].status, "quarantined");
  assert.equal(normalized.tasks["95"].quarantined, true);
  assert.equal(normalized.state_version, state.state_version + 1);

  const replay = normalizeLegacyRetryTimestamps(normalized, normalized.updated_at, 9000);
  assert.equal(replay, normalized);
  assert.equal(replay.state_version, normalized.state_version);
});

test("legacy retry normalization preserves explicit retry deadlines and caps exponential fallback", () => {
  const state = createInitialFactoryState(1000);
  state.tasks["81"] = {
    status: "retry_wait", attempts: 8, failures: 8, candidate_failures: 0,
    quarantined: false, next_attempt_at: new Date(777_000).toISOString(), last_error: null, last_success_at: null,
  };
  state.tasks["94"] = {
    status: "retry_wait", attempts: 9, failures: 9, candidate_failures: 0,
    quarantined: false, next_attempt_at: null, last_error: null, last_success_at: null,
  };

  const normalized = normalizeLegacyRetryTimestamps(state, state.updated_at, 5000);
  assert.equal(normalized.tasks["81"].next_attempt_at, new Date(777_000).toISOString());
  assert.equal(normalized.tasks["94"].next_attempt_at, new Date(1_801_000).toISOString());
  assert.equal(getTaskRetryAt(normalized.tasks["94"]), 1_801_000);
});
