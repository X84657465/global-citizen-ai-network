import test from "node:test";
import assert from "node:assert/strict";
import { nextPlannerTask, plannerIssueBody } from "../lib/agent-factory-policy.mjs";

function collectPlannerTasks() {
  const tasks = [];
  const titles = [];
  for (let index = 0; index < 20; index += 1) {
    const task = nextPlannerTask(titles);
    if (!task) return tasks;
    tasks.push(task);
    titles.push(task.title);
  }
  assert.fail("Factory roadmap must remain finite");
}

test("every automatic roadmap candidate is narrowly Agent Factory V2 scoped", () => {
  const tasks = collectPlannerTasks();
  assert.ok(tasks.length > 0);
  for (const task of tasks) {
    assert.match(task.title, /\bfactory\b/i);
    assert.match(task.goal, /agent factory v2/i);
    assert.ok(task.paths.length > 0);
    for (const path of task.paths) {
      assert.match(path, /^(tests|docs)\//);
      assert.doesNotMatch(path, /^(app|src|supabase|\.github|scripts|lib)\//);
    }
    const scope = [task.title, task.goal, ...task.paths, ...task.criteria].join(" ").toLowerCase();
    assert.match(scope, /factory/);
    assert.doesNotMatch(scope, /product ui|member workspace|billing|contribution|revenue|release.readiness|security.evidence matrix/);
  }
});

test("automatic roadmap excludes non-Factory Product and release-gate candidates", () => {
  const tasks = collectPlannerTasks();
  const titles = tasks.map((task) => task.title.toLowerCase()).join("\n");
  assert.doesNotMatch(titles, /product|billing|contribution|release.gate|security evidence/);
  assert.ok(tasks.every((task) => /factory/i.test(task.title)));
});

test("planner title de-duplication is case-insensitive and finite", () => {
  const first = nextPlannerTask([]);
  assert.ok(first);
  assert.equal(nextPlannerTask([first.title.toUpperCase()])?.title, nextPlannerTask([first.title])?.title);
  const all = collectPlannerTasks();
  const allTitles = all.map((task) => task.title);
  assert.equal(new Set(allTitles.map((title) => title.toLowerCase())).size, all.length);
  assert.equal(nextPlannerTask(allTitles), null);
});

test("planner preserves four sections, marker, and strict implementer patch budget contract", () => {
  const task = nextPlannerTask([]);
  const body = plannerIssueBody(task);
  for (const heading of ["Goal", "Allowed paths", "Acceptance criteria", "Explicit exclusions"]) {
    assert.equal(body.split("## " + heading).length - 1, 1);
  }
  assert.match(body, /<!-- ai-task-generated-by-planner -->/);
  assert.match(body, /exactly one implementer task/);
  assert.match(body, /action `propose_patch`/);
  assert.match(body, /numeric `max_output_bytes: 16384`/);
  assert.match(body, /inspect → propose_patch → validate_patch/);
});
