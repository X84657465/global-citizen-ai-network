import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  createGitHubActionsFactoryCoordinator,
} from "../lib/agent-factory-cross-executor-coordinator.mjs";

const first = createGitHubActionsFactoryCoordinator();
const second = createGitHubActionsFactoryCoordinator();
if (!first || !second) {
  throw new Error("Factory coordinator smoke test requires GitHub Actions OIDC and coordinator endpoint configuration.");
}

const scopeKey = "repo/X84657465/global-citizen-ai-network/factory-smoke/" +
  process.env.GITHUB_RUN_ID + "/" + process.env.GITHUB_RUN_ATTEMPT;
const firstLease = await first.acquireLease(scopeKey, 1_000);
assert.equal(firstLease?.acquired, true, "first executor must acquire the empty lease");
assert.equal(firstLease.fencing_token, 1, "first lease generation must be one");

const competingLease = await second.acquireLease(scopeKey, 1_000);
assert.equal(competingLease?.acquired, false, "a competing executor must not acquire an active lease");
assert.equal(competingLease.reason, "lease_held");

await new Promise((resolve) => setTimeout(resolve, 1_250));

const takeoverLease = await second.acquireLease(scopeKey, 60_000);
assert.equal(takeoverLease?.acquired, true, "second executor must reclaim the expired lease");
assert.equal(takeoverLease.fencing_token, firstLease.fencing_token + 1, "takeover must increment fencing token");
assert.equal(await first.assertLease(firstLease), false, "the old lease must be fenced out");

await assert.rejects(
  () => first.persistTaskState(firstLease, randomUUID(), { stage: "stale-writer" }),
  /factory coordinator persist_state failed/,
  "stale executor must not persist state",
);

const persisted = await second.persistTaskState(takeoverLease, randomUUID(), {
  stage: "fencing-smoke",
  run_id: process.env.GITHUB_RUN_ID,
  status: "verified",
});
assert.equal(persisted?.persisted, true);
assert.equal(persisted?.version, 1);

const idempotencyKey = "a".repeat(64);
const payloadHash = "b".repeat(64);
const reservation = await second.reservePublication(
  takeoverLease,
  idempotencyKey,
  payloadHash,
  { task_id: "fencing-smoke", branch: "factory/local-task/fencing-smoke" },
);
assert.equal(reservation?.reserved, true);
assert.equal(await second.recordPublication(
  takeoverLease,
  idempotencyKey,
  "published",
  "factory/local-task/fencing-smoke",
  1,
), true);
assert.equal(await second.releaseLease(takeoverLease), true);

console.log(JSON.stringify({
  status: "FACTORY_CROSS_EXECUTOR_FENCING_PASSED",
  scope_key: scopeKey,
  initial_fencing_token: firstLease.fencing_token,
  takeover_fencing_token: takeoverLease.fencing_token,
  stale_executor_rejected: true,
  durable_state_version: persisted.version,
  publication_intent_recorded: true,
}));
