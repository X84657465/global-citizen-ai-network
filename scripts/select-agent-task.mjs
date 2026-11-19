import { appendFileSync } from "node:fs";
import { collectGitHubPages } from "../lib/github-pagination.mjs";
import { taskDependenciesResolved } from "../lib/agent-task-dependencies.mjs";
import { sortTaskIssues, isMergedTaskPullRequest } from "../lib/agent-task-queue.mjs";
import { createGitHubApiClient } from "../lib/github-api-client.mjs";
import { createFactoryStateStore } from "../lib/agent-factory-state-store.mjs";

const fail = (message) => {
  console.error("Agent task selection failed: " + message);
  process.exit(1);
};

const repository = process.env.GITHUB_REPOSITORY ?? "";
const token = process.env.GITHUB_TOKEN ?? "";
const output = process.env.GITHUB_OUTPUT ?? "";
const repositoryParts = repository.split("/");
if (repositoryParts.length !== 2 || !repositoryParts.every((part) => /^[A-Za-z0-9_.-]+$/.test(part))) {
  fail("GITHUB_REPOSITORY is missing or invalid.");
}
if (!token) fail("GITHUB_TOKEN is unavailable.");
if (!output) fail("GITHUB_OUTPUT is unavailable.");

const apiBase = (process.env.GITHUB_API_URL || "https://api.github.com").replace(/\/+$/, "");
const api = createGitHubApiClient({
  baseUrl: apiBase,
  token,
  timeoutMs: 15_000,
  maxRetries: 2,
  maxInlineRetryDelayMs: 30_000,
});
const apiGet = async (path) => {
  try {
    return await api.request("/repos/" + repository + path);
  } catch (error) {
    fail("GitHub queue lookup failed: " + (error instanceof Error ? error.message : String(error)));
  }
};

const apiGetAllPages = (path) => collectGitHubPages((page) => {
  const separator = path.includes("?") ? "&" : "?";
  return apiGet(path + separator + "page=" + page);
});

const [issues, pulls] = await Promise.all([
  apiGetAllPages("/issues?state=all&per_page=100&sort=created&direction=asc"),
  apiGetAllPages("/pulls?state=all&per_page=100"),
]);
if (!Array.isArray(issues) || !Array.isArray(pulls)) fail("GitHub queue response has an unexpected shape.");

const stateStore = createFactoryStateStore(api, { repository });
const stored = await stateStore.read();
const factoryState = stored.state;
if (factoryState.active_task) {
  appendFileSync(output, "issue_number=\n", "utf8");
  console.log("Queue paused: Issue #" + factoryState.active_task.issue_number +
    " still owns active lease " + factoryState.active_task.lease_id + ".");
  process.exit(0);
}
const owner = repositoryParts[0].toLowerCase();
const taskStateByIssue = factoryState.tasks ?? {};
const skippedIssueNumbers = new Set((process.env.AGENT_FACTORY_SKIPPED_ISSUES ?? "").split(",").map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0));
const alreadyPublished = new Set();
const mergedTaskIssueNumbers = new Set();
const openTaskPrNumbers = new Set();
const issuesByNumber = new Map(issues.filter((issue) => !issue.pull_request).map((issue) => [issue.number, issue]));
for (const pull of pulls) {
  const match = typeof pull.body === "string" ? pull.body.match(/<!-- ai-task:(\d+) -->/) : null;
  if (match && (pull.state === "open" || isMergedTaskPullRequest(pull))) alreadyPublished.add(Number(match[1]));
  if (match && pull.state === "open") openTaskPrNumbers.add(Number(match[1]));
  if (match && isMergedTaskPullRequest(pull)) mergedTaskIssueNumbers.add(Number(match[1]));
}
const ready = issues.filter((issue) =>
  !issue.pull_request &&
  issue.state === "open" &&
  (issue.user?.login?.toLowerCase() === owner ||
   (issue.user?.login?.toLowerCase() === "github-actions[bot]" &&
    typeof issue.body === "string" && issue.body.includes("<!-- ai-task-generated-by-planner -->"))) &&
  typeof issue.title === "string" && issue.title.startsWith("[AI Task]") &&
  !alreadyPublished.has(issue.number) &&
  !skippedIssueNumbers.has(issue.number) &&
  (!taskStateByIssue[String(issue.number)] ||
   (taskStateByIssue[String(issue.number)].status === "queued" && !taskStateByIssue[String(issue.number)].quarantined))
);
const dependencyReady = ready.filter((issue) => taskDependenciesResolved(issue.body, issuesByNumber, mergedTaskIssueNumbers));
const blockedByDependencies = ready.length - dependencyReady.length;
const openTaskPrs = openTaskPrNumbers.size;

// Explicit P0-P3 priority first; preserve FIFO order within each priority class.
const orderedTasks = sortTaskIssues(dependencyReady);

const selected = orderedTasks[0];
if (!selected) {
  appendFileSync(output, "issue_number=\nblocked_by_dependencies=" + blockedByDependencies + "\nopen_task_prs=" + openTaskPrs + "\n", "utf8");
  console.log(blockedByDependencies > 0
    ? "Queue waiting: " + blockedByDependencies + " task(s) have unresolved dependencies; no dependent task was started."
    : "Queue empty: no eligible open owner-authored [AI Task] issue remains without an open task PR.");
} else {
  appendFileSync(output, "issue_number=" + selected.number + "\nblocked_by_dependencies=" + blockedByDependencies + "\nopen_task_prs=" + openTaskPrs + "\n", "utf8");
  console.log("Selected one queued task: issue #" + selected.number + ". Existing task PRs are excluded; later cycles will pick the next task.");
}
