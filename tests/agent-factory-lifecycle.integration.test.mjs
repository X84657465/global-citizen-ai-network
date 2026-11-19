import test from "node:test";
import assert from "node:assert/strict";
import { createAgentFactoryController } from "../lib/agent-factory-controller.mjs";
import { createFactoryStateStore, FACTORY_STATE_ISSUE_TITLE } from "../lib/agent-factory-state-store.mjs";
import { isTaskAlreadyPublished } from "../lib/agent-task-queue.mjs";

const repository = "owner/repo";
const issueNumber = 42;
const leaseId = "gcan-700001-1-42";
const candidateSha = "b".repeat(40);

function createFakeGitHubApi() {
  const issues = [{
    number: issueNumber,
    title: "[AI Task] exercise the complete factory lifecycle",
    state: "open",
    user: { login: "owner" },
    body: "Deterministic lifecycle integration fixture.",
  }];
  let nextIssueNumber = 100;
  const workflows = new Map();

  return {
    issues,
    workflows,
    async request(path, options = {}) {
      const url = new URL(path, "https://api.github.com");
      const method = options.method ?? "GET";
      if (url.pathname === "/repos/owner/repo/issues" && method === "GET") {
        return structuredClone(issues);
      }
      if (url.pathname === "/repos/owner/repo/issues" && method === "POST") {
        const created = {
          number: nextIssueNumber++,
          title: options.body.title,
          body: options.body.body,
          state: "open",
        };
        issues.push(created);
        return structuredClone(created);
      }
      const workflowMatch = /^\/repos\/owner\/repo\/actions\/runs\/(\d+)$/.exec(url.pathname);
      if (workflowMatch && method === "GET") {
        const workflow = workflows.get(workflowMatch[1]);
        if (!workflow) throw new Error("Workflow run not found.");
        return structuredClone(workflow);
      }
      const match = /^\/repos\/owner\/repo\/issues\/(\d+)$/.exec(url.pathname);
      if (match) {
        const issue = issues.find((item) => item.number === Number(match[1]));
        if (!issue) throw new Error("Not Found");
        if (method === "GET") return structuredClone(issue);
        if (method === "PATCH") {
          Object.assign(issue, structuredClone(options.body));
          return structuredClone(issue);
        }
      }
      throw new Error("Unexpected fake GitHub API request: " + method + " " + path);
    },
  };
}

test("persists the complete worker-to-candidate lifecycle across controller restarts and duplicate CI callbacks", async () => {
  const api = createFakeGitHubApi();
  let now = Date.parse("2026-11-19T10:00:00.000Z");

  // Recreate both controller and state-store objects for every operation.
  // This models separate Actions processes and proves the GitHub Issue is
  // the durable source of truth rather than an in-memory controller cache.
  const invoke = async (env) => {
    const store = createFactoryStateStore(api, { repository });
    const controller = createAgentFactoryController({
      store,
      api,
      repository,
      now: () => now,
    });
    const result = await controller.run(env);
    now += 100;
    return result;
  };

  let result = await invoke({
    AGENT_FACTORY_MODE: "reserve",
    ISSUE_NUMBER: String(issueNumber),
    GITHUB_RUN_ID: "700001",
    GITHUB_RUN_ATTEMPT: "1",
    GITHUB_SHA: "a".repeat(40),
    RUNNER_NAME: "integration-runner",
  });
  assert.equal(result.state.active_task.lease_id, leaseId);
  assert.equal(result.state.tasks[String(issueNumber)].status, "reserved");

  const transitions = [
    "preparing",
    "planning",
    "patching",
    "sandbox_testing",
    "publishing",
  ];
  for (const nextState of transitions) {
    result = await invoke({
      AGENT_FACTORY_MODE: "transition",
      ISSUE_NUMBER: String(issueNumber),
      AGENT_FACTORY_LEASE_ID: leaseId,
      NEXT_TASK_STATE: nextState,
    });
    assert.equal(result.state.active_task.state, nextState);
  }

  result = await invoke({
    AGENT_FACTORY_MODE: "transition",
    ISSUE_NUMBER: String(issueNumber),
    AGENT_FACTORY_LEASE_ID: leaseId,
    NEXT_TASK_STATE: "draft_pr_created",
    HEAD_SHA: candidateSha,
    PULL_REQUEST_NUMBER: "88",
  });
  assert.equal(result.state.tasks[String(issueNumber)].pull_request_number, 88);

  result = await invoke({
    AGENT_FACTORY_MODE: "transition",
    ISSUE_NUMBER: String(issueNumber),
    AGENT_FACTORY_LEASE_ID: leaseId,
    NEXT_TASK_STATE: "awaiting_ci",
  });
  assert.equal(result.state.active_task, null);
  assert.equal(result.state.tasks[String(issueNumber)].status, "awaiting_ci");

  result = await invoke({
    AGENT_FACTORY_MODE: "candidate-start",
    ISSUE_NUMBER: String(issueNumber),
    PULL_REQUEST_NUMBER: "88",
    HEAD_SHA: candidateSha,
    HEAD_REF: "ai-task/issue-42-abcdef123456",
    CI_RUN_ID: "800001",
    CI_RUN_ATTEMPT: "1",
  });
  assert.equal(result.state.tasks[String(issueNumber)].candidate_status, "pending");

  const callback = {
    AGENT_FACTORY_MODE: "candidate",
    ISSUE_NUMBER: String(issueNumber),
    PULL_REQUEST_NUMBER: "88",
    HEAD_SHA: candidateSha,
    CI_CONCLUSION: "success",
    CI_RUN_ID: "800001",
    CI_RUN_ATTEMPT: "1",
  };
  result = await invoke(callback);
  assert.equal(result.state.tasks[String(issueNumber)].status, "completed");
  assert.equal(result.state.tasks[String(issueNumber)].candidate_status, "success");
  assert.equal(result.state.active_task, null);

  const completedVersion = result.state.state_version;
  const duplicate = await invoke(callback);
  assert.equal(duplicate.outputs.duplicate, true);
  assert.equal(duplicate.state.state_version, completedVersion);
  assert.equal(duplicate.state.tasks[String(issueNumber)].status, "completed");

  const persisted = await createFactoryStateStore(api, { repository }).read();
  assert.equal(persisted.state.state_version, completedVersion);
  assert.equal(persisted.state.tasks[String(issueNumber)].status, "completed");
  assert.equal(api.issues.filter((issue) => issue.title === FACTORY_STATE_ISSUE_TITLE).length, 1);
});

test("durable scheduler completes a 24-task lifecycle simulation with idempotent callbacks", async () => {
  const api = createFakeGitHubApi();
  let now = Date.parse("2026-11-19T10:00:00.000Z");
  const invoke = async (env) => {
    const store = createFactoryStateStore(api, { repository });
    const controller = createAgentFactoryController({ store, api, repository, now: () => now });
    const result = await controller.run(env);
    now += 100;
    return result;
  };

  const taskCount = 24;
  for (let index = 0; index < taskCount; index += 1) {
    const issue = 42 + index;
    const runId = String(710000 + index);
    const ciRunId = String(810000 + index);
    const headSha = index.toString(16).repeat(40).slice(0, 40);
    const pullRequestNumber = 2000 + index;
    const leaseId = "gcan-" + runId + "-1-" + issue;

    let result = await invoke({
      AGENT_FACTORY_MODE: "reserve",
      ISSUE_NUMBER: String(issue),
      GITHUB_RUN_ID: runId,
      GITHUB_RUN_ATTEMPT: "1",
      GITHUB_SHA: "a".repeat(40),
      RUNNER_NAME: "soak-runner",
    });
    assert.equal(result.state.active_task.lease_id, leaseId);

    for (const nextState of ["preparing", "planning", "patching", "sandbox_testing", "publishing"]) {
      result = await invoke({
        AGENT_FACTORY_MODE: "transition",
        ISSUE_NUMBER: String(issue),
        AGENT_FACTORY_LEASE_ID: leaseId,
        NEXT_TASK_STATE: nextState,
      });
      assert.equal(result.state.active_task.state, nextState);
    }

    await invoke({
      AGENT_FACTORY_MODE: "transition",
      ISSUE_NUMBER: String(issue),
      AGENT_FACTORY_LEASE_ID: leaseId,
      NEXT_TASK_STATE: "draft_pr_created",
      HEAD_SHA: headSha,
      PULL_REQUEST_NUMBER: String(pullRequestNumber),
    });
    result = await invoke({
      AGENT_FACTORY_MODE: "transition",
      ISSUE_NUMBER: String(issue),
      AGENT_FACTORY_LEASE_ID: leaseId,
      NEXT_TASK_STATE: "awaiting_ci",
    });
    assert.equal(result.state.active_task, null);

    result = await invoke({
      AGENT_FACTORY_MODE: "candidate-start",
      ISSUE_NUMBER: String(issue),
      PULL_REQUEST_NUMBER: String(pullRequestNumber),
      HEAD_SHA: headSha,
      HEAD_REF: "ai-task/issue-" + issue + "-" + index.toString(16).padStart(12, "0"),
      CI_RUN_ID: ciRunId,
      CI_RUN_ATTEMPT: "1",
    });
    assert.equal(result.state.tasks[String(issue)].candidate_status, "pending");

    const callback = {
      AGENT_FACTORY_MODE: "candidate",
      ISSUE_NUMBER: String(issue),
      PULL_REQUEST_NUMBER: String(pullRequestNumber),
      HEAD_SHA: headSha,
      CI_CONCLUSION: "success",
      CI_RUN_ID: ciRunId,
      CI_RUN_ATTEMPT: "1",
    };
    result = await invoke(callback);
    assert.equal(result.state.tasks[String(issue)].status, "completed");
    assert.equal(result.state.active_task, null);

    const completedVersion = result.state.state_version;
    const duplicate = await invoke(callback);
    assert.equal(duplicate.outputs.duplicate, true);
    assert.equal(duplicate.state.state_version, completedVersion);

    // Advance the deterministic clock by one hour between task completions.
    now += 60 * 60 * 1000;
  }

  const finalState = await createFactoryStateStore(api, { repository }).read();
  assert.equal(Object.keys(finalState.state.tasks).length, taskCount);
  assert.equal(Object.values(finalState.state.tasks).filter((task) => task.status === "completed").length, taskCount);
  assert.equal(finalState.state.active_task, null);
  assert.equal(finalState.state.processed_events.length, taskCount * 3);
  assert.equal(api.issues.filter((issue) => issue.title === FACTORY_STATE_ISSUE_TITLE).length, 1);
});

test("candidate failure recovers through backoff and retries the same open PR without duplication", async () => {
  const api = createFakeGitHubApi();
  let now = Date.parse("2026-11-19T10:00:00.000Z");
  const invoke = async (env) => {
    const store = createFactoryStateStore(api, { repository });
    const controller = createAgentFactoryController({ store, api, repository, now: () => now });
    return controller.run(env);
  };
  const issue = 42;
  const pullRequestNumber = 88;
  const firstRun = "720001";
  const firstLease = "gcan-" + firstRun + "-1-" + issue;
  const firstSha = "a".repeat(40);

  await invoke({
    AGENT_FACTORY_MODE: "reserve",
    ISSUE_NUMBER: String(issue),
    GITHUB_RUN_ID: firstRun,
    GITHUB_RUN_ATTEMPT: "1",
    GITHUB_SHA: "b".repeat(40),
    RUNNER_NAME: "retry-integration-runner",
  });
  for (const nextState of ["preparing", "planning", "patching", "sandbox_testing", "publishing"]) {
    await invoke({
      AGENT_FACTORY_MODE: "transition",
      ISSUE_NUMBER: String(issue),
      AGENT_FACTORY_LEASE_ID: firstLease,
      NEXT_TASK_STATE: nextState,
    });
  }
  await invoke({
    AGENT_FACTORY_MODE: "transition",
    ISSUE_NUMBER: String(issue),
    AGENT_FACTORY_LEASE_ID: firstLease,
    NEXT_TASK_STATE: "draft_pr_created",
    HEAD_SHA: firstSha,
    PULL_REQUEST_NUMBER: String(pullRequestNumber),
  });
  await invoke({
    AGENT_FACTORY_MODE: "transition",
    ISSUE_NUMBER: String(issue),
    AGENT_FACTORY_LEASE_ID: firstLease,
    NEXT_TASK_STATE: "awaiting_ci",
  });
  await invoke({
    AGENT_FACTORY_MODE: "candidate-start",
    ISSUE_NUMBER: String(issue),
    PULL_REQUEST_NUMBER: String(pullRequestNumber),
    HEAD_SHA: firstSha,
    HEAD_REF: "ai-task/issue-42-abcdef123456",
    CI_RUN_ID: "820001",
    CI_RUN_ATTEMPT: "1",
  });

  const failure = {
    AGENT_FACTORY_MODE: "candidate",
    ISSUE_NUMBER: String(issue),
    PULL_REQUEST_NUMBER: String(pullRequestNumber),
    HEAD_SHA: firstSha,
    CI_CONCLUSION: "failure",
    CI_RUN_ID: "820001",
    CI_RUN_ATTEMPT: "1",
    FAILURE_SUMMARY: "candidate lint failed",
  };
  let result = await invoke(failure);
  assert.equal(result.state.tasks[String(issue)].status, "candidate_rejected");
  const retryAt = Date.parse(result.state.tasks[String(issue)].next_attempt_at);
  assert.ok(retryAt > now);

  const failedVersion = result.state.state_version;
  const duplicateFailure = await invoke(failure);
  assert.equal(duplicateFailure.outputs.duplicate, true);
  assert.equal(duplicateFailure.state.state_version, failedVersion);

  now = retryAt - 1;
  result = await invoke({ AGENT_FACTORY_MODE: "check" });
  assert.equal(result.outputs.requeued_tasks, 0);
  assert.equal(result.state.tasks[String(issue)].status, "candidate_rejected");

  now = retryAt;
  result = await invoke({ AGENT_FACTORY_MODE: "check" });
  assert.equal(result.outputs.requeued_tasks, 1);
  assert.equal(result.state.tasks[String(issue)].status, "queued");
  assert.equal(isTaskAlreadyPublished(issue, result.state.tasks[String(issue)], new Set([issue]), new Set()), false);

  const secondRun = "720002";
  const secondLease = "gcan-" + secondRun + "-1-" + issue;
  // A retry may reuse the open PR only when the deterministic candidate
  // branch still resolves to the exact validated head commit.
  const secondSha = firstSha;
  await invoke({
    AGENT_FACTORY_MODE: "reserve",
    ISSUE_NUMBER: String(issue),
    GITHUB_RUN_ID: secondRun,
    GITHUB_RUN_ATTEMPT: "1",
    GITHUB_SHA: "d".repeat(40),
    RUNNER_NAME: "retry-integration-runner",
  });
  for (const nextState of ["preparing", "planning", "patching", "sandbox_testing", "publishing"]) {
    await invoke({
      AGENT_FACTORY_MODE: "transition",
      ISSUE_NUMBER: String(issue),
      AGENT_FACTORY_LEASE_ID: secondLease,
      NEXT_TASK_STATE: nextState,
    });
  }
  await invoke({
    AGENT_FACTORY_MODE: "transition",
    ISSUE_NUMBER: String(issue),
    AGENT_FACTORY_LEASE_ID: secondLease,
    NEXT_TASK_STATE: "draft_pr_created",
    HEAD_SHA: secondSha,
    PULL_REQUEST_NUMBER: String(pullRequestNumber),
  });
  await invoke({
    AGENT_FACTORY_MODE: "transition",
    ISSUE_NUMBER: String(issue),
    AGENT_FACTORY_LEASE_ID: secondLease,
    NEXT_TASK_STATE: "awaiting_ci",
  });
  await invoke({
    AGENT_FACTORY_MODE: "candidate-start",
    ISSUE_NUMBER: String(issue),
    PULL_REQUEST_NUMBER: String(pullRequestNumber),
    HEAD_SHA: secondSha,
    HEAD_REF: "ai-task/issue-42-abcdef123456",
    CI_RUN_ID: "820002",
    CI_RUN_ATTEMPT: "1",
  });

  result = await invoke({
    AGENT_FACTORY_MODE: "candidate",
    ISSUE_NUMBER: String(issue),
    PULL_REQUEST_NUMBER: String(pullRequestNumber),
    HEAD_SHA: secondSha,
    CI_CONCLUSION: "success",
    CI_RUN_ID: "820002",
    CI_RUN_ATTEMPT: "1",
  });
  assert.equal(result.state.tasks[String(issue)].status, "completed");
  assert.equal(result.state.tasks[String(issue)].attempts, 2);
  assert.equal(result.state.tasks[String(issue)].pull_request_number, pullRequestNumber);
  assert.equal(isTaskAlreadyPublished(issue, result.state.tasks[String(issue)], new Set([issue]), new Set()), true);
  assert.equal(api.issues.filter((item) => item.title === FACTORY_STATE_ISSUE_TITLE).length, 1);
});


test("recovers an expired worker lease only after a restarted controller confirms the exact workflow attempt has stopped", async () => {
  const api = createFakeGitHubApi();
  let now = Date.parse("2026-11-19T10:00:00.000Z");
  const invoke = async (env) => {
    const store = createFactoryStateStore(api, { repository });
    const controller = createAgentFactoryController({ store, api, repository, now: () => now });
    const result = await controller.run(env);
    now += 100;
    return result;
  };

  const reserved = await invoke({
    AGENT_FACTORY_MODE: "reserve",
    ISSUE_NUMBER: String(issueNumber),
    GITHUB_RUN_ID: "700001",
    GITHUB_RUN_ATTEMPT: "1",
    GITHUB_SHA: "a".repeat(40),
    RUNNER_NAME: "integration-runner",
  });
  const expiredAt = Date.parse(reserved.state.active_task.lease_expires_at) + 1;
  now = expiredAt;
  api.workflows.set("700001", { run_attempt: 1, status: "in_progress" });

  // A restarted controller must not steal a lease while GitHub still reports
  // that the original workflow attempt is running, even after lease expiry.
  let result = await invoke({ AGENT_FACTORY_MODE: "check" });
  assert.equal(result.outputs.lease_recovered, false);
  assert.equal(result.state.active_task.lease_id, leaseId);
  assert.equal(result.state.tasks[String(issueNumber)].status, "reserved");

  // Missing attempt metadata must fail closed; status alone is insufficient.
  api.workflows.set("700001", { status: "completed" });
  result = await invoke({ AGENT_FACTORY_MODE: "check" });
  assert.equal(result.outputs.lease_recovered, false);
  assert.equal(result.state.active_task.lease_id, leaseId);
  assert.equal(result.state.tasks[String(issueNumber)].status, "reserved");

  // An unavailable workflow-status API must also preserve the lease.
  const request = api.request;
  api.request = async (path, options) => {
    if (path.includes("/actions/runs/")) throw new Error("simulated GitHub API outage");
    return request(path, options);
  };
  result = await invoke({ AGENT_FACTORY_MODE: "check" });
  assert.equal(result.outputs.lease_recovered, false);
  assert.equal(result.state.active_task.lease_id, leaseId);
  assert.equal(result.state.tasks[String(issueNumber)].status, "reserved");
  api.request = request;

  // A newer GitHub rerun supersedes the leased attempt. While that
  // attempt is running it cannot be recovered; once it completes, the old
  // lease is stale and can be safely reclaimed.
  api.workflows.set("700001", { run_attempt: 2, status: "in_progress" });
  result = await invoke({ AGENT_FACTORY_MODE: "check" });
  assert.equal(result.outputs.lease_recovered, false);
  assert.equal(result.state.active_task.lease_id, leaseId);
  assert.equal(result.state.tasks[String(issueNumber)].status, "reserved");

  api.workflows.set("700001", { run_attempt: 2, status: "completed" });
  result = await invoke({ AGENT_FACTORY_MODE: "check" });
  assert.equal(result.outputs.lease_recovered, true);
  assert.equal(result.outputs.recovered_issue_number, issueNumber);
  assert.equal(result.state.active_task, null);
  assert.equal(result.state.tasks[String(issueNumber)].status, "queued");
  assert.equal(result.state.system.consecutive_failures, 1);

  const recoveredVersion = result.state.state_version;
  const duplicateCheck = await invoke({ AGENT_FACTORY_MODE: "check" });
  assert.equal(duplicateCheck.outputs.lease_recovered, false);
  assert.equal(duplicateCheck.state.state_version, recoveredVersion);
  assert.equal(duplicateCheck.state.system.consecutive_failures, 1);
});
