import test from "node:test";
import assert from "node:assert/strict";
import {
  buildGitHubIssueSourceEnvelope,
  selectEligibleGitHubTask,
  intakeNextGitHubIssue,
} from "../lib/agent-factory-local-issue-intake.mjs";

function taskIssue(overrides = {}) {
  return {
    number: 42,
    title: "[AI Task] Add deterministic queue handoff",
    body: "## Goal\nImplement a safe task handoff with durable identity.\n",
    state: "open",
    html_url: "https://github.com/owner/repo/issues/42",
    updated_at: "2026-11-28T00:00:00Z",
    created_at: "2026-11-27T00:00:00Z",
    user: { login: "owner" },
    ...overrides,
  };
}

test("source envelope binds canonical Issue identity, body digest and durable state version", () => {
  const issue = taskIssue();
  const envelope = buildGitHubIssueSourceEnvelope({
    repository: "owner/repo",
    issue,
    sourceStateVersion: 9,
  });
  assert.equal(envelope.kind, "github-issue-source");
  assert.equal(envelope.issue_number, 42);
  assert.equal(envelope.canonical_url, issue.html_url);
  assert.equal(envelope.updated_at, issue.updated_at);
  assert.equal(envelope.source_state_version, 9);
  assert.match(envelope.stable_dedupe_key, /^[a-f0-9]{64}$/);
  assert.match(envelope.issue_body_sha256, /^[a-f0-9]{64}$/);
  assert.throws(() => buildGitHubIssueSourceEnvelope({
    repository: "owner/repo",
    issue: { ...issue, html_url: "https://attacker.invalid/issue/42" },
    sourceStateVersion: 9,
  }), /source identity or durable state version is invalid/);
});

test("selector chooses only one eligible owner-authored AI Task and honors durable state", () => {
  const first = taskIssue();
  const second = taskIssue({
    number: 43,
    html_url: "https://github.com/owner/repo/issues/43",
    title: "[AI Task] Lower priority later task",
    created_at: "2026-11-28T00:00:00Z",
  });
  const selected = selectEligibleGitHubTask({
    issues: [second, first],
    pulls: [],
    factoryState: { state_version: 4, tasks: {}, active_task: null },
    repository: "owner/repo",
  });
  assert.equal(selected.selected.number, 42);
  assert.equal(selected.reason, "selected");
  assert.equal(selectEligibleGitHubTask({
    issues: [first],
    pulls: [],
    factoryState: { state_version: 5, tasks: {}, active_task: { issue_number: 12, lease_id: "lease" } },
    repository: "owner/repo",
  }).reason, "active_factory_lease");
});

test("selector excludes planner lookalikes, closed Issues and tasks with unresolved dependencies", () => {
  const plannerLookalike = taskIssue({
    number: 43,
    html_url: "https://github.com/owner/repo/issues/43",
    user: { login: "someone-else" },
  });
  const dependencyBlocked = taskIssue({
    number: 44,
    html_url: "https://github.com/owner/repo/issues/44",
    body: "## Goal\nImplement the task.\n\n## Dependencies\n- #999\n",
  });
  const closed = taskIssue({
    number: 45,
    html_url: "https://github.com/owner/repo/issues/45",
    state: "closed",
  });
  const selected = selectEligibleGitHubTask({
    issues: [plannerLookalike, dependencyBlocked, closed],
    pulls: [],
    factoryState: { state_version: 0, tasks: {}, active_task: null },
    repository: "owner/repo",
  });
  assert.equal(selected.selected, null);
  assert.equal(selected.reason, "dependencies_blocked");
  assert.equal(selected.blocked_by_dependencies, 1);
});

test("Issue intake fails closed before GitHub reads until cross-executor lease fencing exists", async () => {
  let requests = 0;
  await assert.rejects(() => intakeNextGitHubIssue({
    api: { request: async () => { requests += 1; throw new Error("unexpected GitHub request"); } },
    queue: { addFromSource() { throw new Error("unexpected SQLite write"); } },
    repository: "owner/repo",
    repositoryRoot: "/tmp/repo",
    oracleTestFiles: ["tests/oracle.test.mjs"],
    baseSha: "a".repeat(40),
    baseBranch: "main",
  }), /cross-executor V2 lease\/fencing coordinator/);
  assert.equal(requests, 0);
});
