export type CostEvidence = "provider_invoice" | "internal_estimate";

export type WorkloadObservation = {
  workloadClass: string;
  executionTarget: "local_device" | "trusted_cloud" | "community_node";
  outcome: "accepted" | "failed";
  costTwd: number | null;
  costEvidence: CostEvidence | null;
  latencyMs: number;
  attempts: number;
};

export type CostBaseline = {
  totalJobs: number;
  acceptedJobs: number;
  failedJobs: number;
  acceptanceRate: number;
  failureRate: number;
  totalAttempts: number;
  retryAttempts: number;
  retryRate: number;
  medianAcceptedLatencyMs: number | null;
  p95AcceptedLatencyMs: number | null;
  invoiceCostTwd: number;
  estimatedCostTwd: number;
  unpricedJobs: number;
  invoiceCostPerAcceptedResultTwd: number | null;
  estimatedCostPerAcceptedResultTwd: number | null;
};

function assertFiniteNonNegative(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0) throw new Error(`invalid_${field}`);
}

function percentileNearestRank(values: number[], percentile: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(percentile * sorted.length) - 1)];
}

/**
 * Computes a baseline from one observation per logical workload/job.
 * Invoice-backed and internally estimated costs remain separate and are never
 * added together. Failed-job costs remain in the numerator because they are
 * real spend incurred while producing accepted results.
 */
export function summarizeWorkloadCosts(observations: WorkloadObservation[]): CostBaseline {
  let acceptedJobs = 0;
  let failedJobs = 0;
  let totalAttempts = 0;
  let retryAttempts = 0;
  let invoiceCostTwd = 0;
  let estimatedCostTwd = 0;
  let unpricedJobs = 0;
  const acceptedLatencies: number[] = [];

  for (const observation of observations) {
    if (!observation.workloadClass.trim()) throw new Error("invalid_workload_class");
    assertFiniteNonNegative(observation.latencyMs, "latency");
    if (!Number.isInteger(observation.attempts) || observation.attempts < 1) {
      throw new Error("invalid_attempts");
    }
    if (observation.costTwd === null) {
      if (observation.costEvidence !== null) throw new Error("cost_evidence_without_amount");
      unpricedJobs += 1;
    } else {
      assertFiniteNonNegative(observation.costTwd, "cost");
      if (observation.costEvidence === "provider_invoice") invoiceCostTwd += observation.costTwd;
      else if (observation.costEvidence === "internal_estimate") estimatedCostTwd += observation.costTwd;
      else throw new Error("missing_cost_evidence");
    }

    totalAttempts += observation.attempts;
    retryAttempts += observation.attempts - 1;
    if (observation.outcome === "accepted") {
      acceptedJobs += 1;
      acceptedLatencies.push(observation.latencyMs);
    } else {
      failedJobs += 1;
    }
  }

  const totalJobs = observations.length;
  const safeDivide = (numerator: number, denominator: number) => denominator === 0 ? 0 : numerator / denominator;
  return {
    totalJobs,
    acceptedJobs,
    failedJobs,
    acceptanceRate: safeDivide(acceptedJobs, totalJobs),
    failureRate: safeDivide(failedJobs, totalJobs),
    totalAttempts,
    retryAttempts,
    retryRate: safeDivide(retryAttempts, totalAttempts),
    medianAcceptedLatencyMs: percentileNearestRank(acceptedLatencies, 0.5),
    p95AcceptedLatencyMs: percentileNearestRank(acceptedLatencies, 0.95),
    invoiceCostTwd,
    estimatedCostTwd,
    unpricedJobs,
    invoiceCostPerAcceptedResultTwd: acceptedJobs === 0 ? null : invoiceCostTwd / acceptedJobs,
    estimatedCostPerAcceptedResultTwd: acceptedJobs === 0 ? null : estimatedCostTwd / acceptedJobs,
  };
}
