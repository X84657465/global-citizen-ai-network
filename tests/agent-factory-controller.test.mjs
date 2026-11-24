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
  const history = [];
  return {
    async migrate() { return { issue: { number: 100 }, state, migrated: false }; },
    async read() {
      if (options.failReadAfterWrite && writes > 0) throw new Error("injected durable read-back failure");
      const observedState = options.readOverrideAfterWrite && writes > 0
        ? options.readOverrideAfterWrite
        : state;
      return { issue: { number: 100 }, state: observedState };
    },
    getStateIssueNumber() { return 100; },
    async write(expectedVersion, nextState) {
      writes += 1;
      if (options.failWriteAt === writes) throw new Error("injected state write failure");
      if (state.state_version !== expectedVersion) throw new Error("state version conflict");
      if (nextState.state_version !== expectedVersion + 1) throw new Error("invalid next state version");
      history.push({
        expectedVersion,
        state_version: nextState.state_version,
        issue_number: nextState.active_task?.issue_number ?? null,
        lease_id: nextState.active_task?.lease_id ?? null,
        task_state: nextState.active_task?.state ?? null,
      });
      state = nextState;
      if (options.writeThenThrowAt === writes) throw new Error("injected ambiguous state write failure");
      return { state };
    },
    get state() { return state; },
    get writes() { return writes; },
    get history() { return history; },
  };
}

test("rejects malformed and dot-segment repository names before controller use", () => {
  const store = fakeStore(createInitialFactoryState(1000));
  for (const repository of ["owner/..", "./repo", ".owner/repo", "owner/.repo", "..owner/repo", "owner./repo", "owner/repo.", "owner/repo..archive", "owner/repo/extra", "/repo", "owner/", "owner\\repo", "owner/%2e%2e", "owner/%2Fadmin", "owner/repo?query", "owner/repo#fragment", "owner/" + "r".repeat(101), "o".repeat(40) + "/repo", "owner.with.dot/repo", "_owner/repo"]) {
    assert.throws(
      () => createAgentFactoryController({ store, repository }),
      /A valid repository name is required/,
      repository,
    );
  }
  assert.doesNotThrow(() => createAgentFactoryController({ store, repository: "owner/repo" }));
  assert.doesNotThrow(() => createAgentFactoryController({ store, repository: "owner/repo.v2" }));
});

const leaseEnv = {
  AGENT_FACTORY_MODE: "reserve",
  ISSUE_NUMBER: "42",
  GITHUB_RUN_ID: "123456",
  GITHUB_RUN_ATTEMPT: "1",
  GITHUB_SHA: "a".repeat(40),
  RUNNER_NAME: "DESKTOP-S2S4BM9",
};

async function advanceActiveTaskTo(controller, targetState) {
  const leaseId = "gcan-123456-1-42";
  await controller.run(leaseEnv);
  for (const nextState of ["preparing", "planning", "patching", "sandbox_testing"]) {
    await controller.run({
      AGENT_FACTORY_MODE: "transition",
      ISSUE_NUMBER: "42",
      AGENT_FACTORY_LEASE_ID: leaseId,
      NEXT_TASK_STATE: nextState,
    });
    if (nextState === targetState) return leaseId;
  }
  throw new Error("Unsupported target state for test setup: " + targetState);
}

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

function currentCandidatePullApi({ headSha = "b".repeat(40), headShaAfterFirstRequest, headRef = "ai-task/issue-42-abcdef123456", state = "open" } = {}) {
  let requests = 0;
  return {
    async request(path) {
      assert.equal(path, "/repos/owner/repo/pulls/88");
      requests += 1;
      return {
        number: 88,
        state,
        body: "<!-- ai-task:42 -->",
        user: { login: "owner" },
        base: { ref: "main", repo: { full_name: "owner/repo" } },
        head: {
          ref: headRef,
          sha: requests > 1 && headShaAfterFirstRequest ? headShaAfterFirstRequest : headSha,
          repo: { full_name: "owner/repo" },
        },
      };
    },
  };
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

function quarantinedTaskState(now = 1000) {
  const state = createInitialFactoryState(now);
  state.tasks["42"] = {
    status: "quarantined",
    attempts: 4,
    failures: 3,
    candidate_failures: 3,
    quarantined: true,
    next_attempt_at: null,
    last_error: { code: "TASK_FAILURE", summary: "Repeated candidate failure", at: new Date(now - 100).toISOString() },
    last_success_at: null,
    candidate_status: "failure",
    candidate_error: "Candidate checks failed",
    candidate_failed_at: new Date(now - 100).toISOString(),
    head_sha: "b".repeat(40),
    pull_request_number: 88,
    ci_run_id: "ci-run-123456",
    ci_run_attempt: 1,
    candidate_failure_history: [{
      head_sha: "b".repeat(40),
      pull_request_number: 88,
      ci_run_id: "ci-run-123456",
      ci_run_attempt: 1,
      summary: "Candidate checks failed",
      failed_at: new Date(now - 100).toISOString(),
    }],
  };
  return state;
}

function operatorRecoveryEnv(overrides = {}) {
  return {
    AGENT_FACTORY_MODE: "operator-recovery",
    GITHUB_EVENT_NAME: "workflow_dispatch",
    GITHUB_REF: "refs/heads/main",
    GITHUB_REPOSITORY: "owner/repo",
    GITHUB_ACTOR: "owner",
    FACTORY_OPERATOR_RECOVERY_ENV_GUARD: "configured-secret-marker",
    ISSUE_NUMBER: "42",
    EXPECTED_STATE_VERSION: "0",
    EXPECTED_TASK_STATUS: "quarantined",
    RECOVERY_REASON: "Reviewed remediation fixes the repeated candidate failure.",
    EVIDENCE_REFERENCE: "https://github.com/owner/repo/commit/" + "d".repeat(40),
    OPERATOR_RECOVERY_CONFIRMATION: "RECOVER_QUARANTINED_TASK",
    ...overrides,
  };
}


const SYSTEM_HEALTH_JOB_NAMES = [
  "Resolve exact candidate PR metadata",
  "Windows Runner quality gates — tests, types, lint, audit and production build",
  "Windows Ollama and local execution integration",
  "Windows Supabase migrations, PostgreSQL and RLS integration",
];

function systemHealthJobs(runId, runAttempt, headSha, overrides = {}) {
  return {
    total_count: SYSTEM_HEALTH_JOB_NAMES.length,
    jobs: SYSTEM_HEALTH_JOB_NAMES.map((name, index) => ({
      id: index + 1,
      name,
      run_id: runId,
      run_attempt: runAttempt,
      head_sha: headSha,
      status: "completed",
      conclusion: "success",
      ...overrides[name],
    })),
  };
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

test("publishing transition durably records sandbox_testing first under the same lease", async () => {
  const store = fakeStore(createInitialFactoryState(1000));
  const controller = createAgentFactoryController({ store, repository: "owner/repo", now: () => 2000 });
  const leaseId = await advanceActiveTaskTo(controller, "patching");
  const result = await controller.run({
    AGENT_FACTORY_MODE: "transition",
    ISSUE_NUMBER: "42",
    AGENT_FACTORY_LEASE_ID: leaseId,
    NEXT_TASK_STATE: "publishing",
  });

  assert.deepEqual(store.history.slice(-2).map((entry) => entry.task_state), ["sandbox_testing", "publishing"]);
  assert.deepEqual(store.history.slice(-2).map((entry) => entry.issue_number), [42, 42]);
  assert.deepEqual(store.history.slice(-2).map((entry) => entry.lease_id), [leaseId, leaseId]);
  assert.equal(result.state.active_task.state, "publishing");
  assert.equal(result.state.tasks["42"].status, "publishing");

  const writesAfterPublish = store.writes;
  const replay = await controller.run({
    AGENT_FACTORY_MODE: "transition",
    ISSUE_NUMBER: "42",
    AGENT_FACTORY_LEASE_ID: leaseId,
    NEXT_TASK_STATE: "publishing",
  });
  assert.equal(replay.state.state_version, result.state.state_version);
  assert.equal(store.writes, writesAfterPublish);
});

test("publishing transition from sandbox_testing performs only the publishing write", async () => {
  const store = fakeStore(createInitialFactoryState(1000));
  const controller = createAgentFactoryController({ store, repository: "owner/repo", now: () => 2000 });
  const leaseId = await advanceActiveTaskTo(controller, "sandbox_testing");
  const writesBeforePublish = store.writes;

  const result = await controller.run({
    AGENT_FACTORY_MODE: "transition",
    ISSUE_NUMBER: "42",
    AGENT_FACTORY_LEASE_ID: leaseId,
    NEXT_TASK_STATE: "publishing",
  });

  assert.equal(store.writes, writesBeforePublish + 1);
  assert.equal(store.history.at(-1).task_state, "publishing");
  assert.equal(store.history.at(-1).issue_number, 42);
  assert.equal(store.history.at(-1).lease_id, leaseId);
  assert.equal(result.state.active_task.state, "publishing");
});

test("failed publishing persistence resumes from the durable sandbox_testing state", async () => {
  const store = fakeStore(createInitialFactoryState(1000), { failWriteAt: 6 });
  const controller = createAgentFactoryController({ store, repository: "owner/repo", now: () => 2000 });
  const leaseId = await advanceActiveTaskTo(controller, "patching");

  await assert.rejects(controller.run({
    AGENT_FACTORY_MODE: "transition",
    ISSUE_NUMBER: "42",
    AGENT_FACTORY_LEASE_ID: leaseId,
    NEXT_TASK_STATE: "publishing",
  }), /injected state write failure/);

  assert.equal(store.state.active_task.state, "sandbox_testing");
  assert.equal(store.state.active_task.issue_number, 42);
  assert.equal(store.state.active_task.lease_id, leaseId);
  assert.equal(store.state.tasks["42"].status, "sandbox_testing");

  const retried = await controller.run({
    AGENT_FACTORY_MODE: "transition",
    ISSUE_NUMBER: "42",
    AGENT_FACTORY_LEASE_ID: leaseId,
    NEXT_TASK_STATE: "publishing",
  });

  assert.equal(store.history.at(-1).task_state, "publishing");
  assert.equal(store.history.at(-1).issue_number, 42);
  assert.equal(store.history.at(-1).lease_id, leaseId);
  assert.equal(retried.state.active_task.state, "publishing");
  assert.equal(retried.state.tasks["42"].status, "publishing");
});

test("failed sandbox_testing persistence never reports publishing success or loses the lease", async () => {
  const store = fakeStore(createInitialFactoryState(1000), { failWriteAt: 5 });
  const controller = createAgentFactoryController({ store, repository: "owner/repo", now: () => 2000 });
  const leaseId = await advanceActiveTaskTo(controller, "patching");
  const versionBeforePublish = store.state.state_version;

  await assert.rejects(controller.run({
    AGENT_FACTORY_MODE: "transition",
    ISSUE_NUMBER: "42",
    AGENT_FACTORY_LEASE_ID: leaseId,
    NEXT_TASK_STATE: "publishing",
  }), /injected state write failure/);

  assert.equal(store.state.active_task.state, "patching");
  assert.equal(store.state.active_task.issue_number, 42);
  assert.equal(store.state.active_task.lease_id, leaseId);
  assert.equal(store.state.tasks["42"].status, "patching");
  assert.equal(store.state.state_version, versionBeforePublish);
  assert.notEqual(store.state.tasks["42"].status, "publishing");

  const retried = await controller.run({
    AGENT_FACTORY_MODE: "transition",
    ISSUE_NUMBER: "42",
    AGENT_FACTORY_LEASE_ID: leaseId,
    NEXT_TASK_STATE: "publishing",
  });
  assert.deepEqual(store.history.slice(-2).map((entry) => entry.task_state), ["sandbox_testing", "publishing"]);
  assert.deepEqual(store.history.slice(-2).map((entry) => entry.lease_id), [leaseId, leaseId]);
  assert.equal(retried.state.active_task.state, "publishing");
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

test("system failure callback persists a provider cooldown on the first rate-limit event", async () => {
  const store = fakeStore(createInitialFactoryState(1000));
  const controller = createAgentFactoryController({ store, repository: "owner/repo", now: () => 2000 });
  const cooldownUntil = new Date(2_000 + 60 * 60 * 1000).toISOString();
  const env = {
    AGENT_FACTORY_MODE: "failure",
    AGENT_FACTORY_FAILURE_SCOPE: "system",
    GITHUB_RUN_ID: "777001",
    GITHUB_RUN_ATTEMPT: "1",
    FAILURE_STAGE: "build",
    AGENT_FACTORY_ERROR_CODE: "API_RATE_LIMIT",
    FAILURE_SUMMARY: "GitHub requested a retry delay.",
    AGENT_FACTORY_API_COOLDOWN_UNTIL: cooldownUntil,
  };

  const result = await controller.run(env);
  const duplicate = await controller.run(env);

  assert.equal(result.state.system.consecutive_failures, 1);
  assert.equal(result.state.system.cooldown_until, cooldownUntil);
  assert.equal(result.outputs.cooldown_active, true);
  assert.equal(duplicate.outputs.duplicate, true);
  assert.equal(duplicate.state.state_version, result.state.state_version);
  assert.equal(store.writes, 1);
});

test("system failure callback rejects malformed provider cooldown without persisting partial state", async () => {
  const store = fakeStore(createInitialFactoryState(1000));
  const controller = createAgentFactoryController({ store, repository: "owner/repo", now: () => 2000 });

  await assert.rejects(controller.run({
    AGENT_FACTORY_MODE: "failure",
    AGENT_FACTORY_FAILURE_SCOPE: "system",
    GITHUB_RUN_ID: "777002",
    GITHUB_RUN_ATTEMPT: "1",
    FAILURE_STAGE: "build",
    AGENT_FACTORY_ERROR_CODE: "API_RATE_LIMIT",
    AGENT_FACTORY_API_COOLDOWN_UNTIL: "not-a-timestamp",
  }), /valid future timestamp/);

  assert.equal(store.writes, 0);
  assert.equal(store.state.state_version, 0);
  assert.equal(store.state.system.consecutive_failures, 0);
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
  const controller = createAgentFactoryController({ store, repository: "owner/repo", now: () => 3000, api: currentCandidatePullApi() });
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
  const controller = createAgentFactoryController({ store, repository: "owner/repo", now: () => 3000, api: currentCandidatePullApi() });
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
  const controller = createAgentFactoryController({ store, repository: "owner/repo", now: () => 3000, api: currentCandidatePullApi() });
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


test("candidate-start safely ignores a same-SHA rerun during retry backoff", async () => {
  let state = awaitingCandidate();
  const firstEvidence = {
    pull_request_number: 88,
    head_sha: "b".repeat(40),
    head_ref: "ai-task/issue-42-abcdef123456",
    ci_run_id: "555099",
    ci_run_attempt: 1,
  };
  state = recordCandidateStarted(state, 42, "candidate-start-original", firstEvidence, 2000).state;
  state = recordCandidateFailure(
    state, 42, "candidate-failure-original",
    { ...firstEvidence, ci_conclusion: "failure" }, "lint failed", 3000,
  ).state;
  const store = fakeStore(state);
  const controller = createAgentFactoryController({
    store, repository: "owner/repo", now: () => 4000,
    api: currentCandidatePullApi(),
  });
  const result = await controller.run({
    AGENT_FACTORY_MODE: "candidate-start",
    ISSUE_NUMBER: "42",
    PULL_REQUEST_NUMBER: "88",
    HEAD_SHA: "b".repeat(40),
    HEAD_REF: "ai-task/issue-42-abcdef123456",
    CI_RUN_ID: "555099",
    CI_RUN_ATTEMPT: "2",
  });
  assert.equal(result.outputs.ignored, true);
  assert.equal(result.outputs.candidate_status, "retry_backoff");
  assert.equal(result.state, state);
  assert.equal(store.writes, 0);
  assert.equal(store.state.system.consecutive_failures, 0);
  assert.equal(store.state.tasks["42"].status, "candidate_rejected");
  assert.equal(store.state.tasks["42"].ci_run_attempt, 1);
});

test("candidate-start binds one PR head SHA and exact CI run attempt idempotently", async () => {
  const store = fakeStore(awaitingCandidate());
  const controller = createAgentFactoryController({
    store,
    repository: "owner/repo",
    now: () => 3000,
    api: {
      async request(path) {
        assert.equal(path, "/repos/owner/repo/pulls/88");
        return {
          number: 88,
          state: "open",
          body: "<!-- ai-task:42 -->",
          user: { login: "owner" },
          base: { ref: "main", repo: { full_name: "owner/repo" } },
          head: {
            ref: "ai-task/issue-42-fedcba654321",
            sha: "c".repeat(40),
            repo: { full_name: "owner/repo" },
          },
        };
      },
    },
  });
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


test("candidate-start rejects a PR head that moved after metadata resolution without persisting stale evidence", async () => {
  const store = fakeStore(awaitingCandidate());
  const initialStateVersion = store.state.state_version;
  const requests = [];
  const controller = createAgentFactoryController({
    store,
    repository: "owner/repo",
    now: () => 3000,
    api: {
      async request(path) {
        requests.push(path);
        return {
          number: 88,
          state: "open",
          body: "<!-- ai-task:42 -->",
          user: { login: "owner" },
          base: { ref: "main", repo: { full_name: "owner/repo" } },
          head: {
            ref: "ai-task/issue-42-fedcba654321",
            sha: "d".repeat(40),
            repo: { full_name: "owner/repo" },
          },
        };
      },
    },
  });

  await assert.rejects(controller.run({
    AGENT_FACTORY_MODE: "candidate-start",
    ISSUE_NUMBER: "42",
    PULL_REQUEST_NUMBER: "88",
    HEAD_SHA: "c".repeat(40),
    HEAD_REF: "ai-task/issue-42-fedcba654321",
    CI_RUN_ID: "555010",
    CI_RUN_ATTEMPT: "1",
  }), /Candidate start rejected: PR must be the current open same-repository AI Task PR at the exact supplied head SHA and branch/);

  assert.deepEqual(requests, ["/repos/owner/repo/pulls/88"]);
  assert.equal(store.state.state_version, initialStateVersion);
  assert.equal(store.state.tasks["42"].status, "awaiting_ci");
  assert.equal(store.state.tasks["42"].head_sha, "b".repeat(40));
});

test("candidate-start fails closed when GitHub PR verification is unavailable for a persisted candidate", async () => {
  const initial = awaitingCandidate();
  const store = fakeStore(initial);
  const controller = createAgentFactoryController({
    store,
    repository: "owner/repo",
    now: () => 3000,
  });

  await assert.rejects(startCandidate(controller, "555011"),
    /Candidate start requires current GitHub PR verification/);

  assert.equal(store.state.state_version, initial.state_version);
  assert.equal(store.state.tasks["42"].status, "awaiting_ci");
  assert.equal(store.state.tasks["42"].pull_request_number, 88);
  assert.equal(store.state.tasks["42"].head_sha, "b".repeat(40));
});

test("candidate-start fails closed when the current GitHub PR verification request throws", async () => {
  const initial = awaitingCandidate();
  const store = fakeStore(initial);
  const controller = createAgentFactoryController({
    store,
    repository: "owner/repo",
    now: () => 3000,
    api: {
      async request(path) {
        assert.equal(path, "/repos/owner/repo/pulls/88");
        throw new Error("GitHub API temporarily unavailable");
      },
    },
  });

  await assert.rejects(startCandidate(controller, "555012"),
    /GitHub API temporarily unavailable/);

  assert.equal(store.state.state_version, initial.state_version);
  assert.equal(store.state.tasks["42"].status, "awaiting_ci");
  assert.equal(store.state.tasks["42"].pull_request_number, 88);
  assert.equal(store.state.tasks["42"].head_sha, "b".repeat(40));
});

test("candidate success callback rejects a PR head that moved after CI without completing the stale candidate", async () => {
  const initial = awaitingCandidate();
  const store = fakeStore(initial);
  const controller = createAgentFactoryController({
    store,
    repository: "owner/repo",
    now: () => 3000,
    api: currentCandidatePullApi({ headShaAfterFirstRequest: "c".repeat(40) }),
  });
  await startCandidate(controller, "555020");

  await assert.rejects(controller.run({
    AGENT_FACTORY_MODE: "candidate",
    ISSUE_NUMBER: "42",
    PULL_REQUEST_NUMBER: "88",
    HEAD_SHA: "b".repeat(40),
    HEAD_REF: "ai-task/issue-42-abcdef123456",
    CI_CONCLUSION: "success",
    CI_RUN_ID: "555020",
    CI_RUN_ATTEMPT: "1",
  }), /Candidate outcome rejected: PR must remain the current open same-repository AI Task PR/);

  assert.equal(store.state.state_version, initial.state_version + 1);
  assert.equal(store.state.tasks["42"].status, "awaiting_ci");
  assert.equal(store.state.tasks["42"].head_sha, "b".repeat(40));
});

test("candidate failure callback rejects a PR head that moved after CI without penalizing the newer candidate", async () => {
  const initial = awaitingCandidate();
  const store = fakeStore(initial);
  const controller = createAgentFactoryController({
    store,
    repository: "owner/repo",
    now: () => 3000,
    api: currentCandidatePullApi({ headShaAfterFirstRequest: "c".repeat(40) }),
  });
  await startCandidate(controller, "555021");

  await assert.rejects(controller.run({
    AGENT_FACTORY_MODE: "candidate",
    ISSUE_NUMBER: "42",
    PULL_REQUEST_NUMBER: "88",
    HEAD_SHA: "b".repeat(40),
    HEAD_REF: "ai-task/issue-42-abcdef123456",
    CI_CONCLUSION: "failure",
    CI_RUN_ID: "555021",
    CI_RUN_ATTEMPT: "1",
    FAILURE_SUMMARY: "stale CI failure",
  }), /Candidate outcome rejected: PR must remain the current open same-repository AI Task PR/);

  assert.equal(store.state.state_version, initial.state_version + 1);
  assert.equal(store.state.tasks["42"].status, "awaiting_ci");
  assert.equal(store.state.tasks["42"].candidate_failures, 0);
  assert.equal(store.state.tasks["42"].head_sha, "b".repeat(40));
});

test("candidate outcome rejects when the PR head moves after candidate-start", async () => {
  const initial = awaitingCandidate();
  const store = fakeStore(initial);
  const api = currentCandidatePullApi({
    headShaAfterFirstRequest: "c".repeat(40),
  });
  const controller = createAgentFactoryController({
    store,
    repository: "owner/repo",
    now: () => 3000,
    api,
  });
  await startCandidate(controller, "555024");
  const versionAfterStart = store.state.state_version;

  await assert.rejects(controller.run({
    AGENT_FACTORY_MODE: "candidate",
    ISSUE_NUMBER: "42",
    PULL_REQUEST_NUMBER: "88",
    HEAD_SHA: "b".repeat(40),
    HEAD_REF: "ai-task/issue-42-abcdef123456",
    CI_CONCLUSION: "success",
    CI_RUN_ID: "555024",
    CI_RUN_ATTEMPT: "1",
  }), /Candidate outcome rejected: PR must remain the current open same-repository AI Task PR at the exact supplied head SHA and branch/);

  assert.equal(store.state.state_version, versionAfterStart);
  assert.equal(store.state.tasks["42"].status, "awaiting_ci");
  assert.equal(store.state.tasks["42"].head_sha, "b".repeat(40));
  assert.equal(store.state.tasks["42"].candidate_status, "pending");
});

test("candidate outcome fails closed when the GitHub PR verification client is unavailable", async () => {
  const initial = awaitingCandidate();
  const store = fakeStore(initial);
  const startController = createAgentFactoryController({
    store,
    repository: "owner/repo",
    now: () => 3000,
    api: currentCandidatePullApi(),
  });
  await startCandidate(startController, "555023");
  const versionAfterStart = store.state.state_version;
  const outcomeController = createAgentFactoryController({
    store,
    repository: "owner/repo",
    now: () => 3000,
  });

  await assert.rejects(outcomeController.run({
    AGENT_FACTORY_MODE: "candidate",
    ISSUE_NUMBER: "42",
    PULL_REQUEST_NUMBER: "88",
    HEAD_SHA: "b".repeat(40),
    HEAD_REF: "ai-task/issue-42-abcdef123456",
    CI_CONCLUSION: "success",
    CI_RUN_ID: "555023",
    CI_RUN_ATTEMPT: "1",
  }), /Candidate outcome requires current GitHub PR verification/);

  assert.equal(store.state.state_version, versionAfterStart);
  assert.equal(store.state.tasks["42"].status, "awaiting_ci");
  assert.equal(store.state.tasks["42"].head_sha, "b".repeat(40));
  assert.equal(store.state.tasks["42"].candidate_status, "pending");
});

test("candidate outcome fails closed when current PR verification API request throws", async () => {
  const initial = awaitingCandidate();
  const store = fakeStore(initial);
  let requests = 0;
  const controller = createAgentFactoryController({
    store,
    repository: "owner/repo",
    now: () => 3000,
    api: {
      async request(path) {
        assert.equal(path, "/repos/owner/repo/pulls/88");
        requests += 1;
        if (requests === 1) {
          return {
            number: 88,
            state: "open",
            body: "<!-- ai-task:42 -->",
            user: { login: "owner" },
            base: { ref: "main", repo: { full_name: "owner/repo" } },
            head: {
              ref: "ai-task/issue-42-abcdef123456",
              sha: "b".repeat(40),
              repo: { full_name: "owner/repo" },
            },
          };
        }
        throw new Error("GitHub PR verification temporarily unavailable");
      },
    },
  });
  await startCandidate(controller, "555022");
  const versionAfterStart = store.state.state_version;

  await assert.rejects(controller.run({
    AGENT_FACTORY_MODE: "candidate",
    ISSUE_NUMBER: "42",
    PULL_REQUEST_NUMBER: "88",
    HEAD_SHA: "b".repeat(40),
    HEAD_REF: "ai-task/issue-42-abcdef123456",
    CI_CONCLUSION: "success",
    CI_RUN_ID: "555022",
    CI_RUN_ATTEMPT: "1",
  }), /GitHub PR verification temporarily unavailable/);

  assert.equal(requests, 2);
  assert.equal(store.state.state_version, versionAfterStart);
  assert.equal(store.state.tasks["42"].status, "awaiting_ci");
  assert.equal(store.state.tasks["42"].head_sha, "b".repeat(40));
  assert.equal(store.state.tasks["42"].candidate_status, "pending");
});

test("candidate outcome from a stale CI run attempt is rejected", async () => {
  const store = fakeStore(awaitingCandidate());
  const controller = createAgentFactoryController({ store, repository: "owner/repo", now: () => 3000, api: currentCandidatePullApi() });
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
    const attemptNow = attempt * 300_000;
    const headSha = String.fromCharCode("b".charCodeAt(0) + attempt - 1).repeat(40);
    if (attempt > 1) {
      const leaseId = "lease-quarantine-" + attempt;
      state = reserveTask(state, {
        issue_number: 42,
        lease_id: leaseId,
        lease_owner: "runner",
        workflow_run_id: String(123456 + attempt),
        run_attempt: 1,
        base_sha: "a".repeat(40),
      }, attemptNow);
      for (const [next, offset] of [
        ["preparing", 10],
        ["planning", 20],
        ["patching", 30],
        ["sandbox_testing", 40],
        ["publishing", 50],
        ["draft_pr_created", 60],
        ["awaiting_ci", 70],
      ]) {
        state = transitionTask(
          state,
          42,
          leaseId,
          next,
          next === "draft_pr_created" ? { head_sha: headSha, pull_request_number: 88 } : {},
          attemptNow + offset,
        );
      }
    }
    const evidence = {
      pull_request_number: 88,
      head_sha: headSha,
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
  const pullRequestHeadSha = "e".repeat(40);
  const requests = [];
  const store = fakeStore(initial);
  const controller = createAgentFactoryController({
    store,
    repository: "owner/repo",
    now: () => 3000,
    api: {
      async request(path) {
        requests.push(path);
        if (path === "/repos/owner/repo/actions/runs/555009/attempts/2/jobs?per_page=100") {
          return systemHealthJobs(555009, 2, sha);
        }
        if (path === "/repos/owner/repo/actions/runs/555009") {
          return {
            id: 555009,
            run_attempt: 2,
            head_sha: sha,
            status: "completed",
            conclusion: "success",
            updated_at: new Date(2500).toISOString(),
            path: ".github/workflows/ci.yml",
            event: "pull_request",
            head_repository: { id: 42, full_name: "owner/repo" },
            head_branch: "feature/system-health",
            // GitHub's embedded workflow_run.pull_requests payload uses
            // reduced repository objects without full_name.
            pull_requests: [{
              number: 168,
              base: { ref: "main", repo: { id: 42, name: "repo" } },
              head: { ref: "feature/system-health", sha: pullRequestHeadSha, repo: { id: 42, name: "repo" } },
            }],
          };
        }
        if (path === "/repos/owner/repo/pulls/168") {
          return {
            number: 168,
            state: "open",
            base: { ref: "main", repo: { full_name: "owner/repo" } },
            head: { ref: "feature/system-health", sha: pullRequestHeadSha, repo: { full_name: "owner/repo" } },
          };
        }
        throw new Error("Unexpected API request: " + path);
      },
    },
  });
  const env = {
    AGENT_FACTORY_MODE: "system-health-success",
    SYSTEM_HEALTH_RUN_ID: "555009",
    SYSTEM_HEALTH_RUN_ATTEMPT: "2",
    SYSTEM_HEALTH_PULL_REQUEST_NUMBER: "168",
    SYSTEM_HEALTH_HEAD_SHA: sha,
    SYSTEM_HEALTH_PR_HEAD_SHA: pullRequestHeadSha,
  };

  const first = await controller.run(env);
  const replay = await controller.run(env);

  assert.equal(first.outputs.breaker_reset, true);
  assert.equal(first.outputs.duplicate, false);
  assert.equal(first.outputs.health_head_sha, sha);
  assert.equal(first.outputs.health_pr_head_sha, pullRequestHeadSha);
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
    "/repos/owner/repo/actions/runs/555009/attempts/2/jobs?per_page=100",
    "/repos/owner/repo/pulls/168",
    "/repos/owner/repo/actions/runs/555009",
    "/repos/owner/repo/actions/runs/555009/attempts/2/jobs?per_page=100",
    "/repos/owner/repo/pulls/168",
  ]);
});

test("system-health success rejects an overall successful run when required CI jobs were skipped", async () => {
  const initial = awaitingCandidate();
  initial.system.consecutive_failures = 2;
  initial.system.cooldown_until = new Date(120_000).toISOString();
  const sha = "d".repeat(40);
  const store = fakeStore(initial);
  const controller = createAgentFactoryController({
    store,
    repository: "owner/repo",
    now: () => 3000,
    api: {
      async request(path) {
        if (path === "/repos/owner/repo/actions/runs/555030") {
          return {
            id: 555030,
            run_attempt: 1,
            head_sha: sha,
            status: "completed",
            conclusion: "success",
            path: ".github/workflows/ci.yml",
            event: "pull_request",
            head_repository: { full_name: "owner/repo" },
            head_branch: "feature/system-health",
            pull_requests: [{
              number: 170,
              base: { ref: "main", repo: { full_name: "owner/repo" } },
              head: { ref: "feature/system-health", sha, repo: { full_name: "owner/repo" } },
            }],
          };
        }
        if (path === "/repos/owner/repo/actions/runs/555030/attempts/1/jobs?per_page=100") {
          return systemHealthJobs(555030, 1, sha, {
            "Windows Runner quality gates — tests, types, lint, audit and production build": {
              conclusion: "skipped",
            },
            "Windows Ollama and local execution integration": { conclusion: "skipped" },
            "Windows Supabase migrations, PostgreSQL and RLS integration": { conclusion: "skipped" },
          });
        }
        throw new Error("Unexpected API request: " + path);
      },
    },
  });

  await assert.rejects(controller.run({
    AGENT_FACTORY_MODE: "system-health-success",
    SYSTEM_HEALTH_RUN_ID: "555030",
    SYSTEM_HEALTH_RUN_ATTEMPT: "1",
    SYSTEM_HEALTH_PULL_REQUEST_NUMBER: "170",
    SYSTEM_HEALTH_HEAD_SHA: sha,
    SYSTEM_HEALTH_PR_HEAD_SHA: sha,
  }), /every resolver, quality, build, and database job to succeed/);

  assert.equal(store.state.state_version, initial.state_version);
  assert.equal(store.state.system.consecutive_failures, 2);
  assert.equal(store.state.system.cooldown_until, new Date(120_000).toISOString());
});

test("system-health success rejects a required CI job from another attempt or SHA", async () => {
  const initial = awaitingCandidate();
  initial.system.consecutive_failures = 2;
  initial.system.cooldown_until = new Date(120_000).toISOString();
  const sha = "d".repeat(40);
  const store = fakeStore(initial);
  const controller = createAgentFactoryController({
    store,
    repository: "owner/repo",
    now: () => 3000,
    api: {
      async request(path) {
        if (path === "/repos/owner/repo/actions/runs/555031") {
          return {
            id: 555031,
            run_attempt: 2,
            head_sha: sha,
            status: "completed",
            conclusion: "success",
            path: ".github/workflows/ci.yml",
            event: "pull_request",
            head_repository: { full_name: "owner/repo" },
            head_branch: "feature/system-health",
            pull_requests: [{
              number: 171,
              base: { ref: "main", repo: { full_name: "owner/repo" } },
              head: { ref: "feature/system-health", sha, repo: { full_name: "owner/repo" } },
            }],
          };
        }
        if (path === "/repos/owner/repo/actions/runs/555031/attempts/2/jobs?per_page=100") {
          return systemHealthJobs(555031, 2, sha, {
            "Windows Runner quality gates — tests, types, lint, audit and production build": {
              head_sha: "e".repeat(40),
            },
          });
        }
        throw new Error("Unexpected API request: " + path);
      },
    },
  });

  await assert.rejects(controller.run({
    AGENT_FACTORY_MODE: "system-health-success",
    SYSTEM_HEALTH_RUN_ID: "555031",
    SYSTEM_HEALTH_RUN_ATTEMPT: "2",
    SYSTEM_HEALTH_PULL_REQUEST_NUMBER: "171",
    SYSTEM_HEALTH_HEAD_SHA: sha,
    SYSTEM_HEALTH_PR_HEAD_SHA: sha,
  }), /every resolver, quality, build, and database job to succeed/);

  assert.equal(store.state.state_version, initial.state_version);
  assert.equal(store.state.system.consecutive_failures, 2);
  assert.equal(store.state.system.cooldown_until, new Date(120_000).toISOString());
});

test("system-health success rejects a closed PR even when its old CI run was successful", async () => {
  const initial = awaitingCandidate();
  initial.system.consecutive_failures = 2;
  initial.system.cooldown_until = new Date(120_000).toISOString();
  const sha = "d".repeat(40);
  const store = fakeStore(initial);
  const controller = createAgentFactoryController({
    store,
    repository: "owner/repo",
    now: () => 3000,
    api: {
      async request(path) {
        if (path === "/repos/owner/repo/actions/runs/555032") {
          return {
            id: 555032,
            run_attempt: 1,
            head_sha: sha,
            status: "completed",
            conclusion: "success",
            path: ".github/workflows/ci.yml",
            event: "pull_request",
            head_repository: { full_name: "owner/repo" },
            head_branch: "feature/system-health",
            pull_requests: [{
              number: 172,
              base: { ref: "main", repo: { full_name: "owner/repo" } },
              head: { ref: "feature/system-health", sha, repo: { full_name: "owner/repo" } },
            }],
          };
        }
        if (path === "/repos/owner/repo/actions/runs/555032/attempts/1/jobs?per_page=100") {
          return systemHealthJobs(555032, 1, sha);
        }
        if (path === "/repos/owner/repo/pulls/172") {
          return {
            number: 172,
            state: "closed",
            base: { ref: "main", repo: { full_name: "owner/repo" } },
            head: { ref: "feature/system-health", sha, repo: { full_name: "owner/repo" } },
          };
        }
        throw new Error("Unexpected API request: " + path);
      },
    },
  });

  await assert.rejects(controller.run({
    AGENT_FACTORY_MODE: "system-health-success",
    SYSTEM_HEALTH_RUN_ID: "555032",
    SYSTEM_HEALTH_RUN_ATTEMPT: "1",
    SYSTEM_HEALTH_PULL_REQUEST_NUMBER: "172",
    SYSTEM_HEALTH_HEAD_SHA: sha,
    SYSTEM_HEALTH_PR_HEAD_SHA: sha,
  }), /current open same-repository non-task PR head and branch no longer match/);

  assert.equal(store.state.state_version, initial.state_version);
  assert.equal(store.state.system.consecutive_failures, 2);
  assert.equal(store.state.system.cooldown_until, new Date(120_000).toISOString());
});

test("system-health success rejects a successful CI run when the PR has advanced to a newer head", async () => {
  const initial = awaitingCandidate();
  initial.system.consecutive_failures = 2;
  initial.system.cooldown_until = new Date(120_000).toISOString();
  const testedSha = "d".repeat(40);
  const testedPullRequestHeadSha = "e".repeat(40);
  const currentSha = "f".repeat(40);
  const store = fakeStore(initial);
  const controller = createAgentFactoryController({
    store,
    repository: "owner/repo",
    now: () => 3000,
    api: {
      async request(path) {
        if (path === "/repos/owner/repo/actions/runs/555011/attempts/1/jobs?per_page=100") {
          return systemHealthJobs(555011, 1, testedSha);
        }
        if (path === "/repos/owner/repo/actions/runs/555011") {
          return {
            id: 555011,
            run_attempt: 1,
            head_sha: testedSha,
            status: "completed",
            conclusion: "success",
            path: ".github/workflows/ci.yml",
            event: "pull_request",
            head_repository: { full_name: "owner/repo" },
            head_branch: "feature/system-health",
            pull_requests: [{
              number: 169,
              base: { ref: "main", repo: { full_name: "owner/repo" } },
              head: { ref: "feature/system-health", sha: testedPullRequestHeadSha, repo: { full_name: "owner/repo" } },
            }],
          };
        }
        if (path === "/repos/owner/repo/pulls/169") {
          return {
            number: 169,
            state: "open",
            base: { ref: "main", repo: { full_name: "owner/repo" } },
            head: { ref: "feature/system-health", sha: currentSha, repo: { full_name: "owner/repo" } },
          };
        }
        throw new Error("Unexpected API request: " + path);
      },
    },
  });

  await assert.rejects(controller.run({
    AGENT_FACTORY_MODE: "system-health-success",
    SYSTEM_HEALTH_RUN_ID: "555011",
    SYSTEM_HEALTH_RUN_ATTEMPT: "1",
    SYSTEM_HEALTH_PULL_REQUEST_NUMBER: "169",
    SYSTEM_HEALTH_HEAD_SHA: testedSha,
    SYSTEM_HEALTH_PR_HEAD_SHA: testedPullRequestHeadSha,
  }), /current open same-repository non-task PR head and branch no longer match/);

  assert.equal(store.state.state_version, initial.state_version);
  assert.equal(store.state.system.consecutive_failures, 2);
  assert.equal(store.state.system.cooldown_until, new Date(120_000).toISOString());
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
          head_repository: { full_name: "owner/repo" },
          head_branch: "feature/system-health",
          pull_requests: [{
            number: 168,
            base: { ref: "main", repo: { full_name: "owner/repo" } },
            head: { ref: "feature/system-health", sha: "e".repeat(40), repo: { full_name: "owner/repo" } },
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
      SYSTEM_HEALTH_HEAD_SHA: "e".repeat(40),
    }),
    /System health pull-request head SHA is required/,
  );
  await assert.rejects(
    controller.run({
      AGENT_FACTORY_MODE: "system-health-success",
      SYSTEM_HEALTH_RUN_ID: "555010",
      SYSTEM_HEALTH_RUN_ATTEMPT: "1",
      SYSTEM_HEALTH_PULL_REQUEST_NUMBER: "168",
      SYSTEM_HEALTH_HEAD_SHA: "f".repeat(40),
      SYSTEM_HEALTH_PR_HEAD_SHA: "f".repeat(40),
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
      SYSTEM_HEALTH_PR_HEAD_SHA: "e".repeat(40),
    }),
    /same-repository PR targeting main/,
  );

  assert.equal(store.state.state_version, initial.state_version);
  assert.equal(store.state.system.consecutive_failures, 2);
  assert.equal(store.state.system.cooldown_until, new Date(120_000).toISOString());
});

test("system-health success rejects task candidates and ambiguous or mismatched PR associations", async () => {
  const sha = "d".repeat(40);
  const validBranch = "feature/system-health";
  const basePullRequest = {
    number: 180,
    base: { ref: "main", repo: { full_name: "owner/repo" } },
    head: { ref: validBranch, sha, repo: { full_name: "owner/repo" } },
  };
  const scenarios = [
    {
      name: "task candidate branch",
      workflow: {
        head_branch: "ai-task/issue-42-abcdef123456",
        pull_requests: [{
          ...basePullRequest,
          head: { ...basePullRequest.head, ref: "ai-task/issue-42-abcdef123456" },
        }],
      },
    },
    {
      name: "Codex task candidate branch",
      workflow: {
        head_branch: "codex/issue-42-abcdef123456",
        pull_requests: [{
          ...basePullRequest,
          head: { ...basePullRequest.head, ref: "codex/issue-42-abcdef123456" },
        }],
      },
    },
    { name: "missing PR association", workflow: { head_branch: validBranch, pull_requests: [] } },
    {
      name: "ambiguous PR associations",
      workflow: {
        head_branch: validBranch,
        pull_requests: [basePullRequest, { ...basePullRequest, number: 181 }],
      },
    },
    {
      name: "workflow and PR branch mismatch",
      workflow: {
        head_branch: validBranch,
        pull_requests: [{
          ...basePullRequest,
          head: { ...basePullRequest.head, ref: "feature/other-branch" },
        }],
      },
    },
    {
      name: "fork PR association",
      workflow: {
        head_branch: validBranch,
        head_repository: { full_name: "contributor/repo" },
        pull_requests: [{
          ...basePullRequest,
          head: { ...basePullRequest.head, repo: { full_name: "contributor/repo" } },
        }],
      },
    },
    {
      name: "wrong base branch",
      workflow: {
        head_branch: validBranch,
        pull_requests: [{
          ...basePullRequest,
          base: { ...basePullRequest.base, ref: "release" },
        }],
      },
    },
    {
      name: "wrong base repository",
      workflow: {
        head_branch: validBranch,
        pull_requests: [{
          ...basePullRequest,
          base: { ref: "main", repo: { full_name: "other/repo" } },
        }],
      },
    },
  ];

  for (const scenario of scenarios) {
    const initial = awaitingCandidate();
    initial.system.consecutive_failures = 2;
    initial.system.cooldown_until = new Date(120_000).toISOString();
    const store = fakeStore(initial);
    const controller = createAgentFactoryController({
      store,
      repository: "owner/repo",
      now: () => 3000,
      api: {
        async request(path) {
          assert.equal(path, "/repos/owner/repo/actions/runs/555040", scenario.name);
          return {
            id: 555040,
            run_attempt: 1,
            head_sha: sha,
            head_branch: scenario.workflow.head_branch,
            head_repository: scenario.workflow.head_repository ?? { full_name: "owner/repo" },
            status: "completed",
            conclusion: "success",
            path: ".github/workflows/ci.yml",
            event: "pull_request",
            pull_requests: scenario.workflow.pull_requests,
          };
        },
      },
    });

    await assert.rejects(controller.run({
      AGENT_FACTORY_MODE: "system-health-success",
      SYSTEM_HEALTH_RUN_ID: "555040",
      SYSTEM_HEALTH_RUN_ATTEMPT: "1",
      SYSTEM_HEALTH_PULL_REQUEST_NUMBER: "180",
      SYSTEM_HEALTH_HEAD_SHA: sha,
      SYSTEM_HEALTH_PR_HEAD_SHA: sha,
    }), /exactly one non-task same-repository PR targeting main/);

    assert.equal(store.state.state_version, initial.state_version, scenario.name);
    assert.equal(store.state.system.consecutive_failures, 2, scenario.name);
    assert.equal(store.state.system.cooldown_until, new Date(120_000).toISOString(), scenario.name);
  }
});

test("system-health success rejects a PR whose current branch ref no longer matches the completed CI run", async () => {
  const initial = awaitingCandidate();
  initial.system.consecutive_failures = 2;
  initial.system.cooldown_until = new Date(120_000).toISOString();
  const sha = "d".repeat(40);
  const store = fakeStore(initial);
  const controller = createAgentFactoryController({
    store,
    repository: "owner/repo",
    now: () => 3000,
    api: {
      async request(path) {
        if (path === "/repos/owner/repo/actions/runs/555041") {
          return {
            id: 555041,
            run_attempt: 1,
            head_sha: sha,
            head_branch: "feature/system-health",
            head_repository: { full_name: "owner/repo" },
            status: "completed",
            conclusion: "success",
            path: ".github/workflows/ci.yml",
            event: "pull_request",
            pull_requests: [{
              number: 180,
              base: { ref: "main", repo: { full_name: "owner/repo" } },
              head: { ref: "feature/system-health", sha, repo: { full_name: "owner/repo" } },
            }],
          };
        }
        if (path === "/repos/owner/repo/actions/runs/555041/attempts/1/jobs?per_page=100") {
          return systemHealthJobs(555041, 1, sha);
        }
        if (path === "/repos/owner/repo/pulls/180") {
          return {
            number: 180,
            state: "open",
            base: { ref: "main", repo: { full_name: "owner/repo" } },
            head: { ref: "feature/renamed", sha, repo: { full_name: "owner/repo" } },
          };
        }
        throw new Error("Unexpected API request: " + path);
      },
    },
  });

  await assert.rejects(controller.run({
    AGENT_FACTORY_MODE: "system-health-success",
    SYSTEM_HEALTH_RUN_ID: "555041",
    SYSTEM_HEALTH_RUN_ATTEMPT: "1",
    SYSTEM_HEALTH_PULL_REQUEST_NUMBER: "180",
    SYSTEM_HEALTH_HEAD_SHA: sha,
    SYSTEM_HEALTH_PR_HEAD_SHA: sha,
  }), /current open same-repository non-task PR head and branch no longer match/);

  assert.equal(store.state.state_version, initial.state_version);
  assert.equal(store.state.system.consecutive_failures, 2);
  assert.equal(store.state.system.cooldown_until, new Date(120_000).toISOString());
});

test("operator recovery requires owner, main, workflow_dispatch, protected secret, and explicit confirmation", async () => {
  const invalid = [
    { GITHUB_EVENT_NAME: "issues" },
    { GITHUB_REF: "refs/heads/feature" },
    { GITHUB_ACTOR: "contributor" },
    { FACTORY_OPERATOR_RECOVERY_ENV_GUARD: "" },
    // A legacy repository/org-scoped secret must never satisfy the Environment-only guard.
    { FACTORY_OPERATOR_RECOVERY_ENV_GUARD: "", FACTORY_OPERATOR_RECOVERY_GUARD: "legacy-repository-secret" },
    { OPERATOR_RECOVERY_CONFIRMATION: "yes" },
  ];
  for (const overrides of invalid) {
    const store = fakeStore(quarantinedTaskState());
    const controller = createAgentFactoryController({ store, repository: "owner/repo", now: () => 2000 });
    await assert.rejects(controller.run(operatorRecoveryEnv(overrides)), /restricted|must execute|secret is required|confirmation/);
    assert.equal(store.state.state_version, 0);
    assert.equal(store.writes, 0);
  }
});

test("operator recovery changes only the named quarantined task and preserves the global breaker", async () => {
  const initial = quarantinedTaskState();
  initial.system.consecutive_failures = 2;
  initial.system.cooldown_until = new Date(90_000).toISOString();
  initial.system.last_error_code = "RUNNER_FAILURE";
  initial.system.last_error = "Unrelated infrastructure failure";
  const beforeSystem = structuredClone(initial.system);
  const beforeTask = structuredClone(initial.tasks["42"]);
  const store = fakeStore(initial);
  const controller = createAgentFactoryController({ store, repository: "owner/repo", now: () => 2000 });

  const result = await controller.run(operatorRecoveryEnv());
  assert.equal(result.outputs.recovered, true);
  assert.equal(result.outputs.duplicate, false);
  assert.equal(result.outputs.task_state, "retry_wait");
  assert.equal(result.outputs.retry_at, new Date(62_000).toISOString());
  assert.equal(result.state.tasks["42"].attempts, beforeTask.attempts);
  assert.equal(result.state.tasks["42"].failures, beforeTask.failures);
  assert.deepEqual(result.state.tasks["42"].last_error, beforeTask.last_error);
  assert.deepEqual(result.state.system, beforeSystem);
  assert.equal(result.state.active_task, null);
  assert.equal(store.writes, 1);
});

test("operator recovery duplicate replay is a no-op even when the original expected version is now stale", async () => {
  const store = fakeStore(quarantinedTaskState());
  const controller = createAgentFactoryController({ store, repository: "owner/repo", now: () => 2000 });
  const first = await controller.run(operatorRecoveryEnv());
  const duplicate = await controller.run(operatorRecoveryEnv());
  assert.equal(first.outputs.recovered, true);
  assert.equal(duplicate.outputs.duplicate, true);
  assert.equal(duplicate.outputs.recovered, false);
  assert.equal(duplicate.state.state_version, first.state.state_version);
  assert.equal(store.writes, 1);
});

test("operator recovery reconciles an ambiguous write only after exact durable read-back", async () => {
  const store = fakeStore(quarantinedTaskState(), { writeThenThrowAt: 1 });
  const controller = createAgentFactoryController({ store, repository: "owner/repo", now: () => 2000 });
  const result = await controller.run(operatorRecoveryEnv());
  assert.equal(result.outputs.recovered, true);
  assert.equal(result.state.state_version, 1);
  assert.equal(store.writes, 1);
});

test("operator recovery rejects stale versions and invalid task identity without mutation", async () => {
  for (const overrides of [
    { EXPECTED_STATE_VERSION: "1" },
    { ISSUE_NUMBER: "43" },
    { EXPECTED_TASK_STATUS: "retry_wait" },
  ]) {
    const store = fakeStore(quarantinedTaskState());
    const controller = createAgentFactoryController({ store, repository: "owner/repo", now: () => 2000 });
    await assert.rejects(controller.run(operatorRecoveryEnv(overrides)));
    assert.equal(store.state.state_version, 0);
    assert.equal(store.writes, 0);
  }
});

test("operator recovery canonicalizes equivalent GitHub evidence URLs for duplicate replay", async () => {
  const store = fakeStore(quarantinedTaskState());
  const controller = createAgentFactoryController({ store, repository: "owner/repo", now: () => 2000 });
  const first = await controller.run(operatorRecoveryEnv({
    EVIDENCE_REFERENCE: "https://GITHUB.com/owner/repo/commit/" + "d".repeat(40),
  }));
  const duplicate = await controller.run(operatorRecoveryEnv({
    EVIDENCE_REFERENCE: "https://github.com/owner/repo/commit/" + "d".repeat(40),
  }));
  assert.equal(first.outputs.recovered, true);
  assert.equal(duplicate.outputs.duplicate, true);
  assert.equal(duplicate.state.state_version, first.state.state_version);
  assert.equal(store.writes, 1);
});

test("operator recovery fails closed when ambiguous write read-back is unavailable or mismatched", async () => {
  const mismatchedReadBack = quarantinedTaskState();
  mismatchedReadBack.state_version = 99;
  for (const options of [
    { failReadAfterWrite: true },
    { readOverrideAfterWrite: mismatchedReadBack },
  ]) {
    const store = fakeStore(quarantinedTaskState(), { writeThenThrowAt: 1, ...options });
    const controller = createAgentFactoryController({ store, repository: "owner/repo", now: () => 2000 });
    await assert.rejects(
      controller.run(operatorRecoveryEnv()),
      /injected ambiguous state write failure/,
    );
    assert.equal(store.writes, 1);
  }
});
