import test from "node:test";
import assert from "node:assert/strict";
import { chooseExecutionTarget, type ExecutionQuote, type WorkloadProfile } from "../lib/compute/cost-router.ts";

const quotes: ExecutionQuote[] = [
  { target: "trusted_cloud", estimatedCostTwd: 10, estimatedLatencyMs: 900, available: true },
  { target: "local_device", estimatedCostTwd: 2, estimatedLatencyMs: 1200, available: true },
  { target: "community_node", estimatedCostTwd: 1, estimatedLatencyMs: 1800, available: true },
];

const publicWorkload: WorkloadProfile = {
  workloadClass: "public_parallel",
  estimatedInputBytes: 1024,
  estimatedOutputBytes: 1024,
  trustedCloudAvailable: true,
  userAllowsLocal: true,
  userAllowsCommunity: true,
};

test("selects lowest estimated cost among explicitly eligible public workloads", () => {
  const result = chooseExecutionTarget(publicWorkload, quotes);
  assert.equal(result.target, "community_node");
  assert.equal(result.estimatedCostTwd, 1);
});

test("never sends private user data to community nodes", () => {
  const result = chooseExecutionTarget({ ...publicWorkload, workloadClass: "private_user_data" }, quotes);
  assert.equal(result.target, "local_device");
  assert.equal(result.reason, "private_data_stays_on_user_device");
});

test("private data falls back to trusted cloud when local execution is not allowed", () => {
  const result = chooseExecutionTarget({ ...publicWorkload, workloadClass: "private_user_data", userAllowsLocal: false }, quotes);
  assert.equal(result.target, "trusted_cloud");
});

test("privileged tasks are restricted to trusted cloud", () => {
  const result = chooseExecutionTarget({ ...publicWorkload, workloadClass: "privileged" }, quotes);
  assert.equal(result.target, "trusted_cloud");
});

test("nondeterministic AI workloads are restricted to trusted cloud until verification policy exists", () => {
  const result = chooseExecutionTarget({ ...publicWorkload, workloadClass: "nondeterministic_ai" }, quotes);
  assert.equal(result.target, "trusted_cloud");
});

test("community execution requires explicit member opt-in", () => {
  const result = chooseExecutionTarget({ ...publicWorkload, userAllowsCommunity: false }, quotes);
  assert.notEqual(result.target, "community_node");
});

test("unavailable targets are excluded", () => {
  const result = chooseExecutionTarget(publicWorkload, quotes.map(q => q.target === "community_node" ? { ...q, available: false } : q));
  assert.equal(result.target, "local_device");
});

test("rejects oversized workload artifacts", () => {
  assert.throws(() => chooseExecutionTarget({ ...publicWorkload, estimatedInputBytes: 100 * 1024 * 1024 }, quotes), /invalid_or_oversized_workload/);
});

test("rejects negative or non-finite quotes", () => {
  assert.throws(() => chooseExecutionTarget(publicWorkload, [{ ...quotes[0], estimatedCostTwd: -1 }]), /invalid_execution_quote/);
  assert.throws(() => chooseExecutionTarget(publicWorkload, [{ ...quotes[0], estimatedLatencyMs: Number.NaN }]), /invalid_execution_quote/);
});

test("rejects duplicate quotes for the same execution target", () => {
  assert.throws(() => chooseExecutionTarget(publicWorkload, [quotes[0], quotes[0]]), /duplicate_execution_quote/);
});
