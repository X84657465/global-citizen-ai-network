import { appendFileSync } from "node:fs";

const fail = (message) => {
  console.error("Agent task selection failed: " + message);
  process.exit(1);
};

const repository = process.env.GITHUB_REPOSITORY ?? "";
const token = process.env.GITHUB_TOKEN ?? "";
const output = process.env.GITHUB_OUTPUT ?? "";
if (!/^[A-Za-z0-9_.-]+\\/[A-Za-z0-9_.-]+$/.test(repository)) fail("GITHUB_REPOSITORY is missing or invalid.");
if (!token) fail("GITHUB_TOKEN is unavailable.");
if (!output) fail("GITHUB_OUTPUT is unavailable.");

const response = await fetch("https://api.github.com/repos/" + repository + "/issues?state=open&per_page=100&sort=created&direction=asc", {
  headers: {
    Accept: "application/vnd.github+json",
    Authorization: "Bearer " + token,
    "X-GitHub-Api-Version": "2022-11-28",
  },
  signal: AbortSignal.timeout(15000),
});
if (!response.ok) fail("GitHub issue queue lookup returned HTTP " + response.status + ".");
let issues;
try { issues = await response.json(); } catch { fail("GitHub issue queue response was not valid JSON."); }
if (!Array.isArray(issues)) fail("GitHub issue queue response has an unexpected shape.");

const owner = repository.split("/")[0].toLowerCase();
const ready = issues.filter((issue) =>
  !issue.pull_request &&
  issue.state === "open" &&
  issue.user?.login?.toLowerCase() === owner &&
  typeof issue.title === "string" && issue.title.startsWith("[AI Task]") &&
  Array.isArray(issue.labels) && issue.labels.some((label) => label.name === "ai-task-ready")
).sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));

const selected = ready[0];
if (!selected) {
  appendFileSync(output, "issue_number=\\n", "utf8");
  console.log("Queue empty: no open owner-authored [AI Task] issue has the ai-task-ready label.");
} else {
  appendFileSync(output, "issue_number=" + selected.number + "\\n", "utf8");
  console.log("Selected one queued task: issue #" + selected.number + ". Remaining queued tasks will be handled by later scheduled cycles.");
}
