import test from "node:test";
import assert from "node:assert/strict";
import { selectNextQueuedTask, TASK_RETRY_LABEL, TASK_SKIPPED_LABEL } from "../lib/agent-task-queue.mjs";

const owner = "X84657465";
const repository = owner + "/global-citizen-ai-network";
const issue = (number, overrides = {}) => ({
  number,
  title: "[AI Task] Example task " + number,
  html_url: "https://github.com/" + repository + "/issues/" + number,
  state: "open",
  user: { login: owner },
  labels: [],
  body: `## Goal
Implement a useful, bounded feature for task ${number} with tests and documentation.

## Allowed paths
- app/example/page.tsx
- tests/example.test.ts

## Acceptance criteria
- The behavior is covered by deterministic tests.

## Explicit exclusions
- No production deployment.
`,
  ...overrides,
});

test("selects fresh tasks by priority before retrying a failed task", () => {
  const result = selectNextQueuedTask([
    issue(3, { labels: [{ name: TASK_RETRY_LABEL }] }),
    issue(17),
    issue(71),
  ], [], repository);
  assert.equal(result.selected.number, 17);
  assert.equal(result.retry_count, 1);
});

test("retries a first-failure task after fresh tasks are exhausted", () => {
  const result = selectNextQueuedTask([
    issue(3, { labels: [{ name: TASK_RETRY_LABEL }] }),
  ], [], repository);
  assert.equal(result.selected.number, 3);
});

test("never selects a task marked skipped or already published to an open/merged PR", () => {
  const result = selectNextQueuedTask([
    issue(3, { labels: [{ name: TASK_SKIPPED_LABEL }] }),
    issue(17),
    issue(71),
  ], [
    { state: "open", body: "<!-- ai-task:17 -->" },
    { state: "closed", merged: true, body: "<!-- ai-task:71 -->" },
  ], repository);
  assert.equal(result.selected, null);
});

test("allows a task to re-enter the queue when its previous PR was closed without merge", () => {
  const result = selectNextQueuedTask([issue(3)], [
    { state: "closed", merged: false, body: "<!-- ai-task:3 -->" },
  ], repository);
  assert.equal(result.selected.number, 3);
});

test("skips malformed task specifications instead of repeatedly launching a doomed run", () => {
  const malformed = issue(3, { body: "## Goal\\nThis task is missing required sections." });
  const result = selectNextQueuedTask([malformed, issue(17)], [], repository);
  assert.equal(result.selected.number, 17);
  assert.equal(result.blocked[0].number, 3);
});
