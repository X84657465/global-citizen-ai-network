import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { TaskValidationError, validateAndBuildTask } from "../lib/agent-task-validation.mjs";
import { createGitHubApiClient } from "../lib/github-api-client.mjs";
import { persistApiCooldownDeadline } from "../lib/agent-factory-api-cooldown.mjs";

const fail = (message, error = null) => {
  if (error?.rateLimited === true) {
    try { persistApiCooldownDeadline(error); } catch {
      console.error("Unable to persist the task-preparation rate-limit deadline.");
    }
  }
  console.error("Task preflight rejected: " + message);
  process.exit(1);
};

const markTaskScopedFailure = () => {
  const envFile = process.env.GITHUB_ENV;
  if (envFile) appendFileSync(envFile, "AGENT_FACTORY_FAILURE_SCOPE=task\n", "utf8");
};

const issueNumber = process.env.ISSUE_NUMBER ?? "";
const repository = process.env.GITHUB_REPOSITORY ?? "";
const token = process.env.GITHUB_TOKEN ?? "";

if (!/^\d{1,8}$/.test(issueNumber) || Number(issueNumber) < 1) {
  fail("issue_number must be a positive integer.");
}
if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
  fail("GITHUB_REPOSITORY is missing or invalid.");
}
if (!token) fail("GITHUB_TOKEN is unavailable.");

const githubApi = createGitHubApiClient({
  baseUrl: process.env.GITHUB_API_URL || undefined,
  token,
});

let issue;
try {
  issue = await githubApi.request("/repos/" + repository + "/issues/" + issueNumber);
} catch (error) {
  const status = Number(error?.status) || 0;
  const reason = status > 0 ? "HTTP " + status : "network/timeout";
  fail("GitHub issue lookup failed (" + reason + ").", error);
}

let task;
try {
  task = validateAndBuildTask(issue, repository);
} catch (error) {
  if (error instanceof TaskValidationError) {
    try {
      markTaskScopedFailure();
    } catch {
      // Marker persistence failure remains system-scoped.
    }
  }
  fail(error instanceof Error ? error.message : "Unknown task validation error.");
}

try {
  mkdirSync("artifacts", { recursive: true });
  writeFileSync("artifacts/agent-task.json", JSON.stringify(task, null, 2) + "\n", "utf8");
} catch (error) {
  fail(error instanceof Error ? error.message : "Unable to write the task bundle.");
}

console.log("Prepared read-only task bundle for issue #" + issue.number + ". No AI model or code execution was invoked.");
