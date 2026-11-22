import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { validateAndBuildTask } from "../lib/agent-task-validation.mjs";
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

const response = await fetch(
  "https://api.github.com/repos/" + repository + "/issues/" + issueNumber,
  {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: "Bearer " + token,
      "X-GitHub-Api-Version": "2022-11-28",
    },
    signal: AbortSignal.timeout(10000),
  },
);

let issue;
if (!response.ok) {
  let responseBody = {};
  try { responseBody = await response.json(); } catch { /* retain status and headers */ }
  const message = String(responseBody?.message ?? response.statusText ?? "request failed").slice(0, 500);
  const rateLimited = response.status === 429 ||
    (response.status === 403 && (
      response.headers?.get?.("x-ratelimit-remaining") === "0" ||
      /secondary rate|abuse detection|rate limit/i.test(message)
    ));
  const error = {
    status: response.status,
    message,
    retryAfter: response.headers?.get?.("retry-after") ?? null,
    rateLimitReset: response.headers?.get?.("x-ratelimit-reset") ?? null,
    rateLimitRemaining: response.headers?.get?.("x-ratelimit-remaining") ?? null,
    rateLimited,
  };
  fail("GitHub issue lookup returned HTTP " + response.status + ".", error);
}
try {
  issue = await response.json();
} catch {
  fail("GitHub issue response was not valid JSON.");
}

let task;
try {
  task = validateAndBuildTask(issue, repository);
} catch (error) {
  markTaskScopedFailure();
  fail(error instanceof Error ? error.message : "Unknown task validation error.");
}

try {
  mkdirSync("artifacts", { recursive: true });
  writeFileSync("artifacts/agent-task.json", JSON.stringify(task, null, 2) + "\n", "utf8");
} catch (error) {
  fail(error instanceof Error ? error.message : "Unable to write the task bundle.");
}

console.log("Prepared read-only task bundle for issue #" + issue.number + ". No AI model or code execution was invoked.");
