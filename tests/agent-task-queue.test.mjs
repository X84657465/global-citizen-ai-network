import test from "node:test";
import assert from "node:assert/strict";
import { taskPriority, compareTaskIssues, sortTaskIssues, isMergedTaskPullRequest, isTaskAlreadyPublished } from "../lib/agent-task-queue.mjs";

const issue = (number, created_at, priority = null) => ({
  number, created_at, body: priority ? "## Priority\n" + priority + "\n\n## Goal\n..." : "## Goal\n...",
});

test("reads only explicit P0-P3 priority values", () => {
  assert.equal(taskPriority(issue(1, "2026-01-01T00:00:00Z", "P0 - release blocker")), "P0");
  assert.equal(taskPriority(issue(2, "2026-01-01T00:00:00Z", "P3")), "P3");
  assert.equal(taskPriority(issue(3, "2026-01-01T00:00:00Z", "urgent")), null);
  assert.equal(taskPriority(issue(4, "2026-01-01T00:00:00Z")), null);
});

test("sorts by explicit priority then FIFO creation time", () => {
  const sorted = sortTaskIssues([
    issue(10, "2026-01-01T00:00:00Z"),
    issue(11, "2026-01-03T00:00:00Z", "P1"),
    issue(12, "2026-01-02T00:00:00Z", "P0"),
    issue(13, "2026-01-01T00:00:00Z", "P1"),
  ]);
  assert.deepEqual(sorted.map((item) => item.number), [12, 13, 11, 10]);
});

test("uses issue number as deterministic tie-break for equal timestamps", () => {
  const a = issue(22, "2026-01-01T00:00:00Z");
  const b = issue(21, "2026-01-01T00:00:00Z");
  assert.ok(compareTaskIssues(b, a) < 0);
  assert.deepEqual(sortTaskIssues([a, b]).map((item) => item.number), [21, 22]);
});

test("does not mutate the source queue", () => {
  const source = [issue(2, "2026-01-02T00:00:00Z"), issue(1, "2026-01-01T00:00:00Z")];
  const sorted = sortTaskIssues(source);
  assert.notEqual(sorted, source);
  assert.equal(source[0].number, 2);
});

test("recognizes merged task PRs using GitHub merged_at metadata", () => {
  assert.equal(isMergedTaskPullRequest({ state: "closed", merged_at: "2026-11-19T00:24:22Z" }), true);
  assert.equal(isMergedTaskPullRequest({ state: "closed", merged_at: null }), false);
  assert.equal(isMergedTaskPullRequest({ state: "open", merged_at: null }), false);
});

test("accepts normalized merged boolean while preserving raw GitHub metadata support", () => {
  assert.equal(isMergedTaskPullRequest({ merged: true }), true);
  assert.equal(isMergedTaskPullRequest({ merged: false, merged_at: null }), false);
});


test("queued retries may reuse an existing open task PR without creating duplicates", () => {
  const open = new Set([42]);
  const merged = new Set();
  assert.equal(isTaskAlreadyPublished(42, { status: "queued", quarantined: false }, open, merged), false);
  assert.equal(isTaskAlreadyPublished(42, { status: "candidate_rejected", quarantined: false }, open, merged), true);
  assert.equal(isTaskAlreadyPublished(42, { status: "completed", quarantined: false }, open, merged), true);
  assert.equal(isTaskAlreadyPublished(42, undefined, open, merged), true);
});

test("merged task PRs and quarantined tasks remain excluded even when queued metadata is stale", () => {
  assert.equal(isTaskAlreadyPublished(42, { status: "queued", quarantined: false }, new Set(), new Set([42])), true);
  assert.equal(isTaskAlreadyPublished(42, { status: "queued", quarantined: true }, new Set([42]), new Set()), true);
  assert.equal(isTaskAlreadyPublished(42, { status: "queued", quarantined: false }, new Set(), new Set()), false);
});
