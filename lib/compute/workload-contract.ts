export type CommunityWorkloadType = "dataset_transform" | "image_thumbnail" | "public_benchmark";
export type VerificationStrategy = "deterministic_digest" | "trusted_recompute";

export type CommunityWorkloadManifest = {
  id: string;
  type: CommunityWorkloadType;
  workloadClass: "public_parallel";
  input: { artifactId: string; sha256: string; sizeBytes: number; visibility: "public" };
  resources: { cpuCores: number; memoryBytes: number; maxDurationSeconds: number };
  deadlineAt: string;
  output: { schemaId: string; maxBytes: number };
  verification: VerificationStrategy;
  containsPersonalData: false;
  requiresSecrets: false;
  executableArtifact?: never;
};

export type SignedWorkLease = {
  jobId: string;
  nodeId: string;
  manifestSha256: string;
  nonce: string;
  issuedAt: string;
  expiresAt: string;
  signature: string;
  audience: "citizen-compute-node";
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256 = /^[0-9a-f]{64}$/i;
const SAFE_ID = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/;
const ALLOWED_TYPES = new Set<CommunityWorkloadType>(["dataset_transform", "image_thumbnail", "public_benchmark"]);
const ALLOWED_VERIFIERS = new Set<VerificationStrategy>(["deterministic_digest", "trusted_recompute"]);

function hasOnlyKeys(value: unknown, allowed: string[]): boolean {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.keys(value).every(key => allowed.includes(key));
}

export function validateCommunityWorkloadManifest(
  value: CommunityWorkloadManifest,
  now = Date.now(),
): { valid: true } {
  if (!hasOnlyKeys(value, ["id", "type", "workloadClass", "input", "resources", "deadlineAt", "output", "verification", "containsPersonalData", "requiresSecrets"])) {
    throw new Error("unknown_manifest_field");
  }
  if (typeof value.id !== "string" || !UUID.test(value.id)) throw new Error("invalid_workload_id");
  if (!ALLOWED_TYPES.has(value.type)) throw new Error("workload_type_not_allowlisted");
  if (value.workloadClass !== "public_parallel") throw new Error("community_workload_must_be_public_parallel");
  if (value.containsPersonalData !== false || value.requiresSecrets !== false) throw new Error("sensitive_workload_rejected");
  if ("executableArtifact" in value) throw new Error("arbitrary_executable_rejected");
  if (!hasOnlyKeys(value.input, ["artifactId", "sha256", "sizeBytes", "visibility"])
    || value.input.visibility !== "public" || typeof value.input.artifactId !== "string" || !SAFE_ID.test(value.input.artifactId)
    || typeof value.input.sha256 !== "string" || !SHA256.test(value.input.sha256) || !Number.isSafeInteger(value.input.sizeBytes)
    || value.input.sizeBytes < 1 || value.input.sizeBytes > 50 * 1024 * 1024) {
    throw new Error("invalid_public_input_artifact");
  }
  if (!hasOnlyKeys(value.resources, ["cpuCores", "memoryBytes", "maxDurationSeconds"]) || !Number.isInteger(value.resources.cpuCores)
    || value.resources.cpuCores < 1 || value.resources.cpuCores > 4
    || !Number.isSafeInteger(value.resources.memoryBytes)
    || value.resources.memoryBytes < 256 * 1024 * 1024
    || value.resources.memoryBytes > 4 * 1024 * 1024 * 1024
    || !Number.isInteger(value.resources.maxDurationSeconds)
    || value.resources.maxDurationSeconds < 1 || value.resources.maxDurationSeconds > 900) {
    throw new Error("resource_envelope_out_of_range");
  }
  if (!hasOnlyKeys(value.output, ["schemaId", "maxBytes"]) || typeof value.output.schemaId !== "string" || !SAFE_ID.test(value.output.schemaId)
    || !Number.isSafeInteger(value.output.maxBytes) || value.output.maxBytes < 1
    || value.output.maxBytes > 50 * 1024 * 1024) throw new Error("invalid_output_contract");
  if (!ALLOWED_VERIFIERS.has(value.verification)) throw new Error("verification_strategy_required");
  if (typeof value.deadlineAt !== "string") throw new Error("deadline_out_of_range");
  const deadline = Date.parse(value.deadlineAt);
  if (!Number.isFinite(deadline) || deadline <= now || deadline > now + 24 * 60 * 60 * 1000) {
    throw new Error("deadline_out_of_range");
  }
  return { valid: true };
}

/** Validates lease shape and expiry only; cryptographic signature verification is a separate trusted-service responsibility. */
export function validateWorkLease(lease: SignedWorkLease, now = Date.now()): { valid: true } {
  if (!hasOnlyKeys(lease, ["jobId", "nodeId", "manifestSha256", "nonce", "issuedAt", "expiresAt", "signature", "audience"])) {
    throw new Error("unknown_lease_field");
  }
  if (typeof lease.jobId !== "string" || !UUID.test(lease.jobId)
    || typeof lease.nodeId !== "string" || !UUID.test(lease.nodeId)) throw new Error("invalid_lease_identity");
  if (typeof lease.manifestSha256 !== "string" || !SHA256.test(lease.manifestSha256)
    || typeof lease.nonce !== "string" || !SAFE_ID.test(lease.nonce)) throw new Error("invalid_lease_binding");
  if (lease.audience !== "citizen-compute-node" || typeof lease.signature !== "string" || lease.signature.length < 32) {
    throw new Error("invalid_lease_authentication_fields");
  }
  if (typeof lease.issuedAt !== "string" || typeof lease.expiresAt !== "string") throw new Error("lease_expired_or_invalid_window");
  const issued = Date.parse(lease.issuedAt);
  const expires = Date.parse(lease.expiresAt);
  if (!Number.isFinite(issued) || !Number.isFinite(expires) || issued > now + 30_000
    || expires <= now || expires <= issued || expires - issued > 15 * 60 * 1000) {
    throw new Error("lease_expired_or_invalid_window");
  }
  return { valid: true };
}
