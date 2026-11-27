import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLocalFactoryQueue } from "../lib/agent-factory-local-queue.mjs";

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
    assert.equal(queue.claim("worker-a").id, task.id);
    assert.equal(queue.claim("worker-b"), null);
    assert.throws(() => queue.complete(task.id, "worker-b", queue.get(task.id).lease_token, { ok: true }), /lease is not owned/);
    const claimed = queue.get(task.id);\n    assert.equal(queue.complete(task.id, "worker-a", claimed.lease_token, { ok: true }).status, "succeeded");
  });
});

test("task failures retry and quarantine after the configured third failure", () => {
  withQueue((queue) => {
    const task = queue.add({ title: "bounded retry", payload: { goal: "quarantine" } });
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      assert.equal(queue.claim("worker").id, task.id);
      const failed = queue.fail(task.id, "worker", "deterministic task failure");
      assert.equal(failed.failures, attempt);
      assert.equal(failed.status, attempt === 3 ? "quarantined" : "retry_wait");
    }
    assert.equal(queue.claim("worker"), null);
  });
});

test("system failures release a task without incrementing task failure count", () => {
  withQueue((queue) => {
    const task = queue.add({ title: "system failure", payload: { goal: "do not quarantine" } });
    queue.claim("worker");
    const released = queue.fail(task.id, "worker", "local Ollama unavailable", { scope: "system" });
    assert.equal(released.status, "queued");
    assert.equal(released.failures, 0);
    assert.equal(released.last_error, "local Ollama unavailable");
    assert.equal(queue.events(task.id).at(-1).event_type, "system_failure_released");
  });
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
    assert.equal(recovered.lease_owner, null);\n    assert.equal(recovered.lease_token, null);
  }, { now: () => current, leaseMs: 1_000 });
});

test("queue rejects invalid payloads, retry limits and unknown states", () => {
  withQueue((queue) => {
    assert.throws(() => queue.add({ title: "bad payload", payload: [] }), /JSON object/);
    assert.throws(() => queue.add({ title: "bad retry", payload: {}, maxFailures: 4 }), /from 1 to 3/);
    assert.throws(() => queue.list({ status: "pending" }), /Unsupported task status/);
  });
});

\ntest("expired leases are quarantined after the bounded recovery limit", () => {
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
