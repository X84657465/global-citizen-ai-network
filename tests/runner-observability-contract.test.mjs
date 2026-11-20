import test from "node:test";
import assert from "node:assert/strict";
import { evaluateRunnerHealth, validateRunnerSnapshot } from "../lib/runner-observability-contract.mjs";

const snapshot = () => ({
  schemaVersion: 1,
  repository: "X84657465/global-citizen-ai-network",
  observedAt: "2026-11-20T10:00:00Z",
  runner: {
    id: "runner-01",
    name: "Windows Self-hosted",
    status: "online",
    lastHeartbeatAt: "2026-11-20T09:59:30Z",
    labels: ["self-hosted", "Windows", "X64"],
  },
  queue: { queued: 2, running: 1, oldestQueuedAt: "2026-11-20T09:58:00Z" },
  metrics: { completed: 90, failed: 10, retried: 4, windowMinutes: 60 },
  quota: { limit: 1000, used: 500, unit: "minutes", resetAt: "2026-11-21T00:00:00Z" },
});

test("accepts a complete privacy-minimized Runner snapshot", () => {
  assert.deepEqual(validateRunnerSnapshot(snapshot(), {
    expectedRepository: "X84657465/global-citizen-ai-network",
  }), { valid: true, errors: [] });
});

test("rejects unsupported fields that could leak host or credential data", () => {
  const value = snapshot();
  value.runner.environment = { GITHUB_TOKEN: "must-not-be-recorded" };
  value.hostPath = "C:\\runner\\_work";
  const result = validateRunnerSnapshot(value);
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("runner contains unsupported fields"));
  assert.ok(result.errors.includes("snapshot contains unsupported root fields"));
});

test("rejects invalid identity, timestamp, queue and quota boundaries", () => {
  const value = snapshot();
  value.repository = "not-a-repository";
  value.observedAt = "2026-02-30T25:61:00";
  value.queue.queued = 2;
  value.queue.oldestQueuedAt = null;
  value.quota.used = 1001;
  const result = validateRunnerSnapshot(value);
  assert.ok(result.errors.some((error) => error.includes("repository")));
  assert.ok(result.errors.some((error) => error.includes("observedAt")));
  assert.ok(result.errors.some((error) => error.includes("oldestQueuedAt")));
  const negativeQueue = snapshot();
  negativeQueue.queue.queued = -1;
  assert.ok(validateRunnerSnapshot(negativeQueue).errors.some((error) => error.includes("queue.queued")));
  assert.ok(result.errors.some((error) => error.includes("quota.used")));
});

test("requires queue age metadata only when queued work exists", () => {
  const value = snapshot();
  value.queue.queued = 0;
  value.queue.oldestQueuedAt = "2026-11-20T09:58:00Z";
  assert.ok(validateRunnerSnapshot(value).errors.includes("queue.oldestQueuedAt must be null when no tasks are queued"));
  value.queue.oldestQueuedAt = null;
  assert.equal(validateRunnerSnapshot(value).valid, true);
});

test("returns normal health when heartbeat, queue, failures and quota are below thresholds", () => {
  const value = snapshot();
  value.metrics.failed = 1;
  value.metrics.completed = 99;
  assert.deepEqual(evaluateRunnerHealth(value), {
    valid: true,
    severity: "normal",
    findings: [],
    metrics: { heartbeatAgeMs: 30000, failureRate: 0.01, quotaRatio: 0.5 },
    recommendedActions: [],
  });
});

test("recommends operator review when Runner heartbeat is stale or Runner is offline", () => {
  const value = snapshot();
  value.runner.lastHeartbeatAt = "2026-11-20T09:55:00Z";
  const stale = evaluateRunnerHealth(value);
  assert.equal(stale.severity, "critical");
  assert.ok(stale.recommendedActions.includes("pause_new_tasks_pending_operator_review"));
  value.runner.status = "offline";
  value.runner.lastHeartbeatAt = value.observedAt;
  assert.ok(evaluateRunnerHealth(value).recommendedActions.includes("pause_new_tasks_pending_operator_review"));
});

test("detects queue pressure, failure rate and quota pressure without performing actions", () => {
  const value = snapshot();
  value.queue.queued = 15;
  value.metrics.failed = 20;
  value.metrics.completed = 80;
  value.quota.used = 950;
  const result = evaluateRunnerHealth(value);
  assert.equal(result.severity, "critical");
  assert.ok(result.findings.some((finding) => finding.includes("queue depth")));
  assert.ok(result.findings.some((finding) => finding.includes("failure rate")));
  assert.ok(result.findings.some((finding) => finding.includes("quota consumption")));
  assert.ok(result.recommendedActions.includes("pause_quota_consuming_work_pending_operator_review"));
  assert.equal(Object.hasOwn(result, "executedActions"), false);
});

test("rejects invalid thresholds and inverted critical thresholds", () => {
  const value = snapshot();
  assert.equal(evaluateRunnerHealth(value, { queueWarningDepth: 0 }).valid, false);
  assert.equal(evaluateRunnerHealth(value, { queueWarningDepth: 10, queueCriticalDepth: 5 }).valid, false);
  assert.equal(evaluateRunnerHealth(value, { quotaWarningRatio: 0.9, quotaCriticalRatio: 0.8 }).valid, false);
  assert.equal(evaluateRunnerHealth(value, { unexpected: true }).valid, false);
});

test("flags future heartbeat timestamps for clock review", () => {
  const value = snapshot();
  value.runner.lastHeartbeatAt = "2026-11-20T10:01:00Z";
  const result = evaluateRunnerHealth(value);
  assert.ok(result.findings.some((finding) => finding.includes("later than")));
  assert.ok(result.recommendedActions.includes("verify_clock_synchronization"));
});
