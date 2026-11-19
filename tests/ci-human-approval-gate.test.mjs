import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workflow = readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");

test("CI must never promote or merge AI-generated pull requests", () => {
  assert.equal(workflow.includes("auto-merge-ai-task"), false);
  assert.equal(workflow.includes("github.rest.pulls.merge"), false);
  assert.equal(workflow.includes("markPullRequestReadyForReview"), false);
  assert.equal(workflow.includes("pull-requests: write"), false);
  assert.equal(workflow.includes("contents: write"), false);
});

test("CI validation must not close task issues or dispatch the next task after an AI merge", () => {
  assert.equal(workflow.includes("github.rest.repos.createDispatchEvent"), false);
  assert.equal(workflow.includes("github.rest.issues.update"), false);
});


test("human review of one AI task does not freeze unrelated eligible queue work", () => {
  const policy = readFileSync(new URL("../docs/ai-task-human-review.md", import.meta.url), "utf8");
  assert.ok(policy.includes("Other independent eligible tasks whose declared dependencies are satisfied may continue"));
  assert.equal(policy.includes("The scheduler remains idle while an AI task pull request is open."), false);
});
