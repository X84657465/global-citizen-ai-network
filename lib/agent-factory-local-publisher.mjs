import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { validateAgentPlan } from "./agent-plan-validation.mjs";
import { validatePatchManifest } from "./agent-patch-validation.mjs";
import { restoreLocalFactoryTask } from "./agent-factory-local-adapter.mjs";
import { verifyTrustedAcceptanceOracle } from "./agent-factory-trusted-oracle.mjs";
import { verifyLocalFactoryPublicationTarget } from "./agent-factory-local-publication-contract.mjs";
import { ensureDeterministicBranch } from "./agent-publisher-branch.mjs";
import { collectGitHubPages } from "./github-pagination.mjs";
import { createGitHubApiClient } from "./github-api-client.mjs";

const SHA_RE = /^[a-f0-9]{40}$/i;
const MAX_PATCH_BYTES = 256 * 1024;

function reject(message, cause = undefined) {
  const error = new Error(message, cause ? { cause } : undefined);
  error.name = "LocalFactoryPublisherError";
  error.scope = "task";
  throw error;
}

function git(repositoryRoot, args, { encoding = "utf8", maxBuffer = 4 * 1024 * 1024 } = {}) {
  try {
    return execFileSync("git", args, {
      cwd: repositoryRoot,
      encoding,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer,
    });
  } catch (error) {
    reject("Local publication Git verification failed: " + args[0], error);
  }
}

function validTapEvidence(evidence, expectedFiles) {
  const summary = evidence?.tap_summary;
  return evidence?.exit_code === 0 &&
    Number.isSafeInteger(evidence?.passed_tests) && evidence.passed_tests > 0 &&
    summary?.valid === true &&
    summary.tests === evidence.passed_tests &&
    summary.pass === summary.tests &&
    summary.fail === 0 && summary.cancelled === 0 &&
    summary.skipped === 0 && summary.todo === 0 &&
    Array.isArray(evidence.test_files) &&
    JSON.stringify([...evidence.test_files].sort()) === JSON.stringify([...expectedFiles].sort());
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalPatchDigest(files) {
  return sha256(JSON.stringify(files.map((file) => ({
    path: file.path,
    operation: file.operation,
    content: file.content,
  }))));
}

function makePublicationIdentity({ taskId, target, branch, patchSha256 }) {
  const idempotencyKey = sha256([
    "gcan-local-factory-publish-v1",
    taskId,
    target.base_sha,
    target.target_sha256,
    patchSha256,
  ].join("\n"));
  return {
    idempotency_key: idempotencyKey,
    repository: target.repository,
    base_branch: target.base_branch,
    base_sha: target.base_sha,
    contract_sha256: target.contract_sha256,
    target_sha256: target.target_sha256,
    branch,
    patch_sha256: patchSha256,
  };
}

function validateAcceptedTask({ taskRecord, taskEvents, repositoryRoot }) {
  if (!taskRecord || taskRecord.status !== "succeeded" ||
      taskRecord.result?.outcome !== "accepted" ||
      taskRecord.result?.acceptance_status !== "ACCEPTED") {
    reject("Only a SQLite-persisted ACCEPTED task can be published.");
  }
  const id = taskRecord.id;
  if (!Array.isArray(taskEvents) ||
      !taskEvents.some((event) => event.task_id === id && event.event_type === "task_succeeded")) {
    reject("The durable task_succeeded event is missing; refusing publication.");
  }

  const payload = taskRecord.payload;
  const result = taskRecord.result;
  const contract = payload?.trusted_oracle_contract;
  let oracle;
  let target;
  let task;
  try {
    task = restoreLocalFactoryTask(payload.task);
    oracle = verifyTrustedAcceptanceOracle({
      repositoryRoot,
      contract,
      taskId: id,
    });
    target = verifyLocalFactoryPublicationTarget(payload.publication_target, {
      taskId: id,
      contract,
    });
  } catch (error) {
    reject("Accepted task contract validation failed: " + (error instanceof Error ? error.message : "unknown validation error"), error);
  }
  const baseSha = git(repositoryRoot, ["rev-parse", "HEAD"]).trim();
  if (baseSha !== contract.base_sha || target.base_sha !== baseSha) {
    reject("The local checkout no longer matches the exact task intake base SHA; re-intake against the current base.");
  }
  const worktreeStatus = git(repositoryRoot, ["status", "--porcelain=v1", "--untracked-files=all"]).trim();
  if (worktreeStatus.length > 0) {
    reject("The local checkout is dirty; refusing publication to avoid mixing unrelated work.");
  }

  const planArtifact = result.plan_artifact;
  let plan;
  try {
    plan = validateAgentPlan({
      schema_version: planArtifact?.schema_version,
      tasks: planArtifact?.tasks,
    }, task);
  } catch (error) {
    reject("Persisted Planner artifact failed publication-time revalidation.", error);
  }
  const plannedPaths = new Set(plan.tasks
    .filter((entry) => entry.role === "implementer" && entry.action === "propose_patch")
    .flatMap((entry) => entry.allowed_paths.map((path) => path.toLowerCase())));
  const patchablePaths = task.allowed_paths.filter((path) => plannedPaths.has(path.toLowerCase()));
  if (patchablePaths.length === 0) reject("The validated plan authorizes no patch paths.");

  const patchArtifact = result.patch_artifact;
  if (patchArtifact?.status !== "VALIDATED_PATCH" ||
      patchArtifact.patch?.schema_version !== 1 || !Array.isArray(patchArtifact.patch.files)) {
    reject("Persisted patch artifact is not a validated patch.");
  }
  const trackedPaths = git(repositoryRoot, ["ls-files", "-z"], { encoding: null })
    .toString("utf8").split("\0").filter(Boolean);
  let patch;
  try {
    patch = validatePatchManifest(
      { schema_version: patchArtifact.patch.schema_version, files: patchArtifact.patch.files },
      { ...task, allowed_paths: patchablePaths },
      trackedPaths,
    );
  } catch (error) {
    reject("Persisted patch failed independent path and content revalidation.", error);
  }
  const canonicalFiles = [...patch.files].sort((a, b) => a.path.localeCompare(b.path));
  const totalBytes = canonicalFiles.reduce((sum, file) => sum + Buffer.byteLength(file.content, "utf8"), 0);
  if (totalBytes < 1 || totalBytes > MAX_PATCH_BYTES) reject("Validated patch is empty or exceeds 256 KiB.");

  const scratch = result.scratch_evidence;
  if (scratch?.status !== "SANDBOX_TESTS_PASSED" ||
      scratch.generated_code_executed !== true ||
      scratch.repository_files_modified !== false ||
      !Array.isArray(scratch.patched_files) ||
      scratch.patched_files.length !== canonicalFiles.length) {
    reject("Persisted scratch evidence is not a complete accepted patch execution record.");
  }
  const expectedScratchFiles = canonicalFiles.map((file) => ({
    path: file.path,
    operation: file.operation,
    bytes: Buffer.byteLength(file.content, "utf8"),
    sha256: sha256(Buffer.from(file.content, "utf8")),
  }));
  const actualScratchFiles = scratch.patched_files.map((file) => ({
    path: file?.path,
    operation: file?.operation,
    bytes: file?.bytes,
    sha256: file?.sha256,
  })).sort((a, b) => String(a.path).localeCompare(String(b.path)));
  if (JSON.stringify(expectedScratchFiles) !== JSON.stringify(actualScratchFiles)) {
    reject("The persisted scratch file list or SHA-256 evidence does not match the exact Patch artifact.");
  }

  const expectedGeneratedTests = canonicalFiles
    .filter((file) => file.path.startsWith("tests/") && file.path.endsWith(".test.mjs"))
    .map((file) => file.path);
  if (!validTapEvidence(scratch.sandbox_evidence, expectedGeneratedTests)) {
    reject("Generated-test TAP evidence is missing, incomplete or not tied to the exact generated test files.");
  }
  const scratchOracleEvidence = scratch.trusted_oracle_evidence;
  if (!validTapEvidence(scratchOracleEvidence, oracle.test_files) ||
      scratchOracleEvidence.contract_sha256 !== contract.contract_sha256 ||
      scratchOracleEvidence.task_id !== id ||
      scratchOracleEvidence.base_sha !== contract.base_sha ||
      !validTapEvidence(result.acceptance_evidence, oracle.test_files) ||
      result.acceptance_evidence.contract_sha256 !== contract.contract_sha256 ||
      result.acceptance_evidence.task_id !== id ||
      result.acceptance_evidence.base_sha !== contract.base_sha ||
      scratchOracleEvidence.exit_code !== result.acceptance_evidence.exit_code ||
      scratchOracleEvidence.passed_tests !== result.acceptance_evidence.passed_tests ||
      JSON.stringify(scratchOracleEvidence.test_files) !== JSON.stringify(result.acceptance_evidence.test_files) ||
      result.trusted_oracle?.valid !== true ||
      result.trusted_oracle.contract_sha256 !== contract.contract_sha256 ||
      result.trusted_oracle.task_id !== id ||
      result.trusted_oracle.base_sha !== contract.base_sha) {
    reject("Independent Trusted Oracle evidence does not match the immutable task contract.");
  }

  return {
    task,
    result,
    contract,
    target,
    files: canonicalFiles,
    patch_sha256: canonicalPatchDigest(canonicalFiles),
  };
}

function markerFor(taskId) {
  return "<!-- gcan-local-task:" + taskId + " -->";
}

function publicationBody({ taskId, target, files, result, contract, branch, commitSha }) {
  const changed = files.map((file) => "- " + file.path + " (" + file.operation + ")").join("\n");
  const criteria = target.acceptance_criteria?.map((item) => "- " + item).join("\n") ?? "";
  return [
    markerFor(taskId),
    "## Locally accepted Factory task",
    "",
    "This Draft PR was generated from a locally persisted Agent Factory task after independent Trusted Oracle acceptance.",
    "",
    "- Task ID: `" + taskId + "`",
    "- Intake base SHA: `" + target.base_sha + "`",
    "- Trusted Oracle contract SHA-256: `" + contract.contract_sha256 + "`",
    "- Deterministic branch: `" + branch + "`",
    "- Candidate commit: `" + commitSha + "`",
    "",
    "### Changed files",
    changed,
    "",
    "### Acceptance criteria",
    criteria || "- No additional task-specific criteria supplied.",
    "",
    "### Validation evidence",
    "- Local Ollama plan and patch passed schema / path-policy validation.",
    "- Generated tests: " + result.scratch_evidence.sandbox_evidence.passed_tests + " passed.",
    "- Independent Trusted Oracle tests: " + result.acceptance_evidence.passed_tests + " passed.",
    "- Both TAP runs: exit code 0, zero fail/cancel/skip/todo.",
    "- SQLite persisted ACCEPTED result and exact evidence before publication.",
    "",
    "### Safety boundary",
    "- This PR is Draft and requires exact-HEAD repository CI plus independent human review.",
    "- No automatic approval, merge, production deployment, or database write was performed.",
    "- The publisher only writes the validated allowlisted files to the isolated task branch.",
  ].join("\n");
}

async function listTaskPulls(api, repository, taskId) {
  const pulls = await collectGitHubPages((page) =>
    api("/repos/" + repository + "/pulls?state=all&per_page=100&page=" + page)
  );
  if (!Array.isArray(pulls)) reject("GitHub returned an invalid pull-request listing.");
  return pulls.filter((pull) => typeof pull.body === "string" && pull.body.includes(markerFor(taskId)));
}

export async function publishAcceptedLocalFactoryTask({
  taskRecord,
  taskEvents,
  existingPublication = null,
  repositoryRoot = process.cwd(),
  api = null,
  token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || "",
  apiBase = process.env.GITHUB_API_URL || "https://api.github.com",
  dryRun = false,
  persistPublication = null,
} = {}) {
  const accepted = validateAcceptedTask({ taskRecord, taskEvents, repositoryRoot });
  const taskId = taskRecord.id;
  const { target, contract, result, files, patch_sha256 } = accepted;
  const owner = target.repository.split("/")[0];
  const branch = "factory/local-task/" + taskId + "-" + patch_sha256.slice(0, 12);
  const identity = makePublicationIdentity({ taskId, target, branch, patchSha256 });

  if (existingPublication) {
    for (const [key, value] of Object.entries(identity)) {
      if (existingPublication[key] !== value) {
        reject("Stored publication record no longer matches the accepted task's deterministic publication identity.");
      }
    }
  }

  const save = async (state, extras = {}) => {
    const value = { ...identity, state, ...extras };
    if (typeof persistPublication === "function") await persistPublication(value);
    return value;
  };
  if (dryRun) {
    return {
      state: "dry_run",
      task_id: taskId,
      repository: target.repository,
      base_branch: target.base_branch,
      base_sha: target.base_sha,
      branch,
      patch_sha256,
      idempotency_key: identity.idempotency_key,
      changed_files: files.map((file) => file.path),
      no_remote_writes: true,
    };
  }

  await save("prepared");
  if (!token && !api) reject("GH_TOKEN or GITHUB_TOKEN with contents:write and pull-requests:write is required for Draft PR publication.");
  const client = api ? null : createGitHubApiClient({
    baseUrl: apiBase.replace(/\\/+$/, ""),
    token,
    timeoutMs: 20_000,
    maxRetries: 2,
    maxInlineRetryDelayMs: 30_000,
  });
  const github = api ?? ((path, method = "GET", payload = undefined) =>
    client.request(path, { method, body: payload }));
  const basePath = "/repos/" + target.repository;
  let baseBranch;
  try {
    baseBranch = await github(basePath + "/branches/" + encodeURIComponent(target.base_branch));
  } catch (error) {
    reject("Unable to read the publication base branch; no remote write has been attempted.", error);
  }
  if (baseBranch?.commit?.sha !== target.base_sha) {
    reject("Remote base branch advanced since task intake; refusing to publish stale accepted code.");
  }

  const existingPulls = await listTaskPulls(github, target.repository, taskId);
  if (existingPulls.length > 1) reject("Multiple Pull Requests already carry this task marker; refusing ambiguous recovery.");
  let existingPull = existingPulls[0] ?? null;
  if (existingPull && (existingPull.head?.ref !== branch ||
      !SHA_RE.test(existingPull.head?.sha ?? "") ||
      existingPull.base?.ref !== target.base_branch ||
      existingPull.state !== "open" || existingPull.draft !== true)) {
    reject("An existing task PR does not match the exact deterministic branch/base or is no longer an open Draft.");
  }
  if (existingPublication?.state === "draft_pr_created" && !existingPull) {
    reject("SQLite records a Draft PR, but no matching remote PR exists; refusing to create a duplicate after remote deletion.");
  }

  let commitSha = existingPublication?.commit_sha ?? null;
  if (existingPull) {
    if (commitSha && existingPull.head.sha !== commitSha) reject("Existing Draft PR head differs from the persisted publication commit.");
    commitSha = existingPull.head.sha;
  } else {
    const baseCommitInfo = await github(basePath + "/git/commits/" + target.base_sha);
    if (!SHA_RE.test(baseCommitInfo?.tree?.sha ?? "")) reject("GitHub did not return the exact base commit tree.");
    const blobEntries = [];
    for (const file of files) {
      const blob = await github(basePath + "/git/blobs", "POST", {
        content: file.content,
        encoding: "utf-8",
      });
      if (!SHA_RE.test(blob?.sha ?? "")) reject("GitHub did not return a valid blob SHA for " + file.path + ".");
      blobEntries.push({ path: file.path, mode: "100644", type: "blob", sha: blob.sha });
    }
    const tree = await github(basePath + "/git/trees", "POST", {
      base_tree: baseCommitInfo.tree.sha,
      tree: blobEntries,
    });
    if (!SHA_RE.test(tree?.sha ?? "")) reject("GitHub did not return a valid candidate tree SHA.");
    const branchResult = await ensureDeterministicBranch(
      github,
      target.repository,
      branch,
      target.base_sha,
      tree.sha,
      "feat(factory): publish accepted local task " + taskId,
    );
    commitSha = branchResult.commit_sha;
    if (!SHA_RE.test(commitSha ?? "")) reject("Deterministic task branch did not resolve to a valid exact commit.");
    await save("branch_created", { commit_sha: commitSha });
  }

  const currentBase = await github(basePath + "/branches/" + encodeURIComponent(target.base_branch));
  if (currentBase?.commit?.sha !== target.base_sha) {
    reject("Remote base branch advanced during publication; branch is retained but no Draft PR was created.");
  }
  const refreshedPulls = await listTaskPulls(github, target.repository, taskId);
  if (refreshedPulls.length > 1) reject("Multiple task PRs appeared during publication; refusing duplicate creation.");
  existingPull = refreshedPulls[0] ?? existingPull;
  if (existingPull) {
    if (existingPull.head?.ref !== branch || existingPull.head?.sha !== commitSha ||
        existingPull.base?.ref !== target.base_branch || existingPull.state !== "open" || existingPull.draft !== true) {
      reject("The recovered PR does not match the exact branch commit and base.");
    }
  } else {
    const title = ("[Factory Task " + taskId + "] " + taskRecord.title).slice(0, 240);
    const body = publicationBody({ taskId, target: {
      ...target,
      acceptance_criteria: accepted.task.acceptance_criteria,
    }, files, result, contract, branch, commitSha });
    try {
      existingPull = await github(basePath + "/pulls", "POST", {
        title,
        head: owner + ":" + branch,
        base: target.base_branch,
        body,
        draft: true,
      });
    } catch (error) {
      const recovered = await listTaskPulls(github, target.repository, taskId);
      if (recovered.length !== 1) throw error;
      existingPull = recovered[0];
    }
  }
  if (existingPull?.state !== "open" || existingPull?.draft !== true ||
      existingPull?.head?.ref !== branch || existingPull?.head?.sha !== commitSha ||
      existingPull?.base?.ref !== target.base_branch ||
      !Number.isSafeInteger(existingPull.number) || typeof existingPull.html_url !== "string") {
    reject("GitHub did not confirm the exact open Draft PR handoff.");
  }

  await save("draft_pr_created", {
    commit_sha: commitSha,
    pull_request_number: existingPull.number,
    pull_request_url: existingPull.html_url,
  });
  return {
    state: "draft_pr_created",
    task_id: taskId,
    repository: target.repository,
    base_branch: target.base_branch,
    base_sha: target.base_sha,
    branch,
    commit_sha: commitSha,
    pull_request_number: existingPull.number,
    pull_request_url: existingPull.html_url,
    idempotency_key: identity.idempotency_key,
    changed_files: files.map((file) => file.path),
    automatic_merge: false,
    production_deployment: false,
  };
}
