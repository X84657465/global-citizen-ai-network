import test from "node:test";
import assert from "node:assert/strict";
import { summarizeWorkloadCosts, type WorkloadObservation } from "../lib/compute/cost-metrics.ts";

const sample: WorkloadObservation[] = [
  { workloadClass: "public_parallel", executionTarget: "trusted_cloud", outcome: "accepted", costTwd: 10, costEvidence: "provider_invoice", latencyMs: 100, attempts: 1 },
  { workloadClass: "public_parallel", executionTarget: "community_node", outcome: "accepted", costTwd: 3, costEvidence: "internal_estimate", latencyMs: 200, attempts: 2 },
  { workloadClass: "public_parallel", executionTarget: "trusted_cloud", outcome: "failed", costTwd: 2, costEvidence: "provider_invoice", latencyMs: 500, attempts: 2 },
];

test("keeps invoice and internal estimates separate", () => {
  const result = summarizeWorkloadCosts(sample);
  assert.equal(result.invoiceCostTwd, 12);
  assert.equal(result.estimatedCostTwd, 3);
  assert.equal(result.invoiceCostPerAcceptedResultTwd, 6);
  assert.equal(result.estimatedCostPerAcceptedResultTwd, 1.5);
});

test("includes failed-job spend in cost per accepted result", () => {
  const result = summarizeWorkloadCosts(sample);
  assert.equal(result.invoiceCostPerAcceptedResultTwd, 6);
});

test("reports acceptance, failure and retry rates", () => {
  const result = summarizeWorkloadCosts(sample);
  assert.equal(result.acceptanceRate, 2 / 3);
  assert.equal(result.failureRate, 1 / 3);
  assert.equal(result.totalAttempts, 5);
  assert.equal(result.retryAttempts, 2);
  assert.equal(result.retryRate, 2 / 5);
});

test("reports median and p95 latency for accepted jobs only", () => {
  const result = summarizeWorkloadCosts(sample);
  assert.equal(result.medianAcceptedLatencyMs, 150);
  assert.equal(result.p95AcceptedLatencyMs, 200);
});

test("does not fabricate per-result costs when there are no accepted jobs", () => {
  const result = summarizeWorkloadCosts(sample.map(item => ({ ...item, outcome: "failed" as const })));
  assert.equal(result.acceptedJobs, 0);
  assert.equal(result.invoiceCostPerAcceptedResultTwd, null);
  assert.equal(result.estimatedCostPerAcceptedResultTwd, null);
});

test("tracks unpriced jobs without pretending they cost zero", () => {
  const result = summarizeWorkloadCosts([
    { ...sample[0], costTwd: null, costEvidence: null },
  ]);
  assert.equal(result.unpricedJobs, 1);
  assert.equal(result.invoiceCostPerAcceptedResultTwd, null);
});

test("handles empty observations", () => {
  const result = summarizeWorkloadCosts([]);
  assert.equal(result.totalJobs, 0);
  assert.equal(result.acceptanceRate, 0);
  assert.equal(result.medianAcceptedLatencyMs, null);
  assert.equal(result.p95AcceptedLatencyMs, null);
  assert.equal(result.invoiceCostPerAcceptedResultTwd, null);
});

test("rejects negative or non-finite costs and latencies", () => {
  assert.throws(() => summarizeWorkloadCosts([{ ...sample[0], costTwd: -1 }]), /invalid_cost/);
  assert.throws(() => summarizeWorkloadCosts([{ ...sample[0], latencyMs: Number.NaN }]), /invalid_latency/);
});

test("rejects invalid attempt counts", () => {
  assert.throws(() => summarizeWorkloadCosts([{ ...sample[0], attempts: 0 }]), /invalid_attempts/);
  assert.throws(() => summarizeWorkloadCosts([{ ...sample[0], attempts: 1.5 }]), /invalid_attempts/);
});

test("rejects evidence labels without a cost amount", () => {
  assert.throws(() => summarizeWorkloadCosts([{ ...sample[0], costTwd: null }]), /cost_evidence_without_amount/);
});

test("rejects amounts without explicit evidence source", () => {
  assert.throws(() => summarizeWorkloadCosts([{ ...sample[0], costEvidence: null }]), /missing_cost_evidence/);
});

test("rejects unsupported runtime execution targets and outcomes", () => {
  assert.throws(() => summarizeWorkloadCosts([{ ...sample[0], executionTarget: "unknown" as never }]), /invalid_execution_target/);
  assert.throws(() => summarizeWorkloadCosts([{ ...sample[0], outcome: "pending" as never }]), /invalid_outcome/);
});

test("p95 uses nearest-rank percentile", () => {
  const observations = Array.from({ length: 20 }, (_, index) => ({
    ...sample[0],
    latencyMs: (index + 1) * 100,
  }));
  const result = summarizeWorkloadCosts(observations);
  assert.equal(result.p95AcceptedLatencyMs, 2000);
});
