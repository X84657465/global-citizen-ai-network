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
    HEAD_REF: "ai-task/issue-42-test",
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

test("reserve mode creates one durable lease and safely handles duplicate invocation", async () => {
  const store = fakeStore(createInitialFactoryState(1000));
  const controller = createAgentFactoryController({ store, repository: "owner/repo", now: () => 2000 });
  const first = await controller.run(leaseEnv);
  const second = await controller.run(leaseEnv);
  assert.equal(first.state.active_task.lease_id, "gcan-123456-1-42");
  assert.equal(second.state.state_version, first.state.state_version);
  assert.equal(store.state.active_task.issue_number, 42);
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
  assert.equal(result.state.tasks["42"].next_attempt_at, new Date(63_000).toISOString());
  assert.equal(result.state.tasks["42"].candidate_failures, 1);
  assert.equal(result.state.tasks["42"].failures, 0);
  assert.equal(result.state.system.consecutive_failures, 0);
});

test("candidate success completes the exact PR and resets the system breaker", async () => {
  const initial = awaitingCandidate();
  initial.system.consecutive_failures = 2;
  const store = fakeStore(initial);
  const controller = createAgentFactoryController({ store, repository: "owner/repo", now: () => 3000 });
  await startCandidate(controller, "555002");
  const env = {
    AGENT_FACTORY_MODE: "candidate",
    ISSUE_NUMBER: "42",
    PULL_REQUEST_NUMBER: "88",
    HEAD_SHA: "b".repeat(40),
    CI_CONCLUSION: "success",
    CI_RUN_ID: "555002",
    CI_RUN_ATTEMPT: "1",
  };
  const result = await controller.run(env);
  const duplicate = await controller.run(env);
  assert.equal(result.state.tasks["42"].status, "completed");
  assert.equal(result.state.system.consecutive_failures, 0);
  assert.equal(duplicate.outputs.duplicate, true);
  assert.equal(duplicate.state.state_version, result.state.state_version);
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
    head_ref: "ai-task/issue-42-test",
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

test("check mode recovers an expired lease only after the workflow is confirmed completed", async () => {
  const state = reserveTask(createInitialFactoryState(1000), {
    issue_number: 42, lease_id: "lease-expired", lease_owner: "runner",
    workflow_run_id: "123456", run_attempt: 1, base_sha: "a".repeat(40), lease_ms: 60_000,
  }, 1000);
  const store = fakeStore(state);
  const controller = createAgentFactoryController({
    store, repository: "owner/repo", now: () => 62_000,
    api: { request: async () => ({ status: "completed", conclusion: "failure" }) },
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
    api: { request: async () => ({ status: "in_progress" }) },
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

test("check mode does not recover an expired lease for an unknown workflow status", async () => {
  const state = reserveTask(createInitialFactoryState(1000), {
    issue_number: 42, lease_id: "lease-unknown-status", lease_owner: "runner",
    workflow_run_id: "123456", run_attempt: 1, base_sha: "a".repeat(40), lease_ms: 60_000,
  }, 1000);
  const store = fakeStore(state);
  const controller = createAgentFactoryController({
    store, repository: "owner/repo", now: () => 62_000,
    api: { request: async () => ({ status: "unknown" }) },
  });

  const result = await controller.run({ AGENT_FACTORY_MODE: "check" });

  assert.equal(result.outputs.lease_recovered, false);
  assert.equal(result.state.active_task.lease_id, "lease-unknown-status");
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


test("candidate success callback recovers when the system-breaker write fails after task completion", async () => {
  const initial = awaitingCandidate();
  initial.system.consecutive_failures = 2;
  const store = fakeStore(initial, { failWriteAt: 3 });
  const controller = createAgentFactoryController({ store, repository: "owner/repo", now: () => 3000 });
  await startCandidate(controller, "555003");
  const env = {
    AGENT_FACTORY_MODE: "candidate",
    ISSUE_NUMBER: "42",
    PULL_REQUEST_NUMBER: "88",
    HEAD_SHA: "b".repeat(40),
    CI_CONCLUSION: "success",
    CI_RUN_ID: "555003",
    CI_RUN_ATTEMPT: "1",
  };
  await assert.rejects(controller.run(env), /injected state write failure/);
  assert.equal(store.state.tasks["42"].status, "completed");
  assert.equal(store.state.system.consecutive_failures, 2);

  const recovered = await controller.run(env);
  assert.equal(recovered.outputs.duplicate, false);
  assert.equal(recovered.state.system.consecutive_failures, 0);
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
    HEAD_REF: "ai-task/issue-42-updated",
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
      head_ref: "ai-task/issue-42-test",
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
