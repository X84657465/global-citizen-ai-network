import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLocalFactoryQueue } from "../lib/agent-factory-local-queue.mjs";
import { createLocalFactoryPublicationTarget } from "../lib/agent-factory-local-publication-contract.mjs";
import { createHash } from "node:crypto";

function withQueue(run, options = {}) {
  const directory = mkdtempSync(join(tmpdir(), "gcan-local-queue-test-"));
  const queue = createLocalFactoryQueue({
    databasePath: join(directory, "factory.sqlite"),
    retryDelayMs: 0,
    ...options,
  });
  try {
    return run(queue, directory);
  } finally {
    queue.close();
    rmSync(directory, { recursive: true, force: true });
  }
}

async function withQueueAsync(run, options = {}) {
  const directory = mkdtempSync(join(tmpdir(), "gcan-local-queue-async-test-"));
  const queue = createLocalFactoryQueue({
    databasePath: join(directory, "factory.sqlite"),
    retryDelayMs: 0,
    ...options,
  });
  try {
    return await run(queue, directory);
  } finally {
    queue.close();
    rmSync(directory, { recursive: true, force: true });
  }
}

async function startSQLiteWriteLock(databasePath, durationMs) {
  const script = [
    'import { DatabaseSync } from "node:sqlite";',
    'const db = new DatabaseSync(process.argv[1]);',
    'db.exec("PRAGMA busy_timeout=5000; BEGIN IMMEDIATE;");',
    'process.stdout.write("READY\\n");',
    'setTimeout(() => { db.exec("COMMIT;"); db.close(); }, Number(process.argv[2]));',
  ].join("\n");
  const child = spawn(process.execPath, ["--input-type=module", "-e", script, databasePath, String(durationMs)], {
    stdio: ["ignore", "pipe", "inherit"],
  });
  await new Promise((resolve, reject) => {
    let output = "";
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      output += chunk;
      if (output.includes("READY\n")) resolve();
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (!output.includes("READY\n")) reject(new Error("SQLite lock holder exited before acquiring its write lock (code " + code + ")."));
    });
  });
  return child;
}

async function waitForExit(child) {
  if (child.exitCode !== null) return;
  await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", resolve);
  });
}

test("claim lease starts after a competing process releases SQLite write lock", async () => {
  await withQueueAsync(async (queue, directory) => {
    const task = queue.add({ title: "lock delayed claim", payload: { goal: "lease must start after lock acquisition" } });
    const child = await startSQLiteWriteLock(join(directory, "factory.sqlite"), 1_600);
    try {
      const claimed = queue.claim("worker-after-lock");
      assert.equal(claimed.id, task.id);
      assert.ok(claimed.lease_expires_at > Date.now(), "new lease must still be valid when claim returns");
      assert.equal(queue.get(task.id).status, "running");
      await waitForExit(child);
    } finally {
      if (child.exitCode === null) child.kill();
    }
  }, { leaseMs: 1_000 });
});

test("expired lease recovery samples time after a competing process releases SQLite write lock", async () => {
  await withQueueAsync(async (queue, directory) => {
    const task = queue.add({ title: "lock delayed recovery", payload: { goal: "recovery must observe expiry after lock wait" } });
    const claim = queue.claim("worker-before-lock");
    assert.equal(claim.id, task.id);
    const child = await startSQLiteWriteLock(join(directory, "factory.sqlite"), 1_600);
    try {
      assert.equal(queue.recoverExpiredLeases(), 1);
      assert.equal(queue.get(task.id).status, "queued");
      await waitForExit(child);
    } finally {
      if (child.exitCode === null) child.kill();
    }
  }, { leaseMs: 1_000 });
});

test("local queue persists a task, claim, result and events across database reopen", () => {
  const directory = mkdtempSync(join(tmpdir(), "gcan-local-queue-reopen-"));
  const databasePath = join(directory, "factory.sqlite");
  const first = createLocalFactoryQueue({ databasePath });
  const task = first.add({ title: "first local task", payload: { goal: "test persistence" } });
  const claimed = first.claim("worker-one");
  assert.equal(claimed.id, task.id);
  assert.equal(claimed.status, "running");
  first.complete(task.id, "worker-one", claimed.lease_token, { test_exit_code: 0, evidence: "unit-test" });
  first.close();

  const reopened = createLocalFactoryQueue({ databasePath });
  try {
    const restored = reopened.get(task.id);
    assert.equal(restored.status, "succeeded");
    assert.deepEqual(restored.result, { test_exit_code: 0, evidence: "unit-test" });
    assert.deepEqual(reopened.events(task.id).map((entry) => entry.event_type), [
      "task_queued", "task_claimed", "task_succeeded",
    ]);
  } finally {
    reopened.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("only one worker can claim a queued task and lease ownership is enforced", () => {
  withQueue((queue) => {
    const task = queue.add({ title: "single worker", payload: { goal: "exclusive claim" } });
    const claimed = queue.claim("worker-a");
    assert.equal(claimed.id, task.id);
    assert.equal(queue.claim("worker-b"), null);
    assert.throws(
      () => queue.complete(task.id, "worker-b", claimed.lease_token, { ok: true }),
      /lease is not owned/,
    );
    assert.equal(queue.complete(task.id, "worker-a", claimed.lease_token, { ok: true }).status, "succeeded");
  });
});

test("task failures retry and quarantine after the configured third failure", () => {
  withQueue((queue) => {
    const task = queue.add({ title: "bounded retry", payload: { goal: "quarantine" } });
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const claimed = queue.claim("worker");
      assert.equal(claimed.id, task.id);
      const failed = queue.fail(task.id, "worker", claimed.lease_token, "deterministic task failure");
      assert.equal(failed.failures, attempt);
      assert.equal(failed.status, attempt === 3 ? "quarantined" : "retry_wait");
    }
    assert.equal(queue.claim("worker"), null);
  });
});

test("system failures use bounded exponential backoff without consuming task failures or hot-looping", () => {
  let current = 1_800_000_000_000;
  withQueue((queue) => {
    const task = queue.add({ title: "system failure", payload: { goal: "do not quarantine" } });
    const firstClaim = queue.claim("worker");
    const firstRelease = queue.fail(task.id, "worker", firstClaim.lease_token, "local Ollama unavailable", { scope: "system" });
    assert.equal(firstRelease.status, "queued");
    assert.equal(firstRelease.failures, 0);
    assert.equal(firstRelease.system_failures, 1);
    assert.equal(firstRelease.available_at, current + 10_000);
    assert.equal(queue.claim("worker"), null);
    assert.equal(firstRelease.last_error, "local Ollama unavailable");

    current += 10_000;
    const secondClaim = queue.claim("worker");
    assert.equal(secondClaim.id, task.id);
    const secondRelease = queue.fail(task.id, "worker", secondClaim.lease_token, "Ollama still unavailable", { scope: "system" });
    assert.equal(secondRelease.status, "queued");
    assert.equal(secondRelease.failures, 0);
    assert.equal(secondRelease.system_failures, 2);
    assert.equal(secondRelease.available_at, current + 20_000);
    assert.equal(queue.claim("worker"), null);
    assert.equal(queue.events(task.id).at(-1).detail.retry_delay_ms, 20_000);
  }, { now: () => current, systemRetryDelayMs: 10_000, maxSystemRetryDelayMs: 40_000 });
});

test("expired worker lease is recovered without inventing a task failure", () => {
  let current = 1_800_000_000_000;
  withQueue((queue) => {
    const task = queue.add({ title: "expired lease", payload: { goal: "recover" } });
    queue.claim("worker");
    current += 2_000;
    assert.equal(queue.recoverExpiredLeases(), 1);
    const recovered = queue.get(task.id);
    assert.equal(recovered.status, "queued");
    assert.equal(recovered.failures, 0);
    assert.equal(recovered.lease_owner, null);
    assert.equal(recovered.lease_token, null);
  }, { now: () => current, leaseMs: 1_000 });
});

test("expired leases are quarantined after the bounded recovery limit", () => {
  let current = 1_800_000_000_000;
  withQueue((queue) => {
    const task = queue.add({ title: "crash loop", payload: { goal: "bounded recovery" } });
    for (let expiry = 1; expiry <= 3; expiry += 1) {
      const claimed = queue.claim("worker");
      assert.equal(claimed.id, task.id);
      current += 2_000;
      assert.equal(queue.recoverExpiredLeases(), 1);
      const recovered = queue.get(task.id);
      assert.equal(recovered.lease_expiries, expiry);
      assert.equal(recovered.failures, 0);
      assert.equal(recovered.status, expiry === 3 ? "quarantined" : "queued");
    }
    assert.equal(queue.claim("worker"), null);
  }, { now: () => current, leaseMs: 1_000 });
});

test("stale lease token is rejected after same worker reclaims an expired task", () => {
  let current = 1_800_000_000_000;
  withQueue((queue) => {
    const task = queue.add({ title: "fencing", payload: { goal: "reject stale worker" } });
    const oldClaim = queue.claim("same-worker");
    current += 2_000;
    assert.equal(queue.recoverExpiredLeases(), 1);
    const newClaim = queue.claim("same-worker");
    assert.equal(newClaim.id, task.id);
    assert.notEqual(newClaim.lease_token, oldClaim.lease_token);
    assert.throws(
      () => queue.complete(task.id, "same-worker", oldClaim.lease_token, { stale: true }),
      /lease is not owned/,
    );
    assert.equal(
      queue.complete(task.id, "same-worker", newClaim.lease_token, { current: true }).status,
      "succeeded",
    );
  }, { now: () => current, leaseMs: 1_000 });
});

test("queue rejects invalid payloads, retry limits and unknown states", () => {
  withQueue((queue) => {
    assert.throws(() => queue.add({ title: "bad payload", payload: [] }), /JSON object/);
    assert.throws(() => queue.add({ title: "bad retry", payload: {}, maxFailures: 4 }), /from 1 to 3/);
    assert.throws(() => queue.list({ status: "pending" }), /Unsupported task status/);
  });
});


function publicationTarget(taskId, contract) {
  return createLocalFactoryPublicationTarget({
    taskId,
    repository: "test-owner/test-repo",
    baseBranch: "main",
    baseSha: contract.base_sha,
    contractSha256: contract.contract_sha256,
  });
}

function acceptedAgentResult(taskId, contract, oracleFiles, generatedFiles) {
  const evidence = (testFiles) => ({
    exit_code: 0,
    passed_tests: testFiles.length,
    test_files: testFiles,
    tap_summary: {
      tests: testFiles.length,
      pass: testFiles.length,
      fail: 0,
      cancelled: 0,
      skipped: 0,
      todo: 0,
      valid: true,
    },
  });
  const patchFiles = generatedFiles.map((path) => ({
    path, operation: "add", content: "fixture",
  }));
  const patchedFiles = patchFiles.map((file) => ({
    path: file.path,
    operation: file.operation,
    bytes: Buffer.byteLength(file.content, "utf8"),
    sha256: createHash("sha256").update(file.content, "utf8").digest("hex"),
  }));
  return {
    schema_version: 1,
    kind: "local-agent-task",
    outcome: "accepted",
    acceptance_status: "ACCEPTED",
    generated_code_executed: true,
    trusted_oracle: {
      valid: true,
      task_id: taskId,
      base_sha: contract.base_sha,
      contract_sha256: contract.contract_sha256,
    },
    acceptance_evidence: {
      valid: true,
      task_id: taskId,
      base_sha: contract.base_sha,
      contract_sha256: contract.contract_sha256,
      ...evidence(oracleFiles),
    },
    patch_artifact: {
      status: "VALIDATED_PATCH",
      patch: { schema_version: 1, files: patchFiles },
    },
    scratch_evidence: {
      status: "SANDBOX_TESTS_PASSED",
      generated_code_executed: true,
      repository_files_modified: false,
      patched_files: patchedFiles,
      sandbox_evidence: evidence(generatedFiles),
    },
  };
}

test("SQLite refuses to complete a local agent task from proposal or model-only test evidence", () => {
  withQueue((queue) => {
    const id = "agent-acceptance-gate";
    const contract = {
      schema_version: 2,
      kind: "trusted-acceptance-oracle",
      task_id: id,
      base_sha: "b".repeat(40),
      contract_sha256: "a".repeat(64),
      files: [{ path: "tests/oracle.test.mjs" }],
      worker_allowed_paths: ["docs/result.md", "tests/generated.test.mjs"],
    };
    const task = queue.add({
      id,
      title: "Agent task must fail closed",
      payload: {
        schema_version: 1,
        kind: "local-agent-task",
        task_id: id,
        task: { allowed_paths: contract.worker_allowed_paths },
        trusted_oracle_contract: contract,
        publication_target: publicationTarget(id, contract),
      },
    });
    const claimed = queue.claim("worker");
    assert.equal(claimed.id, task.id);
    assert.throws(
      () => queue.complete(id, "worker", claimed.lease_token, {
        schema_version: 1,
        kind: "local-agent-task",
        outcome: "proposal_ready",
        generated_code_executed: true,
      }),
      /SQLite Trusted Acceptance Gate rejected task completion/,
    );
    assert.equal(queue.get(id).status, "running");
    const failed = queue.fail(id, "worker", claimed.lease_token, "missing trusted acceptance evidence");
    assert.equal(failed.status, "retry_wait");
    assert.deepEqual(queue.events(id).map((event) => event.event_type), [
      "task_queued", "task_claimed", "task_failure_recorded",
    ]);
  });
});

test("SQLite accepts an agent task only when the separate generated and trusted TAP evidence match intake", () => {
  withQueue((queue) => {
    const id = "agent-accepted-fixture";
    const contract = {
      schema_version: 2,
      kind: "trusted-acceptance-oracle",
      task_id: id,
      base_sha: "c".repeat(40),
      contract_sha256: "d".repeat(64),
      files: [{ path: "tests/oracle.test.mjs" }],
      worker_allowed_paths: ["docs/result.md", "tests/generated.test.mjs"],
    };
    const task = queue.add({
      id,
      title: "Valid agent task",
      payload: {
        schema_version: 1,
        kind: "local-agent-task",
        task_id: id,
        task: { allowed_paths: contract.worker_allowed_paths },
        trusted_oracle_contract: contract,
        publication_target: publicationTarget(id, contract),
      },
    });
    const claimed = queue.claim("worker");
    const result = acceptedAgentResult(
      id, contract,
      ["tests/oracle.test.mjs"],
      ["tests/generated.test.mjs"],
    );
    const completed = queue.complete(id, "worker", claimed.lease_token, result);
    assert.equal(completed.status, "succeeded");
    assert.equal(completed.result.acceptance_status, "ACCEPTED");
    assert.equal(queue.events(id).at(-1).detail.trusted_oracle_contract_sha256, contract.contract_sha256);
    assert.equal(queue.get(task.id).status, "succeeded");
  });
});

test("SQLite publication stages survive restart and recover idempotently", () => {
  const directory = mkdtempSync(join(tmpdir(), "gcan-local-publication-reopen-"));
  const databasePath = join(directory, "factory.sqlite");
  const id = "agent-publication-fixture";
  const contract = {
    schema_version: 2,
    kind: "trusted-acceptance-oracle",
    task_id: id,
    base_sha: "e".repeat(40),
    contract_sha256: "f".repeat(64),
    files: [{ path: "tests/oracle.test.mjs" }],
    worker_allowed_paths: ["docs/result.md", "tests/generated.test.mjs"],
  };
  const target = publicationTarget(id, contract);
  const first = createLocalFactoryQueue({ databasePath, retryDelayMs: 0 });
  let identity;
  try {
    first.add({
      id,
      title: "Publish accepted task",
      payload: {
        schema_version: 1,
        kind: "local-agent-task",
        task_id: id,
        task: { allowed_paths: contract.worker_allowed_paths },
        trusted_oracle_contract: contract,
        publication_target: target,
      },
    });
    const claim = first.claim("worker");
    const result = acceptedAgentResult(
      id, contract,
      ["tests/oracle.test.mjs"],
      ["tests/generated.test.mjs"],
    );
    assert.equal(first.complete(id, "worker", claim.lease_token, result).status, "succeeded");
    const patchSha = createHash("sha256").update(JSON.stringify(["fixture-patch"])).digest("hex");
    const branch = "factory/local-task/" + id + "-" + patchSha.slice(0, 12);
    identity = {
      idempotency_key: createHash("sha256").update([
        "gcan-local-factory-publish-v1", id, contract.base_sha, target.target_sha256, patchSha,
      ].join("\\n")).digest("hex"),
      repository: target.repository,
      base_branch: target.base_branch,
      base_sha: target.base_sha,
      contract_sha256: target.contract_sha256,
      target_sha256: target.target_sha256,
      branch,
      patch_sha256: patchSha,
    };
    assert.equal(first.recordPublication(id, { ...identity, state: "prepared" }).state, "prepared");
    assert.equal(first.recordPublication(id, {
      ...identity, state: "branch_created", commit_sha: "1".repeat(40),
    }).state, "branch_created");
    assert.equal(first.recordPublication(id, {
      ...identity, state: "draft_pr_created",
      commit_sha: "1".repeat(40),
      pull_request_number: 777,
      pull_request_url: "https://github.com/test-owner/test-repo/pull/777",
    }).state, "draft_pr_created");
    assert.deepEqual(first.events(id).slice(-3).map((event) => event.event_type), [
      "publication_prepared", "publication_branch_created", "publication_draft_pr_created",
    ]);
  } finally {
    first.close();
  }

  const reopened = createLocalFactoryQueue({ databasePath });
  try {
    const restored = reopened.getPublication(id);
    assert.equal(restored.state, "draft_pr_created");
    assert.equal(restored.pull_request_number, 777);
    assert.equal(restored.commit_sha, "1".repeat(40));
    const before = reopened.events(id).length;
    const replay = reopened.recordPublication(id, { ...identity, state: "prepared" });
    assert.equal(replay.state, "draft_pr_created");
    assert.equal(reopened.events(id).length, before);
    assert.throws(() => reopened.recordPublication(id, {
      ...identity,
      patch_sha256: "9".repeat(64),
      state: "draft_pr_created",
      commit_sha: "1".repeat(40),
      pull_request_number: 777,
      pull_request_url: "https://github.com/test-owner/test-repo/pull/777",
    }), /immutable task\/base\/patch identity/);
  } finally {
    reopened.close();
    rmSync(directory, { recursive: true, force: true });
  }
});


test("GitHub Issue intake is idempotent and rejects a changed source revision", () => {
  withQueue((queue) => {
    const sourceEnvelope = {
      schema_version: 1,
      kind: "github-issue-source",
      repository: "owner/repo",
      issue_number: 42,
      canonical_url: "https://github.com/owner/repo/issues/42",
      updated_at: "2026-11-28T00:00:00Z",
      source_state_version: 7,
      stable_dedupe_key: createHash("sha256").update("owner/repo#42").digest("hex"),
      issue_body_sha256: "b".repeat(64),
    };
    const payload = {
      schema_version: 1,
      kind: "local-agent-task",
      task_id: "github-issue-42",
      source_envelope: sourceEnvelope,
    };
    const first = queue.addFromSource({
      id: "github-issue-42",
      title: "Issue 42 task",
      payload,
      sourceEnvelope,
    });
    assert.equal(first.created, true);
    assert.equal(first.task.status, "queued");
    const replay = queue.addFromSource({
      id: "github-issue-42",
      title: "Issue 42 task",
      payload,
      sourceEnvelope,
    });
    assert.equal(replay.created, false);
    assert.equal(replay.task.id, first.task.id);
    assert.equal(queue.events(first.task.id).filter((entry) => entry.event_type === "task_queued_from_github_issue").length, 1);

    const changedSource = {
      ...sourceEnvelope,
      updated_at: "2026-11-28T00:01:00Z",
      issue_body_sha256: "c".repeat(64),
    };
    assert.throws(() => queue.addFromSource({
      id: "github-issue-42",
      title: "Issue 42 revised task",
      payload: { ...payload, source_envelope: changedSource },
      sourceEnvelope: changedSource,
    }), /source changed after prior intake/);
    assert.equal(queue.get("github-issue-42").payload.source_envelope.updated_at, sourceEnvelope.updated_at);
  });
});
