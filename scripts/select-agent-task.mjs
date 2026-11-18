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

const [issues, pulls] = await Promise.all([
  apiGet("/issues?state=open&per_page=100&sort=created&direction=asc"),
  apiGet("/pulls?state=all&per_page=100"),
]);
if (!Array.isArray(issues) || !Array.isArray(pulls)) fail("GitHub queue response has an unexpected shape.");

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
  !alreadyPublished.has(issue.number)
).sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));

// Stable priority order: security and MVP release gates first, then Phase 2,
 // Phase 3 distributed-compute research, and finally Phase 4 governance/reporting.
 // Unknown future tasks remain eligible after the explicitly ranked backlog.
const priorityOrder = [
  17, 3, 71, 94, 81, 97, 95, 72, 73, 74, 75, 96, 76, 86, 82, 83, 84, 85,
  87, 88, 89, 90, 92, 91, 93,
];
const priorityRank = new Map(priorityOrder.map((issueNumber, index) => [issueNumber, index]));
ready.sort((a, b) => {
  const rankA = priorityRank.get(a.number) ?? Number.MAX_SAFE_INTEGER;
  const rankB = priorityRank.get(b.number) ?? Number.MAX_SAFE_INTEGER;
  if (rankA !== rankB) return rankA - rankB;
  return a.number - b.number;
});

const selected = ready[0];
if (!selected) {
  appendFileSync(output, "issue_number=\n", "utf8");
  console.log("Queue empty: no eligible open owner-authored [AI Task] issue remains without an open task PR.");
} else {
  appendFileSync(output, "issue_number=" + selected.number + "\n", "utf8");
  console.log("Selected one queued task: issue #" + selected.number + ". Existing task PRs are excluded; later cycles will pick the next task.");
}
