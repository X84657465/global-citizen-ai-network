import { mkdirSync, writeFileSync } from "node:fs";

const fail = (message) => {
  console.error(`Task preflight rejected: ${message}`);
  process.exit(1);
};

const issueNumber = process.env.ISSUE_NUMBER ?? "";
const repository = process.env.GITHUB_REPOSITORY ?? "";
const token = process.env.GITHUB_TOKEN ?? "";

if (!/^\d{1,8}$/.test(issueNumber)) fail("issue_number must be a positive integer.");
if (!/^[^/]+\/[^/]+$/.test(repository)) fail("GITHUB_REPOSITORY is missing or invalid.");
if (!token) fail("GITHUB_TOKEN is unavailable.");

const [owner] = repository.split("/");
const response = await fetch(
  `https://api.github.com/repos/${repository}/issues/${issueNumber}`,
  {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  },
);

if (!response.ok) fail(`GitHub issue lookup returned HTTP ${response.status}.`);
const issue = await response.json();

if (issue.pull_request) fail("Pull requests cannot be used as task specifications.");
if (issue.state !== "open") fail("The task issue must be open.");
if (issue.user?.login !== owner) fail("Only an issue authored by the repository owner can enter this preflight.");
if (typeof issue.body !== "string" || issue.body.length > 20000) {
  fail("Issue body is missing or exceeds the 20,000-character limit.");
}

function section(name) {
  const heading = `## ${name}`;
  const start = issue.body.indexOf(heading);
  if (start < 0) fail(`Required section is missing: ${heading}`);
  const contentStart = start + heading.length;
  const remainder = issue.body.slice(contentStart);
  const nextHeading = remainder.search(/^## /m);
  return (nextHeading < 0 ? remainder : remainder.slice(0, nextHeading)).trim();
}

function bulletLines(value, label, maxItems) {
  const rawLines = value.split("\n").map((line) => line.trim()).filter(Boolean);
  if (rawLines.some((line) => !/^[-*]\s+/.test(line))) {
    fail(`${label} must use bullet-list items only.`);
  }
  const lines = rawLines.map((line) => line.replace(/^[-*]\s+/, ""));
  if (lines.length === 0 || lines.length > maxItems) {
    fail(`${label} must contain between 1 and ${maxItems} bullet items.`);
  }
  return lines;
}

const goal = section("Goal");
const allowedPaths = bulletLines(section("Allowed paths"), "Allowed paths", 20);
const acceptanceCriteria = bulletLines(section("Acceptance criteria"), "Acceptance criteria", 15);
const explicitExclusions = bulletLines(section("Explicit exclusions"), "Explicit exclusions", 15);

if (goal.length < 20 || goal.length > 3000) fail("Goal must be between 20 and 3,000 characters.");

const pathPattern = /^(app|components|lib|tests|docs)\/[A-Za-z0-9._/-]+$/;
for (const path of allowedPaths) {
  if (
    !pathPattern.test(path) ||
    path.includes("..") ||
    path.includes("//") ||
    path.startsWith(".github/") ||
    path.startsWith("supabase/") ||
    path.includes(".env") ||
    path.includes("secrets")
  ) {
    fail(`Path is outside the initial write allowlist: ${path}`);
  }
}

const task = {
  schema_version: 1,
  mode: "preflight_only",
  ai_execution_enabled: false,
  repository,
  issue: {
    number: issue.number,
    title: issue.title,
    url: issue.html_url,
    author: issue.user.login,
  },
  goal,
  allowed_paths: allowedPaths,
  acceptance_criteria: acceptanceCriteria,
  explicit_exclusions: explicitExclusions,
  safety: {
    issue_content_is_untrusted_data: true,
    repository_code_was_not_executed: true,
    files_were_not_modified: true,
    pull_request_was_not_created: true,
    production_database_or_deployment_touched: false,
  },
};

mkdirSync("artifacts", { recursive: true });
writeFileSync("artifacts/agent-task.json", `${JSON.stringify(task, null, 2)}\n`, "utf8");
console.log(`Prepared read-only task bundle for issue #${issue.number}. No AI model or code execution was invoked.`);
