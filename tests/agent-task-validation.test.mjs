import test from "node:test";
import assert from "node:assert/strict";
import { TaskValidationError, validateAndBuildTask } from "../lib/agent-task-validation.mjs";
import { extractTaskDependencyNumbers, taskDependenciesResolved } from "../lib/agent-task-dependencies.mjs";

const validIssue = (overrides = {}) => ({
  number: 123,
  title: "Add a bounded settings page improvement",
  html_url: "https://github.com/X84657465/global-citizen-ai-network/issues/123",
  state: "open",
  user: { login: "X84657465" },
  body: `## Goal
Implement a small, accessible settings page improvement with clear empty and error states.

## Allowed paths
- app/settings/page.tsx
- tests/settings-page.test.ts

## Acceptance criteria
- Empty state is accessible
- Error state has a retry action

## Explicit exclusions
- No database schema changes
- No production deployment
`,
  ...overrides,
});

test("builds a read-only task bundle from a valid owner-authored issue", () => {
  const task = validateAndBuildTask(validIssue(), "X84657465/global-citizen-ai-network");
  assert.equal(task.mode, "preflight_only");
  assert.equal(task.ai_execution_enabled, false);
  assert.deepEqual(task.allowed_paths, ["app/settings/page.tsx", "tests/settings-page.test.ts"]);
  assert.equal(task.safety.issue_content_is_untrusted_data, true);
});

test("rejects pull requests and closed issues", () => {
  assert.throws(
    () => validateAndBuildTask(validIssue({ pull_request: { url: "https://example.test" } }), "X84657465/global-citizen-ai-network"),
    TaskValidationError,
  );
  assert.throws(
    () => validateAndBuildTask(validIssue({ state: "closed" }), "X84657465/global-citizen-ai-network"),
    /must be open/,
  );
});

test("rejects tasks authored by anyone other than the repository owner", () => {
  assert.throws(
    () => validateAndBuildTask(validIssue({ user: { login: "someone-else" } }), "X84657465/global-citizen-ai-network"),
    /repository-owner tasks/,
  );
});

test("rejects missing, duplicate, and unexpected sections", () => {
  const missing = validIssue({ body: "## Goal\nA sufficiently long goal that is still incomplete." });
  assert.throws(() => validateAndBuildTask(missing, "X84657465/global-citizen-ai-network"), /Required section/);

  const duplicate = validIssue({ body: validIssue().body + "\n## Goal\nDuplicate goal section." });
  assert.throws(() => validateAndBuildTask(duplicate, "X84657465/global-citizen-ai-network"), /Duplicate section/);

  const unexpected = validIssue({ body: validIssue().body + "\n## Extra\nNot permitted." });
  assert.throws(() => validateAndBuildTask(unexpected, "X84657465/global-citizen-ai-network"), /Unexpected section/);
});

test("rejects non-bullet sections and path traversal", () => {
  const nonBullet = validIssue({ body: validIssue().body.replace("- app/settings/page.tsx", "app/settings/page.tsx") });
  assert.throws(() => validateAndBuildTask(nonBullet, "X84657465/global-citizen-ai-network"), /bullet-list/);

  const traversal = validIssue({ body: validIssue().body.replace("app/settings/page.tsx", "app/../secrets/token.txt") });
  assert.throws(() => validateAndBuildTask(traversal, "X84657465/global-citizen-ai-network"), /Path traversal/);
});

test("accepts safe Next.js dynamic route segments in explicitly allowed paths", () => {
  const body = validIssue().body.replace("app/settings/page.tsx", "app/api/conversations/[id]/route.ts");
  const task = validateAndBuildTask(validIssue({ body }), "X84657465/global-citizen-ai-network");
  assert.deepEqual(task.allowed_paths, ["app/api/conversations/[id]/route.ts", "tests/settings-page.test.ts"]);
});

test("rejects protected roots, dotfiles, duplicate paths, and backslashes", () => {
  for (const unsafePath of [
    ".github/workflows/build.yml",
    "supabase/migrations/001.sql",
    "docs/.env.production",
    "app\\settings\\page.tsx",
    "app/settings/page.tsx",
  ]) {
    const body = validIssue().body.replace("app/settings/page.tsx", unsafePath);
    const issue = validIssue({ body });
    if (unsafePath === "app/settings/page.tsx") {
      const duplicateBody = body.replace("tests/settings-page.test.ts", "app/settings/page.tsx");
      assert.throws(() => validateAndBuildTask(validIssue({ body: duplicateBody }), "X84657465/global-citizen-ai-network"), /Duplicate/);
    } else {
      assert.throws(() => validateAndBuildTask(issue, "X84657465/global-citizen-ai-network"), TaskValidationError);
    }
  }
});

test("rejects oversized bodies and malformed repository names", () => {
  assert.throws(
    () => validateAndBuildTask(validIssue({ body: "x".repeat(20001) }), "X84657465/global-citizen-ai-network"),
    /20,000-character/,
  );
  assert.throws(() => validateAndBuildTask(validIssue(), "not-a-repository"), /Repository name/);
});

test("accepts only explicitly planner-marked automation-authored issues", () => {
  const generated = validIssue({
    user: { login: "github-actions[bot]" },
    body: "<!-- ai-task-generated-by-planner -->\n" + validIssue().body,
  });
  const task = validateAndBuildTask(generated, "X84657465/global-citizen-ai-network");
  assert.equal(task.issue.author, "github-actions[bot]");

  assert.throws(
    () => validateAndBuildTask(validIssue({ user: { login: "github-actions[bot]" } }), "X84657465/global-citizen-ai-network"),
    /repository-owner tasks or explicitly planner-generated tasks/,
  );
});


test("accepts an optional P0-P3 priority section without weakening required sections", () => {
  const issue = validIssue({ body: validIssue().body.replace("## Goal", "## Priority\nP0 — security gate\n\n## Goal") });
  const task = validateAndBuildTask(issue, "X84657465/global-citizen-ai-network");
  assert.equal(task.priority, "P0 — security gate");
  const duplicate = validIssue({ body: issue.body + "\n## Priority\nP1" });
  assert.throws(() => validateAndBuildTask(duplicate, "X84657465/global-citizen-ai-network"), /Duplicate section/);
  const invalid = validIssue({ body: validIssue().body.replace("## Goal", "## Priority\nUrgent\n\n## Goal") });
  assert.throws(() => validateAndBuildTask(invalid, "X84657465/global-citizen-ai-network"), /P0-P3/);
});


test("extracts only explicit dependency references without duplicating issue numbers", () => {
  const body = "Goal text mentioning #999 is not a dependency.\nDependencies: #3 uncertain outcome, #84 provider adapter, and #94 migration chain.\nDependencies/context: #84 provider adapter.";
  assert.deepEqual(extractTaskDependencyNumbers(body), [3, 84, 94]);
  assert.deepEqual(extractTaskDependencyNumbers("No dependency declaration."), []);
});

test("blocks tasks until every dependency is completed or its task PR is merged", () => {
  const body = "Dependencies: #3, #84, and #94.";
  const issues = new Map([
    [3, { number: 3, state: "open" }],
    [84, { number: 84, state: "closed", state_reason: "completed" }],
    [94, { number: 94, state: "open" }],
  ]);
  assert.equal(taskDependenciesResolved(body, issues), false);
  assert.equal(taskDependenciesResolved(body, issues, new Set([3, 94])), true);
});

test("does not treat missing or intentionally abandoned dependencies as completed", () => {
  assert.equal(taskDependenciesResolved("Dependencies: #1234.", new Map()), false);
  const notPlanned = new Map([[1234, { number: 1234, state: "closed", state_reason: "not_planned" }]]);
  assert.equal(taskDependenciesResolved("Dependencies: #1234.", notPlanned), false);
  assert.equal(taskDependenciesResolved("No dependencies.", notPlanned), true);
});
