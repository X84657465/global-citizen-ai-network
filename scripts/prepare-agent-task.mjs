import { mkdirSync, writeFileSync } from "node:fs";
import { validateAndBuildTask } from "../lib/agent-task-validation.mjs";
function fail(message) { console.error("Task preflight rejected: " + message); process.exit(1); }
const issueNumber = process.env.ISSUE_NUMBER || "";
const repository = process.env.GITHUB_REPOSITORY || "";
const token = process.env.GITHUB_TOKEN || "";
if (!/^\d{1,8}$/.test(issueNumber) || Number(issueNumber) < 1) fail("issue_number must be a positive integer.");
if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) fail("GITHUB_REPOSITORY is missing or invalid.");
if (!token) fail("GITHUB_TOKEN is unavailable.");
const response = await fetch("https://api.github.com/repos/" + repository + "/issues/" + issueNumber, {
  headers: { Accept: "application/vnd.github+json", Authorization: "Bearer " + token, "X-GitHub-Api-Version": "2022-11-28" },
  signal: AbortSignal.timeout(10000),
});
if (!response.ok) fail("GitHub issue lookup returned HTTP " + response.status + ".");
let issue;
try { issue = await response.json(); } catch { fail("GitHub issue response was not valid JSON."); }
let task;
try { task = validateAndBuildTask(issue, repository); }
catch (error) { fail(error instanceof Error ? error.message : "Unknown validation error."); }
mkdirSync("artifacts", { recursive: true });
writeFileSync("artifacts/agent-task.json", JSON.stringify(task, null, 2) + "\n", "utf8");
console.log("Prepared read-only task bundle for issue #" + issue.number + ". No AI model or code execution was invoked.");
