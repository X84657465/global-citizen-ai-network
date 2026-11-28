import { createHash } from "node:crypto";

const SHA_RE = /^[a-f0-9]{40}$/;
const DIGEST_RE = /^[a-f0-9]{64}$/;
const REPOSITORY_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

function fail(message) {
  const error = new Error(message);
  error.name = "LocalFactoryPublicationContractError";
  error.scope = "task";
  throw error;
}

function validBranch(value) {
  return typeof value === "string" &&
    value.length > 0 && value.length <= 200 &&
    /^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(value) &&
    !value.includes("..") &&
    !value.includes("//") &&
    !value.includes("@{") &&
    !value.endsWith("/") &&
    !value.endsWith(".") &&
    !value.split("/").some((part) => part.length === 0 || part.startsWith(".") || part.endsWith(".lock"));
}

function canonicalTarget(target) {
  return Buffer.from(JSON.stringify({
    schema_version: target.schema_version,
    task_id: target.task_id,
    repository: target.repository,
    base_branch: target.base_branch,
    base_sha: target.base_sha,
    contract_sha256: target.contract_sha256,
  }), "utf8");
}

export function createLocalFactoryPublicationTarget({
  taskId,
  repository,
  baseBranch,
  baseSha,
  contractSha256,
} = {}) {
  if (typeof taskId !== "string" || !/^[A-Za-z0-9._:-]{1,128}$/.test(taskId) ||
      !REPOSITORY_RE.test(repository ?? "") ||
      !validBranch(baseBranch) ||
      !SHA_RE.test(baseSha ?? "") ||
      !DIGEST_RE.test(contractSha256 ?? "")) {
    fail("Local publication target requires a valid task, repository, base branch, exact base SHA and Trusted Oracle contract digest.");
  }
  const target = {
    schema_version: 1,
    task_id: taskId,
    repository,
    base_branch: baseBranch,
    base_sha: baseSha,
    contract_sha256: contractSha256,
  };
  return Object.freeze({
    ...target,
    target_sha256: createHash("sha256").update(canonicalTarget(target)).digest("hex"),
  });
}

export function verifyLocalFactoryPublicationTarget(target, {
  taskId,
  contract,
} = {}) {
  const expectedKeys = "base_branch,base_sha,contract_sha256,repository,schema_version,target_sha256,task_id";
  if (!target || typeof target !== "object" || Array.isArray(target) ||
      Object.keys(target).sort().join(",") !== expectedKeys ||
      target.schema_version !== 1 ||
      target.task_id !== taskId ||
      !/^[A-Za-z0-9._:-]{1,128}$/.test(target.task_id ?? "") ||
      !REPOSITORY_RE.test(target.repository ?? "") ||
      !validBranch(target.base_branch) ||
      !SHA_RE.test(target.base_sha ?? "") ||
      !DIGEST_RE.test(target.contract_sha256 ?? "") ||
      !DIGEST_RE.test(target.target_sha256 ?? "") ||
      target.base_sha !== contract?.base_sha ||
      target.contract_sha256 !== contract?.contract_sha256 ||
      contract?.task_id !== taskId ||
      createHash("sha256").update(canonicalTarget(target)).digest("hex") !== target.target_sha256) {
    fail("Local publication target is malformed, modified, or detached from the Trusted Oracle intake contract.");
  }
  return Object.freeze({
    valid: true,
    task_id: target.task_id,
    repository: target.repository,
    base_branch: target.base_branch,
    base_sha: target.base_sha,
    contract_sha256: target.contract_sha256,
    target_sha256: target.target_sha256,
  });
}
