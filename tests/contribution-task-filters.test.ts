import test from "node:test";
import assert from "node:assert/strict";
import {
  filterContributionTasks,
  getContributionTaskFilterOptions,
  getLatestSubmissionByTask,
  UNSUBMITTED_FILTER,
} from "../lib/contribution-task-filters.mjs";

const tasks = [
  { id: "task-a", category: "Research" },
  { id: "task-b", category: "Translation" },
  { id: "task-c", category: "Research" },
  { id: "task-d", category: "Review" },
];
const submissions = [
  { id: "submission-c-new", task_id: "task-c", status: "accepted", submitted_at: "2026-11-23T10:00:00Z" },
  { id: "submission-a-new", task_id: "task-a", status: "under_review", submitted_at: "2026-11-23T09:00:00Z" },
  { id: "submission-a-old", task_id: "task-a", status: "submitted", submitted_at: "2026-11-22T09:00:00Z" },
  { id: "submission-outside", task_id: "task-outside", status: "rejected", submitted_at: "2026-11-23T08:00:00Z" },
];

test("category-only filtering returns tasks in the selected available category", () => {
  assert.deepEqual(
    filterContributionTasks(tasks, submissions, { category: "Research" }).map((task) => task.id),
    ["task-a", "task-c"],
  );
});

test("submission-status filtering uses each task's latest submission", () => {
  assert.deepEqual(
    filterContributionTasks(tasks, submissions, { submissionStatus: "under_review" }).map((task) => task.id),
    ["task-a"],
  );
  assert.deepEqual(
    filterContributionTasks(tasks, submissions, { submissionStatus: "submitted" }).map((task) => task.id),
    [],
  );
});

test("category and latest submission status filters combine with AND semantics", () => {
  assert.deepEqual(
    filterContributionTasks(tasks, submissions, {
      category: "Research",
      submissionStatus: "accepted",
    }).map((task) => task.id),
    ["task-c"],
  );
});

test("a filter with no matches returns an empty list", () => {
  assert.deepEqual(
    filterContributionTasks(tasks, submissions, {
      category: "Translation",
      submissionStatus: "accepted",
    }),
    [],
  );
});

test("empty filters restore the complete task list", () => {
  assert.deepEqual(filterContributionTasks(tasks, submissions), tasks);
  assert.deepEqual(filterContributionTasks(tasks, submissions, {
    category: "",
    submissionStatus: "",
  }), tasks);
});

test("tasks without a submission can be filtered as unsubmitted", () => {
  assert.deepEqual(
    filterContributionTasks(tasks, submissions, {
      submissionStatus: UNSUBMITTED_FILTER,
    }).map((task) => task.id),
    ["task-b", "task-d"],
  );
});

test("the first newest-first submission row is authoritative for each task", () => {
  const latest = getLatestSubmissionByTask(submissions);
  assert.equal(latest.get("task-a")?.id, "submission-a-new");
  assert.equal(latest.get("task-a")?.status, "under_review");
});

test("filter choices come only from current tasks and their latest returned submissions", () => {
  assert.deepEqual(getContributionTaskFilterOptions(tasks, submissions), {
    categories: ["Research", "Review", "Translation"],
    submissionStatuses: ["accepted", "under_review"],
    hasUnsubmitted: true,
  });
});

test("filtering preserves the full API task shape for TypeScript callers", () => {
  type ApiContributionTask = {
    id: string;
    category: string;
    title: string;
    description: string;
    acceptance_criteria: string[];
    reward_amount: number;
    reward_currency: string;
    closes_at: string | null;
  };

  const apiTasks: ApiContributionTask[] = [{
    id: "task-rich",
    category: "Research",
    title: "Review evidence",
    description: "Review a source package",
    acceptance_criteria: ["Cite each claim"],
    reward_amount: 25,
    reward_currency: "USD",
    closes_at: null,
  }];

  // Compile-time regression guard: retain all API-specific fields.
  const filtered: ApiContributionTask[] = filterContributionTasks(
    apiTasks,
    [],
    { category: "Research" },
  );

  assert.deepEqual(filtered, apiTasks);
});

