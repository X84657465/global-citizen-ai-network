import test from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createLocalFactoryQueue } from "../lib/agent-factory-local-queue.mjs";
import { validateLocalFactoryTask } from "../lib/agent-factory-local-adapter.mjs";
import { validateAgentPlan } from "../lib/agent-plan-validation.mjs";
import { validatePatchManifest } from "../lib/agent-patch-validation.mjs";
import { createTrustedAcceptanceOracle, verifyTrustedAcceptanceOracle } from "../lib/agent-factory-trusted-oracle.mjs";
import { createLocalFactoryPublicationTarget } from "../lib/agent-factory-local-publication-contract.mjs";
import { publishAcceptedLocalFactoryTask } from "../lib/agent-factory-local-publisher.mjs";

const sha = (value) => createHash("sha256").update(value).digest("hex");

function git(root, args, options = {}) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  }).trim();
}

function tapEvidence(testFiles, count = 1) {
  return {
    exit_code: 0,
    passed_tests: count,
    test_files: [...testFiles],
    tap_summary: {
      valid: true,
      tests: count,
      pass: count,
      fail: 0,
      cancelled: 0,
      skipped: 0,
      todo: 0,
    },
    stdout: "",
    stderr: "",
    duration_ms: 1,
  };
}

function createAcceptedFixture(t) {
  const root = mkdtempSync(join(tmpdir(), "gcan-local-publisher-repo-"));
  const databaseDirectory = mkdtempSync(join(tmpdir(), "gcan-local-publisher-db-"));
  t.after(() => {
    rmSync(root, { recursive: true, force: true });
    rmSync(databaseDirectory, { recursive: true, force: true });
  });

  git(root, ["init", "-b", "main"]);
  git(root, ["config", "user.email", "factory-publisher-test@example.invalid"]);
  git(root, ["config", "user.name", "Factory Publisher Test"]);
  mkdirSync(join(root, "tests"), { recursive: true });
  writeFileSync(
    join(root, "tests", "oracle.test.mjs"),
    'import test from "node:test";\ntest("trusted publisher fixture", () => {});\n',
  );
  git(root, ["add", "tests/oracle.test.mjs"]);
  git(root, ["commit", "-m", "trusted Oracle fixture"]);
  const baseSha = git(root, ["rev-parse", "HEAD"]);

  const taskId = randomUUID();
  const task = validateLocalFactoryTask({
    schema_version: 1,
    title: "Publish a local Factory patch",
    goal: "Create a deterministic documentation result and a generated unit test",
    allowed_paths: ["docs/local-result.md", "tests/local-result.test.mjs"],
    acceptance_criteria: ["The documentation file is added", "The generated test file is added"],
    explicit_exclusions: [],
  });
  const contract = createTrustedAcceptanceOracle({
    repositoryRoot: root,
    baseSha,
    taskId,
    oracleTestFiles: ["tests/oracle.test.mjs"],
    workerAllowedPaths: task.allowed_paths,
  });
  const target = createLocalFactoryPublicationTarget({
    taskId,
    repository: "test-owner/test-repo",
    baseBranch: "main",
    baseSha,
    contractSha256: contract.contract_sha256,
  });

  const plan = validateAgentPlan({
    schema_version: 1,
    tasks: [{
      id: "implement-result",
      title: "Create result and regression test",
      role: "implementer",
      action: "propose_patch",
      depends_on: [],
      allowed_paths: [...task.allowed_paths],
      acceptance_criteria: [...task.acceptance_criteria],
      max_output_bytes: 16_384,
    }],
  }, task);

  const patchFiles = [
    {
      path: "docs/local-result.md",
      operation: "add",
      content: "# Locally accepted result\n\nPersisted by Agent Factory.\n",
    },
    {
      path: "tests/local-result.test.mjs",
      operation: "add",
      content: [
        'import test from "node:test";',
        'import assert from "node:assert/strict";',
        'test("local result is deterministic", () => { assert.equal("factory", "factory"); });',
        "",
      ].join("\n"),
    },
  ];
  const trackedPaths = git(root, ["ls-files", "-z"], { encoding: null })
    .toString("utf8")
    .split("\0")
    .filter(Boolean);
  const patch = validatePatchManifest({
    schema_version: 1,
    files: patchFiles,
  }, task, trackedPaths);

  const patchedFiles = patch.files.map((file) => ({
    path: file.path,
    operation: file.operation,
    bytes: Buffer.byteLength(file.content, "utf8"),
    sha256: sha(Buffer.from(file.content, "utf8")),
  }));
  const generatedEvidence = tapEvidence(["tests/local-result.test.mjs"], 1);
  const oracleEvidence = {
    valid: true,
    task_id: taskId,
    base_sha: baseSha,
    oracle_sha256: contract.oracle_sha256,
    contract_sha256: contract.contract_sha256,
    test_files: ["tests/oracle.test.mjs"],
    ...tapEvidence(["tests/oracle.test.mjs"], 2),
  };
  const result = {
    schema_version: 1,
    kind: "local-agent-task",
    outcome: "accepted",
    acceptance_status: "ACCEPTED",
    generated_code_executed: true,
    test_execution: "GENERATED_TESTS_AND_TRUSTED_ORACLE_PASSED_IN_SEPARATE_NETWORK_DISABLED_RUNS",
    trusted_oracle: verifyTrustedAcceptanceOracle({
      repositoryRoot: root,
      contract,
      taskId,
    }),
    acceptance_evidence: oracleEvidence,
    plan_artifact: {
      schema_version: 1,
      tasks: plan.tasks,
      status: "VALIDATED_PLAN",
      model: "publisher-test-model",
    },
    patch_artifact: {
      schema_version: 1,
      status: "VALIDATED_PATCH",
      model: "publisher-test-model",
      patch,
    },
    scratch_evidence: {
      schema_version: 1,
      status: "SANDBOX_TESTS_PASSED",
      base_directory: "disposable-scratch",
      patched_files: patchedFiles,
      repository_files_modified: false,
      generated_code_executed: true,
      test_execution: "GENERATED_TESTS_AND_TRUSTED_ORACLE_PASSED_IN_SEPARATE_NETWORK_DISABLED_RUNS",
      sandbox_evidence: generatedEvidence,
      trusted_oracle_evidence: oracleEvidence,
    },
    persistence_contract: "SQLite ACCEPTED evidence is persisted before publication.",
  };

  const databasePath = join(databaseDirectory, "factory.sqlite");
  const queue = createLocalFactoryQueue({ databasePath, retryDelayMs: 0 });
  let queueClosed = false;
  const closeQueue = () => {
    if (queueClosed) return;
    queue.close();
    queueClosed = true;
  };
  t.after(() => {
    closeQueue();
    rmSync(root, { recursive: true, force: true });
    rmSync(databaseDirectory, { recursive: true, force: true });
  });
  const queued = queue.add({
    id: taskId,
    title: task.title,
    payload: {
      schema_version: 1,
      kind: "local-agent-task",
      task_id: taskId,
      task,
      trusted_oracle_contract: contract,
      publication_target: target,
    },
  });
  const claim = queue.claim("publisher-test-worker");
  assert.equal(claim.id, queued.id);
  assert.equal(queue.complete(taskId, "publisher-test-worker", claim.lease_token, result).status, "succeeded");

  return {
    root,
    databasePath,
    taskId,
    baseSha,
    task,
    contract,
    target,
    result,
    queue,
    closeQueue,
  };
}

function makeGitHubApi({ baseSha, baseBranch = "main", onCreatePull = "success" }) {
  const calls = [];
  const blobs = [];
  const pulls = [];
  const baseTreeSha = "a".repeat(40);
  const candidateTreeSha = "b".repeat(40);
  const commitSha = "c".repeat(40);
  let branchCreated = false;
  let prCreateCount = 0;

  const api = async (path, method = "GET", payload = undefined) => {
    calls.push({ path, method, payload });

    if (path === "/repos/test-owner/test-repo/branches/" + encodeURIComponent(baseBranch)) {
      return { commit: { sha: baseSha } };
    }
    if (path === "/repos/test-owner/test-repo/git/commits/" + baseSha) {
      return { sha: baseSha, tree: { sha: baseTreeSha } };
    }
    if (path === "/repos/test-owner/test-repo/git/blobs" && method === "POST") {
      const blobSha = (String(blobs.length + 1)).padStart(40, "0");
      blobs.push({ blobSha, payload });
      return { sha: blobSha };
    }
    if (path === "/repos/test-owner/test-repo/git/trees" && method === "POST") {
      assert.equal(payload.base_tree, baseTreeSha);
      return { sha: candidateTreeSha };
    }
    if (path.startsWith("/repos/test-owner/test-repo/git/ref/heads/")) {
      if (!branchCreated) {
        throw Object.assign(new Error("Reference not found"), { status: 404 });
      }
      return { object: { sha: commitSha } };
    }
    if (path === "/repos/test-owner/test-repo/git/commits" && method === "POST") {
      assert.equal(payload.tree, candidateTreeSha);
      assert.deepEqual(payload.parents, [baseSha]);
      return { sha: commitSha };
    }
    if (path === "/repos/test-owner/test-repo/git/refs" && method === "POST") {
      assert.equal(payload.sha, commitSha);
      branchCreated = true;
      return { ref: payload.ref, object: { sha: commitSha } };
    }
    if (path.startsWith("/repos/test-owner/test-repo/pulls?state=all&per_page=100&page=")) {
      return [...pulls];
    }
    if (path === "/repos/test-owner/test-repo/pulls" && method === "POST") {
      prCreateCount += 1;
      const url = "https://github.com/test-owner/test-repo/pull/777";
      const created = {
        number: 777,
        html_url: url,
        state: "open",
        draft: true,
        body: payload.body,
        base: { ref: baseBranch },
        head: {
          ref: payload.head.split(":")[1],
          sha: commitSha,
        },
      };
      pulls.push(created);
      if (onCreatePull === "lost-response") {
        throw new Error("Simulated lost response after GitHub created the PR.");
      }
      return created;
    }
    throw new Error("Unexpected GitHub API request: " + method + " " + path);
  };

  return {
    api,
    calls,
    pulls,
    get prCreateCount() { return prCreateCount; },
    get blobs() { return blobs; },
  };
}

test("accepted local task is published as one deterministic Draft PR and recovered after SQLite restart", async (t) => {
  const fixture = createAcceptedFixture(t);
  const github = makeGitHubApi({
    baseSha: fixture.baseSha,
    onCreatePull: "lost-response",
  });

  const first = await publishAcceptedLocalFactoryTask({
    taskRecord: fixture.queue.get(fixture.taskId),
    taskEvents: fixture.queue.events(fixture.taskId),
    repositoryRoot: fixture.root,
    api: github.api,
    persistPublication: (record) => fixture.queue.recordPublication(fixture.taskId, record),
  });

  assert.equal(first.state, "draft_pr_created");
  assert.equal(first.task_id, fixture.taskId);
  assert.equal(first.base_sha, fixture.baseSha);
  assert.equal(first.pull_request_number, 777);
  assert.equal(first.automatic_merge, false);
  assert.equal(first.production_deployment, false);
  assert.equal(github.prCreateCount, 1);
  assert.equal(github.pulls.length, 1);
  assert.deepEqual(
    github.calls.filter((call) => call.path === "/repos/test-owner/test-repo/git/blobs").map((call) => call.method),
    ["POST", "POST"],
  );

  const publication = fixture.queue.getPublication(fixture.taskId);
  assert.equal(publication.state, "draft_pr_created");
  assert.equal(publication.commit_sha, "c".repeat(40));
  assert.equal(publication.pull_request_url, "https://github.com/test-owner/test-repo/pull/777");
  assert.deepEqual(fixture.queue.events(fixture.taskId).slice(-3).map((event) => event.event_type), [
    "publication_prepared",
    "publication_branch_created",
    "publication_draft_pr_created",
  ]);

  fixture.closeQueue();
  const reopened = createLocalFactoryQueue({ databasePath: fixture.databasePath });
  try {
    const task = reopened.get(fixture.taskId);
    const restoredPublication = reopened.getPublication(fixture.taskId);
    assert.equal(task.status, "succeeded");
    assert.equal(task.result.acceptance_status, "ACCEPTED");
    assert.equal(restoredPublication.state, "draft_pr_created");
    assert.equal(restoredPublication.commit_sha, "c".repeat(40));
    assert.equal(restoredPublication.pull_request_number, 777);

    const replay = await publishAcceptedLocalFactoryTask({
      taskRecord: task,
      taskEvents: reopened.events(fixture.taskId),
      existingPublication: restoredPublication,
      repositoryRoot: fixture.root,
      api: github.api,
      persistPublication: (record) => reopened.recordPublication(fixture.taskId, record),
    });
    assert.equal(replay.state, "draft_pr_created");
    assert.equal(replay.commit_sha, "c".repeat(40));
    assert.equal(github.prCreateCount, 1, "recovery must not create a duplicate Draft PR");
    assert.equal(github.pulls.length, 1);
    assert.equal(reopened.getPublication(fixture.taskId).state, "draft_pr_created");
  } finally {
    reopened.close();
    // The fixture cleanup closes/removes the original resources after this test.
  }
});

test("local publisher refuses a base SHA that differs from the intake checkout before any GitHub write", async (t) => {
  const fixture = createAcceptedFixture(t);
  const github = makeGitHubApi({ baseSha: "d".repeat(40) });
  await assert.rejects(
    publishAcceptedLocalFactoryTask({
      taskRecord: fixture.queue.get(fixture.taskId),
      taskEvents: fixture.queue.events(fixture.taskId),
      repositoryRoot: fixture.root,
      api: github.api,
      persistPublication: (record) => fixture.queue.recordPublication(fixture.taskId, record),
    }),
    /Remote base branch advanced since task intake/,
  );
  assert.equal(github.calls.filter((call) => call.method === "POST").length, 0);
  assert.equal(fixture.queue.getPublication(fixture.taskId).state, "prepared");
});

test("local publisher refuses a dirty checkout before any GitHub write", async (t) => {
  const fixture = createAcceptedFixture(t);
  writeFileSync(join(fixture.root, "unrelated-local-change.txt"), "must not be published\\n");
  const github = makeGitHubApi({ baseSha: fixture.baseSha });
  await assert.rejects(
    publishAcceptedLocalFactoryTask({
      taskRecord: fixture.queue.get(fixture.taskId),
      taskEvents: fixture.queue.events(fixture.taskId),
      repositoryRoot: fixture.root,
      api: github.api,
      persistPublication: (record) => fixture.queue.recordPublication(fixture.taskId, record),
    }),
    /checkout is dirty/,
  );
  assert.equal(github.calls.filter((call) => call.method === "POST").length, 0);
  assert.equal(fixture.queue.getPublication(fixture.taskId), null);
});

test("local publisher dry-run verifies accepted evidence without API or SQLite writes", async (t) => {
  const fixture = createAcceptedFixture(t);
  let apiCalls = 0;
  let persistenceCalls = 0;
  const result = await publishAcceptedLocalFactoryTask({
    taskRecord: fixture.queue.get(fixture.taskId),
    taskEvents: fixture.queue.events(fixture.taskId),
    repositoryRoot: fixture.root,
    api: async () => { apiCalls += 1; throw new Error("dry-run must not call the GitHub API"); },
    dryRun: true,
    persistPublication: () => { persistenceCalls += 1; },
  });
  assert.equal(result.state, "dry_run");
  assert.equal(result.no_remote_writes, true);
  assert.equal(apiCalls, 0);
  assert.equal(persistenceCalls, 0);
  assert.equal(fixture.queue.getPublication(fixture.taskId), null);
});
