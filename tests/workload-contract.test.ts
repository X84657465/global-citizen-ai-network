import test from "node:test";
import assert from "node:assert/strict";
import { validateCommunityWorkloadManifest, validateWorkLease, type CommunityWorkloadManifest, type SignedWorkLease } from "../lib/compute/workload-contract.ts";

const now = Date.parse("2026-11-18T12:00:00.000Z");
const manifest: CommunityWorkloadManifest = {
  id: "2d931510-d99f-494a-8c67-87feb05e1594",
  type: "dataset_transform",
  workloadClass: "public_parallel",
  input: { artifactId: "public-dataset-v1", sha256: "a".repeat(64), sizeBytes: 1024, visibility: "public" },
  resources: { cpuCores: 2, memoryBytes: 512 * 1024 * 1024, maxDurationSeconds: 120 },
  deadlineAt: "2026-11-18T13:00:00.000Z",
  output: { schemaId: "dataset-output-v1", maxBytes: 1024 * 1024 },
  verification: "deterministic_digest",
  containsPersonalData: false,
  requiresSecrets: false,
};

const lease: SignedWorkLease = {
  jobId: "2d931510-d99f-494a-8c67-87feb05e1594",
  nodeId: "3d931510-d99f-494a-8c67-87feb05e1594",
  manifestSha256: "b".repeat(64),
  nonce: "lease-nonce-123",
  issuedAt: "2026-11-18T11:59:00.000Z",
  expiresAt: "2026-11-18T12:05:00.000Z",
  signature: "x".repeat(64),
  audience: "citizen-compute-node",
};

test("accepts a bounded public deterministic manifest", () => {
  assert.deepEqual(validateCommunityWorkloadManifest(manifest, now), { valid: true });
});

test("rejects private, unlisted, arbitrary executable, and oversized jobs", () => {
  assert.throws(() => validateCommunityWorkloadManifest({ ...manifest, workloadClass: "private_user_data" } as unknown as CommunityWorkloadManifest, now), /public_parallel/);
  assert.throws(() => validateCommunityWorkloadManifest({ ...manifest, type: "shell_script" } as unknown as CommunityWorkloadManifest, now), /not_allowlisted/);
  assert.throws(() => validateCommunityWorkloadManifest({ ...manifest, executableArtifact: "payload" } as unknown as CommunityWorkloadManifest, now), /arbitrary_executable/);
  assert.throws(() => validateCommunityWorkloadManifest({ ...manifest, input: { ...manifest.input, sizeBytes: 60 * 1024 * 1024 } }, now), /invalid_public_input/);
});

test("rejects resource and deadline violations", () => {
  assert.throws(() => validateCommunityWorkloadManifest({ ...manifest, resources: { ...manifest.resources, cpuCores: 16 } }, now), /resource_envelope/);
  assert.throws(() => validateCommunityWorkloadManifest({ ...manifest, deadlineAt: "2026-11-19T12:00:01.000Z" }, now), /deadline_out_of_range/);
});

test("checks lease audience, binding and short expiry window", () => {
  assert.deepEqual(validateWorkLease(lease, now), { valid: true });
  assert.throws(() => validateWorkLease({ ...lease, audience: "browser" } as unknown as SignedWorkLease, now), /authentication_fields/);
  assert.throws(() => validateWorkLease({ ...lease, expiresAt: "2026-11-18T12:30:00.000Z" }, now), /invalid_window/);
});


test("rejects unknown fields at manifest and nested contract boundaries", () => {
  assert.throws(() => validateCommunityWorkloadManifest({ ...manifest, command: "run arbitrary code" } as unknown as CommunityWorkloadManifest, now), /unknown_manifest_field/);
  assert.throws(() => validateCommunityWorkloadManifest({ ...manifest, input: { ...manifest.input, localPath: "C:\\\\Users" } } as unknown as CommunityWorkloadManifest, now), /invalid_public_input/);
  assert.throws(() => validateCommunityWorkloadManifest({ ...manifest, resources: { ...manifest.resources, environment: { SECRET: "x" } } } as unknown as CommunityWorkloadManifest, now), /resource_envelope/);
});

test("rejects unknown lease fields and non-string identity values", () => {
  assert.throws(() => validateWorkLease({ ...lease, command: "execute" } as unknown as SignedWorkLease, now), /unknown_lease_field/);
  assert.throws(() => validateWorkLease({ ...lease, jobId: 123 } as unknown as SignedWorkLease, now), /invalid_lease_identity/);
});
