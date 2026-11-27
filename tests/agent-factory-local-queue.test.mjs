import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
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
