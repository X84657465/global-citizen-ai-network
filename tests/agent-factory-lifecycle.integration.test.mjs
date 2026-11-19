import test from "node:test";
import assert from "node:assert/strict";
import { createAgentFactoryController } from "../lib/agent-factory-controller.mjs";
import { createFactoryStateStore, FACTORY_STATE_ISSUE_TITLE } from "../lib/agent-factory-state-store.mjs";

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

  return {
    issues,
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
    HEAD_REF: "ai-task/issue-42-lifecycle",
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
