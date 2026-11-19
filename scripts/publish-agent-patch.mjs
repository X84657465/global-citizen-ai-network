import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { validateAgentPlan } from "../lib/agent-plan-validation.mjs";
import { validatePatchManifest } from "../lib/agent-patch-validation.mjs";

const fail = (message) => {
  console.error("Agent PR publishing rejected: " + message);
  process.exit(1);
};

const readJson = (path, label) => {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    fail(label + " is missing or invalid JSON.");
  }
};

const repository = process.env.GITHUB_REPOSITORY ?? "";
const issueNumber = Number(process.env.ISSUE_NUMBER ?? "");
const dryRun = process.env.PUBLISH_AGENT_DRY_RUN === "true";
const testsPassed = process.env.CANDIDATE_TESTS_PASSED === "true";
const token = process.env.GITHUB_TOKEN ?? "";

if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
  fail("GITHUB_REPOSITORY is missing or invalid.");
}
if (!Number.isInteger(issueNumber) || issueNumber < 1) fail("ISSUE_NUMBER must be a positive integer.");
if (!testsPassed) fail("Candidate tests have not been explicitly marked as passed.");

const [owner] = repository.split("/");
const task = readJson("artifacts/agent-task.json", "Validated task bundle");
const planArtifact = readJson("artifacts/agent-plan.json", "Validated plan");
const patchArtifact = readJson("artifacts/agent-patch.json", "Validated patch proposal");
const scratch = readJson("artifacts/agent-scratch.json", "Scratch test manifest");

if (task?.repository !== repository || task?.mode !== "preflight_only" ||
    task?.ai_execution_enabled !== false || task?.issue?.number !== issueNumber ||
    typeof task.issue.title !== "string" || task.issue.author?.toLowerCase() !== owner.toLowerCase()) {
  fail("Task repository, issue number, or owner authorization does not match this workflow.");
}
if (task.safety?.issue_content_is_untrusted_data !== true ||
    task.safety?.files_were_not_modified !== true ||
    task.safety?.pull_request_was_not_created !== true ||
    task.safety?.production_database_or_deployment_touched !== false) {
  fail("Task safety flags are missing or do not preserve the approval boundary.");
}
if (planArtifact?.execution_mode !== "validated_plan_only" ||
    planArtifact?.ai_execution_enabled !== false ||
    planArtifact?.safety?.no_commands_or_model_code_executed !== true) {
  fail("Only a validated read-only plan can authorize publication.");
}
if (scratch?.schema_version !== 1 ||
    scratch?.repository_files_modified !== false ||
    scratch?.generated_code_executed !== false ||
    typeof scratch.base_commit !== "string" ||
    !Array.isArray(scratch.patched_files)) {
  fail("The isolated scratch test manifest is invalid.");
}

let baseCommit;
try {
  baseCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
} catch {
  fail("Unable to identify the checked-out base commit.");
}
if (scratch.base_commit !== baseCommit) {
  fail("Scratch test evidence does not match the checked-out base commit.");
}

let trackedPaths;
try {
  trackedPaths = execFileSync("git", ["ls-files", "-z"], {
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
  }).split("\0").filter(Boolean);
} catch {
  fail("Unable to inventory tracked repository paths.");
}

let validatedPlan;
try {
  validatedPlan = validateAgentPlan(
    { schema_version: planArtifact.schema_version, tasks: planArtifact.tasks },
    task,
  );
} catch (error) {
  fail(error instanceof Error ? error.message : "Plan revalidation failed.");
}

const plannedPaths = new Set(
  validatedPlan.tasks
    .filter((item) => item.role === "implementer" && item.action === "propose_patch")
    .flatMap((item) => item.allowed_paths.map((path) => String(path).toLowerCase())),
);
const patchablePaths = task.allowed_paths.filter((path) => plannedPaths.has(path.toLowerCase()));
if (patchablePaths.length === 0) fail("The plan did not authorize any patch paths.");

let validatedPatch;
try {
  validatedPatch = validatePatchManifest(
    { schema_version: patchArtifact.schema_version, files: patchArtifact.files },
    { ...task, allowed_paths: patchablePaths },
    trackedPaths,
  );
} catch (error) {
  fail(error instanceof Error ? error.message : "Patch revalidation failed.");
}

const scratchFiles = scratch.patched_files.map((file) => ({
  path: file.path,
  operation: file.operation,
})).sort((a, b) => a.path.localeCompare(b.path));
const patchFiles = validatedPatch.files.map((file) => ({
  path: file.path,
  operation: file.operation,
})).sort((a, b) => a.path.localeCompare(b.path));
if (JSON.stringify(scratchFiles) !== JSON.stringify(patchFiles)) {
  fail("Scratch test evidence does not match the validated patch manifest.");
}

const digest = createHash("sha256")
  .update(JSON.stringify(validatedPatch.files))
  .digest("hex")
  .slice(0, 12);
const branch = "ai-task/issue-" + issueNumber + "-" + digest;
const safeIssueTitle = task.issue.title.replace(/[\r\n]+/g, " ").trim().slice(0, 120);
const pullTitle = ("[AI Task #" + issueNumber + "] " + safeIssueTitle).slice(0, 240);
const changedFiles = validatedPatch.files.map((file) => "- " + file.path + " (" + file.operation + ")").join("\n");
const criteria = task.acceptance_criteria.map((item) => "- " + item).join("\n");
const body = [
  "<!-- ai-task:" + issueNumber + " -->",
  "## Automated candidate change",
  "",
  "This draft pull request was generated from repository-owner task issue #" + issueNumber + " after isolated validation.",
  "",
  "**Source task:** https://github.com/" + repository + "/issues/" + issueNumber,
  "",
  "### Goal",
  task.goal,
  "",
  "### Changed files",
  changedFiles,
  "",
  "### Acceptance criteria",
  criteria,
  "",
  "### Validation evidence",
  "- AI plan schema and path allowlist validated",
  "- Patch manifest revalidated against the task and plan",
  "- Patch applied only to a disposable scratch copy",
  "- Dependencies installed with lifecycle scripts disabled",
  "- Unit tests, TypeScript, and ESLint passed in a non-root container with network disabled",
  "",
  "### Safety boundary",
  "- Draft PR remains open until the repository CI build and PostgreSQL/RLS tests pass",
  "- No production deployment or production database access",
  "- CI results are validation evidence only; a human must review and explicitly approve the PR before any merge",
  "- The factory does not automatically approve, merge, or close the source task issue",
].join("\n");

const resultPath = "artifacts/agent-publish.json";
const saveResult = (result) => {
  mkdirSync("artifacts", { recursive: true });
  writeFileSync(resultPath, JSON.stringify(result, null, 2) + "\n", "utf8");
};

if (dryRun) {
  saveResult({
    schema_version: 1,
    state: "dry_run",
    repository,
    issue_number: issueNumber,
    base_commit: baseCommit,
    branch,
    title: pullTitle,
    draft: true,
    changed_files: validatedPatch.files.map((file) => file.path),
    no_api_writes: true,
    merge_policy: "human_approval_required",
    automatic_merge: false,
    production_deployment: false,
  });
  console.log("PASS: publication payload validated in dry-run mode; no GitHub API writes were made.");
  console.log("Proposed draft branch: " + branch);
  console.log("Proposed changed files: " + validatedPatch.files.length);
  process.exit(0);
}

if (!token) fail("GITHUB_TOKEN is required for draft PR creation.");

const apiBase = (process.env.GITHUB_API_URL || "https://api.github.com").replace(/\/+$/, "");
const api = async (path, method = "GET", payload = undefined) => {
  let response;
  try {
    response = await fetch(apiBase + path, {
      method,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: "Bearer " + token,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(payload ? { "Content-Type": "application/json" } : {}),
      },
      ...(payload ? { body: JSON.stringify(payload) } : {}),
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw new Error("GitHub API network request failed: " + method + " " + path);
  }

  const responseText = await response.text();
  let data = null;
  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      throw new Error("GitHub API returned a non-JSON response for " + path);
    }
  }
  if (!response.ok) {
    const message = typeof data?.message === "string" ? data.message.slice(0, 300) : "request failed";
    throw new Error("GitHub API " + method + " " + path + " returned HTTP " + response.status + ": " + message);
  }
  return data;
};

const dispatchAiTaskCi = async (pull) => {
  await api("/dispatches", "POST", {
    event_type: "ai-task-ci",
    client_payload: {
      pull_request_number: pull.number,
      head_sha: pull.head.sha,
    },
  });
};

try {
  const repoInfo = await api("/repos/" + repository);
  const defaultBranch = repoInfo.default_branch;
  if (typeof defaultBranch !== "string" || !defaultBranch) fail("Repository default branch is unavailable.");

  const branchInfo = await api("/repos/" + repository + "/branches/" + encodeURIComponent(defaultBranch));
  if (branchInfo.commit?.sha !== baseCommit) {
    fail("Default branch advanced after candidate tests; rerun the task against the latest base.");
  }

  const openPulls = await api("/repos/" + repository + "/pulls?state=open&per_page=100");
  const existingPull = openPulls.find((pull) => pull.body?.includes("<!-- ai-task:" + issueNumber + " -->"));
  if (existingPull) {
    await dispatchAiTaskCi(existingPull);
    saveResult({
      schema_version: 1,
      state: "existing_open_pr",
      repository,
      issue_number: issueNumber,
      pull_request_number: existingPull.number,
      pull_request_url: existingPull.html_url,
      no_duplicate_created: true,
      merge_policy: "human_approval_required",
      automatic_merge: false,
      production_deployment: false,
    });
    console.log("An open PR already exists for this task: " + existingPull.html_url);
    process.exit(0);
  }

  const baseCommitInfo = await api("/repos/" + repository + "/git/commits/" + baseCommit);
  const blobEntries = [];
  for (const file of validatedPatch.files) {
    const blob = await api("/repos/" + repository + "/git/blobs", "POST", {
      content: file.content,
      encoding: "utf-8",
    });
    blobEntries.push({
      path: file.path,
      mode: "100644",
      type: "blob",
      sha: blob.sha,
    });
  }

  const tree = await api("/repos/" + repository + "/git/trees", "POST", {
    base_tree: baseCommitInfo.tree.sha,
    tree: blobEntries,
  });
  const commit = await api("/repos/" + repository + "/git/commits", "POST", {
    message: "feat(ai-task): " + safeIssueTitle + " (#" + issueNumber + ")",
    tree: tree.sha,
    parents: [baseCommit],
  });

  await api("/repos/" + repository + "/git/refs", "POST", {
    ref: "refs/heads/" + branch,
    sha: commit.sha,
  });

  const pull = await api("/repos/" + repository + "/pulls", "POST", {
    title: pullTitle,
    head: owner + ":" + branch,
    base: defaultBranch,
    body,
    draft: true,
  });

  // The pull_request opened event runs CI for this new draft PR. Keep repository_dispatch
  // for explicit revalidation of an already-open PR above to avoid duplicate full CI runs.

  try {
    await api("/repos/" + repository + "/issues/" + issueNumber + "/comments", "POST", {
      body: "The automated candidate passed isolated tests and a draft pull request is awaiting repository CI and human review: " + pull.html_url + "\n\nNo merge, source-issue closure, or production deployment was performed. A human must review and explicitly merge the pull request.",
    });
  } catch (error) {
    console.warn("Draft PR was created, but the source issue comment could not be posted: " + error.message);
  }

  saveResult({
    schema_version: 1,
    state: "draft_pr_created",
    repository,
    issue_number: issueNumber,
    pull_request_number: pull.number,
    pull_request_url: pull.html_url,
    branch,
    base_branch: defaultBranch,
    base_commit: baseCommit,
    commit_sha: commit.sha,
    changed_files: validatedPatch.files.map((file) => file.path),
    merge_policy: "human_approval_required",
    automatic_merge: false,
    production_deployment: false,
  });
  console.log("Created draft PR after successful isolated validation: " + pull.html_url);
} catch (error) {
  fail(error instanceof Error ? error.message : "Unexpected GitHub publication failure.");
}
