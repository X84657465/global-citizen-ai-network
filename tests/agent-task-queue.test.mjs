import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { taskPriority, compareTaskIssues, sortTaskIssues, isMergedTaskPullRequest, isTaskAlreadyPublished } from "../lib/agent-task-queue.mjs";
import { extractTaskDependencyNumbers, taskDependenciesResolved } from "../lib/agent-task-dependencies.mjs";

const selectorSource = readFileSync(new URL("../scripts/select-agent-task.mjs", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const preflightWorkflow = readFileSync(new URL("../.github/workflows/agent-task-preflight.yml", import.meta.url), "utf8").replace(/\r\n/g, "\n");

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


test("task selector applies durable retry eligibility instead of blanket open-PR exclusion", () => {
  assert.ok(selectorSource.includes("isTaskAlreadyPublished("));
  assert.ok(selectorSource.includes("openTaskPrNumbers"));
  assert.ok(selectorSource.includes("mergedTaskIssueNumbers"));
  assert.equal(selectorSource.includes("!alreadyPublished.has(issue.number)"), false);
});


test("workflow supersedes changed candidate branches instead of overwriting an existing PR", () => {
  assert.ok(preflightWorkflow.includes("$publish.different_candidate_branch -eq $true"));
  assert.ok(preflightWorkflow.includes('$env:NEXT_TASK_STATE = "superseded"'));
  assert.ok(preflightWorkflow.includes("Publisher did not return exact candidate commit and PR evidence."));
});


test("extracts inline and multiline dependency declarations, including the production issue format", () => {
  const actualIssueShape = [
    "## Priority",
    "P0 — core contribution platform",
    "",
    "## Dependencies",
    "#74 task discovery; #75 submission/review status",
    "#81 RLS tests",
    "#94 migration-chain validation",
    "",
    "## Safety",
    "Do not issue real cash payouts or represent pending rewards as withdrawable funds.",
  ].join("\n");
  assert.deepEqual(extractTaskDependencyNumbers(actualIssueShape), [74, 75, 81, 94]);
  assert.deepEqual(extractTaskDependencyNumbers("Dependencies: #74, #75 and #81\nDependencies/context: #94"), [74, 75, 81, 94]);
});

test("dependency extraction is scoped to dependency sections, ignores code fences, and deduplicates", () => {
  const fence = "\x60\x60\x60";
  const body = [
    "## Goal",
    "See unrelated issue #10.",
    "## Dependencies/context",
    "- #94 migration",
    "- #74 discovery",
    "- #94 duplicate",
    fence + "md",
    "- #999 example only",
    "## Not a real heading",
    fence,
    "## Acceptance criteria",
    "Do not parse #12 from this section.",
  ].join("\n");
  assert.deepEqual(extractTaskDependencyNumbers(body), [74, 94]);
});

test("dependency extraction ignores mismatched and undersized closing fences", () => {
  const body = [
    "## Dependencies",
    "- #74 required",
    "````md",
    "- #999 inside fenced example",
    "```",
    "~~~",
    "- #998 still inside fenced example",
    "````",
    "- #75 required after the real closing fence",
    "## Acceptance criteria",
    "- #12 unrelated reference",
  ].join("\n");
  assert.deepEqual(extractTaskDependencyNumbers(body), [74, 75]);
});

test("invalid backtick fence info strings cannot hide subsequent dependencies", () => {
  const body = [
    "## Dependencies",
    "```invalid`info",
    "- #74 must remain visible to the dependency gate",
    "## Acceptance criteria",
    "- #12 unrelated reference",
  ].join("\n");
  assert.deepEqual(extractTaskDependencyNumbers(body), [74]);
});

test("dependency resolution fails closed for open, missing, and non-completed closed issues", () => {
  const body = "## Dependencies\n- #74\n- #75\n- #81";
  const dependencies = new Map([
    [74, { state: "closed", state_reason: "completed" }],
    [75, { state: "open", state_reason: null }],
    [81, { state: "closed", state_reason: "not_planned" }],
  ]);
  assert.equal(taskDependenciesResolved(body, dependencies), false);
  dependencies.set(75, { state: "closed", state_reason: "completed" });
  assert.equal(taskDependenciesResolved(body, dependencies), false);
  dependencies.set(81, { state: "closed", state_reason: "completed" });
  assert.equal(taskDependenciesResolved(body, dependencies), true);
  assert.equal(taskDependenciesResolved("## Dependencies\n- #74", new Map()), false);
  assert.equal(taskDependenciesResolved("## Dependencies\n- #74", new Map(), new Set([74])), true);
});
