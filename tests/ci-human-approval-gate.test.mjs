import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workflow = readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");

test("CI must never promote or merge AI-generated pull requests", () => {
  assert.doesNotMatch(workflow, /auto-merge-ai-task/i);
  assert.doesNotMatch(workflow, /github\\.rest\\.pulls\\.merge/);
  assert.doesNotMatch(workflow, /markPullRequestReadyForReview/);
  assert.doesNotMatch(workflow, /pull-requests:\\s*write/);
  assert.doesNotMatch(workflow, /contents:\\s*write/);
});

test("CI validation must not close task issues or dispatch the next task after an AI merge", () => {
  assert.doesNotMatch(workflow, /github\\.rest\\.repos\\.createDispatchEvent/);
  assert.doesNotMatch(workflow, /github\\.rest\\.issues\\.update/);
});
