export type DeviceTelemetryInput = {
  consent: boolean;
  runtime: "browser" | "desktop";
  cpuLogicalCores?: number | null;
  availableMemoryBytes?: number | null;
  gpu?: { vendor?: string | null; name?: string | null; vramBytes?: number | null } | null;
  storageQuotaBytes?: number | null;
  storageUsageBytes?: number | null;
  networkRttMs?: number | null;
  networkDownlinkMbps?: number | null;
  batteryPercent?: number | null;
  charging?: boolean | null;
};

export type DeviceCapabilitySnapshot = {
  consented: boolean;
  runtime: DeviceTelemetryInput["runtime"];
  cpuLogicalCores: number | null;
  availableMemoryBytes: number | null;
  gpu: { vendor: string | null; name: string | null; vramBytes: number | null } | null;
  storage: { quotaBytes: number; usageBytes: number | null } | null;
  network: { rttMs: number | null; downlinkMbps: number | null };
  power: { batteryPercent: number | null; charging: boolean | null };
};

function boundedInteger(value: number | null | undefined, min: number, max: number): number | null {
  if (value == null || !Number.isSafeInteger(value) || value < min || value > max) return null;
  return value;
}
function boundedNumber(value: number | null | undefined, min: number, max: number): number | null {
  if (value == null || !Number.isFinite(value) || value < min || value > max) return null;
  return value;
}

/**
 * Normalizes only caller-supplied, explicitly consented measurements.
 * This module does not probe hardware, fingerprint a device, or infer missing
 * values. Browser-reported storage/network/GPU data is advisory, not attested.
 */
export function createDeviceCapabilitySnapshot(input: DeviceTelemetryInput): DeviceCapabilitySnapshot {
  if (input.runtime !== "browser" && input.runtime !== "desktop") throw new Error("invalid_runtime");
  if (input.consent !== true) {
    return {
      consented: false, runtime: input.runtime, cpuLogicalCores: null,
      availableMemoryBytes: null, gpu: null, storage: null,
      network: { rttMs: null, downlinkMbps: null },
      power: { batteryPercent: null, charging: null },
    };
  }

  const quota = boundedInteger(input.storageQuotaBytes, 1, Number.MAX_SAFE_INTEGER);
  const usage = boundedInteger(input.storageUsageBytes, 0, Number.MAX_SAFE_INTEGER);
  const gpu = input.gpu ? {
    vendor: typeof input.gpu.vendor === "string" && input.gpu.vendor.length <= 80 ? input.gpu.vendor : null,
    name: typeof input.gpu.name === "string" && input.gpu.name.length <= 120 ? input.gpu.name : null,
    vramBytes: boundedInteger(input.gpu.vramBytes, 1, Number.MAX_SAFE_INTEGER),
  } : null;

  return {
    consented: true,
    runtime: input.runtime,
    cpuLogicalCores: boundedInteger(input.cpuLogicalCores, 1, 512),
    availableMemoryBytes: boundedInteger(input.availableMemoryBytes, 1, Number.MAX_SAFE_INTEGER),
    gpu,
    storage: quota === null ? null : { quotaBytes: quota, usageBytes: usage !== null && usage <= quota ? usage : null },
    network: {
      rttMs: boundedNumber(input.networkRttMs, 0, 600_000),
      downlinkMbps: boundedNumber(input.networkDownlinkMbps, 0, 100_000),
    },
    power: {
      batteryPercent: boundedNumber(input.batteryPercent, 0, 100),
      charging: typeof input.charging === "boolean" ? input.charging : null,
    },
  };
}

export type NodeResourcePolicy = {
  maxCpuPercent: number;
  maxConcurrentJobs: number;
  maxMemoryBytes: number;
  requireCharging?: boolean;
  minimumBatteryPercent?: number;
};

export function validateNodeResourcePolicy(policy: NodeResourcePolicy): NodeResourcePolicy {
  if (!Number.isInteger(policy.maxCpuPercent) || policy.maxCpuPercent < 1 || policy.maxCpuPercent > 80) {
    throw new Error("cpu_limit_out_of_range");
  }
  if (!Number.isInteger(policy.maxConcurrentJobs) || policy.maxConcurrentJobs < 1 || policy.maxConcurrentJobs > 4) {
    throw new Error("concurrency_limit_out_of_range");
  }
  if (!Number.isSafeInteger(policy.maxMemoryBytes) || policy.maxMemoryBytes < 256 * 1024 * 1024) {
    throw new Error("memory_limit_too_low_or_invalid");
  }
  if (policy.minimumBatteryPercent !== undefined
    && (!Number.isFinite(policy.minimumBatteryPercent) || policy.minimumBatteryPercent < 10 || policy.minimumBatteryPercent > 100)) {
    throw new Error("battery_threshold_out_of_range");
  }
  return { ...policy };
}

export function canAcceptCommunityWork(
  snapshot: DeviceCapabilitySnapshot,
  policy: NodeResourcePolicy,
  activeJobs: number,
): { allowed: boolean; reason: string } {
  validateNodeResourcePolicy(policy);
  if (!snapshot.consented) return { allowed: false, reason: "explicit_opt_in_required" };
  if (snapshot.runtime !== "desktop") return { allowed: false, reason: "desktop_runtime_required" };
  if (!Number.isInteger(activeJobs) || activeJobs < 0) return { allowed: false, reason: "invalid_active_job_count" };
  if (activeJobs >= policy.maxConcurrentJobs) return { allowed: false, reason: "concurrency_limit_reached" };
  if (snapshot.cpuLogicalCores === null || snapshot.availableMemoryBytes === null) {
    return { allowed: false, reason: "capabilities_unknown" };
  }
  if (snapshot.availableMemoryBytes < policy.maxMemoryBytes) return { allowed: false, reason: "insufficient_memory" };
  if (policy.requireCharging && snapshot.power.charging !== true) return { allowed: false, reason: "charging_required" };
  if (policy.minimumBatteryPercent !== undefined
    && (snapshot.power.batteryPercent === null || snapshot.power.batteryPercent < policy.minimumBatteryPercent)) {
    return { allowed: false, reason: "battery_below_threshold_or_unknown" };
  }
  return { allowed: true, reason: "eligible_within_user_limits" };
}
