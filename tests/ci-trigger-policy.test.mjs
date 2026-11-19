import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workflow = readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const preflight = readFileSync(new URL("../.github/workflows/agent-task-preflight.yml", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const runnerSmoke = readFileSync(new URL("../.github/workflows/self-hosted-runner-smoke.yml", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const workflowLevelConcurrency = workflow.split("\non:\n", 1)[0];

test("full CI runs on main pushes and pull-request lifecycle events, not codex branch pushes", () => {
  assert.ok(workflow.includes("  push:\n    branches: [main]\n"));
  assert.ok(workflow.includes("  pull_request:\n    branches: [main]\n    types: [opened, reopened, synchronize]\n"));
  assert.ok(workflow.includes("  repository_dispatch:\n    types: [ai-task-ci]\n"));
  assert.equal(workflow.includes('branches: [main, "codex/**"]'), false);
});

test("CI coalesces pending commits per PR while serializing self-hosted jobs globally", () => {
  assert.ok(workflowLevelConcurrency.includes("group: global-citizen-ai-network-ci-\${{ github.event.pull_request.number || github.event.client_payload.pull_request_number || github.ref }}"));
  assert.ok(workflowLevelConcurrency.includes("cancel-in-progress: false"));
  assert.equal(workflowLevelConcurrency.includes("queue: max"), false);

  for (const job of ["build", "database", "circuit-breaker", "circuit-breaker-success"]) {
    const start = workflow.indexOf("  " + job + ":\n");
    assert.ok(start >= 0, "missing CI job: " + job);
    const next = workflow.indexOf("\n  ", start + 4);
    const section = workflow.slice(start, next < 0 ? workflow.length : next);
    assert.ok(section.includes("group: global-citizen-ai-network-self-hosted-runner"), job + " must use the shared Runner group");
    assert.ok(section.includes("queue: max"), job + " must preserve pending Runner jobs");
  }
});

test("preflight and Runner smoke workflows share the bounded Runner queue", () => {
  for (const source of [preflight, runnerSmoke]) {
    assert.ok(source.includes("group: global-citizen-ai-network-self-hosted-runner"));
    assert.ok(source.includes("queue: max"));
    assert.ok(source.includes("cancel-in-progress: false"));
  }
});

test("CI never auto-approves or merges AI task pull requests; human approval is required", () => {
  assert.equal(workflow.includes("  auto-merge-ai-task:"), false);
  assert.equal(workflow.includes("markPullRequestReadyForReview"), false);
  assert.equal(workflow.includes("github.rest.pulls.merge"), false);
});
