import test from "node:test";
import assert from "node:assert/strict";
import { TaskValidationError, buildAgentTaskContext, validateAndBuildTask } from "../lib/agent-task-validation.mjs";
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


test("requires a human approval label before allowing factory control-plane paths", () => {
  const body = validIssue().body.replace("app/settings/page.tsx", "lib/agent-factory-state-machine.mjs");
  assert.throws(
    () => validateAndBuildTask(validIssue({ body }), "X84657465/global-citizen-ai-network"),
    /factory-control-plane-approved/,
  );
  const task = validateAndBuildTask(validIssue({
    body,
    labels: [{ name: "factory-control-plane-approved" }],
  }), "X84657465/global-citizen-ai-network");
  assert.equal(task.control_plane_authorized, true);
  assert.deepEqual(task.allowed_paths, ["lib/agent-factory-state-machine.mjs", "tests/settings-page.test.ts"]);
});


test("section parsing ignores headings inside matching Markdown fences", () => {
  const body = [
    "## Goal",
    "Implement a bounded settings improvement with accessible empty and error states.",
    "````md",
    "## Allowed paths",
    "- app/should-not-be-accepted.ts",
    "```",
    "~~~",
    "```",
    "````",
    "## Allowed paths",
    "- app/settings/page.tsx",
    "- tests/settings-page.test.ts",
    "## Acceptance criteria",
    "- Empty state is accessible",
    "- Error state has a retry action",
    "## Explicit exclusions",
    "- No database schema changes",
    "- No production deployment",
  ].join("\n");
  const task = validateAndBuildTask(validIssue({ body }), "X84657465/global-citizen-ai-network");
  assert.deepEqual(task.allowed_paths, ["app/settings/page.tsx", "tests/settings-page.test.ts"]);
  assert.match(task.goal, /app\/should-not-be-accepted\.ts/);
});

test("invalid backtick fence info strings do not suppress required task sections", () => {
  const body = [
    "## Goal",
    "Implement a bounded settings improvement with accessible empty and error states.",
    "```invalid`info",
    "## Allowed paths",
    "- app/settings/page.tsx",
    "- tests/settings-page.test.ts",
    "## Acceptance criteria",
    "- Empty state is accessible",
    "- Error state has a retry action",
    "## Explicit exclusions",
    "- No database schema changes",
    "- No production deployment",
  ].join("\n");
  const task = validateAndBuildTask(validIssue({ body }), "X84657465/global-citizen-ai-network");
  assert.deepEqual(task.allowed_paths, ["app/settings/page.tsx", "tests/settings-page.test.ts"]);
});

test("indented code headings cannot create or replace task sections", () => {
  const body = [
    "## Goal",
    "Implement a bounded settings improvement with accessible empty and error states.",
    "    ## Allowed paths",
    "    - app/hidden-example.ts",
    "\t## Acceptance criteria",
    "\t- This is an indented code example, not a section",
    "## Allowed paths",
    "- app/settings/page.tsx",
    "- tests/settings-page.test.ts",
    "## Acceptance criteria",
    "- Empty state is accessible",
    "- Error state has a retry action",
    "## Explicit exclusions",
    "- No database schema changes",
    "- No production deployment",
  ].join("\n");
  const task = validateAndBuildTask(validIssue({ body }), "X84657465/global-citizen-ai-network");
  assert.deepEqual(task.allowed_paths, ["app/settings/page.tsx", "tests/settings-page.test.ts"]);
  assert.ok(task.goal.includes("app/hidden-example.ts"));
});

test("accepts a dependency section and carries normalized dependency issue numbers into the task bundle", () => {
  const body = validIssue().body.replace(
    "## Acceptance criteria",
    "## Dependencies\n- #94 migration-chain validation\n- #74 task discovery\n- #94 duplicate reference\n\n## Acceptance criteria",
  );
  const task = validateAndBuildTask(validIssue({ body }), "X84657465/global-citizen-ai-network");
  assert.deepEqual(task.dependency_issue_numbers, [74, 94]);
});

test("keeps dependency declarations optional and rejects duplicate dependency sections", () => {
  const task = validateAndBuildTask(validIssue(), "X84657465/global-citizen-ai-network");
  assert.deepEqual(task.dependency_issue_numbers, []);
  const withOne = validIssue({ body: validIssue().body.replace("## Acceptance criteria", "## Dependencies\n- #74\n\n## Acceptance criteria") });
  assert.throws(
    () => validateAndBuildTask(validIssue({ body: withOne.body + "\n## Dependencies\n- #75\n" }), "X84657465/global-citizen-ai-network"),
    /Duplicate section/,
  );
});


test("accepts the Dependencies/context section alias in task preflight", () => {
  const body = validIssue().body.replace(
    "## Acceptance criteria",
    "## Dependencies/context\n- #75 submission/review status\n\n## Acceptance criteria",
  );
  const task = validateAndBuildTask(validIssue({ body }), "X84657465/global-citizen-ai-network");
  assert.deepEqual(task.dependency_issue_numbers, [75]);
});

test("rejects indented code-block bullets instead of treating them as task directives", () => {
  const allowedPathExample = validIssue({
    body: validIssue().body.replace(
      "- app/settings/page.tsx",
      "    - app/hidden-example.ts",
    ),
  });
  assert.throws(
    () => validateAndBuildTask(allowedPathExample, "X84657465/global-citizen-ai-network"),
    /indented code-block directives/,
  );

  const acceptanceExample = validIssue({
    body: validIssue().body.replace(
      "- Empty state is accessible",
      "    - Hidden acceptance criterion",
    ),
  });
  assert.throws(
    () => validateAndBuildTask(acceptanceExample, "X84657465/global-citizen-ai-network"),
    /indented code-block directives/,
  );

  const exclusionExample = validIssue({
    body: validIssue().body.replace(
      "- No production deployment",
      "    - Hidden exclusion directive",
    ),
  });
  assert.throws(
    () => validateAndBuildTask(exclusionExample, "X84657465/global-citizen-ai-network"),
    /indented code-block directives/,
  );
});

test("rejects tab-indented code-block bullets in task directive sections", () => {
  const issue = validIssue({
    body: validIssue().body.replace(
      "- app/settings/page.tsx",
      "\t- app/tab-indented-example.ts",
    ),
  });
  assert.throws(
    () => validateAndBuildTask(issue, "X84657465/global-citizen-ai-network"),
    /indented code-block directives/,
  );
});


test("preserves the explicitly supported supplemental task context sections", () => {
  const body = validIssue().body + `
\n## Confirmed evidence
Observed preflight rejection on the exact factory workflow run.

## Finding and required behavior
Preserve required task sections and keep path validation fail-closed.

## Retry scope refinement — 2026-11-21
Keep the existing acceptance criteria and constrain the implementation output.
`;
  const task = validateAndBuildTask(validIssue({ body }), "X84657465/global-citizen-ai-network");
  assert.deepEqual(task.additional_context, {
    "Confirmed evidence": "Observed preflight rejection on the exact factory workflow run.",
    "Finding and required behavior": "Preserve required task sections and keep path validation fail-closed.",
    "Retry scope refinement — 2026-11-21": "Keep the existing acceptance criteria and constrain the implementation output.",
  });
  assert.deepEqual(buildAgentTaskContext(task), {
    goal: task.goal,
    acceptance_criteria: task.acceptance_criteria,
    explicit_exclusions: task.explicit_exclusions,
    required_patch_paths: [],
    forbidden_content: [],
    additional_context: task.additional_context,
  });
  assert.deepEqual(
    buildAgentTaskContext({ ...task, additional_context: undefined }).additional_context,
    {},
  );
});


test("accepts only real calendar dates in retry-scope supplemental headings", () => {
  const validLeapDay = validIssue({
    body: validIssue().body + "\n\n## Retry scope refinement — 2024-02-29\nValid leap-day context.",
  });
  const task = validateAndBuildTask(validLeapDay, "X84657465/global-citizen-ai-network");
  assert.equal(
    task.additional_context["Retry scope refinement — 2024-02-29"],
    "Valid leap-day context.",
  );

  for (const invalidDate of ["2025-02-29", "2026-04-31", "2026-13-01", "2026-00-10"]) {
    const issue = validIssue({
      body: validIssue().body + `\n\n## Retry scope refinement — ${invalidDate}\nInvalid date must not be accepted.`,
    });
    assert.throws(
      () => validateAndBuildTask(issue, "X84657465/global-citizen-ai-network"),
      /Unexpected section: Retry scope refinement/,
    );
  }
});

test("rejects duplicate supplemental context sections and still rejects unknown headings", () => {
  const duplicate = validIssue({
    body: validIssue().body + "\n## Confirmed evidence\nFirst.\n\n## Confirmed evidence\nSecond.",
  });
  assert.throws(
    () => validateAndBuildTask(duplicate, "X84657465/global-citizen-ai-network"),
    /Duplicate section: Confirmed evidence/,
  );
  const unknown = validIssue({
    body: validIssue().body + "\n## Unrecognized operational instructions\nNot accepted.",
  });
  assert.throws(
    () => validateAndBuildTask(unknown, "X84657465/global-citizen-ai-network"),
    /Unexpected section: Unrecognized operational instructions/,
  );
});


test("parses required patch outputs and literal forbidden-content rules into the validated task", () => {
  const body = validIssue().body + "\n\n## Required patch paths\n- tests/security/dependency-audit.test.mjs\n\n## Forbidden content\n- Recommended Next.js version: 13.5.6\n- Recommended ESLint version: 8.55.0\n- Run command: npm audit fix --force\n";
  const task = validateAndBuildTask(validIssue({ body }), "X84657465/global-citizen-ai-network");
  assert.deepEqual(task.required_patch_paths, ["tests/security/dependency-audit.test.mjs"]);
  assert.deepEqual(task.forbidden_content, [
    "Recommended Next.js version: 13.5.6",
    "Recommended ESLint version: 8.55.0",
    "Run command: npm audit fix --force",
  ]);
  const context = buildAgentTaskContext(task);
  assert.deepEqual(context.required_patch_paths, task.required_patch_paths);
  assert.deepEqual(context.forbidden_content, task.forbidden_content);
});

test("rejects required patch outputs outside the task allowlist and duplicate contract entries", () => {
  const outside = validIssue({ body: validIssue().body + "\n\n## Required patch paths\n- docs/not-allowed.md\n" });
  assert.throws(() => validateAndBuildTask(outside, "X84657465/global-citizen-ai-network"), /also appear in the task allowlist/);
  const duplicate = validIssue({ body: validIssue().body + "\n\n## Required patch paths\n- tests/settings-page.test.ts\n- tests/settings-page.test.ts\n" });
  assert.throws(() => validateAndBuildTask(duplicate, "X84657465/global-citizen-ai-network"), /must not contain duplicates/);
});
