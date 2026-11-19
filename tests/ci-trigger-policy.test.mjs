import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workflow = readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8").replace(/\r\n/g, "\n");

test("full CI runs on main pushes and pull-request lifecycle events, not codex branch pushes", () => {
  assert.ok(workflow.includes("  push:\n    branches: [main]\n"));
  assert.ok(workflow.includes("  pull_request:\n    branches: [main]\n    types: [opened, reopened, synchronize]\n"));
  assert.ok(workflow.includes("  repository_dispatch:\n    types: [ai-task-ci]\n"));
  assert.equal(workflow.includes('branches: [main, "codex/**"]'), false);
});

test("CI coalesces pending runs per pull request instead of queueing every superseded commit", () => {
  assert.ok(workflow.includes("group: global-citizen-ai-network-ci-${{ github.event.pull_request.number || github.event.client_payload.pull_request_number || github.ref }}"));
  assert.ok(workflow.includes("cancel-in-progress: false"));
  assert.equal(workflow.includes("queue: max"), false);
});

test("CI never auto-approves or merges AI task pull requests; human approval is required", () => {
  assert.equal(workflow.includes("  auto-merge-ai-task:"), false);
  assert.equal(workflow.includes("markPullRequestReadyForReview"), false);
  assert.equal(workflow.includes("github.rest.pulls.merge"), false);
});


test("new task PRs rely on the pull_request opened event while existing PRs retain explicit CI re-dispatch", () => {
  const publisher = readFileSync(new URL("../scripts/publish-agent-patch.mjs", import.meta.url), "utf8").replace(/\r\n/g, "\n");
  const existingStart = publisher.indexOf("if (existingPull) {");
  const createStart = publisher.indexOf('const pull = await api("/repos/" + repository + "/pulls", "POST", {');
  assert.ok(existingStart >= 0);
  assert.ok(createStart > existingStart);
  const existingBlock = publisher.slice(existingStart, publisher.indexOf("const baseCommitInfo", existingStart));
  const newPullBlock = publisher.slice(createStart);
  assert.ok(existingBlock.includes("await dispatchAiTaskCi(existingPull);"));
  assert.equal(newPullBlock.includes("dispatchAiTaskCi("), false);
  assert.ok(workflow.includes("types: [opened, reopened, synchronize]"));
  assert.ok(workflow.includes("types: [ai-task-ci]"));
});
