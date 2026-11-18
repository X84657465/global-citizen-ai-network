export type WorkloadClass = "public_parallel" | "private_user_data" | "privileged" | "nondeterministic_ai";

export type ExecutionTarget = "local_device" | "trusted_cloud" | "community_node";

export type WorkloadProfile = {
  workloadClass: WorkloadClass;
  estimatedInputBytes: number;
  estimatedOutputBytes: number;
  requiresSecrets?: boolean;
  userAllowsLocal?: boolean;
  userAllowsCommunity?: boolean;
  trustedCloudAvailable: boolean;
};

export type ExecutionQuote = {
  target: ExecutionTarget;
  estimatedCostTwd: number;
  estimatedLatencyMs: number;
  available: boolean;
  reason?: string;
};

export type CostRoutingDecision = {
  target: ExecutionTarget;
  estimatedCostTwd: number;
  estimatedLatencyMs: number;
  reason: string;
  alternatives: ExecutionQuote[];
};

const MAX_ARTIFACT_BYTES = 100 * 1024 * 1024;

function validNonNegative(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function eligibleForCommunity(profile: WorkloadProfile): boolean {
  return profile.workloadClass === "public_parallel"
    && profile.requiresSecrets !== true
    && profile.userAllowsCommunity === true;
}

function eligibleForLocal(profile: WorkloadProfile): boolean {
  return profile.userAllowsLocal === true
    && profile.workloadClass !== "privileged"
    && profile.requiresSecrets !== true;
}

/**
 * Pure policy/cost router. Quotes are caller-supplied estimates, not measured
 * prices. This function never executes work, dispatches jobs, or grants access.
 * Unknown/private/privileged workloads fail closed to trusted cloud only.
 */
export function chooseExecutionTarget(
  profile: WorkloadProfile,
  quotes: ExecutionQuote[],
): CostRoutingDecision {
  if (
    !validNonNegative(profile.estimatedInputBytes)
    || !validNonNegative(profile.estimatedOutputBytes)
    || profile.estimatedInputBytes + profile.estimatedOutputBytes > MAX_ARTIFACT_BYTES
  ) {
    throw new Error("invalid_or_oversized_workload");
  }

  const uniqueTargets = new Set(quotes.map(quote => quote.target));
  if (uniqueTargets.size !== quotes.length) throw new Error("duplicate_execution_quote");

  for (const quote of quotes) {
    if (!validNonNegative(quote.estimatedCostTwd) || !validNonNegative(quote.estimatedLatencyMs)) {
      throw new Error("invalid_execution_quote");
    }
  }

  const allowed = quotes.filter(quote => {
    if (!quote.available) return false;
    if (quote.target === "trusted_cloud") return profile.trustedCloudAvailable;
    if (quote.target === "local_device") return eligibleForLocal(profile);
    return eligibleForCommunity(profile);
  });

  if (profile.workloadClass !== "public_parallel" && profile.workloadClass !== "private_user_data") {
    const trusted = allowed.find(quote => quote.target === "trusted_cloud");
    if (!trusted) throw new Error("no_safe_execution_target");
    return {
      target: trusted.target,
      estimatedCostTwd: trusted.estimatedCostTwd,
      estimatedLatencyMs: trusted.estimatedLatencyMs,
      reason: "sensitive_or_privileged_workload_requires_trusted_cloud",
      alternatives: quotes,
    };
  }

  if (profile.workloadClass === "private_user_data") {
    const local = allowed.find(quote => quote.target === "local_device");
    if (local) {
      return {
        target: local.target,
        estimatedCostTwd: local.estimatedCostTwd,
        estimatedLatencyMs: local.estimatedLatencyMs,
        reason: "private_data_stays_on_user_device",
        alternatives: quotes,
      };
    }
    const trusted = allowed.find(quote => quote.target === "trusted_cloud");
    if (!trusted) throw new Error("no_safe_execution_target");
    return {
      target: trusted.target,
      estimatedCostTwd: trusted.estimatedCostTwd,
      estimatedLatencyMs: trusted.estimatedLatencyMs,
      reason: "private_data_never_routed_to_community_nodes",
      alternatives: quotes,
    };
  }

  if (allowed.length === 0) throw new Error("no_eligible_execution_target");
  allowed.sort((a, b) => a.estimatedCostTwd - b.estimatedCostTwd || a.estimatedLatencyMs - b.estimatedLatencyMs);
  const selected = allowed[0];
  return {
    target: selected.target,
    estimatedCostTwd: selected.estimatedCostTwd,
    estimatedLatencyMs: selected.estimatedLatencyMs,
    reason: selected.target === "community_node"
      ? "lowest_estimated_cost_eligible_community_node"
      : selected.target === "local_device"
        ? "lowest_estimated_cost_eligible_local_execution"
        : "trusted_cloud_selected_by_cost_and_availability",
    alternatives: quotes,
  };
}
