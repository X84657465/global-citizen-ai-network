import test from "node:test";
import assert from "node:assert/strict";
import {
  createInitialFactoryState,
  recordTaskFailure,
  recordCandidateStarted,
  recordCandidateFailure,
  requeueTask,
  reserveTask,
  transitionTask,
} from "../lib/agent-factory-state-machine.mjs";
import { createAgentFactoryController } from "../lib/agent-factory-controller.mjs";

function fakeStore(initialState, options = {}) {
  let state = initialState;
  let writes = 0;
  return {
    async migrate() { return { issue: { number: 100 }, state, migrated: false }; },
    async read() { return { issue: { number: 100 }, state }; },
    getStateIssueNumber() { return 100; },
    async write(expectedVersion, nextState) {
      writes += 1;
      if (options.failWriteAt === writes) throw new Error("injected state write failure");
      if (state.state_version !== expectedVersion) throw new Error("state version conflict");
      if (nextState.state_version !== expectedVersion + 1) throw new Error("invalid next state version");
      state = nextState;
      return { state };
    },
    get state() { return state; },
  };
}

const leaseEnv = {
  AGENT_FACTORY_MODE: "reserve",
  ISSUE_NUMBER: "42",
  GITHUB_RUN_ID: "123456",
  GITHUB_RUN_ATTEMPT: "1",
  GITHUB_SHA: "a".repeat(40),
  RUNNER_NAME: "DESKTOP-S2S4BM9",
};

async function startCandidate(controller, ciRunId) {
  return controller.run({
    AGENT_FACTORY_MODE: "candidate-start",
    ISSUE_NUMBER: "42",
    PULL_REQUEST_NUMBER: "88",
    HEAD_SHA: "b".repeat(40),
    HEAD_REF: "ai-task/issue-42-abcdef123456",
    CI_RUN_ID: ciRunId,
    CI_RUN_ATTEMPT: "1",
  });
}

function awaitingCandidate(now = 1000) {
  const leaseId = "lease-candidate-42";
  let state = reserveTask(createInitialFactoryState(now), {
    issue_number: 42,
    lease_id: leaseId,
    lease_owner: "runner",
    workflow_run_id: "123456",
    run_attempt: 1,
    base_sha: "a".repeat(40),
  }, now);
  for (const [next, at] of [
    ["preparing", now + 100],
    ["planning", now + 200],
    ["patching", now + 300],
    ["sandbox_testing", now + 400],
    ["publishing", now + 500],
    ["draft_pr_created", now + 600],
  ]) {
    state = transitionTask(state, 42, leaseId, next,
      next === "draft_pr_created" ? { head_sha: "b".repeat(40), pull_request_number: 88 } : {}, at);
  }
  state = transitionTask(state, 42, leaseId, "awaiting_ci", {}, now + 700);
  return state;
}

test("reserve mode rejects a missing workflow attempt before persisting a lease", async () => {
  const store = fakeStore(createInitialFactoryState(1000));
  const controller = createAgentFactoryController({ store, repository: "owner/repo", now: () => 2000 });

  await assert.rejects(controller.run({
    AGENT_FACTORY_MODE: "reserve",
    ISSUE_NUMBER: "42",
    GITHUB_RUN_ID: "123456",
    GITHUB_SHA: "a".repeat(40),
  }), /Workflow run attempt must be a positive integer/);

  assert.equal(store.state.state_version, 0);
  assert.equal(store.state.active_task, null);
});

test("reserve mode creates one durable lease and safely handles duplicate invocation", async () => {
  const store = fakeStore(createInitialFactoryState(1000));
  const controller = createAgentFactoryController({ store, repository: "owner/repo", now: () => 2000 });
  const first = await controller.run(leaseEnv);
  const second = await controller.run(leaseEnv);
  assert.equal(first.state.active_task.lease_id, "gcan-123456-1-42");
  assert.equal(second.state.state_version, first.state.state_version);
  assert.equal(store.state.active_task.issue_number, 42);
});

test("concurrent workers cannot reserve different tasks under one repository lease", async () => {
  const store = fakeStore(createInitialFactoryState(1000));
  const first = createAgentFactoryController({ store, repository: "owner/repo", now: () => 2000 });
  const second = createAgentFactoryController({ store, repository: "owner/repo", now: () => 2000 });
  const reserve = (issueNumber, runId) => ({
    AGENT_FACTORY_MODE: "reserve",
    ISSUE_NUMBER: String(issueNumber),
    GITHUB_RUN_ID: runId,
    GITHUB_RUN_ATTEMPT: "1",
    GITHUB_SHA: "a".repeat(40),
    RUNNER_NAME: "integration-runner",
  });

  const results = await Promise.allSettled([
    first.run(reserve(42, "123456")),
    second.run(reserve(43, "123457")),
  ]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.filter((result) => result.status === "rejected").length, 1);
  assert.ok([42, 43].includes(store.state.active_task.issue_number));
  assert.equal(Object.values(store.state.tasks).filter((task) => task.status === "reserved").length, 1);
});

test("transition mode is idempotent for a repeated exact lease transition", async () => {
  const store = fakeStore(createInitialFactoryState(1000));
  const controller = createAgentFactoryController({ store, repository: "owner/repo", now: () => 2000 });
  await controller.run(leaseEnv);
  const env = {
    AGENT_FACTORY_MODE: "transition",
    ISSUE_NUMBER: "42",
    AGENT_FACTORY_LEASE_ID: "gcan-123456-1-42",
    NEXT_TASK_STATE: "preparing",
  };
  const first = await controller.run(env);
  const second = await controller.run(env);
  assert.equal(first.state.tasks["42"].status, "preparing");
  assert.equal(second.state.state_version, first.state.state_version);
});

test("failure event identity rejects a missing workflow run attempt", async () => {
  const store = fakeStore(createInitialFactoryState(1000));
  const controller = createAgentFactoryController({ store, repository: "owner/repo", now: () => 2000 });

  await assert.rejects(controller.run({
    AGENT_FACTORY_MODE: "failure",
    GITHUB_RUN_ID: "missing-attempt-run",
    FAILURE_STAGE: "build",
  }), /Workflow run attempt must be a positive integer/);

  assert.equal(store.state.state_version, 0);
});

test("task-scoped failure requires and releases the exact active lease", async () => {
  const store = fakeStore(createInitialFactoryState(1000));
  const controller = createAgentFactoryController({ store, repository: "owner/repo", now: () => 2000 });
  await controller.run(leaseEnv);
  const result = await controller.run({
    AGENT_FACTORY_MODE: "failure",
    AGENT_FACTORY_FAILURE_SCOPE: "task",
    FAILED_ISSUE_NUMBER: "42",
    AGENT_FACTORY_LEASE_ID: "gcan-123456-1-42",
    GITHUB_RUN_ID: "123456",
    GITHUB_RUN_ATTEMPT: "1",
    AGENT_FACTORY_ERROR_CODE: "PATCH_INVALID",
    FAILURE_SUMMARY: "invalid patch",
  });
  assert.equal(result.outputs.failure_scope, "task");
  assert.equal(result.state.active_task, null);
  assert.equal(result.state.tasks["42"].failures, 1);
  assert.equal(result.state.tasks["42"].status, "retry_wait");
});

test("candidate failure callback persists rejection and delays retry without counting infrastructure failure", async () => {
  const store = fakeStore(awaitingCandidate());
  const controller = createAgentFactoryController({ store, repository: "owner/repo", now: () => 3000 });
  await startCandidate(controller, "555001");
  const env = {
    AGENT_FACTORY_MODE: "candidate",
    ISSUE_NUMBER: "42",
    PULL_REQUEST_NUMBER: "88",
    HEAD_SHA: "b".repeat(40),
    HEAD_REF: "ai-task/issue-42-abcdef123456",
    CI_CONCLUSION: "failure",
    CI_RUN_ID: "555001",
    CI_RUN_ATTEMPT: "1",
    FAILURE_SUMMARY: "lint failed",
  };
  const result = await controller.run(env);
  const duplicate = await controller.run(env);
  assert.equal(result.state.tasks["42"].status, "candidate_rejected");
  assert.equal(duplicate.outputs.duplicate, true);
  assert.equal(duplicate.state.state_version, result.state.state_version);
  assert.equal(result.state.tasks["42"].candidate_status, "failure");
  assert.deepEqual(JSON.parse(result.outputs.candidate_evidence_json), {
    repository: "owner/repo", branch: "ai-task/issue-42-abcdef123456", commit_sha: "b".repeat(40),
    command: "Agent Factory candidate CI evidence v1.0.0; Issue #42; PR #88; run #555001; attempt 1",
    result: "fail", run_url: "https://github.com/owner/repo/actions/runs/555001",
    timestamp: new Date(3000).toISOString(),
  });
  assert.equal(duplicate.outputs.candidate_evidence_json, "");
  assert.equal(result.state.tasks["42"].next_attempt_at, new Date(63_000).toISOString());
  assert.equal(result.state.tasks["42"].candidate_failures, 1);
  assert.equal(result.state.tasks["42"].failures, 0);
  assert.equal(result.state.system.consecutive_failures, 0);
});

test("candidate success completes only its task and preserves the global breaker and unrelated quarantine", async () => {
  const initial = awaitingCandidate();
  initial.system = {
    consecutive_failures: 2,
    cooldown_until: new Date(120_000).toISOString(),
    last_error_code: "RUNNER_UNAVAILABLE",
    last_error: "Shared Runner is still unavailable.",
    last_success_at: new Date(500).toISOString(),
  };
  initial.tasks["99"] = {
    status: "quarantined",
    attempts: 3,
    failures: 3,
    candidate_failures: 0,
    quarantined: true,
    next_attempt_at: null,
    last_error: { code: "TASK_FAILURE", summary: "Independent task repeatedly failed.", at: new Date(1000).toISOString() },
  };
  const expectedSystem = structuredClone(initial.system);
  const expectedQuarantine = structuredClone(initial.tasks["99"]);
  const store = fakeStore(initial);
  const controller = createAgentFactoryController({ store, repository: "owner/repo", now: () => 3000 });
  await startCandidate(controller, "555002");
  const env = {
    AGENT_FACTORY_MODE: "candidate",
    ISSUE_NUMBER: "42",
    PULL_REQUEST_NUMBER: "88",
    HEAD_SHA: "b".repeat(40),
    HEAD_REF: "ai-task/issue-42-abcdef123456",
    CI_CONCLUSION: "success",
    CI_RUN_ID: "555002",
    CI_RUN_ATTEMPT: "1",
  };
  const result = await controller.run(env);
  const duplicate = await controller.run(env);
  assert.equal(result.state.tasks["42"].status, "completed");
  assert.equal(JSON.parse(result.outputs.candidate_evidence_json).result, "pass");
  assert.equal(JSON.parse(result.outputs.candidate_evidence_json).commit_sha, "b".repeat(40));
  assert.deepEqual(result.state.system, expectedSystem);
  assert.deepEqual(result.state.tasks["99"], expectedQuarantine);
  assert.equal(duplicate.outputs.duplicate, true);
  assert.equal(duplicate.state.state_version, result.state.state_version);
  assert.deepEqual(duplicate.state.system, expectedSystem);
});
test("check mode requeues retry-wait tasks only after their backoff expires", async () => {
  let state = reserveTask(createInitialFactoryState(1000), {
    issue_number: 42, lease_id: "lease-retry", lease_owner: "runner",
    workflow_run_id: "123456", run_attempt: 1, base_sha: "a".repeat(40),
  }, 1000);
  state = recordTaskFailure(state, 42, "lease-retry", "workflow-run-123456-attempt-1-failure", "PATCH_INVALID", "bad patch", 2000).state;
  const readyAt = Date.parse(state.tasks["42"].next_attempt_at) + 1;
  const store = fakeStore(state);
  const controller = createAgentFactoryController({ store, repository: "owner/repo", now: () => readyAt });
  const result = await controller.run({ AGENT_FACTORY_MODE: "check" });
  assert.equal(result.outputs.requeued_tasks, 1);
  assert.equal(result.state.tasks["42"].status, "queued");
});

test("check mode waits for candidate CI retry backoff before requeueing", async () => {
  const evidence = {
    pull_request_number: 88,
    head_sha: "b".repeat(40),
    head_ref: "ai-task/issue-42-abcdef123456",
    ci_run_id: "candidate-backoff-1",
    ci_run_attempt: 1,
  };
  let state = awaitingCandidate();
  state = recordCandidateStarted(state, 42, "candidate-start-backoff-1", evidence, 2000).state;
  state = recordCandidateFailure(
    state,
    42,
    "candidate-failure-backoff-1",
    { ...evidence, ci_conclusion: "failure" },
    "candidate checks failed",
    3000,
  ).state;
  assert.equal(state.tasks["42"].status, "candidate_rejected");
  assert.equal(state.tasks["42"].next_attempt_at, new Date(63_000).toISOString());

  let now = 3000;
  const store = fakeStore(state);
  const controller = createAgentFactoryController({ store, repository: "owner/repo", now: () => now });
  const early = await controller.run({ AGENT_FACTORY_MODE: "check" });
  assert.equal(early.outputs.requeued_tasks, 0);
  assert.equal(early.state.tasks["42"].status, "candidate_rejected");

  now = 63_000;
  const ready = await controller.run({ AGENT_FACTORY_MODE: "check" });
  assert.equal(ready.outputs.requeued_tasks, 1);
  assert.equal(ready.state.tasks["42"].status, "queued");
});

test("check mode safely requeues legacy candidate rejections after a fallback delay", async () => {
  const evidence = {
    pull_request_number: 88,
    head_sha: "b".repeat(40),
    head_ref: "ai-task/issue-42-abcdef123456",
    ci_run_id: "legacy-candidate",
    ci_run_attempt: 1,
  };
  let state = awaitingCandidate();
  state = recordCandidateStarted(state, 42, "candidate-start-legacy", evidence, 2000).state;
  state = recordCandidateFailure(
    state,
    42,
    "candidate-failure-legacy",
    { ...evidence, ci_conclusion: "failure" },
    "candidate checks failed",
    3000,
  ).state;
  delete state.tasks["42"].next_attempt_at;

  let now = 62_999;
  const store = fakeStore(state);
  const controller = createAgentFactoryController({ store, repository: "owner/repo", now: () => now });
  const early = await controller.run({ AGENT_FACTORY_MODE: "check" });
  assert.equal(early.outputs.requeued_tasks, 0);
  assert.equal(early.state.tasks["42"].status, "candidate_rejected");

  now = 63_000;
  const ready = await controller.run({ AGENT_FACTORY_MODE: "check" });
  assert.equal(ready.outputs.requeued_tasks, 1);
  assert.equal(ready.state.tasks["42"].status, "queued");
});

test("check mode recovers an expired lease only after the workflow is confirmed completed", async () => {
  const state = reserveTask(createInitialFactoryState(1000), {
    issue_number: 42, lease_id: "lease-expired", lease_owner: "runner",
    workflow_run_id: "123456", run_attempt: 1, base_sha: "a".repeat(40), lease_ms: 60_000,
  }, 1000);
  const store = fakeStore(state);
  const controller = createAgentFactoryController({
    store, repository: "owner/repo", now: () => 62_000,
    api: { request: async () => ({ id: 123456, status: "completed", conclusion: "failure", run_attempt: 1 }) },
  });
  const result = await controller.run({ AGENT_FACTORY_MODE: "check" });
  assert.equal(result.outputs.lease_recovered, true);
  assert.equal(result.state.active_task, null);
  assert.equal(result.state.system.consecutive_failures, 1);
});

test("check mode never recovers a lease while its workflow is still running", async () => {
  const state = reserveTask(createInitialFactoryState(1000), {
    issue_number: 42, lease_id: "lease-running", lease_owner: "runner",
    workflow_run_id: "123456", run_attempt: 1, base_sha: "a".repeat(40), lease_ms: 60_000,
  }, 1000);
  const store = fakeStore(state);
  const controller = createAgentFactoryController({
    store, repository: "owner/repo", now: () => 62_000,
    api: { request: async () => ({ id: 123456, status: "in_progress", run_attempt: 1 }) },
  });
  const result = await controller.run({ AGENT_FACTORY_MODE: "check" });
  assert.equal(result.outputs.lease_recovered, false);
  assert.equal(result.state.active_task.lease_id, "lease-running");
});

test("check mode fails closed when the workflow status API is unavailable", async () => {
  const state = reserveTask(createInitialFactoryState(1000), {
    issue_number: 42, lease_id: "lease-api-down", lease_owner: "runner",
    workflow_run_id: "123456", run_attempt: 1, base_sha: "a".repeat(40), lease_ms: 60_000,
  }, 1000);
  const store = fakeStore(state);
  const requestedPaths = [];
  const controller = createAgentFactoryController({
    store, repository: "owner/repo", now: () => 62_000,
    api: { request: async (path) => { requestedPaths.push(path); throw new Error("GitHub Actions API unavailable"); } },
  });

  const result = await controller.run({ AGENT_FACTORY_MODE: "check" });

  assert.deepEqual(requestedPaths, ["/repos/owner/repo/actions/runs/123456"]);
  assert.equal(result.outputs.lease_recovered, false);
  assert.match(result.outputs.recovery_error, /API unavailable/);
  assert.equal(result.state.active_task.lease_id, "lease-api-down");
  assert.equal(store.state.state_version, state.state_version);
});

test("check mode retries lease recovery after the durable state write fails", async () => {
  const state = reserveTask(createInitialFactoryState(1000), {
    issue_number: 42, lease_id: "lease-recovery-write-failure", lease_owner: "runner",
    workflow_run_id: "123456", run_attempt: 1, base_sha: "a".repeat(40), lease_ms: 60_000,
  }, 1000);
  const store = fakeStore(state, { failWriteAt: 1 });
  const controller = createAgentFactoryController({
    store, repository: "owner/repo", now: () => 62_000,
    api: { request: async () => ({ id: 123456, status: "completed", conclusion: "failure", run_attempt: 1 }) },
  });

  await assert.rejects(controller.run({ AGENT_FACTORY_MODE: "check" }), /injected state write failure/);
  assert.equal(store.state.active_task.lease_id, "lease-recovery-write-failure");
  assert.equal(store.state.state_version, state.state_version);

  const recovered = await controller.run({ AGENT_FACTORY_MODE: "check" });
  assert.equal(recovered.outputs.lease_recovered, true);
  assert.equal(recovered.state.active_task, null);
  assert.equal(recovered.state.tasks["42"].status, "queued");
  assert.equal(recovered.state.system.consecutive_failures, 1);

  const duplicate = await controller.run({ AGENT_FACTORY_MODE: "check" });
  assert.equal(duplicate.outputs.lease_recovered, false);
  assert.equal(duplicate.state.state_version, recovered.state.state_version);
});

test("check mode does not recover an expired lease for an unknown workflow status", async () => {
  const state = reserveTask(createInitialFactoryState(1000), {
    issue_number: 42, lease_id: "lease-unknown-status", lease_owner: "runner",
    workflow_run_id: "123456", run_attempt: 1, base_sha: "a".repeat(40), lease_ms: 60_000,
  }, 1000);
  const store = fakeStore(state);
  const controller = createAgentFactoryController({
    store, repository: "owner/repo", now: () => 62_000,
    api: { request: async () => ({ id: 123456, status: "unknown", run_attempt: 1 }) },
  });

  const result = await controller.run({ AGENT_FACTORY_MODE: "check" });

  assert.equal(result.outputs.lease_recovered, false);
  assert.equal(result.state.active_task.lease_id, "lease-unknown-status");
  assert.equal(store.state.state_version, state.state_version);
});


test("check mode recovers an expired lease after a later workflow attempt is confirmed completed", async () => {
  const state = reserveTask(createInitialFactoryState(1000), {
    issue_number: 42, lease_id: "lease-attempt-1", lease_owner: "runner",
    workflow_run_id: "123456", run_attempt: 1, base_sha: "a".repeat(40), lease_ms: 60_000,
  }, 1000);
  const store = fakeStore(state);
  const controller = createAgentFactoryController({
    store, repository: "owner/repo", now: () => 62_000,
    api: { request: async () => ({ id: 123456, status: "completed", conclusion: "failure", run_attempt: 2 }) },
  });

  const result = await controller.run({ AGENT_FACTORY_MODE: "check" });

  assert.equal(result.outputs.lease_recovered, true);
  assert.equal(result.state.active_task, null);
  assert.equal(result.state.tasks["42"].status, "queued");
  assert.equal(result.state.system.consecutive_failures, 1);
  assert.equal(store.state.state_version, state.state_version + 1);
});

test("check mode waits for a later workflow attempt to finish before recovering its old lease", async () => {
  const state = reserveTask(createInitialFactoryState(1000), {
    issue_number: 42, lease_id: "lease-attempt-running", lease_owner: "runner",
    workflow_run_id: "123456", run_attempt: 1, base_sha: "a".repeat(40), lease_ms: 60_000,
  }, 1000);
  const store = fakeStore(state);
  const controller = createAgentFactoryController({
    store, repository: "owner/repo", now: () => 62_000,
    api: { request: async () => ({ id: 123456, status: "in_progress", run_attempt: 2 }) },
  });

  const result = await controller.run({ AGENT_FACTORY_MODE: "check" });

  assert.equal(result.outputs.lease_recovered, false);
  assert.equal(result.state.active_task.lease_id, "lease-attempt-running");
  assert.equal(store.state.state_version, state.state_version);
});

test("check mode fails closed when GitHub reports an attempt older than the active lease", async () => {
  const state = reserveTask(createInitialFactoryState(1000), {
    issue_number: 42, lease_id: "lease-attempt-2", lease_owner: "runner",
    workflow_run_id: "123456", run_attempt: 2, base_sha: "a".repeat(40), lease_ms: 60_000,
  }, 1000);
  const store = fakeStore(state);
  const controller = createAgentFactoryController({
    store, repository: "owner/repo", now: () => 62_000,
    api: { request: async () => ({ id: 123456, status: "completed", conclusion: "failure", run_attempt: 1 }) },
  });

  const result = await controller.run({ AGENT_FACTORY_MODE: "check" });

  assert.equal(result.outputs.lease_recovered, false);
  assert.match(result.outputs.recovery_error, /predates the active lease/);
  assert.equal(result.state.active_task.lease_id, "lease-attempt-2");
  assert.equal(store.state.state_version, state.state_version);
});


test("check mode fails closed when GitHub omits the workflow run attempt", async () => {
  const state = reserveTask(createInitialFactoryState(1000), {
    issue_number: 42, lease_id: "lease-attempt-missing", lease_owner: "runner",
    workflow_run_id: "123456", run_attempt: 1, base_sha: "a".repeat(40), lease_ms: 60_000,
  }, 1000);
  const store = fakeStore(state);
  const controller = createAgentFactoryController({
    store, repository: "owner/repo", now: () => 62_000,
    api: { request: async () => ({ id: 123456, status: "completed", conclusion: "failure" }) },
  });

  const result = await controller.run({ AGENT_FACTORY_MODE: "check" });

  assert.equal(result.outputs.lease_recovered, false);
  assert.match(result.outputs.recovery_error, /attempt is missing or invalid/);
  assert.equal(result.state.active_task.lease_id, "lease-attempt-missing");
  assert.equal(store.state.state_version, state.state_version);
});

test("transition mode remains idempotent after awaiting_ci has released the worker lease", async () => {
  const store = fakeStore(awaitingCandidate());
  const controller = createAgentFactoryController({ store, repository: "owner/repo", now: () => 3000 });
  const result = await controller.run({
    AGENT_FACTORY_MODE: "transition",
    ISSUE_NUMBER: "42",
    AGENT_FACTORY_LEASE_ID: "lease-candidate-42",
    NEXT_TASK_STATE: "awaiting_ci",
  });
  assert.equal(result.state.active_task, null);
  assert.equal(result.state.tasks["42"].status, "awaiting_ci");
  assert.equal(result.state.state_version, store.state.state_version);
});



test("candidate failure callback recovers after a transient durable-state write failure", async () => {
  const store = fakeStore(awaitingCandidate(), { failWriteAt: 2 });
  const controller = createAgentFactoryController({ store, repository: "owner/repo", now: () => 3000 });
  await startCandidate(controller, "555004");
  const env = {
    AGENT_FACTORY_MODE: "candidate",
    ISSUE_NUMBER: "42",
    PULL_REQUEST_NUMBER: "88",
    HEAD_SHA: "b".repeat(40),
    HEAD_REF: "ai-task/issue-42-abcdef123456",
    CI_CONCLUSION: "failure",
    CI_RUN_ID: "555004",
    CI_RUN_ATTEMPT: "1",
    FAILURE_SUMMARY: "lint failed",
  };
  await assert.rejects(controller.run(env), /injected state write failure/);
  assert.equal(store.state.tasks["42"].status, "awaiting_ci");

  const recovered = await controller.run(env);
  assert.equal(recovered.outputs.duplicate, false);
  assert.equal(recovered.state.tasks["42"].status, "candidate_rejected");
  assert.equal(recovered.state.tasks["42"].candidate_status, "failure");
  assert.ok(Date.parse(recovered.state.tasks["42"].next_attempt_at) > 3000);
  const duplicate = await controller.run(env);
  assert.equal(duplicate.outputs.duplicate, true);
  assert.equal(duplicate.state.state_version, recovered.state.state_version);
});


test("candidate-start binds one PR head SHA and exact CI run attempt idempotently", async () => {
  const store = fakeStore(awaitingCandidate());
  const controller = createAgentFactoryController({ store, repository: "owner/repo", now: () => 3000 });
  const env = {
    AGENT_FACTORY_MODE: "candidate-start",
    ISSUE_NUMBER: "42",
    PULL_REQUEST_NUMBER: "88",
    HEAD_SHA: "c".repeat(40),
    HEAD_REF: "ai-task/issue-42-fedcba654321",
    CI_RUN_ID: "555005",
    CI_RUN_ATTEMPT: "2",
  };
  const first = await controller.run(env);
  const duplicate = await controller.run(env);
  assert.equal(first.state.tasks["42"].status, "awaiting_ci");
  assert.equal(first.state.tasks["42"].head_sha, "c".repeat(40));
  assert.equal(first.state.tasks["42"].ci_run_id, "555005");
  assert.equal(first.state.tasks["42"].ci_run_attempt, 2);
  assert.equal(duplicate.outputs.duplicate, true);
  assert.equal(duplicate.state.state_version, first.state.state_version);
});

test("candidate outcome from a stale CI run attempt is rejected", async () => {
  const store = fakeStore(awaitingCandidate());
  const controller = createAgentFactoryController({ store, repository: "owner/repo", now: () => 3000 });
  await startCandidate(controller, "555006");
  await assert.rejects(controller.run({
    AGENT_FACTORY_MODE: "candidate",
    ISSUE_NUMBER: "42",
    PULL_REQUEST_NUMBER: "88",
    HEAD_SHA: "b".repeat(40),
    HEAD_REF: "ai-task/issue-42-abcdef123456",
    CI_CONCLUSION: "failure",
    CI_RUN_ID: "555007",
    CI_RUN_ATTEMPT: "1",
  }), /exact candidate SHA, PR, CI run ID/);
});


test("V2 plan mode creates roadmap tasks through the durable V2 controller", async () => {
  const store = fakeStore(createInitialFactoryState(1000));
  const requests = [];
  const api = {
    async request(path, options = {}) {
      requests.push({ path, options });
      if (path.includes("/issues?state=all")) return [];
      if (path.includes("/pulls?state=all")) return [];
      if (path.endsWith("/issues") && options.method === "POST") return { number: 901 };
      throw new Error("Unexpected GitHub API request: " + path);
    },
  };
  const controller = createAgentFactoryController({ store, api, repository: "owner/repo", now: () => 2000 });
  const result = await controller.run({ AGENT_FACTORY_MODE: "plan" });
  assert.equal(result.outputs.planner_status, "created");
  assert.equal(result.outputs.created_issue_number, 901);
  assert.equal(store.state.state_version, 0);
  assert.equal(requests.filter((request) => request.options.method === "POST").length, 1);
});

test("V2 plan mode waits while an eligible AI Task Issue is open", async () => {
  const store = fakeStore(createInitialFactoryState(1000));
  const api = {
    async request(path) {
      if (path.includes("/issues?state=all")) {
        return [{ number: 42, title: "[AI Task] Existing task", state: "open", created_at: "2026-01-01T00:00:00Z" }];
      }
      if (path.includes("/pulls?state=all")) return [];
      throw new Error("Unexpected GitHub API request: " + path);
    },
  };
  const controller = createAgentFactoryController({ store, api, repository: "owner/repo", now: () => 2000 });
  const result = await controller.run({ AGENT_FACTORY_MODE: "plan" });
  assert.equal(result.outputs.planner_status, "blocked_by_existing_tasks");
  assert.equal(result.outputs.pending_tasks, 1);
});

test("V2 plan mode waits while an AI Task PR is open", async () => {
  const store = fakeStore(createInitialFactoryState(1000));
  const api = {
    async request(path) {
      if (path.includes("/issues?state=all")) return [];
      if (path.includes("/pulls?state=all")) return [{ number: 88, state: "open", body: "<!-- ai-task:42 -->" }];
      throw new Error("Unexpected GitHub API request: " + path);
    },
  };
  const controller = createAgentFactoryController({ store, api, repository: "owner/repo", now: () => 2000 });
  const result = await controller.run({ AGENT_FACTORY_MODE: "plan" });
  assert.equal(result.outputs.planner_status, "blocked_by_existing_tasks");
  assert.equal(result.outputs.active_task_pr, true);
});


test("check mode excludes quarantined tasks from the pending planner count", async () => {
  let state = awaitingCandidate();
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const attemptNow = attempt * 100_000;
    const evidence = {
      pull_request_number: 88,
      head_sha: "b".repeat(40),
      head_ref: "ai-task/issue-42-abcdef123456",
      ci_run_id: "quarantine-" + attempt,
      ci_run_attempt: 1,
    };
    state = recordCandidateStarted(state, 42, "candidate-start-" + attempt, evidence, attemptNow + 100).state;
    state = recordCandidateFailure(
      state,
      42,
      "candidate-failure-" + attempt,
      { ...evidence, ci_conclusion: "failure" },
      "candidate test failed",
      attemptNow + 200,
    ).state;
    if (attempt < 3) state = requeueTask(
      state,
      42,
      attemptNow + 200 + (60_000 * (2 ** (attempt - 1))),
    );
  }
  assert.equal(state.tasks["42"].quarantined, true);
  const store = fakeStore(state);
  const controller = createAgentFactoryController({ store, repository: "owner/repo", now: () => 10000 });
  const result = await controller.run({ AGENT_FACTORY_MODE: "check" });
  assert.equal(result.outputs.quarantined_tasks, 1);
  assert.equal(result.outputs.pending_tasks, 0);
});


test("check mode fails closed when the workflow API returns a different run ID", async () => {
  const state = reserveTask(createInitialFactoryState(1000), {
    issue_number: 42, lease_id: "lease-wrong-run-id", lease_owner: "runner",
    workflow_run_id: "123456", run_attempt: 1, base_sha: "a".repeat(40), lease_ms: 60_000,
  }, 1000);
  const store = fakeStore(state);
  const controller = createAgentFactoryController({
    store, repository: "owner/repo", now: () => 62_000,
    api: { request: async () => ({ id: 654321, status: "completed", conclusion: "failure", run_attempt: 1 }) },
  });

  const result = await controller.run({ AGENT_FACTORY_MODE: "check" });

  assert.equal(result.outputs.lease_recovered, false);
  assert.match(result.outputs.recovery_error, /run ID does not match/);
  assert.equal(result.state.active_task.lease_id, "lease-wrong-run-id");
  assert.equal(store.state.state_version, state.state_version);
});


test("check mode keeps an expired lease while a newer rerun attempt is active, then recovers after it completes", async () => {
  const state = reserveTask(createInitialFactoryState(1000), {
    issue_number: 42, lease_id: "lease-rerun-attempt", lease_owner: "runner",
    workflow_run_id: "123456", run_attempt: 1, base_sha: "a".repeat(40), lease_ms: 60_000,
  }, 1000);
  const store = fakeStore(state);
  let workflow = { id: 123456, status: "in_progress", conclusion: null, run_attempt: 2 };
  const controller = createAgentFactoryController({
    store, repository: "owner/repo", now: () => 62_000,
    api: { request: async () => workflow },
  });

  const running = await controller.run({ AGENT_FACTORY_MODE: "check" });
  assert.equal(running.outputs.lease_recovered, false);
  assert.equal(running.state.active_task.lease_id, "lease-rerun-attempt");
  assert.equal(store.state.state_version, state.state_version);

  workflow = { id: 123456, status: "completed", conclusion: "success", run_attempt: 2 };
  const completed = await controller.run({ AGENT_FACTORY_MODE: "check" });
  assert.equal(completed.outputs.lease_recovered, true);
  assert.equal(completed.state.active_task, null);
  assert.equal(completed.state.tasks["42"].status, "queued");
});

test("check mode rejects a workflow response from an older run attempt", async () => {
  const state = reserveTask(createInitialFactoryState(1000), {
    issue_number: 42, lease_id: "lease-old-attempt", lease_owner: "runner",
    workflow_run_id: "123456", run_attempt: 2, base_sha: "a".repeat(40), lease_ms: 60_000,
  }, 1000);
  const store = fakeStore(state);
  const controller = createAgentFactoryController({
    store, repository: "owner/repo", now: () => 62_000,
    api: { request: async () => ({ id: 123456, status: "completed", conclusion: "success", run_attempt: 1 }) },
  });

  const result = await controller.run({ AGENT_FACTORY_MODE: "check" });

  assert.equal(result.outputs.lease_recovered, false);
  assert.match(result.outputs.recovery_error, /predates the active lease/);
  assert.equal(result.state.active_task.lease_id, "lease-old-attempt");
  assert.equal(store.state.state_version, state.state_version);
});

test("check mode fails closed when a completed workflow has a missing or unsupported conclusion", async () => {
  for (const conclusion of [null, "unknown", "success-ish"]) {
    const state = reserveTask(createInitialFactoryState(1000), {
      issue_number: 42, lease_id: "lease-invalid-conclusion-" + String(conclusion),
      lease_owner: "runner", workflow_run_id: "123456", run_attempt: 1,
      base_sha: "a".repeat(40), lease_ms: 60_000,
    }, 1000);
    const store = fakeStore(state);
    const controller = createAgentFactoryController({
      store, repository: "owner/repo", now: () => 62_000,
      api: { request: async () => ({ id: 123456, status: "completed", conclusion, run_attempt: 1 }) },
    });
    const result = await controller.run({ AGENT_FACTORY_MODE: "check" });
    assert.equal(result.outputs.lease_recovered, false);
    assert.match(result.outputs.recovery_error, /conclusion is missing or unsupported/);
    assert.equal(result.state.active_task.lease_id, "lease-invalid-conclusion-" + String(conclusion));
    assert.equal(store.state.state_version, state.state_version);
  }
});


test("check mode requeues migrated retry tasks using one immutable state timestamp", async () => {
  const initial = createInitialFactoryState(100_000);
  const retryTask = (failures) => ({
    status: "retry_wait", attempts: failures, failures, candidate_failures: 0,
    quarantined: false, next_attempt_at: null, last_error: null, last_success_at: null,
  });
  initial.tasks["81"] = retryTask(1);
  initial.tasks["94"] = retryTask(2);
  initial.tasks["95"] = {
    status: "quarantined", attempts: 3, failures: 3, candidate_failures: 0,
    quarantined: true, next_attempt_at: null, last_error: null, last_success_at: null,
  };
  const store = fakeStore(initial);
  const controller = createAgentFactoryController({
    store, repository: "owner/repo", now: () => 400_000,
  });

  const result = await controller.run({ AGENT_FACTORY_MODE: "check" });

  assert.equal(result.outputs.requeued_tasks, 2);
  assert.equal(result.state.tasks["81"].status, "queued");
  assert.equal(result.state.tasks["94"].status, "queued");
  assert.equal(result.state.tasks["95"].status, "quarantined");
  assert.equal(result.state.tasks["95"].quarantined, true);
});

test("check mode does not requeue a migrated task before its fallback backoff expires", async () => {
  const initial = createInitialFactoryState(100_000);
  initial.tasks["94"] = {
    status: "retry_wait", attempts: 2, failures: 2, candidate_failures: 0,
    quarantined: false, next_attempt_at: null, last_error: null, last_success_at: null,
  };
  const store = fakeStore(initial);
  const controller = createAgentFactoryController({
    store, repository: "owner/repo", now: () => 150_000,
  });

  const result = await controller.run({ AGENT_FACTORY_MODE: "check" });

  assert.equal(result.outputs.requeued_tasks, 0);
  assert.equal(result.state.tasks["94"].status, "retry_wait");
  assert.equal(result.state.tasks["94"].next_attempt_at, new Date(220_000).toISOString());
  assert.equal(store.state.state_version, initial.state_version + 1);
});



test("check mode preserves the pre-initialization retry clock when creating the state issue", async () => {
  const initial = createInitialFactoryState(100_000);
  initial.tasks["94"] = {
    status: "retry_wait", attempts: 2, failures: 2, candidate_failures: 0,
    quarantined: false, next_attempt_at: null, last_error: null, last_success_at: null,
  };
  let state = initial;
  const store = {
    async migrate() { return { issue: null, state, migrated: false }; },
    async read() { return { issue: null, state }; },
    getStateIssueNumber() { return null; },
    async write(expectedVersion, nextState) {
      assert.equal(state.state_version, expectedVersion);
      assert.equal(nextState.state_version, expectedVersion + 1);
      state = nextState;
      return { state };
    },
  };
  const controller = createAgentFactoryController({
    store, repository: "owner/repo", now: () => 150_000,
  });

  const result = await controller.run({ AGENT_FACTORY_MODE: "check" });

  assert.equal(result.state.tasks["94"].status, "retry_wait");
  assert.equal(result.state.tasks["94"].next_attempt_at, new Date(220_000).toISOString());
  assert.equal(result.state.updated_at, new Date(150_000).toISOString());
});

test("check mode persists legacy retry deadlines before later state writes can shift the fallback clock", async () => {
  const initial = createInitialFactoryState(100_000);
  initial.tasks["94"] = {
    status: "retry_wait", attempts: 2, failures: 2, candidate_failures: 0,
    quarantined: false, next_attempt_at: null, last_error: null, last_success_at: null,
  };
  const store = fakeStore(initial);
  const controller = createAgentFactoryController({
    store, repository: "owner/repo", now: () => 150_000,
  });

  const first = await controller.run({ AGENT_FACTORY_MODE: "check" });
  const deadline = new Date(220_000).toISOString();
  assert.equal(first.state.tasks["94"].status, "retry_wait");
  assert.equal(first.state.tasks["94"].next_attempt_at, deadline);

  const second = await controller.run({ AGENT_FACTORY_MODE: "check" });
  assert.equal(second.state.tasks["94"].next_attempt_at, deadline);
  assert.equal(second.state.state_version, first.state.state_version);
});

test("task publication success is a non-mutating callback and cannot reset the global breaker", async () => {
  const initial = awaitingCandidate();
  initial.system = {
    consecutive_failures: 2,
    cooldown_until: new Date(120_000).toISOString(),
    last_error_code: "RUNNER_UNAVAILABLE",
    last_error: "Shared Runner is still unavailable.",
    last_success_at: new Date(500).toISOString(),
  };
  initial.tasks["99"] = {
    status: "quarantined",
    attempts: 3,
    failures: 3,
    candidate_failures: 0,
    quarantined: true,
    next_attempt_at: null,
    last_error: { code: "TASK_FAILURE", summary: "Independent task repeatedly failed.", at: new Date(1000).toISOString() },
  };
  const expectedSystem = structuredClone(initial.system);
  const expectedTasks = structuredClone(initial.tasks);
  const store = fakeStore(initial);
  const controller = createAgentFactoryController({ store, repository: "owner/repo", now: () => 3000 });

  const first = await controller.run({ AGENT_FACTORY_MODE: "success" });
  const replay = await controller.run({ AGENT_FACTORY_MODE: "success" });

  assert.equal(first.outputs.task_publication_success, true);
  assert.equal(first.outputs.breaker_reset, false);
  assert.equal(first.outputs.ignored, true);
  assert.equal(first.state.state_version, initial.state_version);
  assert.equal(replay.state.state_version, initial.state_version);
  assert.deepEqual(first.state.system, expectedSystem);
  assert.deepEqual(replay.state.system, expectedSystem);
  assert.deepEqual(first.state.tasks, expectedTasks);
  assert.deepEqual(replay.state.tasks, expectedTasks);
});

test("system-health success requires verified exact-head CI evidence and resets only global breaker fields", async () => {
  const initial = awaitingCandidate();
  initial.system = {
    consecutive_failures: 2,
    cooldown_until: new Date(120_000).toISOString(),
    last_error_code: "RUNNER_UNAVAILABLE",
    last_error: "Shared Runner is still unavailable.",
    last_success_at: new Date(500).toISOString(),
  };
  initial.tasks["99"] = {
    status: "quarantined",
    attempts: 3,
    failures: 3,
    candidate_failures: 0,
    quarantined: true,
    next_attempt_at: null,
    last_error: { code: "TASK_FAILURE", summary: "Independent task repeatedly failed.", at: new Date(1000).toISOString() },
  };
  const expectedTasks = structuredClone(initial.tasks);
  const sha = "d".repeat(40);
  const requests = [];
  const store = fakeStore(initial);
  const controller = createAgentFactoryController({
    store,
    repository: "owner/repo",
    now: () => 3000,
    api: {
      async request(path) {
        requests.push(path);
        return {
          id: 555009,
          run_attempt: 2,
          head_sha: sha,
          status: "completed",
          conclusion: "success",
          path: ".github/workflows/ci.yml",
          event: "pull_request",
          pull_requests: [{
            number: 168,
            base: { ref: "main", repo: { full_name: "owner/repo" } },
            head: { sha, repo: { full_name: "owner/repo" } },
          }],
        };
      },
    },
  });
  const env = {
    AGENT_FACTORY_MODE: "system-health-success",
    SYSTEM_HEALTH_RUN_ID: "555009",
    SYSTEM_HEALTH_RUN_ATTEMPT: "2",
    SYSTEM_HEALTH_PULL_REQUEST_NUMBER: "168",
    SYSTEM_HEALTH_HEAD_SHA: sha,
  };

  const first = await controller.run(env);
  const replay = await controller.run(env);

  assert.equal(first.outputs.breaker_reset, true);
  assert.equal(first.outputs.duplicate, false);
  assert.equal(first.outputs.cooldown_active, false);
  assert.equal(first.state.system.consecutive_failures, 0);
  assert.equal(first.state.system.cooldown_until, null);
  assert.equal(first.state.system.last_error_code, null);
  assert.equal(first.state.system.last_error, null);
  assert.equal(first.state.system.last_success_at, new Date(3000).toISOString());
  assert.deepEqual(first.state.tasks, expectedTasks);
  assert.equal(replay.outputs.duplicate, true);
  assert.equal(replay.outputs.breaker_reset, false);
  assert.equal(replay.state.state_version, first.state.state_version);
  assert.deepEqual(replay.state.tasks, expectedTasks);
  assert.deepEqual(requests, [
    "/repos/owner/repo/actions/runs/555009",
    "/repos/owner/repo/actions/runs/555009",
  ]);
});

test("system-health success fails closed for missing or mismatched health evidence", async () => {
  const initial = awaitingCandidate();
  initial.system.consecutive_failures = 2;
  initial.system.cooldown_until = new Date(120_000).toISOString();
  const store = fakeStore(initial);
  const controller = createAgentFactoryController({
    store,
    repository: "owner/repo",
    now: () => 3000,
    api: {
      async request() {
        return {
          id: 555010,
          run_attempt: 1,
          head_sha: "e".repeat(40),
          status: "completed",
          conclusion: "success",
          path: ".github/workflows/ci.yml",
          event: "pull_request",
          pull_requests: [{
            number: 168,
            base: { ref: "main", repo: { full_name: "owner/repo" } },
            head: { sha: "e".repeat(40), repo: { full_name: "owner/repo" } },
          }],
        };
      },
    },
  });

  await assert.rejects(
    controller.run({ AGENT_FACTORY_MODE: "system-health-success" }),
    /System health workflow run ID must be a positive integer/,
  );
  await assert.rejects(
    controller.run({
      AGENT_FACTORY_MODE: "system-health-success",
      SYSTEM_HEALTH_RUN_ID: "555010",
      SYSTEM_HEALTH_RUN_ATTEMPT: "1",
      SYSTEM_HEALTH_PULL_REQUEST_NUMBER: "168",
      SYSTEM_HEALTH_HEAD_SHA: "f".repeat(40),
    }),
    /exact-head CI pull_request run/,
  );
  await assert.rejects(
    controller.run({
      AGENT_FACTORY_MODE: "system-health-success",
      SYSTEM_HEALTH_RUN_ID: "555010",
      SYSTEM_HEALTH_RUN_ATTEMPT: "1",
      SYSTEM_HEALTH_PULL_REQUEST_NUMBER: "999",
      SYSTEM_HEALTH_HEAD_SHA: "e".repeat(40),
    }),
    /same-repository PR targeting main/,
  );

  assert.equal(store.state.state_version, initial.state_version);
  assert.equal(store.state.system.consecutive_failures, 2);
  assert.equal(store.state.system.cooldown_until, new Date(120_000).toISOString());
});

