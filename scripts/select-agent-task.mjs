import { appendFileSync } from "node:fs";

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

const activeStatuses = ["queued", "in_progress", "waiting", "pending", "requested"];
const [issues, pulls, activeRunPages] = await Promise.all([
  apiGet("/issues?state=open&per_page=100&sort=created&direction=asc"),
  apiGet("/pulls?state=all&per_page=100"),
  Promise.all(activeStatuses.map((status) =>
    apiGet("/actions/workflows/agent-task-preflight.yml/runs?status=" + status + "&per_page=100")
  )),
]);
if (!Array.isArray(issues) || !Array.isArray(pulls) || !Array.isArray(activeRunPages)) {
  fail("GitHub queue response has an unexpected shape.");
}

const activeRuns = activeRunPages.flatMap((page) =>
  Array.isArray(page?.workflow_runs) ? page.workflow_runs : []
);
const activeIssueNumbers = new Set();
for (const run of activeRuns) {
  if (run.event !== "issues" || typeof run.display_title !== "string") continue;
  const displayTitle = run.display_title.trim();
  const numberedTitle = displayTitle.match(/\\bIssue\\s+#?(\\d+)\\b/i) ||
    displayTitle.match(/^#(\\d+)\\b/);
  if (numberedTitle) activeIssueNumbers.add(Number(numberedTitle[1]));
  for (const issue of issues) {
    if (!issue.pull_request && typeof issue.title === "string" &&
        (displayTitle === issue.title || displayTitle.includes(issue.title))) {
      activeIssueNumbers.add(issue.number);
    }
  }
}

const owner = repositoryParts[0].toLowerCase();
const alreadyPublished = new Set();
for (const pull of pulls) {
  const match = typeof pull.body === "string" ? pull.body.match(/<!-- ai-task:(\d+) -->/) : null;
  if (match) alreadyPublished.add(Number(match[1]));
}
const ready = issues.filter((issue) =>
  !issue.pull_request &&
  issue.state === "open" &&
  issue.user?.login?.toLowerCase() === owner &&
  typeof issue.title === "string" && issue.title.startsWith("[AI Task]") &&
  !alreadyPublished.has(issue.number) &&
  !activeIssueNumbers.has(issue.number)
).sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));

const selected = ready[0];
if (!selected) {
  appendFileSync(output, "issue_number=\n", "utf8");
  console.log("Queue empty: no eligible open owner-authored [AI Task] issue remains without an open task PR.");
} else {
  appendFileSync(output, "issue_number=" + selected.number + "\n", "utf8");
  console.log("Selected one queued task: issue #" + selected.number + ". Existing task PRs and active or waiting issue runs are excluded; later cycles will pick the next task.");
}
