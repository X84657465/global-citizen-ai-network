import test from "node:test";
import assert from "node:assert/strict";
import { FAILURE_THRESHOLD, COOLDOWN_MS, cooldownActive, nextFailureState, nextPlannerTask, plannerIssueBody, successState } from "../lib/agent-factory-policy.mjs";

test("third consecutive failure activates a fifteen-minute cooldown", () => {
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

test("success resets failure count and cooldown", () => {
  assert.deepEqual(successState(1234), { consecutive_failures: 0, cooldown_until: null, task_failures: {}, skipped_issue_numbers: [], last_failure_at: null, last_error: null, updated_at: new Date(1234).toISOString() });
});

test("planner emits finite deduplicated four-section Runner tasks", () => {
  const task = nextPlannerTask([]);
  assert.ok(task);
  const body = plannerIssueBody(task);
  for (const heading of ["Goal", "Allowed paths", "Acceptance criteria", "Explicit exclusions"]) assert.equal(body.split("## " + heading).length - 1, 1);
  assert.match(body, /<!-- ai-task-generated-by-planner -->/);
  assert.equal(nextPlannerTask([task.title]), null);
});
