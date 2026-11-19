import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FAILURE_THRESHOLD, COOLDOWN_MS, cooldownActive, apiCooldownUntil, nextFailureState, nextPlannerTask, plannerIssueBody, successState } from "../lib/agent-factory-policy.mjs";

test("third consecutive failure activates a fifteen-minute cooldown and task skip is per issue", () => {
  const now = Date.parse("2026-11-19T00:00:00.000Z");
  const first = nextFailureState({}, "first", now);
  const second = nextFailureState(first, "second", now + 1000);
  const third = nextFailureState(second, "third", now + 2000, 123);
  assert.equal(FAILURE_THRESHOLD, 3);
  assert.equal(third.consecutive_failures, 3);
  assert.equal(third.task_failures["123"], 1);
  const secondTaskFailure = nextFailureState(third, "again", now + 3000, 123);
  const thirdTaskFailure = nextFailureState(secondTaskFailure, "again", now + 4000, 123);
  assert.deepEqual(thirdTaskFailure.skipped_issue_numbers, [123]);
  assert.equal(Date.parse(third.cooldown_until), now + 2000 + COOLDOWN_MS);
  assert.equal(cooldownActive(third, now + 3000), true);
  assert.equal(cooldownActive(third, now + 2000 + COOLDOWN_MS + 1), false);
});

test("success resets consecutive failures and only clears the completed issue's retry history", () => {
  const previous = { consecutive_failures: 2, cooldown_until: "2026-11-19T00:20:00.000Z", task_failures: { "12": 2, "13": 1 }, skipped_issue_numbers: [12], last_error: "old" };
  const reset = successState(1234, previous, 12);
  assert.equal(reset.consecutive_failures, 0);
  assert.equal(reset.cooldown_until, null);
  assert.deepEqual(reset.task_failures, { "13": 1 });
  assert.deepEqual(reset.skipped_issue_numbers, []);
  assert.equal(reset.last_error, null);
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
