import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const candidates = [
  "tests/ai-provider-response.test.ts",
  "tests/ai-pending-retry.test.ts",
  "tests/ai-pending-recovery.test.ts",
  "tests/ai-config.test.ts",
  "tests/ai-history.test.ts",
  "tests/contribution-task-validation.test.ts",
  "tests/ai-idempotency.test.ts",
  "tests/http-read-json-body.test.ts",
  "tests/security-headers.test.ts",
  "tests/ai-reconciliation-form-error.test.ts",
  "tests/ai-reconciliation-input.test.ts",
  "tests/ai-reconciliation-auth.test.ts",
  "tests/ai-cost.test.ts",
  "tests/agent-task-validation.test.mjs",
  "tests/agent-patch-validation.test.mjs",
  "tests/agent-plan-validation.test.mjs",
  "tests/agent-factory-policy.test.mjs",
  "tests/agent-factory-state-machine.test.mjs",
  "tests/agent-task-queue.test.mjs",
  "tests/github-api-client.test.mjs",
  "tests/agent-factory-state-store.test.mjs",
  "tests/agent-factory-lifecycle.integration.test.mjs",
  "tests/agent-path-safety.test.mjs",
  "tests/agent-scratch-evidence.test.mjs",
  "tests/agent-publisher-branch.test.mjs",
  "tests/agent-factory-controller.test.mjs",
  "tests/agent-task-pr-metadata.test.mjs",
  "tests/github-pagination.test.mjs",
  "tests/ollama-generate-stream.test.mjs",
  "tests/ollama-smoke-test.test.mjs",
  "tests/gcan-homepage.test.mjs"
];

const testFiles = candidates.filter((path) => existsSync(path));
if (testFiles.length === 0) {
  console.error("No configured unit test files were found.");
  process.exitCode = 1;
} else {
  console.log(`Running ${testFiles.length} available unit test files.`);
  const result = spawnSync(
    process.execPath,
    ["--experimental-strip-types", "--test", ...testFiles],
    { stdio: "inherit" }
  );
  if (result.error) {
    console.error(result.error);
    process.exitCode = 1;
  } else {
    process.exitCode = result.status ?? 1;
  }
}
