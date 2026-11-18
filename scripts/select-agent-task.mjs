import { appendFileSync } from "node:fs";
import { selectNextQueuedTask } from "../lib/agent-task-queue.mjs";

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

const [issues, pulls] = await Promise.all([
  apiGet("/issues?state=open&per_page=100&sort=created&direction=asc"),
  apiGet("/pulls?state=all&per_page=100"),
]);
if (!Array.isArray(issues) || !Array.isArray(pulls)) fail("GitHub queue response has an unexpected shape.");

const queue = selectNextQueuedTask(issues, pulls, repository);
for (const blocked of queue.blocked) {
  console.warn("Skipping malformed task issue #" + blocked.number + ": " + blocked.reason);
}
const selected = queue.selected;

if (!selected) {
  appendFileSync(output, "issue_number=\n", "utf8");
  console.log("Queue empty: no valid eligible task remains. " + queue.blocked.length + " malformed issue(s) were skipped.");
} else {
  appendFileSync(output, "issue_number=" + selected.number + "\n", "utf8");
  console.log(
    "Selected issue #" + selected.number +
    " from " + queue.eligible_count + " valid queued task(s); " +
    queue.retry_count + " task(s) are awaiting their one permitted retry."
  );
}
