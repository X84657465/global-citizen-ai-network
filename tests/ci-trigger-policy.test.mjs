import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workflow = readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8").replace(/\r\n/g, "\n");

test("full CI runs on main pushes and pull-request lifecycle events, not codex branch pushes", () => {
  assert.ok(workflow.includes("  push:\n    branches: [main, feat/agent-factory-v2, feat/gcan-product-homepage, feat/github-project-showcase, feat/deep-neural-core, feat/deep-research-workbench]\n"));
  assert.ok(workflow.includes("  pull_request:\n    branches: [main, feat/github-project-showcase]\n    types: [opened, reopened, synchronize]\n"));
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

test("Windows Supabase CI allocates ports outside the default dynamic TCP range", () => {
  assert.ok(workflow.includes("$candidate = 20000 + (([int64]$env:GITHUB_RUN_ID + ($attempt * 7)) % 20000)"));
  assert.equal(workflow.includes("$candidate = 55000 + (([int64]$env:GITHUB_RUN_ID + ($attempt * 7)) % 9000)"), false);
});


test("package lock metadata matches the resolved eslint-import-resolver-node tarball version", () => {
  const lock = JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"));
  const entry = lock.packages["node_modules/eslint-import-resolver-node"];
  assert.ok(entry, "eslint-import-resolver-node must be present in the lockfile");
  const resolvedTarball = entry.resolved.split("/").at(-1);
  assert.equal(resolvedTarball, "eslint-import-resolver-node-" + entry.version + ".tgz");
});
