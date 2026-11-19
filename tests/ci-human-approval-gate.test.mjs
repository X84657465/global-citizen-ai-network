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
