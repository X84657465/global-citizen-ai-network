import { appendFileSync } from "node:fs";
import { collectGitHubPages } from "../lib/github-pagination.mjs";
import { taskDependenciesResolved } from "../lib/agent-task-dependencies.mjs";
import { sortTaskIssues, isMergedTaskPullRequest } from "../lib/agent-task-queue.mjs";

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

const headers = {
  Accept: "application/vnd.github+json",
  Authorization: "Bearer " + token,
  "X-GitHub-Api-Version": "2022-11-28",
};
const apiGet = async (path) => {
  const response = await fetch("https://api.github.com/repos/" + repository + path, {
    headers,
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) fail("GitHub queue lookup returned HTTP " + response.status + ".");
  try { return await response.json(); } catch { fail("GitHub queue response was not valid JSON."); }
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

const owner = repositoryParts[0].toLowerCase();
const skippedIssueNumbers = new Set((process.env.AGENT_FACTORY_SKIPPED_ISSUES ?? "").split(",").map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0));
const alreadyPublished = new Set();
const mergedTaskIssueNumbers = new Set();
const issuesByNumber = new Map(issues.filter((issue) => !issue.pull_request).map((issue) => [issue.number, issue]));
for (const pull of pulls) {
  const match = typeof pull.body === "string" ? pull.body.match(/<!-- ai-task:(\d+) -->/) : null;
  if (match && (pull.state === "open" || isMergedTaskPullRequest(pull))) alreadyPublished.add(Number(match[1]));
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
  !skippedIssueNumbers.has(issue.number)
);
const dependencyReady = ready.filter((issue) => taskDependenciesResolved(issue.body, issuesByNumber, mergedTaskIssueNumbers));
const blockedByDependencies = ready.length - dependencyReady.length;

// Explicit P0-P3 priority first; preserve FIFO order within each priority class.
const orderedTasks = sortTaskIssues(dependencyReady);

const selected = orderedTasks[0];
if (!selected) {
  appendFileSync(output, "issue_number=\n", "utf8");
  console.log(blockedByDependencies > 0
    ? "Queue waiting: " + blockedByDependencies + " task(s) have unresolved dependencies; no dependent task was started."
    : "Queue empty: no eligible open owner-authored [AI Task] issue remains without an open task PR.");
} else {
  appendFileSync(output, "issue_number=" + selected.number + "\n", "utf8");
  console.log("Selected one queued task: issue #" + selected.number + ". Existing task PRs are excluded; later cycles will pick the next task.");
}
