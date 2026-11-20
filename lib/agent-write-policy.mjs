const CONTROL_PLANE_FILES = new Set([
  ".github/workflows/agent-task-preflight.yml",
  "lib/agent-write-policy.mjs",
  "lib/agent-task-validation.mjs",
  "lib/agent-patch-validation.mjs",
  "lib/agent-plan-validation.mjs",
  "lib/agent-path-safety.mjs",
  "lib/agent-factory-state-machine.mjs",
  "lib/agent-factory-state-store.mjs",
  "lib/agent-factory-controller.mjs",
  "lib/agent-factory-policy.mjs",
  "lib/agent-failure-context.mjs",
  "lib/agent-task-dependencies.mjs",
  "lib/agent-task-queue.mjs",
  "lib/github-api-client.mjs",
  "lib/github-pagination.mjs",
  "lib/agent-publisher-branch.mjs",
  "lib/agent-scratch-evidence.mjs",
  "lib/agent-task-pr-metadata.mjs",
  "scripts/agent-factory-v2-controller.mjs",
  "scripts/agent-factory-controller.mjs",
  "scripts/select-agent-task.mjs",
  "scripts/prepare-agent-task.mjs",
  "scripts/generate-agent-plan.mjs",
  "scripts/generate-agent-patch.mjs",
  "scripts/apply-agent-patch-to-scratch.mjs",
  "scripts/publish-agent-patch.mjs",
  "scripts/resolve-agent-task-pr.mjs",
]);

export function isControlPlanePath(path) {
  return typeof path === "string" && CONTROL_PLANE_FILES.has(path.toLowerCase());
}

export function isTestPath(path) {
  return typeof path === "string" && path.split("/")[0]?.toLowerCase() === "tests";
}

export function assertAgentWritePolicy(path, operation, task) {
  if (isControlPlanePath(path) && task?.control_plane_authorized !== true) {
    throw new Error("Control-plane files require the factory-control-plane-approved Issue label.");
  }
  if (isTestPath(path) && operation !== "add") {
    throw new Error("Existing test files are immutable to task agents; only new regression test files may be added.");
  }
}
