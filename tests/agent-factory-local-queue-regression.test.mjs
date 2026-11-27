import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLocalFactoryQueue } from "../lib/agent-factory-local-queue.mjs";

test("two connections cannot hold two simultaneous active tasks", () => {
  const directory = mkdtempSync(join(tmpdir(), "gcan-single-worker-"));
  const databasePath = join(directory, "factory.sqlite");
  const first = createLocalFactoryQueue({ databasePath });
  const second = createLocalFactoryQueue({ databasePath });
  try {
    first.add({ id: "task-a", title: "task a", payload: {} });
    first.add({ id: "task-b", title: "task b", payload: {} });

    const claimA = first.claim("worker-a");
    assert.ok(claimA);
    assert.equal(second.claim("worker-b"), null);
    assert.equal(first.list({ status: "running" }).length, 1);

    first.complete(claimA.id, "worker-a", claimA.lease_token, { ok: true });
    const claimB = second.claim("worker-b");
    assert.ok(claimB);
    assert.notEqual(claimA.id, claimB.id);
  } finally {
    first.close();
    second.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

for (const scope of ["task", "system"]) {
  test(`fail(${scope}) does not persist an event when the lease expires during transition`, () => {
    const directory = mkdtempSync(join(tmpdir(), "gcan-lease-boundary-"));
    let boundary = false;
    let calls = 0;
    let clock = 1_000;
    const queue = createLocalFactoryQueue({
      databasePath: join(directory, "factory.sqlite"),
      leaseMs: 1_000,
      now: () => boundary ? (++calls >= 4 ? 2_000 : 1_999) : clock,
    });
    try {
      const task = queue.add({ title: "lease boundary", payload: {} });
      const claim = queue.claim("worker");
      boundary = true;

      assert.throws(
        () => queue.fail(task.id, "worker", claim.lease_token, "synthetic failure", { scope }),
        /lease is not owned/,
      );
      assert.equal(queue.get(task.id).status, "running");
      assert.equal(queue.get(task.id).failures, 0);
      assert.deepEqual(queue.events(task.id).map((entry) => entry.event_type), [
        "task_queued",
        "task_claimed",
      ]);

      boundary = false;
      clock = 2_000;
      assert.equal(queue.recoverExpiredLeases(), 1);
      assert.equal(queue.get(task.id).status, "queued");
    } finally {
      queue.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });
}
