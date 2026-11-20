import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FAILURE_THRESHOLD, COOLDOWN_MS, cooldownActive, apiCooldownUntil, nextFailureState, nextPlannerTask, plannerIssueBody, successState } from "../lib/agent-factory-policy.mjs";
import { inferTaskIssueNumber } from "../lib/agent-failure-context.mjs";

test("task-scoped failures quarantine only their issue and never increment the global breaker", () => {
  const now = Date.parse("2026-11-19T00:00:00.000Z");
  const previous = { consecutive_failures: 2, cooldown_until: null, task_failures: { "456": 1 }, skipped_issue_numbers: [] };
  const first = nextFailureState(previous, "invalid task spec", now, 123, "task");
  const second = nextFailureState(first, "invalid task spec", now + 1000, 123, "task");
  const third = nextFailureState(second, "invalid task spec", now + 2000, 123, "task");

  assert.equal(FAILURE_THRESHOLD, 3);
  assert.equal(third.consecutive_failures, 2);
  assert.equal(third.cooldown_until, null);
  assert.equal(third.task_failures["123"], 3);
  assert.equal(third.task_failures["456"], 1);
  assert.deepEqual(third.skipped_issue_numbers, [123]);
  assert.equal(cooldownActive(third, now + 3000), false);
});

test("system-scoped failures activate the global cooldown and preserve task quarantine state", () => {
  const now = Date.parse("2026-11-19T00:00:00.000Z");
  const previous = { task_failures: { "123": 2 }, skipped_issue_numbers: [123] };
  const first = nextFailureState(previous, "runner offline", now, 123, "system");
  const second = nextFailureState(first, "runner offline", now + 1000, 123, "system");
  const third = nextFailureState(second, "runner offline", now + 2000, 123, "system");

  assert.equal(third.consecutive_failures, 3);
  assert.equal(third.task_failures["123"], 2);
  assert.deepEqual(third.skipped_issue_numbers, [123]);
  assert.equal(Date.parse(third.cooldown_until), now + 2000 + COOLDOWN_MS);
  assert.equal(cooldownActive(third, now + 3000), true);
  assert.equal(cooldownActive(third, now + 2000 + COOLDOWN_MS + 1), false);
});

test("task-scoped success clears only that task and leaves the global breaker untouched", () => {
  const previous = {
    consecutive_failures: 2,
    cooldown_until: "2026-11-19T00:20:00.000Z",
    task_failures: { "12": 2, "13": 1 },
    skipped_issue_numbers: [12],
    last_error: "shared infrastructure failure",
    last_task_error: "previous task failure",
  };
  const reset = successState(1234, previous, 12, "task");

  assert.equal(reset.consecutive_failures, 2);
  assert.equal(reset.cooldown_until, previous.cooldown_until);
  assert.equal(reset.last_error, previous.last_error);
  assert.equal(reset.last_task_error, null);
  assert.deepEqual(reset.task_failures, { "13": 1 });
  assert.deepEqual(reset.skipped_issue_numbers, []);
});

test("system-scoped success resets only the global breaker and preserves task retry history", () => {
  const previous = {
    consecutive_failures: 4,
    cooldown_until: "2026-11-19T00:20:00.000Z",
    task_failures: { "12": 2 },
    skipped_issue_numbers: [12],
  };
  const reset = successState(1234, previous, null, "system");

  assert.equal(reset.consecutive_failures, 0);
  assert.equal(reset.cooldown_until, null);
  assert.deepEqual(reset.task_failures, { "12": 2 });
  assert.deepEqual(reset.skipped_issue_numbers, [12]);
});

test("task-scoped state transitions require an issue number and an explicit supported scope", () => {
  assert.throws(() => nextFailureState({}, "invalid", 1, null, "task"), /valid issue number/);
  assert.throws(() => successState(1, {}, null, "task"), /valid issue number/);
  assert.throws(() => nextFailureState({}, "invalid", 1, 1, "unknown"), /scope/);
});

test("API cooldown honors numeric Retry-After seconds", () => {
  const now = Date.parse("2026-11-19T00:00:00.000Z");
  assert.equal(apiCooldownUntil({ status: 429, retryAfter: "120" }, now), new Date(now + 120_000).toISOString());
});

test("API cooldown honors HTTP-date Retry-After", () => {
  const now = Date.parse("2026-11-19T00:00:00.000Z");
  const retryAt = new Date(now + 90_000).toUTCString();
  assert.equal(apiCooldownUntil({ status: 503, retryAfter: retryAt }, now), new Date(now + 90_000).toISOString());
});

test("API cooldown honors x-ratelimit-reset epoch seconds and falls back safely", () => {
  const now = Date.parse("2026-11-19T00:00:00.000Z");
  assert.equal(apiCooldownUntil({ status: 403, message: "API rate limit exceeded", rateLimitReset: String((now + 600_000) / 1000) }, now), new Date(now + 600_000).toISOString());
  assert.equal(apiCooldownUntil({ status: 429, message: "rate limit exceeded" }, now), new Date(now + COOLDOWN_MS).toISOString());
});

test("planner emits finite deduplicated four-section Runner tasks", () => {
  const task = nextPlannerTask([]);
  assert.ok(task);
  const body = plannerIssueBody(task);
  for (const heading of ["Goal", "Allowed paths", "Acceptance criteria", "Explicit exclusions"]) assert.equal(body.split("## " + heading).length - 1, 1);
  assert.match(body, /<!-- ai-task-generated-by-planner -->/);
  const titles = [task.title];
  let next = nextPlannerTask(titles);
  assert.ok(next);
  assert.notEqual(next.title, task.title);
  titles.push(next.title);
  next = nextPlannerTask(titles);
  assert.ok(next);
  titles.push(next.title);
  assert.equal(nextPlannerTask(titles), null);
});


test("infers task identity from both AI task and codex issue branches", () => {
  assert.equal(inferTaskIssueNumber({ branch: "ai-task/issue-3-abc", body: "<!-- ai-task:3 -->" }), 3);
  assert.equal(inferTaskIssueNumber({ branch: "codex/issue-121-dedupe-ci-triggers" }), 121);
  assert.equal(inferTaskIssueNumber({ body: "<!-- ai-task:94 -->" }), 94);
});

test("rejects mismatched task branch and pull-request issue markers", () => {
  assert.equal(inferTaskIssueNumber({ branch: "codex/issue-121-fix", body: "<!-- ai-task:120 -->" }), null);
  assert.equal(inferTaskIssueNumber({ branch: "review/no-issue", body: "Closes #121" }), null);
});


test("declares the cooldown output writer before the local cooldown fast path", () => {
  const controller = readFileSync(new URL("../scripts/agent-factory-controller.mjs", import.meta.url), "utf8");
  const writer = controller.indexOf("const writeOutput =");
  const fastPath = controller.indexOf('if (mode === "check" && cooldownActive(localState))');
  assert.ok(writer >= 0);
  assert.ok(fastPath > writer);
});


test("does not persist unrelated review-branch CI failures into the factory circuit breaker", () => {
  const workflow = readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");
  const start = workflow.indexOf("  circuit-breaker:");
  assert.ok(start >= 0);
  const job = workflow.slice(start);
  assert.ok(job.includes("github.event_name == 'push'"));
  assert.ok(job.includes("github.ref == 'refs/heads/main'"));
  assert.ok(job.includes("github.event_name == 'pull_request'"));
  assert.ok(job.includes("github.event.pull_request.head.repo.full_name == github.repository"));
  assert.ok(job.includes("startsWith(github.event.pull_request.head.ref, 'ai-task/issue-')"));
  assert.ok(job.includes("startsWith(github.event.pull_request.head.ref, 'codex/issue-')"));
  assert.ok(job.includes("github.event_name == 'repository_dispatch'"));
  assert.ok(job.includes("github.event.action == 'ai-task-ci'"));
  assert.ok(job.includes("pull-requests: read"));
  assert.equal(job.includes("review/"), false);
});


test("resets the global breaker only after successful CI for main or a tracked factory task", () => {
  const workflow = readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");
  const start = workflow.indexOf("  circuit-breaker-success:");
  assert.ok(start >= 0);
  const job = workflow.slice(start);
  assert.ok(job.includes("needs.build.result == 'success'"));
  assert.ok(job.includes("needs.database.result == 'success'"));
  assert.ok(job.includes("AGENT_FACTORY_MODE: success"));
  assert.ok(job.includes("AGENT_FACTORY_MODE: candidate"));
  assert.ok(job.includes("CI_CONCLUSION: success"));
  assert.ok(job.includes("PULL_REQUEST_NUMBER: ${{ needs.resolve-candidate.outputs.pull_request_number }}"));
  assert.ok(job.includes("HEAD_SHA: ${{ needs.resolve-candidate.outputs.head_sha }}"));
  assert.ok(job.includes("CI_RUN_ID: ${{ github.run_id }}"));
  assert.ok(job.includes("CI_RUN_ATTEMPT: ${{ github.run_attempt }}"));
  assert.ok(job.includes("Reset global breaker after healthy non-task CI"));
  assert.ok(job.includes("contents: read"));
  assert.ok(job.includes("github.ref == 'refs/heads/main'"));
  assert.ok(job.includes("startsWith(github.event.pull_request.head.ref, 'ai-task/issue-')"));
  assert.ok(job.includes("startsWith(github.event.pull_request.head.ref, 'codex/issue-')"));
  assert.ok(job.includes("github.event.action == 'ai-task-ci'"));
  assert.ok(job.includes("pull-requests: read"));
  assert.equal(job.includes("review/"), false);
});


test("verified task CI success clears both that task's quarantine and the global breaker", () => {
  const previous = {
    consecutive_failures: 17,
    cooldown_until: "2026-11-19T04:22:47.792Z",
    task_failures: { "116": 3, "121": 1 },
    skipped_issue_numbers: [116],
    last_error: "old global failure",
  };
  const reset = successState(1234, previous, 116, "task_and_system");
  assert.equal(reset.consecutive_failures, 0);
  assert.equal(reset.cooldown_until, null);
  assert.deepEqual(reset.task_failures, { "121": 1 });
  assert.deepEqual(reset.skipped_issue_numbers, []);
  assert.equal(reset.last_error, null);
});


test("AI task publisher requires explicit human approval and never promises automatic merge", () => {
  const publisher = readFileSync(new URL("../scripts/publish-agent-patch.mjs", import.meta.url), "utf8");
  assert.ok(publisher.includes('merge_policy: "human_approval_required"'));
  assert.ok(publisher.includes("automatic_merge: false"));
  assert.ok(publisher.includes("a human must review and explicitly approve the PR before any merge"));
  assert.ok(publisher.includes("A human must review and explicitly merge the pull request."));
  assert.equal(publisher.includes("automatic_merge_policy"), false);
  assert.equal(publisher.includes("ci_gated_squash"), false);
  assert.equal(/will be squash-merged automatically/i.test(publisher), false);
});


test("passes the reserved lease ID to the task-failure recorder", () => {
  const workflow = readFileSync(new URL("../.github/workflows/agent-task-preflight.yml", import.meta.url), "utf8");
  const start = workflow.indexOf("      - name: Record failed task and activate cooldown after three consecutive failures");
  assert.ok(start >= 0, "factory failure recorder step must exist");
  const next = workflow.indexOf("\n      - name:", start + 1);
  const section = workflow.slice(start, next < 0 ? workflow.length : next);

  assert.match(
    section,
    /AGENT_FACTORY_LEASE_ID\s*:/,
    "task-scoped failures must not shadow the lease ID exported to subsequent steps through GITHUB_ENV"
  );
  assert.match(section, /FAILED_ISSUE_NUMBER:/);
  assert.match(section, /AGENT_FACTORY_MODE:\s*failure/);

  const controller = readFileSync(new URL("../scripts/agent-factory-v2-controller.mjs", import.meta.url), "utf8");
  assert.match(
    controller,
    /writeEnv\("AGENT_FACTORY_LEASE_ID",\s*result\.outputs\.lease_id\)/,
    "the reserve controller must publish the lease ID to GITHUB_ENV for subsequent steps"
  );
});
