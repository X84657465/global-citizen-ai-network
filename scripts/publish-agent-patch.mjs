import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { validateAgentPlan } from "../lib/agent-plan-validation.mjs";
import { validatePatchManifest } from "../lib/agent-patch-validation.mjs";
import { scratchPatchEvidenceMatches } from "../lib/agent-scratch-evidence.mjs";
import { createGitHubApiClient } from "../lib/github-api-client.mjs";
import { ensureDeterministicBranch } from "../lib/agent-publisher-branch.mjs";
import { collectGitHubPages } from "../lib/github-pagination.mjs";

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
if (scratch?.schema_version !== 2 ||
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

if (!scratchPatchEvidenceMatches(scratch.patched_files, validatedPatch.files)) {
  fail("Scratch test evidence does not match the exact validated patch content.");
}

const canonicalPatchFiles = [...validatedPatch.files].sort((a, b) => a.path.localeCompare(b.path));
const digest = createHash("sha256")
  .update(JSON.stringify(canonicalPatchFiles))
  .digest("hex")
  .slice(0, 12);
const branch = "ai-task/issue-" + issueNumber + "-" + digest;
const safeIssueTitle = task.issue.title.replace(/[\r\n]+/g, " ").trim().slice(0, 120);
const pullTitle = ("[AI Task #" + issueNumber + "] " + safeIssueTitle).slice(0, 240);
const changedFiles = canonicalPatchFiles.map((file) => "- " + file.path + " (" + file.operation + ")").join("\n");
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
    changed_files: canonicalPatchFiles.map((file) => file.path),
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

const apiBase = (process.env.GITHUB_API_URL || "https://api.github.com").replace(/\\/+$/, "");
const githubApi = createGitHubApiClient({
  baseUrl: apiBase,
  token,
  timeoutMs: 20_000,
  maxRetries: 2,
  maxInlineRetryDelayMs: 30_000,
});
const api = (path, method = "GET", payload = undefined) =>
  githubApi.request(path, { method, body: payload });
 
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

  const openPulls = await collectGitHubPages((page) =>
    api("/repos/" + repository + "/pulls?state=open&per_page=100&page=" + page)
  );
  if (!Array.isArray(openPulls)) fail("GitHub returned an invalid open pull-request list.");
  const matchingPulls = openPulls.filter((pull) => pull.body?.includes("<!-- ai-task:" + issueNumber + " -->"));
  if (matchingPulls.length > 1) fail("Multiple open pull requests exist for this task; refusing ambiguous publication.");
  const existingPull = matchingPulls[0] ?? null;
  if (existingPull && existingPull.head?.ref !== branch) {
    saveResult({
      schema_version: 1,
      state: "existing_open_pr",
      repository,
      issue_number: issueNumber,
      pull_request_number: existingPull.number,
      pull_request_url: existingPull.html_url,
      existing_branch: existingPull.head?.ref ?? null,
      expected_branch: branch,
      different_candidate_branch: true,
      no_duplicate_created: true,
      ci_dispatch_skipped: true,
      merge_policy: "human_approval_required",
      automatic_merge: false,
      production_deployment: false,
    });
    console.log("An open PR already exists for this task on a different candidate branch: " + existingPull.html_url);
    process.exit(0);
  }

  const baseCommitInfo = await api("/repos/" + repository + "/git/commits/" + baseCommit);
  const blobEntries = [];
  for (const file of canonicalPatchFiles) {
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
  const branchResult = await ensureDeterministicBranch(
    api,
    repository,
    branch,
    baseCommit,
    tree.sha,
    "feat(ai-task): " + safeIssueTitle + " (#" + issueNumber + ")",
  );
  const commitSha = branchResult.commit_sha;

  if (existingPull) {
    if (existingPull.head?.sha !== commitSha) {
      fail("Existing task PR head SHA does not match the exact deterministic candidate branch.");
    }
    await dispatchAiTaskCi(existingPull);
    saveResult({
      schema_version: 1,
      state: "existing_open_pr",
      repository,
      issue_number: issueNumber,
      pull_request_number: existingPull.number,
      pull_request_url: existingPull.html_url,
      branch,
      commit_sha: commitSha,
      no_duplicate_created: true,
      ci_dispatch_requested: true,
      merge_policy: "human_approval_required",
      automatic_merge: false,
      production_deployment: false,
    });
    console.log("The exact deterministic candidate PR already exists and was revalidated: " + existingPull.html_url);
    process.exit(0);
  }

  let pull;
  let pullCreated = false;
  try {
    pull = await api("/repos/" + repository + "/pulls", "POST", {
      title: pullTitle,
      head: owner + ":" + branch,
      base: defaultBranch,
      body,
      draft: true,
    });
    pullCreated = true;
  } catch (createError) {
    const refreshedPulls = await collectGitHubPages((page) =>
      api("/repos/" + repository + "/pulls?state=open&per_page=100&page=" + page)
    );
    const recovered = Array.isArray(refreshedPulls)
      ? refreshedPulls.find((item) =>
          item.body?.includes("<!-- ai-task:" + issueNumber + " -->") &&
          item.head?.ref === branch &&
          item.head?.sha === commitSha)
      : null;
    if (!recovered) throw createError;
    pull = recovered;
  }

  if (pull.head?.ref !== branch || pull.head?.sha !== commitSha) {
    fail("Created task PR does not point to the exact deterministic candidate commit.");
  }


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
    commit_sha: commitSha,
    branch_reused: !branchResult.created,
    publication_recovered: !pullCreated,
    changed_files: validatedPatch.files.map((file) => file.path),
    merge_policy: "human_approval_required",
    automatic_merge: false,
    production_deployment: false,
  });
  console.log("Created draft PR after successful isolated validation: " + pull.html_url);
} catch (error) {
  fail(error instanceof Error ? error.message : "Unexpected GitHub publication failure.");
}
