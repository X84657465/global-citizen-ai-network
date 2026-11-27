import test from "node:test";
import assert from "node:assert/strict";
import { TaskValidationError, validateAndBuildTask } from "../lib/agent-task-validation.mjs";

const REPOSITORY = "X84657465/global-citizen-ai-network";
const TEST_PATH = "tests/agent-task-control-plane-path-allowlist.test.mjs";
const REGISTERED_CONTROL_PLANE_SCRIPTS = [
  "scripts/agent-factory-v2-controller.mjs",
  "scripts/agent-factory-controller.mjs",
  "scripts/select-agent-task.mjs",
  "scripts/prepare-agent-task.mjs",
  "scripts/generate-agent-plan.mjs",
  "scripts/generate-agent-patch.mjs",
  "scripts/apply-agent-patch-to-scratch.mjs",
  "scripts/publish-agent-patch.mjs",
  "scripts/resolve-agent-task-pr.mjs",
];

function issueFor(allowedPath, approved = true) {
  return {
    number: 619,
    title: "Allow only registered control-plane scripts in task paths",
    html_url: "https://github.com/X84657465/global-citizen-ai-network/issues/619",
    state: "open",
    user: { login: "X84657465" },
    labels: approved ? [{ name: "factory-control-plane-approved" }] : [],
    body: `## Goal
Allow a narrowly scoped, explicitly approved registered Factory script path while preserving all other path restrictions.

## Allowed paths
- ${allowedPath}
- ${TEST_PATH}

## Acceptance criteria
- Exact registered control-plane script paths require the approval label.
- Unregistered scripts and case variants remain rejected.

## Explicit exclusions
- No general scripts/ write access.
- No Runner, workflow, secrets, permissions, or durable-state changes.
`,
  };
}

test("accepts every exact registered control-plane script path only with the approval label", () => {
  for (const path of REGISTERED_CONTROL_PLANE_SCRIPTS) {
    const task = validateAndBuildTask(issueFor(path), REPOSITORY);
    assert.deepEqual(task.allowed_paths, [path, TEST_PATH], path);
    assert.equal(task.control_plane_authorized, true, path);
  }
});

test("rejects a registered control-plane script path when the approval label is absent", () => {
  assert.throws(
    () => validateAndBuildTask(issueFor("scripts/agent-factory-controller.mjs", false), REPOSITORY),
    /factory-control-plane-approved/,
  );
});

test("rejects unregistered scripts paths even when the approval label is present", () => {
  assert.throws(
    () => validateAndBuildTask(issueFor("scripts/unregistered-maintenance.mjs"), REPOSITORY),
    /Path root is outside the write allowlist/,
  );
});

test("rejects case variants, traversal, backslashes, absolute paths, and empty segments", () => {
  const unsafePaths = [
    "Scripts/agent-factory-controller.mjs",
    "scripts/AGENT-FACTORY-CONTROLLER.mjs",
    "scripts/agent-factory-controller.MJS",
    "scripts/../lib/agent-task-validation.mjs",
    "scripts\\agent-factory-controller.mjs",
    "/scripts/agent-factory-controller.mjs",
    "C:/scripts/agent-factory-controller.mjs",
    "scripts//agent-factory-controller.mjs",
  ];

  for (const path of unsafePaths) {
    assert.throws(
      () => validateAndBuildTask(issueFor(path), REPOSITORY),
      TaskValidationError,
      path,
    );
  }
});
