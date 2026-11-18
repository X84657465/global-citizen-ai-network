import test from "node:test";
import assert from "node:assert/strict";
import { canAcceptCommunityWork, createDeviceCapabilitySnapshot, validateNodeResourcePolicy } from "../lib/compute/device-capabilities.ts";

const policy = { maxCpuPercent: 50, maxConcurrentJobs: 2, maxMemoryBytes: 512 * 1024 * 1024 };

test("does not expose measurements without explicit opt-in", () => {
  const result = createDeviceCapabilitySnapshot({ consent: false, runtime: "desktop", cpuLogicalCores: 16 });
  assert.equal(result.consented, false);
  assert.equal(result.cpuLogicalCores, null);
  assert.equal(result.gpu, null);
});

test("normalizes consented capabilities and preserves unknown values", () => {
  const result = createDeviceCapabilitySnapshot({
    consent: true, runtime: "desktop", cpuLogicalCores: 8, availableMemoryBytes: 8 * 1024 ** 3,
    gpu: { vendor: "Example", name: "GPU", vramBytes: 4 * 1024 ** 3 },
    storageQuotaBytes: 1000, storageUsageBytes: 1200, networkRttMs: 18, batteryPercent: 70, charging: true,
  });
  assert.equal(result.cpuLogicalCores, 8);
  assert.equal(result.storage?.usageBytes, null);
  assert.equal(result.network.downlinkMbps, null);
});

test("rejects browser runtime for community worker execution", () => {
  const snapshot = createDeviceCapabilitySnapshot({ consent: true, runtime: "browser", cpuLogicalCores: 8, availableMemoryBytes: 8 * 1024 ** 3 });
  assert.deepEqual(canAcceptCommunityWork(snapshot, policy, 0), { allowed: false, reason: "desktop_runtime_required" });
});

test("requires opt-in, known capabilities, and available concurrency", () => {
  const optedOut = createDeviceCapabilitySnapshot({ consent: false, runtime: "desktop" });
  assert.equal(canAcceptCommunityWork(optedOut, policy, 0).reason, "explicit_opt_in_required");
  const unknown = createDeviceCapabilitySnapshot({ consent: true, runtime: "desktop" });
  assert.equal(canAcceptCommunityWork(unknown, policy, 0).reason, "capabilities_unknown");
  const capable = createDeviceCapabilitySnapshot({ consent: true, runtime: "desktop", cpuLogicalCores: 8, availableMemoryBytes: 8 * 1024 ** 3 });
  assert.equal(canAcceptCommunityWork(capable, policy, 2).reason, "concurrency_limit_reached");
  assert.equal(canAcceptCommunityWork(capable, policy, 0).allowed, true);
});

test("validates conservative resource caps", () => {
  assert.throws(() => validateNodeResourcePolicy({ ...policy, maxCpuPercent: 100 }), /cpu_limit_out_of_range/);
  assert.throws(() => validateNodeResourcePolicy({ ...policy, maxConcurrentJobs: 8 }), /concurrency_limit_out_of_range/);
  assert.throws(() => validateNodeResourcePolicy({ ...policy, maxMemoryBytes: 1 }), /memory_limit_too_low_or_invalid/);
});
